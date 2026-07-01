"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { computeInvoice } from "@/lib/calc";
import { formatVND } from "@/lib/format";

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
    setCart((prev) => prev.map((l, idx) => idx === i ? { ...l, qty: Math.max(1, qty) } : l));
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
      body: JSON.stringify({ customerName, customerPhone, discountType, discountValue, taxRate, tipAmount, note, items: cart }),
    });
    setSaving(false);
    if (!res.ok) { const e = await res.json(); alert(JSON.stringify(e.error)); return; }
    const inv = await res.json();
    router.push(`/invoices/${inv.id}`);
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Tạo hóa đơn</h1>
        {cats.map((c) => (
          <div key={c.id}>
            <h3 className="font-semibold">{c.name}</h3>
            <div className="flex flex-wrap gap-2">
              {svcs.filter((s) => s.categoryId === c.id && s.active).map((s) => (
                <button key={s.id} onClick={() => addToCart(s)} className="rounded border px-3 py-1 hover:bg-blue-50">
                  {s.name} · {formatVND(s.price)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded border bg-white p-4">
        <input className="w-full rounded border p-2" placeholder="Tên khách" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        <input className="w-full rounded border p-2" placeholder="SĐT khách" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />

        <table className="w-full text-sm">
          <tbody>
            {cart.map((l, i) => (
              <tr key={i} className="border-b">
                <td>{l.nameSnapshot}</td>
                <td><input type="number" className="w-14 rounded border p-1" value={l.qty} onChange={(e) => setQty(i, Number(e.target.value))} /></td>
                <td className="text-right">{formatVND(l.priceSnapshot * l.qty)}</td>
                <td><button onClick={() => removeLine(i)} className="text-red-600">×</button></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex gap-2">
          <select className="rounded border p-2" value={discountType} onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed")}>
            <option value="fixed">Giảm (đồng)</option>
            <option value="percent">Giảm (%, phần nghìn)</option>
          </select>
          <input type="number" className="w-full rounded border p-2" placeholder="Giá trị giảm" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} />
        </div>
        <label className="block text-sm">Thuế (phần nghìn, 85=8.5%)
          <input type="number" className="w-full rounded border p-2" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
        </label>
        <label className="block text-sm">Tip (đồng)
          <input type="number" className="w-full rounded border p-2" value={tipAmount} onChange={(e) => setTipAmount(Number(e.target.value))} />
        </label>
        <textarea className="w-full rounded border p-2" placeholder="Ghi chú" value={note} onChange={(e) => setNote(e.target.value)} />

        <div className="space-y-1 border-t pt-2 text-sm">
          <div className="flex justify-between"><span>Tạm tính</span><span>{formatVND(calc.subtotal)}</span></div>
          <div className="flex justify-between"><span>Giảm giá</span><span>-{formatVND(calc.discountAmount)}</span></div>
          <div className="flex justify-between"><span>Thuế</span><span>{formatVND(calc.taxAmount)}</span></div>
          <div className="flex justify-between"><span>Tip</span><span>{formatVND(tipAmount)}</span></div>
          <div className="flex justify-between text-lg font-bold"><span>Tổng</span><span>{formatVND(calc.total)}</span></div>
        </div>

        <button onClick={save} disabled={saving} className="w-full rounded bg-green-600 py-2 text-white disabled:opacity-50">
          {saving ? "Đang lưu…" : "Lưu hóa đơn"}
        </button>
      </div>
    </div>
  );
}
