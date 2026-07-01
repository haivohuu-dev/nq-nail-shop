import { sql } from "drizzle-orm";
import { db, invoices } from "@/db";

// Sinh mã YYYYMMDD-NNN, NNN = số thứ tự trong ngày (theo giờ local server)
export async function generateInvoiceNumber(): Promise<string> {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const prefix = `${y}${m}${d}`;

  const rows = await db
    .select({ n: sql<number>`count(*)` })
    .from(invoices)
    .where(sql`${invoices.invoiceNumber} like ${prefix + "-%"}`);

  const seq = (rows[0]?.n ?? 0) + 1;
  return `${prefix}-${String(seq).padStart(3, "0")}`;
}
