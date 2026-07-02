import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

// Băm mật khẩu bằng scrypt (node built-in, không cần thư viện ngoài).
// Định dạng lưu: "<salt hex>:<hash hex>"
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = scryptSync(password, salt, 64);
  const orig = Buffer.from(hash, "hex");
  return orig.length === test.length && timingSafeEqual(orig, test);
}

// Token phiên: chuỗi ngẫu nhiên lưu trong bảng sessions.
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}
