import { createClient } from "@libsql/client";
import { config } from "dotenv";
config({ path: ".env.local" });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

await db.execute("DELETE FROM settings");
await db.execute({
  sql: `INSERT INTO settings
          (id, shop_name, address, phone, logo, currency, default_tax_rate,
           show_discount, show_tax, show_tip, show_logo,
           enable_qr, qr_image, qr_text, show_signature, signature)
        VALUES (1, ?, ?, ?, NULL, 'VND', 0, 1, 1, 1, 1, 0, NULL, '', 0, NULL)`,
  args: [
    "Tiệm Nail Xinh",
    "123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh",
    "0909 123 456",
  ],
});

const r = await db.execute("SELECT * FROM settings");
console.log("Settings reset về mặc định:");
console.log(r.rows[0]);
process.exit(0);
