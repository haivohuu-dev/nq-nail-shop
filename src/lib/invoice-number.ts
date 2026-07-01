import { sql } from "drizzle-orm";
import { db, invoices } from "@/db";

type Executor = Pick<typeof db, "select">;

// Sinh mã YYYYMMDD-NNN, NNN = max số thứ tự đã dùng trong ngày + 1 (theo giờ local server).
// Dùng MAX(suffix) thay vì count(*) để mã không bị trùng sau khi xóa hóa đơn.
// Nhận executor (db hoặc tx) để sinh số trong cùng transaction với insert -> giảm race.
export async function generateInvoiceNumber(executor: Executor = db): Promise<string> {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const prefix = `${y}${m}${d}`;

  // invoice_number = "YYYYMMDD-NNN"; suffix bắt đầu ở vị trí 10 (sau 8 ký tự ngày + dấu '-')
  const rows = await executor
    .select({ m: sql<number>`coalesce(max(cast(substr(${invoices.invoiceNumber}, 10) as integer)), 0)` })
    .from(invoices)
    .where(sql`${invoices.invoiceNumber} like ${prefix + "-%"}`);

  const seq = (rows[0]?.m ?? 0) + 1;
  return `${prefix}-${String(seq).padStart(3, "0")}`;
}
