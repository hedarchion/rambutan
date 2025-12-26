import * as pdfjsLib from 'pdfjs-dist';

// Resolve the library instance by checking for the presence of getDocument.
// This handles differences in how import * behaves across different bundlers/CDNs.
const lib = (pdfjsLib as any).default?.getDocument ? (pdfjsLib as any).default : pdfjsLib;

// Set up the worker source. 
// We use cdnjs for the worker script because it provides a standalone script file 
// that works reliably with importScripts, avoiding MIME type and ESM wrapping issues 
// often encountered with esm.sh worker endpoints.
if (lib.GlobalWorkerOptions) {
  lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

export const convertPdfToImages = async (file: File): Promise<string[]> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Use the resolved lib instance to load the document
    const loadingTask = lib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const images: string[] = [];

    // Target width for high-quality grading (approx 2K resolution)
    // 2480px is roughly 300 DPI for an A4 page width.
    const TARGET_WIDTH = 2480; 

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      
      // 1. Get the unscaled viewport first to understand the PDF's native dimensions
      const unscaledViewport = page.getViewport({ scale: 1 });
      
      // 2. Calculate the scale factor needed to reach our target width
      // This ensures that even small PDF pages are upscaled to be legible
      const scaleFactor = TARGET_WIDTH / unscaledViewport.width;
      
      // 3. Render with the calculated scale
      const viewport = page.getViewport({ scale: scaleFactor });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        // 4. Export as High Quality JPEG (0.95)
        // We use JPEG instead of PNG to keep memory usage manageable for browser LocalStorage
        // 0.95 removes almost all artifacts while being much smaller than PNG
        images.push(canvas.toDataURL('image/jpeg', 0.95));
      }
    }
    return images;
  } catch (error) {
    console.error("Error converting PDF to images:", error);
    throw error;
  }
};