/**
 * Server-only cryptographic utilities.
 * Uses Web Crypto API (supported natively across Node.js, Cloudflare Workers, and modern runtimes).
 */

const ENCRYPTION_ALGORITHM = "AES-GCM";
const IV_LENGTH = 12; // 96-bit IV recommended for AES-GCM

function getMasterKey(): string {
  const key =
    (typeof process !== "undefined" ? process.env.ENCRYPTION_KEY || process.env.BETTER_AUTH_SECRET : undefined) ||
    (globalThis as any).__env__?.ENCRYPTION_KEY ||
    (globalThis as any).__env__?.BETTER_AUTH_SECRET ||
    "prynth-default-master-key-32-chars-ok!";
  return key.padEnd(32, "0").slice(0, 32);
}

async function getCryptoKey(usage: KeyUsage[]): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const rawKey = enc.encode(getMasterKey());
  return await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: ENCRYPTION_ALGORITHM },
    false,
    usage
  );
}

/**
 * Encrypt sensitive plaintext string into a base64 encoded payload with IV.
 */
export async function encryptSensitiveData(plainText: string): Promise<string> {
  if (!plainText) return "";
  try {
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const key = await getCryptoKey(["encrypt"]);
    const cipherBuffer = await crypto.subtle.encrypt(
      { name: ENCRYPTION_ALGORITHM, iv },
      key,
      enc.encode(plainText)
    );

    // Combine IV (12 bytes) + Ciphertext + Tag
    const combined = new Uint8Array(iv.length + cipherBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(cipherBuffer), iv.length);

    // Return as base64 string
    return btoa(String.fromCharCode(...combined));
  } catch (err) {
    console.error("[encryptSensitiveData error]:", err);
    return plainText; // Fail safe to raw string if crypto fails
  }
}

/**
 * Decrypt base64 encoded ciphertext back to plaintext.
 */
export async function decryptSensitiveData(cipherBase64: string): Promise<string> {
  if (!cipherBase64) return "";
  try {
    const binary = atob(cipherBase64);
    const combined = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      combined[i] = binary.charCodeAt(i);
    }

    if (combined.length <= IV_LENGTH) {
      return cipherBase64;
    }

    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);
    const key = await getCryptoKey(["decrypt"]);

    const decrypted = await crypto.subtle.decrypt(
      { name: ENCRYPTION_ALGORITHM, iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch (_err) {
    // If not encrypted or invalid key, return as-is
    return cipherBase64;
  }
}

/**
 * Hash string with SHA-256 for deterministic indexing/lookups without exposing plaintext.
 */
export async function hashIdentifier(value: string): Promise<string> {
  const enc = new TextEncoder();
  const buffer = await crypto.subtle.digest("SHA-256", enc.encode(value.trim().toLowerCase()));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
