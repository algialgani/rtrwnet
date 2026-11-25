import crypto from "crypto";

// ============ Enkripsi kredensial ============
// Password router & API key WA/payment gateway TIDAK boleh plaintext di DB.
// AES-256-GCM dengan key dari env ENCRYPTION_KEY (hex 64 char).
const KEY = process.env.ENCRYPTION_KEY
  ? Buffer.from(process.env.ENCRYPTION_KEY, "hex")
  : crypto.createHash("sha256").update("dev-only-insecure-key").digest();

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, enc].map((b) => b.toString("base64")).join(".");
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, encB64] = payload.split(".");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    KEY,
    Buffer.from(ivB64, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

// ============ Token verifikasi (email/reset) ============
// Token asli dikirim via email; DB hanya menyimpan SHA-256 hash-nya.
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function randomToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Kode voucher acak yang mudah dibaca (tanpa karakter ambigu)
const VCODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function voucherCode(len = 6): string {
  let out = "";
  for (let i = 0; i < len; i++)
    out += VCODE_CHARS[crypto.randomInt(VCODE_CHARS.length)];
  return out;
}
