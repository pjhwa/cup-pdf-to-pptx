import { GoogleGenAI, Type } from "@google/genai";
import { SlideData, ElementType, TextItem } from "../types";
import { GEMINI_MODEL, GEMINI_TEMPERATURE } from "../constants";

const SYSTEM_INSTRUCTION = `
You are an expert presentation layout parser. Your goal is to analyze an image of a presentation slide and extract a structured JSON representation to reconstruct it as an editable PowerPoint file.

**Input Data:**
You are provided with:
1. An **Image** of the slide.
2. A **List of Text Items** extracted physically from the PDF (content and coordinates).

**Analysis Strategy:**
1. **Deconstruct Layers**: Identify the background color first. Then, identify shapes that serve as containers.
2. **Text Mapping (CRITICAL)**: 
   - Use the **provided Text Items** as the ground truth for text content. 
   - Do NOT OCR the image if you can match it to the provided text.
   - Group fragmented text items (e.g., "H", "el", "lo") into logical paragraphs or headings based on the visuals.
3. **Visual Asset Preservation**: 
   - **Photos, Icons, Logos**: Identify these as \`type: image\`.
   - **Simple Shapes**: Rectangles, circles, dividers should be \`type: shape\`.
4. **Layout**:
   - If text sits inside a colored box, create a SHAPE element for the box, then a TEXT element for the content.

**Properties & Estimation Rules:**
- **Coordinates (x, y, w, h)**: Use percentage (0-100) relative to the top-left corner.
  - Bounding boxes must be tight.
- **Font Size**: Estimate in points (pt). Title: 40-60pt, Body: 14-20pt.
- **Colors**: Return 6-digit Hex codes.
- **Alignment**: 'left', 'center', 'right'.

**Output Order**:
Background shapes -> Images -> Text.
`;

export const analyzeSlideWithGemini = async (
  base64Image: string,
  textItems: TextItem[],
  index: number
): Promise<SlideData> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing");

  const ai = new GoogleGenAI({ apiKey });

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      backgroundColor: { type: Type.STRING, description: "Hex color code for the slide background canvas" },
      elements: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: [ElementType.Text, ElementType.Shape, ElementType.Image] },
            content: { type: Type.STRING, description: "The actual text content. For shapes/images, leave empty." },
            x: { type: Type.NUMBER, description: "Left position (0-100)" },
            y: { type: Type.NUMBER, description: "Top position (0-100)" },
            w: { type: Type.NUMBER, description: "Width (0-100)" },
            h: { type: Type.NUMBER, description: "Height (0-100)" },
            color: { type: Type.STRING, description: "Text color hex code" },
            bgColor: { type: Type.STRING, description: "Shape fill color hex code" },
            fontSize: { type: Type.NUMBER, description: "Estimated font size in points" },
            bold: { type: Type.BOOLEAN, description: "True if text is bold" },
            align: { type: Type.STRING, enum: ["left", "center", "right"] },
            shapeType: { type: Type.STRING, enum: ["rect", "ellipse", "line"], description: "Only for type=shape" }
          },
          required: ["type", "x", "y", "w", "h"]
        }
      }
    },
    required: ["backgroundColor", "elements"]
  };

  try {
    // Prepare concise text data representation for the model
    // Truncate if too long to avoid token limits, but typically slides are small.
    const textContext = JSON.stringify(textItems.map(t => ({
      text: t.text,
      x: Math.round(t.x),
      y: Math.round(t.y),
      w: Math.round(t.width),
      h: Math.round(t.height)
    })), null, 0);

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL, // Switched to Flash for speed/cost effectiveness with text-context
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          {
            text: `Analyze this slide. EXTRACTED_TEXT_LAYER: ${textContext}`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: GEMINI_TEMPERATURE
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(text);

    return {
      index,
      originalImageBase64: base64Image,
      backgroundColor: data.backgroundColor || "#FFFFFF",
      elements: data.elements || [],
      textItems: textItems // Store original text items just in case
    };

  } catch (error) {
    console.error(`Error analyzing slide ${index}:`, error);
    // Return a fallback with just the image if analysis fails
    return {
      index,
      originalImageBase64: base64Image,
      backgroundColor: "#FFFFFF",
      elements: [
        {
          type: ElementType.Image,
          x: 0,
          y: 0,
          w: 100,
          h: 100
        }
      ],
      textItems: textItems // FIX: Add textItems for type consistency
    };
  }
};