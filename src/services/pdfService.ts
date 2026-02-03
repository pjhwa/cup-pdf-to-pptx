import * as pdfjsLib from 'pdfjs-dist';
import { TextItem } from '../types';
import { PDF_RENDER_SCALE, JPEG_QUALITY } from '../config/constants';

// Fix for "Failed to fetch dynamically imported module" error:
// PDF.js v5+ in an ESM environment requires the worker to be loaded as a module (.mjs).
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface ProcessedPage {
  image: string;
  textItems: TextItem[];
}

export const processPdfDocument = async (file: File): Promise<ProcessedPage[]> => {
  try {
    const arrayBuffer = await file.arrayBuffer();

    // Initialize the loading task
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const numPages = pdf.numPages;
    const results: ProcessedPage[] = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);

      // Set scale to ensure good quality for AI analysis (approx 1.5x - 2x standard screen)
      const scale = PDF_RENDER_SCALE;
      const viewport = page.getViewport({ scale });

      // 1. Render Image
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) throw new Error('Could not create canvas context');

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;

      // Export to JPEG to save size while maintaining quality for AI
      const base64 = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      const image = base64.split(',')[1];

      // 2. Extract Text
      const textContent = await page.getTextContent();
      const textItems: TextItem[] = textContent.items.map((item: any) => {
        // PDF.js returns a transform array [scaleX, skewY, skewX, scaleY, x, y]
        // y coordinate in PDF is from bottom-left. We need to convert to top-left relative to viewport.
        const tx = item.transform;

        // Calculate standard coordinates (this is simplified, rotation might need more math but sufficient for horizontal text)
        // We use the viewport to transform the PDF point to the Canvas point
        // item.width/height are in PDF units (usually 1/72 inch). 
        // We need to match the scaled viewport.

        // However, simpler is to just use the raw transform and normalization if needed.
        // Let's use viewport.transform provided by pdf.js if possible, or manual calc.
        // Actually, viewport.convertToViewportPoint allows mapping.

        const [x, y] = [tx[4], tx[5]];

        // Transform PDF point (unit space) to Viewport point (pixel space)
        // Note: y is inverted in PDF.
        const viewportPoint = viewport.convertToViewportPoint([x, y]);

        // pdf.js text items have x, y at the baseline. 
        // We need to approximate the bounding box top-left.
        // height is roughly equivalent to font size * scale? 
        // item.height/width in textContent are not always populated in older versions, 
        // but 'width' property usually exists. 'height' is often just the font size.

        // Simplified approach: normalized to 0-100% of viewport
        const normalizedX = (viewportPoint[0] / viewport.width) * 100;
        // viewportPoint[1] is the *baseline* y. To get top-left, we subtract font height.
        // item.height might be 0, so we use transform[0] or [3] which acts as font size scale often.
        const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]); // decomposed scale (already in viewport units)
        // FIX: fontSize is already scaled, don't multiply by scale again

        const normalizedY = ((viewportPoint[1] - fontSize) / viewport.height) * 100;
        // FIX: item.width is in PDF units, convert properly to viewport percentage
        const normalizedW = ((item.width) / (viewport.width / scale)) * 100;
        const normalizedH = (fontSize / viewport.height) * 100;

        return {
          text: item.str,
          x: normalizedX,
          y: normalizedY,
          width: normalizedW,
          height: normalizedH,
          fontName: item.fontName,
        };
      }).filter(item => item.text.trim().length > 0); // Filter empty strings

      results.push({
        image,
        textItems
      });
    }

    return results;
  } catch (error) {
    console.error("PDF Conversion Error:", error);
    throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};