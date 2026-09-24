/**
 * In-memory client-side cache for uploaded File objects.
 * Allows editing a custom order from the cart to instantly restore the 3D model
 * into the Three.js viewport without having to re-upload or re-download.
 */

const fileCache = new Map<string, File>();

export function setCachedModelFile(key: string, file: File): void {
  if (!key || !file) return;
  fileCache.set(key, file);
}

export function getCachedModelFile(key: string): File | undefined {
  if (!key) return undefined;
  return fileCache.get(key);
}

export function removeCachedModelFile(key: string): void {
  if (!key) return;
  fileCache.delete(key);
}
