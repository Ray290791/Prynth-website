/**
 * Cloudflare R2 object storage integration for custom 3D model files.
 * Streams files directly into and out of Cloudflare R2 to avoid base64 storage
 * in Postgres and excessive Worker memory consumption.
 */

export interface R2BucketLike {
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob,
    options?: {
      httpMetadata?: {
        contentType?: string;
        contentDisposition?: string;
      };
      customMetadata?: Record<string, string>;
    }
  ): Promise<any>;
  get(key: string): Promise<{
    body: ReadableStream;
    size: number;
    httpMetadata?: {
      contentType?: string;
      contentDisposition?: string;
    };
  } | null>;
  delete(keys: string | string[]): Promise<void>;
  head(key: string): Promise<any | null>;
}

/**
 * Retrieves the R2 bucket binding from Cloudflare Workers environment.
 */
export function getR2Bucket(): R2BucketLike | null {
  const g = globalThis as any;
  if (g.CUSTOM_MODELS_BUCKET && typeof g.CUSTOM_MODELS_BUCKET.put === "function") {
    return g.CUSTOM_MODELS_BUCKET;
  }
  if (g.__env__?.CUSTOM_MODELS_BUCKET && typeof g.__env__.CUSTOM_MODELS_BUCKET.put === "function") {
    return g.__env__.CUSTOM_MODELS_BUCKET;
  }
  if (typeof process !== "undefined" && (process.env as any)?.CUSTOM_MODELS_BUCKET) {
    const bucket = (process.env as any).CUSTOM_MODELS_BUCKET;
    if (typeof bucket.put === "function") return bucket;
  }
  return null;
}

export function isR2Configured(): boolean {
  return getR2Bucket() !== null;
}

/**
 * Uploads a custom 3D model buffer to Cloudflare R2.
 */
export async function uploadModelToR2(
  key: string,
  data: Uint8Array | ArrayBuffer,
  contentType = "application/octet-stream",
  fileName?: string
): Promise<{ key: string } | null> {
  const bucket = getR2Bucket();
  if (!bucket) {
    return null;
  }

  await bucket.put(key, data, {
    httpMetadata: {
      contentType,
      contentDisposition: fileName
        ? `inline; filename="${encodeURIComponent(fileName)}"`
        : undefined,
    },
  });

  return { key };
}

/**
 * Retrieves a custom 3D model stream directly from Cloudflare R2.
 */
export async function getModelFromR2(key: string) {
  const bucket = getR2Bucket();
  if (!bucket) {
    return null;
  }

  return await bucket.get(key);
}

/**
 * Deletes a custom 3D model object from Cloudflare R2.
 */
export async function deleteModelFromR2(key: string): Promise<boolean> {
  const bucket = getR2Bucket();
  if (!bucket) {
    return false;
  }

  try {
    await bucket.delete(key);
    return true;
  } catch (err) {
    console.warn(`[R2] Failed to delete object ${key}:`, err);
    return false;
  }
}
