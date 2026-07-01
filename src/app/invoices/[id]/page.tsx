"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatVND, formatDate } from "@/lib/format";

type Invoice = {
  id: number; invoiceNumber: string; customerName: string; customerPhone: string;
  subtotal: number; discountAmount: number; taxAmount: number; tipAmount: number;
  total: number; note: string; createdAt: string;
};
type Item = { id: number; nameSnapshot: string; priceSnapshot: number; qty: number };

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<{ invoice: Invoice; items: Item[] } | null>(null);

  useEffect(() => { fetch(`/api/invoices/${id}`).then((r) => r.json()).then(setData); }, [id]);
  if (!data) return <p>Đang tải…</p>;
  const { invoice, items } = data;

  async function remove() {
    if (!confirm("Xóa hóa đơn này?")) return;
    await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    router.push("/invoices");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hóa đơn {invoice.invoiceNumber}</h1>
        <div className="flex gap-2">
          <a href={`/api/invoices/${id}/pdf`} target="_blank" className="rounded bg-blue-600 px-4 py-2 text-white">Tải PDF</a>
          <button onClick={remove} className="rounded bg-red-600 px-4 py-2 text-white">Xóa</button>
        </div>
      </div>
      <p className="text-sm text-gray-600">{formatDate(invoice.createdAt)} · {invoice.customerName || "—"} · {invoice.customerPhone}</p>

      <table className="w-full text-sm">
        <thead><tr className="border-b text-left"><th className="py-2">Dịch vụ</th><th>SL</th><th className="text-right">Thành tiền</th></tr></thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="border-b">
              <td className="py-1">{it.nameSnapshot}</td>
              <td>{it.qty}</td>
              <td className="text-right">{formatVND(it.priceSnapshot * it.qty)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto max-w-xs space-y-1 text-sm">
        <div className="flex justify-between"><span>Tạm tính</span><span>{formatVND(invoice.subtotal)}</span></div>
        <div className="flex justify-between"><span>Giảm giá</span><span>-{formatVND(invoice.discountAmount)}</span></div>
        <div className="flex justify-between"><span>Thuế</span><span>{formatVND(invoice.taxAmount)}</span></div>
        <div className="flex justify-between"><span>Tip</span><span>{formatVND(invoice.tipAmount)}</span></div>
        <div className="flex justify-between text-lg font-bold"><span>Tổng</span><span>{formatVND(invoice.total)}</span></div>
      </div>
      {invoice.note && <p className="text-sm text-gray-600">Ghi chú: {invoice.note}</p>}
    </div>
  );
}
