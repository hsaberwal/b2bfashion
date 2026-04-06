/**
 * AES-256-GCM encryption for sensitive data at rest.
 * Used to encrypt digital signatures stored in the database.
 *
 * Requires ENCRYPTION_KEY env var (32-byte hex string, 64 chars).
 * Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer | null {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) return null;
  return Buffer.from(hex, "hex");
}

export function isEncryptionConfigured(): boolean {
  return getKey() !== null;
}

/**
 * Encrypt a string. Returns "enc:<iv>:<tag>:<ciphertext>" (all hex).
 * If encryption is not configured, returns the plaintext as-is.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  if (!key) return plaintext;

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `enc:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt a string. Expects "enc:<iv>:<tag>:<ciphertext>" format.
 * If the value doesn't start with "enc:", returns it as-is (plaintext/legacy).
 */
export function decrypt(value: string): string {
  if (!value.startsWith("enc:")) return value;

  const key = getKey();
  if (!key) return value; // Can't decrypt without key — return encrypted value

  const parts = value.split(":");
  if (parts.length !== 4) return value;

  const iv = Buffer.from(parts[1], "hex");
  const tag = Buffer.from(parts[2], "hex");
  const ciphertext = Buffer.from(parts[3], "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return decrypted.toString("utf8");
}
