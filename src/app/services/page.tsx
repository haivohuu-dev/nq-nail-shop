"use client";
import { useEffect, useState, useCallback } from "react";
import { formatVND } from "@/lib/format";

type Category = { id: number; name: string };
type Service = { id: number; categoryId: number; name: string; price: number; active: boolean };

export default function ServicesPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [svcs, setSvcs] = useState<Service[]>([]);
  const [newCat, setNewCat] = useState("");
  const [form, setForm] = useState({ categoryId: 0, name: "", price: 0 });

  const load = useCallback(async () => {
    const [c, s] = await Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/services").then((r) => r.json()),
    ]);
    setCats(c); setSvcs(s);
    if (c.length && !form.categoryId) setForm((f) => ({ ...f, categoryId: c[0].id }));
  }, [form.categoryId]);

  useEffect(() => { load(); }, [load]);

  async function addCategory() {
    if (!newCat.trim()) return;
    await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCat }) });
    setNewCat(""); load();
  }

  async function deleteCategory(id: number) {
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (!res.ok) { const e = await res.json(); alert(e.error); return; }
    load();
  }

  async function addService() {
    if (!form.name.trim() || !form.categoryId) return;
    await fetch("/api/services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setForm({ ...form, name: "", price: 0 }); load();
  }

  async function deleteService(id: number) {
    await fetch(`/api/services/${id}`, { method: "DELETE" }); load();
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Danh mục & dịch vụ</h1>

      <section className="space-y-2">
        <h2 className="font-semibold">Thêm danh mục</h2>
        <div className="flex gap-2">
          <input className="rounded border p-2" placeholder="Tên danh mục" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
          <button onClick={addCategory} className="rounded bg-blue-600 px-4 text-white">Thêm</button>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Thêm dịch vụ</h2>
        <div className="flex flex-wrap gap-2">
          <select className="rounded border p-2" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className="rounded border p-2" placeholder="Tên dịch vụ" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input type="number" className="w-32 rounded border p-2" placeholder="Giá" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          <button onClick={addService} className="rounded bg-blue-600 px-4 text-white">Thêm</button>
        </div>
      </section>

      {cats.map((c) => (
        <section key={c.id} className="space-y-1">
          <div className="flex items-center justify-between border-b pb-1">
            <h3 className="font-semibold">{c.name}</h3>
            <button onClick={() => deleteCategory(c.id)} className="text-sm text-red-600">Xóa danh mục</button>
          </div>
          <ul>
            {svcs.filter((s) => s.categoryId === c.id).map((s) => (
              <li key={s.id} className="flex items-center justify-between py-1">
                <span>{s.name} — {formatVND(s.price)}</span>
                <button onClick={() => deleteService(s.id)} className="text-sm text-red-600">Xóa</button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
