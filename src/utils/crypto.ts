/**
 * Cryptographic utilities for encrypting sensitive data at rest.
 *
 * Uses AES-256-GCM for authenticated encryption:
 * - AES-256: Strong symmetric encryption
 * - GCM mode: Provides both confidentiality and authenticity
 * - 96-bit IV: Generated fresh for each encryption
 *
 * The encryption key should be a 32-byte (256-bit) key stored in environment variables.
 * You can generate one with: `openssl rand -base64 32`
 */

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits, recommended for GCM
const TAG_LENGTH = 128; // 128-bit authentication tag

/**
 * Represents encrypted data with the IV needed for decryption.
 * The IV is not secret and can be stored alongside the ciphertext.
 */
export interface EncryptedData {
  /** Base64-encoded ciphertext (includes auth tag) */
  ciphertext: string;
  /** Base64-encoded initialization vector */
  iv: string;
  /** Algorithm identifier for future compatibility */
  algorithm: "AES-256-GCM";
  /** Version for schema migrations */
  version: 1;
}

/**
 * Converts a Uint8Array to an ArrayBuffer (not ArrayBufferLike).
 * This ensures compatibility with Web Crypto API which doesn't accept SharedArrayBuffer.
 */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  // Create a new ArrayBuffer and copy the bytes to ensure we don't have a SharedArrayBuffer
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

/**
 * Derives a CryptoKey from a base64-encoded key string.
 * The key must be exactly 32 bytes (256 bits) when decoded.
 */
async function deriveKey(base64Key: string): Promise<CryptoKey> {
  const keyBytes = base64ToBytes(base64Key);

  if (keyBytes.length !== 32) {
    throw new Error(
      `Invalid encryption key length: expected 32 bytes, got ${keyBytes.length}. ` +
        `Generate a valid key with: openssl rand -base64 32`
    );
  }

  return await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(keyBytes),
    { name: ALGORITHM, length: KEY_LENGTH },
    false, // not extractable
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 *
 * @param plaintext - The string to encrypt
 * @param base64Key - Base64-encoded 32-byte encryption key
 * @returns Encrypted data object containing ciphertext and IV
 *
 * @example
 * ```ts
 * const encrypted = await encrypt("ghp_secret_token", env.TOKEN_ENCRYPTION_KEY);
 * // Store encrypted in database
 * await kv.set(key, encrypted);
 * ```
 */
export async function encrypt(plaintext: string, base64Key: string): Promise<EncryptedData> {
  const key = await deriveKey(base64Key);

  // Generate a random IV for each encryption
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Encode plaintext to bytes
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(plaintext);

  // Encrypt
  const ciphertextBytes = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: toArrayBuffer(iv),
      tagLength: TAG_LENGTH,
    },
    key,
    toArrayBuffer(plaintextBytes)
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertextBytes)),
    iv: bytesToBase64(iv),
    algorithm: "AES-256-GCM",
    version: 1,
  };
}

/**
 * Decrypts data that was encrypted with `encrypt()`.
 *
 * @param data - The encrypted data object
 * @param base64Key - Base64-encoded 32-byte encryption key (same key used for encryption)
 * @returns The original plaintext string
 * @throws Error if decryption fails (wrong key, corrupted data, or tampering detected)
 *
 * @example
 * ```ts
 * const encrypted = await kv.get<EncryptedData>(key);
 * const token = await decrypt(encrypted.value, env.TOKEN_ENCRYPTION_KEY);
 * ```
 */
export async function decrypt(data: EncryptedData, base64Key: string): Promise<string> {
  if (data.algorithm !== "AES-256-GCM" || data.version !== 1) {
    throw new Error(`Unsupported encryption format: ${data.algorithm} v${data.version}`);
  }

  const key = await deriveKey(base64Key);
  const iv = base64ToBytes(data.iv);
  const ciphertext = base64ToBytes(data.ciphertext);

  try {
    const plaintextBytes = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: toArrayBuffer(iv),
        tagLength: TAG_LENGTH,
      },
      key,
      toArrayBuffer(ciphertext)
    );

    const decoder = new TextDecoder();
    return decoder.decode(plaintextBytes);
  } catch {
    // GCM will throw if authentication fails (tampering or wrong key)
    throw new Error(
      "Decryption failed: the data may be corrupted, tampered with, or the encryption key is incorrect"
    );
  }
}

/**
 * Checks if the given data looks like an encrypted token record.
 * Used to detect and migrate unencrypted legacy tokens.
 */
export function isEncryptedData(data: unknown): data is EncryptedData {
  if (!data || typeof data !== "object") {
    return false;
  }

  const candidate = data as Record<string, unknown>;
  return (
    typeof candidate.ciphertext === "string" &&
    typeof candidate.iv === "string" &&
    candidate.algorithm === "AES-256-GCM" &&
    candidate.version === 1
  );
}

/**
 * Generates a cryptographically secure encryption key.
 * Returns a base64-encoded 32-byte key suitable for AES-256.
 *
 * @example
 * ```ts
 * const key = await generateEncryptionKey();
 * console.log(key); // Use this as TOKEN_ENCRYPTION_KEY
 * ```
 */
export async function generateEncryptionKey(): Promise<string> {
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToBase64(keyBytes);
}

// ─────────────────────────────────────────────────────────────────────────────
// Base64 utilities (compatible with both Deno and Cloudflare Workers)
// ─────────────────────────────────────────────────────────────────────────────

function bytesToBase64(bytes: Uint8Array): string {
  // Use btoa in browser-like environments (Cloudflare Workers, Deno)
  const binary = Array.from(bytes)
    .map((byte) => String.fromCharCode(byte))
    .join("");
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
