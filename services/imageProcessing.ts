
export const processImageWithSauvola = async (base64Image: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      // Yield to main thread to allow UI updates (spinner) before blocking CPU
      setTimeout(() => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject("No context"); return; }

          // Draw original image to get raw pixel data
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          const width = canvas.width;
          const height = canvas.height;

          // 1. Prepare Integral Images (Summed Area Tables)
          // Using Float64 for maximum precision over large image areas
          const integral = new Float64Array(width * height);
          const integralSq = new Float64Array(width * height);
          
          for (let y = 0; y < height; y++) {
              let rowSum = 0;
              let rowSumSq = 0;
              for (let x = 0; x < width; x++) {
                  const index = (y * width + x) * 4;
                  
                  // Manual Grayscale using standard Luminance formula
                  const val = data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
                  
                  rowSum += val;
                  rowSumSq += val * val;
                  
                  if (y === 0) {
                      integral[x] = rowSum;
                      integralSq[x] = rowSumSq;
                  } else {
                      const currIdx = y * width + x;
                      const prevIdx = (y - 1) * width + x;
                      integral[currIdx] = integral[prevIdx] + rowSum;
                      integralSq[currIdx] = integralSq[prevIdx] + rowSumSq;
                  }
              }
          }

          // 2. Sauvola Thresholding
          const w = 41; // Window size (must be odd)
          const k = 0.2; // Sensitivity coefficient
          const R = 128; // Max standard deviation for 8-bit
          const whalf = Math.floor(w / 2);

          const outputData = ctx.createImageData(width, height);
          const out = outputData.data;

          for (let y = 0; y < height; y++) {
              for (let x = 0; x < width; x++) {
                  const x1 = Math.max(0, x - whalf);
                  const y1 = Math.max(0, y - whalf);
                  const x2 = Math.min(width - 1, x + whalf);
                  const y2 = Math.min(height - 1, y + whalf);
                  
                  const count = (x2 - x1 + 1) * (y2 - y1 + 1);
                  
                  // Safe Integral Image Lookup (Avoid negative index NaNs)
                  const valD = integral[y2 * width + x2];
                  const valB = y1 > 0 ? integral[(y1 - 1) * width + x2] : 0;
                  const valC = x1 > 0 ? integral[y2 * width + (x1 - 1)] : 0;
                  const valA = (x1 > 0 && y1 > 0) ? integral[(y1 - 1) * width + (x1 - 1)] : 0;
                  const localSum = valD - valB - valC + valA;

                  const valSqD = integralSq[y2 * width + x2];
                  const valSqB = y1 > 0 ? integralSq[(y1 - 1) * width + x2] : 0;
                  const valSqC = x1 > 0 ? integralSq[y2 * width + (x1 - 1)] : 0;
                  const valSqA = (x1 > 0 && y1 > 0) ? integralSq[(y1 - 1) * width + (x1 - 1)] : 0;
                  const localSumSq = valSqD - valSqB - valSqC + valSqA;
                  
                  const mean = localSum / count;
                  const variance = Math.max(0, (localSumSq / count) - (mean * mean));
                  const std = Math.sqrt(variance);
                  
                  // Sauvola Formula: T = m * (1 + k * (s/R - 1))
                  const threshold = mean * (1 + k * ((std / R) - 1));
                  
                  const pixelIndex = (y * width + x) * 4;
                  const pixelLuma = data[pixelIndex] * 0.2126 + data[pixelIndex + 1] * 0.7152 + data[pixelIndex + 2] * 0.0722;
                  const binVal = pixelLuma > threshold ? 255 : 0;
                  
                  out[pixelIndex] = binVal;
                  out[pixelIndex + 1] = binVal;
                  out[pixelIndex + 2] = binVal;
                  out[pixelIndex + 3] = 255;
              }
          }
          
          ctx.putImageData(outputData, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        } catch (e) {
          reject(e);
        }
      }, 50);
    };
    img.onerror = (e) => reject(e);
    img.src = base64Image;
  });
};
