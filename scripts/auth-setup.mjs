// Tạo bảng users + sessions và seed 1 tài khoản admin.
// Chạy: npm run db:auth
import { createClient } from "@libsql/client";
import { config } from "dotenv";
config({ path: ".env.local" });
import { scryptSync, randomBytes } from "crypto";

const url = process.env.TURSO_DATABASE_URL || "file:local.db";
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;
const db = createClient({ url, authToken });

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const ADMIN_EMAIL = "admin@nail.local";
const ADMIN_PASSWORD = "admin123";
const ADMIN_NAME = "Quản trị viên";

async function run() {
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL DEFAULT '',
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        token TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    ],
    "write"
  );

  const existing = await db.execute({
    sql: "SELECT id FROM users WHERE email = ?",
    args: [ADMIN_EMAIL],
  });

  if (existing.rows.length) {
    console.log(`Tài khoản admin đã tồn tại: ${ADMIN_EMAIL}`);
  } else {
    await db.execute({
      sql: "INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)",
      args: [ADMIN_EMAIL, ADMIN_NAME, hashPassword(ADMIN_PASSWORD)],
    });
    console.log("Đã tạo bảng users/sessions + tài khoản admin:");
    console.log(`  Email:    ${ADMIN_EMAIL}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);
  }
}

run()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
