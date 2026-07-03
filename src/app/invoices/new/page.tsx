"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { computeInvoice } from "@/lib/calc";
import { formatVND } from "@/lib/format";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import { Label, TextInput, TextArea, SelectMenu, MoneyInput } from "@/components/form/Field";

type Category = { id: number; name: string };
type Service = { id: number; categoryId: number; name: string; price: number; active: boolean };
type CartLine = { serviceId: number | null; nameSnapshot: string; priceSnapshot: number; qty: number };

export default function NewInvoicePage() {
  const router = useRouter();
  const [cats, setCats] = useState<Category[]>([]);
  const [svcs, setSvcs] = useState<Service[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("fixed");
  const [discountValue, setDiscountValue] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [tipAmount, setTipAmount] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/services").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]).then(([c, s, st]) => { setCats(c); setSvcs(s); setTaxRate(st.defaultTaxRate ?? 0); });
  }, []);

  function addToCart(s: Service) {
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.serviceId === s.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], qty: next[idx].qty + 1 }; return next; }
      return [...prev, { serviceId: s.id, nameSnapshot: s.name, priceSnapshot: s.price, qty: 1 }];
    });
  }
  function setQty(i: number, qty: number) {
    setCart((prev) => prev.map((l, idx) => idx === i ? { ...l, qty: Math.max(0, qty) } : l));
  }
  function removeLine(i: number) { setCart((prev) => prev.filter((_, idx) => idx !== i)); }

  const calc = useMemo(() => computeInvoice({
    items: cart.map((l) => ({ priceSnapshot: l.priceSnapshot, qty: l.qty })),
    discountType, discountValue, taxRate, tipAmount,
  }), [cart, discountType, discountValue, taxRate, tipAmount]);

  async function save() {
    if (!cart.length) { alert("Chưa chọn dịch vụ nào"); return; }
    setSaving(true);
    const res = await fetch("/api/invoices", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerName, customerPhone, discountType, discountValue, taxRate, tipAmount, note, items: cart.map((l) => ({ ...l, qty: Math.max(1, l.qty) })) }),
    });
    setSaving(false);
    if (!res.ok) { const e = await res.json(); alert(JSON.stringify(e.error)); return; }
    const inv = await res.json();
    router.push(`/invoices/${inv.id}`);
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Tạo hóa đơn" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Chọn dịch vụ */}
        <div className="lg:col-span-3">
          <ComponentCard title="Chọn dịch vụ" desc="Bấm để thêm dịch vụ vào hóa đơn">
            {!cats.length && <p className="text-sm text-gray-400">Đang tải…</p>}
            {cats.map((c) => {
              const list = svcs.filter((s) => s.categoryId === c.id && s.active);
              if (!list.length) return null;
              return (
                <div key={c.id}>
                  <h4 className="mb-3 text-sm font-medium text-gray-800 dark:text-white/90">{c.name}</h4>
                  <div className="flex flex-wrap gap-2">
                    {list.map((s) => {
                      const line = cart.find((l) => l.serviceId === s.id);
                      const selected = !!line;
                      return (
                        <button
                          key={s.id}
                          onClick={() => addToCart(s)}
                          className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium shadow-theme-xs transition ${
                            selected
                              ? "border-brand-500 bg-brand-500 text-white hover:bg-brand-600"
                              : "border-gray-300 bg-white text-gray-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                          }`}
                        >
                          {selected && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/25 px-1 text-xs">{line.qty}</span>
                          )}
                          <span>{s.name}</span>
                          <span className={selected ? "text-white/70" : "text-gray-400 dark:text-gray-500"}>{formatVND(s.price)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </ComponentCard>
        </div>

        {/* Tóm tắt hóa đơn */}
        <div className="lg:col-span-2">
          <ComponentCard title="Hóa đơn">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="cName">Tên khách</Label>
                <TextInput id="cName" placeholder="Tên khách" value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="cPhone">SĐT khách</Label>
                <TextInput id="cPhone" placeholder="SĐT khách" value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)} />
              </div>
            </div>

            {/* Giỏ dịch vụ */}
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="px-3 py-2.5 text-center text-theme-xs font-medium text-gray-700 dark:text-gray-400 w-10">#</th>
                    <th className="px-3 py-2.5 text-left text-theme-xs font-medium text-gray-700 dark:text-gray-400">Dịch vụ</th>
                    <th className="px-3 py-2.5 text-center text-theme-xs font-medium text-gray-700 dark:text-gray-400">SL</th>
                    <th className="px-3 py-2.5 text-right text-theme-xs font-medium text-gray-700 dark:text-gray-400">Thành tiền</th>
                    <th className="px-3 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {cart.map((l, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-center text-sm text-gray-500 dark:text-gray-500">{i + 1}</td>
                      <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-400">{l.nameSnapshot}</td>
                      <td className="px-3 py-2 text-center">
                        <input type="number" min={1} value={l.qty === 0 ? "" : l.qty}
                          onChange={(e) => setQty(i, e.target.value === "" ? 0 : Number(e.target.value))}
                          onBlur={(e) => { if (e.target.value === "" || Number(e.target.value) < 1) setQty(i, 1); }}
                          className="h-9 w-16 rounded-lg border border-gray-300 bg-transparent px-2 text-center text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-medium text-gray-700 dark:text-gray-400">{formatVND(l.priceSnapshot * l.qty)}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => removeLine(i)} className="text-error-500 hover:text-error-600" aria-label="Xóa dòng">×</button>
                      </td>
                    </tr>
                  ))}
                  {!cart.length && (
                    <tr><td colSpan={5} className="px-3 py-4 text-center text-sm text-gray-400">Chưa chọn dịch vụ</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Giảm giá / thuế / tip */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="discType">Loại giảm giá</Label>
                <SelectMenu id="discType" value={discountType}
                  onChange={(v) => { setDiscountType(v as "percent" | "fixed"); setDiscountValue(0); }}
                  options={[{ value: "fixed", label: "Giảm (đồng)" }, { value: "percent", label: "Giảm (%)" }]} />
              </div>
              <div>
                <Label htmlFor="discVal">{discountType === "percent" ? "Giá trị giảm (%)" : "Giá trị giảm (VNĐ)"}</Label>
                {discountType === "percent" ? (
                  <TextInput id="discVal" type="number" min={0} max={100} value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))} />
                ) : (
                  <MoneyInput id="discVal" placeholder="0" value={discountValue}
                    onValueChange={setDiscountValue} />
                )}
              </div>
              <div>
                <Label htmlFor="tax">Thuế (%)</Label>
                <TextInput id="tax" type="number" min={0} max={100} value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))} />
              </div>
              <div>
                <Label htmlFor="tip">Tip (VNĐ)</Label>
                <MoneyInput id="tip" placeholder="0" value={tipAmount}
                  onValueChange={setTipAmount} />
              </div>
            </div>

            <div>
              <Label htmlFor="note">Ghi chú</Label>
              <TextArea id="note" placeholder="Ghi chú" value={note}
                onChange={(e) => setNote(e.target.value)} />
            </div>

            {/* Tổng kết */}
            <div className="space-y-2 border-t border-gray-200 pt-4 text-sm dark:border-gray-800">
              <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Tạm tính (VNĐ)</span><span>{formatVND(calc.subtotal)}</span></div>
              <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Giảm giá (VNĐ)</span><span>-{formatVND(calc.discountAmount)}</span></div>
              <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Thuế (VNĐ)</span><span>{formatVND(calc.taxAmount)}</span></div>
              <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Tip (VNĐ)</span><span>{formatVND(tipAmount)}</span></div>
              <div className="flex justify-between text-lg font-bold text-gray-800 dark:text-white/90"><span>Tổng (VNĐ)</span><span>{formatVND(calc.total)}</span></div>
            </div>

            <Button onClick={save} disabled={saving} className="w-full">
              {saving ? "Đang lưu…" : "Lưu hóa đơn"}
            </Button>
          </ComponentCard>
        </div>
      </div>
    </div>
  );
}
