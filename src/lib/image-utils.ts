/**
 * Compresses an image data URL to a lightweight JPEG in the browser.
 * Keeps resolution bounded to maxDim (e.g. 600px) and quality to ~0.82,
 * resulting in ~30-45 KB data URLs that don't blow up database storage
 * while preserving high fidelity for 3D lithophane mesh generation.
 */
export async function compressImageDataUrl(
  dataUrl: string,
  maxDim = 600,
  quality = 0.82
): Promise<string> {
  // If not an image data URL or already very small (< 80 KB chars), return as is
  if (!dataUrl || !dataUrl.startsWith("data:image/") || dataUrl.length < 80000) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
