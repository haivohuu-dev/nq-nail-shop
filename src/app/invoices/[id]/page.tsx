"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatVND, formatDate } from "@/lib/format";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";

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

  async function remove() {
    if (!confirm("Xóa hóa đơn này?")) return;
    await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    router.push("/invoices");
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Chi tiết hóa đơn" />
      {!data ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Đang tải…</p>
      ) : (
        <div className="mx-auto max-w-3xl">
          <ComponentCard title={`Hóa đơn ${data.invoice.invoiceNumber}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 -mt-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatDate(data.invoice.createdAt)} · {data.invoice.customerName || "—"}
                {data.invoice.customerPhone ? ` · ${data.invoice.customerPhone}` : ""}
              </p>
              <div className="flex gap-2">
                <a href={`/api/invoices/${id}/pdf`} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline">Tải PDF</Button>
                </a>
                <Button size="sm" variant="outline" className="!text-error-500 !ring-error-300 hover:!bg-error-50 dark:!ring-error-500/30" onClick={remove}>
                  Xóa
                </Button>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="px-4 py-3 text-center text-theme-xs font-medium text-gray-700 dark:text-gray-400 w-10">#</th>
                    <th className="px-4 py-3 text-left text-theme-xs font-medium text-gray-700 dark:text-gray-400">Dịch vụ</th>
                    <th className="px-4 py-3 text-center text-theme-xs font-medium text-gray-700 dark:text-gray-400">SL</th>
                    <th className="px-4 py-3 text-right text-theme-xs font-medium text-gray-700 dark:text-gray-400">Thành tiền (VNĐ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {data.items.map((it, i) => (
                    <tr key={it.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                      <td className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-500">{i + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-400">{it.nameSnapshot}</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-400">{it.qty}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-400">{formatVND(it.priceSnapshot * it.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ml-auto w-full max-w-xs space-y-2 text-sm">
              <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Tạm tính (VNĐ)</span><span>{formatVND(data.invoice.subtotal)}</span></div>
              <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Giảm giá (VNĐ)</span><span>-{formatVND(data.invoice.discountAmount)}</span></div>
              <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Thuế (VNĐ)</span><span>{formatVND(data.invoice.taxAmount)}</span></div>
              <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Tip (VNĐ)</span><span>{formatVND(data.invoice.tipAmount)}</span></div>
              <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-bold text-gray-800 dark:border-gray-800 dark:text-white/90"><span>Tổng (VNĐ)</span><span>{formatVND(data.invoice.total)}</span></div>
            </div>

            {data.invoice.note && (
              <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600 dark:bg-white/[0.03] dark:text-gray-400">
                Ghi chú: {data.invoice.note}
              </p>
            )}
          </ComponentCard>
        </div>
      )}
    </div>
  );
}
