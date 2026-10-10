import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
function key(): Buffer {
  const value = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!value || !/^[0-9a-f]{64}$/i.test(value))
    throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY must be a 32-byte hex key.");
  return Buffer.from(value, "hex");
}
export function encryptGoogleSecret(value: string, context: string): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), nonce);
  cipher.setAAD(Buffer.from(context));
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    nonce.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}
export function decryptGoogleSecret(value: string, context: string): string {
  const [version, nonce, tag, ciphertext, ...extra] = value.split(".");
  if (version !== "v1" || !nonce || !tag || !ciphertext || extra.length)
    throw new Error("Invalid encrypted Google credential.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(nonce, "base64url"),
  );
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
