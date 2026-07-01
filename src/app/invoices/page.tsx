import Link from "next/link";
import { db, invoices } from "@/db";
import { desc } from "drizzle-orm";
import { formatVND, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const rows = await db.select().from(invoices).orderBy(desc(invoices.id));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hóa đơn</h1>
        <Link href="/invoices/new" className="rounded bg-green-600 px-4 py-2 text-white">+ Tạo hóa đơn</Link>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left"><th className="py-2">Mã</th><th>Khách</th><th>Ngày</th><th className="text-right">Tổng</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b hover:bg-gray-50">
              <td className="py-2"><Link href={`/invoices/${r.id}`} className="text-blue-600">{r.invoiceNumber}</Link></td>
              <td>{r.customerName || "—"}</td>
              <td>{formatDate(r.createdAt)}</td>
              <td className="text-right">{formatVND(r.total)}</td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={4} className="py-4 text-gray-500">Chưa có hóa đơn nào</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
