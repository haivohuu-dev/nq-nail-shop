// Seed dữ liệu mẫu tiếng Việt cho tiệm nail.
// Chạy: npm run db:seed  (đọc file UTF-8 nên tiếng Việt không bị hỏng encoding)
import { createClient } from "@libsql/client";
import { config } from "dotenv";
config({ path: ".env.local" });

const url = process.env.TURSO_DATABASE_URL || "file:local.db";
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;
const db = createClient({ url, authToken });

async function run() {
  // Xoá sạch theo thứ tự khoá ngoại
  await db.batch(
    [
      "DELETE FROM invoice_items",
      "DELETE FROM invoices",
      "DELETE FROM services",
      "DELETE FROM categories",
      "DELETE FROM settings",
      "DELETE FROM sqlite_sequence",
    ],
    "write"
  );

  // Cài đặt tiệm
  await db.execute({
    sql: `INSERT INTO settings (id, shop_name, address, phone, logo, currency, default_tax_rate)
          VALUES (1, ?, ?, ?, NULL, 'VND', 0)`,
    args: [
      "Tiệm Nail Xinh",
      "123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh",
      "0909 123 456",
    ],
  });

  // Danh mục
  const categories = [
    "Sơn gel",
    "Chăm sóc móng",
    "Nối móng",
    "Vẽ nghệ thuật",
  ];
  const catIds = {};
  for (let i = 0; i < categories.length; i++) {
    const r = await db.execute({
      sql: `INSERT INTO categories (name, sort_order) VALUES (?, ?)`,
      args: [categories[i], i],
    });
    catIds[categories[i]] = Number(r.lastInsertRowid);
  }

  // Dịch vụ: [danh mục, tên, giá (đồng)]
  const services = [
    ["Sơn gel", "Sơn gel tay", 200000],
    ["Sơn gel", "Sơn gel chân", 250000],
    ["Sơn gel", "Sơn thường", 100000],
    ["Chăm sóc móng", "Cắt da tay", 80000],
    ["Chăm sóc móng", "Cắt da chân", 100000],
    ["Chăm sóc móng", "Dưỡng móng", 120000],
    ["Nối móng", "Nối móng bột", 350000],
    ["Nối móng", "Nối móng gel", 400000],
    ["Nối móng", "Tháo móng", 80000],
    ["Vẽ nghệ thuật", "Vẽ hoa", 50000],
    ["Vẽ nghệ thuật", "Đính đá", 30000],
    ["Vẽ nghệ thuật", "Ombre", 150000],
  ];
  const svcIds = {};
  let order = 0;
  for (const [cat, name, price] of services) {
    const r = await db.execute({
      sql: `INSERT INTO services (category_id, name, price, active, sort_order)
            VALUES (?, ?, ?, 1, ?)`,
      args: [catIds[cat], name, price, order++],
    });
    svcIds[name] = { id: Number(r.lastInsertRowid), price };
  }

  // Hoá đơn mẫu
  const sampleInvoices = [
    {
      number: "20260701-001",
      customer: "Nguyễn Thị Hương",
      phone: "0912 345 678",
      note: "Khách quen",
      createdAt: "2026-07-01 09:15:00",
      items: [
        ["Sơn gel tay", 1],
        ["Vẽ hoa", 2],
      ],
    },
    {
      number: "20260701-002",
      customer: "Trần Mỹ Linh",
      phone: "0987 654 321",
      note: "Ưu đãi khai trương",
      createdAt: "2026-07-01 14:30:00",
      items: [
        ["Nối móng gel", 1],
        ["Đính đá", 1],
      ],
    },
  ];

  for (const inv of sampleInvoices) {
    let subtotal = 0;
    const rows = inv.items.map(([name, qty]) => {
      const s = svcIds[name];
      subtotal += s.price * qty;
      return { serviceId: s.id, name, price: s.price, qty };
    });
    const total = subtotal; // không giảm giá / thuế / tip trong mẫu
    const r = await db.execute({
      sql: `INSERT INTO invoices
              (invoice_number, customer_name, customer_phone, subtotal,
               discount_type, discount_value, discount_amount,
               tax_rate, tax_amount, tip_amount, total, note, created_at)
            VALUES (?, ?, ?, ?, 'fixed', 0, 0, 0, 0, 0, ?, ?, ?)`,
      args: [inv.number, inv.customer, inv.phone, subtotal, total, inv.note, inv.createdAt],
    });
    const invId = Number(r.lastInsertRowid);
    for (const it of rows) {
      await db.execute({
        sql: `INSERT INTO invoice_items (invoice_id, service_id, name_snapshot, price_snapshot, qty)
              VALUES (?, ?, ?, ?, ?)`,
        args: [invId, it.serviceId, it.name, it.price, it.qty],
      });
    }
  }

  console.log("Seed xong:");
  console.log(`  - ${categories.length} danh mục`);
  console.log(`  - ${services.length} dịch vụ`);
  console.log(`  - ${sampleInvoices.length} hoá đơn mẫu`);
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
