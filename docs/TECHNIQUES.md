# 🧪 Techniques & Methodologies

This document outlines the specific technical challenges encountered and the methodologies used to solve them.

## 1. Hybrid Parsing (The "No-OCR" Approach)

### The Problem with Pure Vision AI
Using Vision AI (like GPT-4o or Gemini 1.5 Pro) to read text from an image often results in:
- **Hallucinations**: Misspelled words or invented sentences.
- **Loss of Formatting**: Difficulty distinguishing between bold, italic, or specific fonts.
- **High Latency**: OCR is computationally expensive for the model.

### The Solution: Text Layer Injection
Since PDFs usually contain embedded text (unless scanned), we extract this programmatically.

```typescript
// Pseudocode of the approach
const textLayer = pdf.getTextContent(); // Exact strings + Precise X/Y
const image = pdf.renderCanvas();       // Visual layout

const prompt = `
  Here is the image of the slide.
  Here is the EXACT text present on the slide: ${JSON.stringify(textLayer)}
  
  Do not read the text from the image. Map the visual elements to these text items.
  Return a layout JSON.
`;
```

**Benefits**:
- **100% Accuracy**: The text is copied byte-for-byte from the source.
- **Lower Token Usage**: The model focuses on *layout* rather than character recognition.

## 2. Coordinate System Normalization

Bridging the gap between PDF Coordinates and Web/Canvas Coordinates is critical.

- **PDF Space**: Origin (0,0) is bottom-left. Units are Points (pt).
- **Canvas/Web Space**: Origin (0,0) is top-left. Units are Pixels (px).
- **PPTX Space**: Units are Inches (in).

### The Formula
We normalize everything to a **Percentage (0-100%)** system to remain resolution-independent.

```typescript
// Y-Coordinate Flip & Normalization
// viewportPoint[1] is the baseline Y from top-left
// viewport.height is the total height
const normalizedY = ((viewportPoint[1] - fontSize) / viewport.height) * 100;
```

This percentage is then projected onto the PPTX slide size (e.g., 10 x 5.625 inches) during generation.

## 3. Dynamic Asset Cropping

To simulate "extracting" images from the PDF without complex vector parsing:
1. The AI returns a bounding box for an image element: `{ type: 'image', x: 10, y: 20, w: 50, h: 50 }`.
2. We use the HTML5 Canvas API to "crop" that specific region from the original high-res render.
3. This cropped blob is inserted into the PPTX as a discrete image.

## 4. Prompt Engineering for Layout

We use a **Structured Output** prompt with explicit constraints:
- **Strict JSON**: Enforced via system instruction and response schema.
- **Layering Order**: "Background shapes -> Images -> Text" ensures proper Z-index stacking in PowerPoint.
