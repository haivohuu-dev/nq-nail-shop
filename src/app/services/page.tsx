"use client";
import { useEffect, useState, useCallback } from "react";
import { formatVND } from "@/lib/format";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import { Label, TextInput, SelectMenu, MoneyInput } from "@/components/form/Field";

type Category = { id: number; name: string };
type Service = { id: number; categoryId: number; name: string; price: number; active: boolean };

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M16.25 5.625L8.125 13.75L3.75 9.375" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
function IconBtn({ onClick, variant, label, children }: { onClick: () => void; variant: "primary" | "outline"; label: string; children: React.ReactNode }) {
  const style = variant === "primary"
    ? "bg-brand-500 text-white hover:bg-brand-600"
    : "border border-gray-300 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5";
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${style}`}>
      {children}
    </button>
  );
}

export default function ServicesPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [svcs, setSvcs] = useState<Service[]>([]);
  const [newCat, setNewCat] = useState("");
  const [form, setForm] = useState({ categoryId: 0, name: "", price: 0 });

  // Trạng thái chỉnh sửa inline
  const [editCat, setEditCat] = useState<{ id: number; name: string } | null>(null);
  const [editSvc, setEditSvc] = useState<{ id: number; categoryId: number; name: string; price: number } | null>(null);
  // Thêm dịch vụ inline theo từng danh mục
  const [addSvc, setAddSvc] = useState<{ categoryId: number; name: string; price: number } | null>(null);

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
    const c = cats.find((x) => x.id === id);
    if (!confirm(`Xóa danh mục "${c?.name ?? ""}"?`)) return;
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (!res.ok) { const e = await res.json(); alert(e.error); return; }
    load();
  }

  async function saveCategory() {
    if (!editCat || !editCat.name.trim()) return;
    const res = await fetch(`/api/categories/${editCat.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editCat.name }),
    });
    if (!res.ok) { const e = await res.json(); alert(JSON.stringify(e.error)); return; }
    setEditCat(null); load();
  }

  async function addService() {
    if (!form.name.trim() || !form.categoryId) return;
    await fetch("/api/services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setForm({ ...form, name: "", price: 0 }); load();
  }

  async function deleteService(id: number) {
    const svc = svcs.find((x) => x.id === id);
    if (!confirm(`Xóa dịch vụ "${svc?.name ?? ""}"?`)) return;
    await fetch(`/api/services/${id}`, { method: "DELETE" }); load();
  }

  async function saveService() {
    if (!editSvc || !editSvc.name.trim() || !editSvc.categoryId) return;
    const res = await fetch(`/api/services/${editSvc.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: editSvc.categoryId, name: editSvc.name, price: editSvc.price }),
    });
    if (!res.ok) { const e = await res.json(); alert(JSON.stringify(e.error)); return; }
    setEditSvc(null); load();
  }

  async function saveNewService() {
    if (!addSvc || !addSvc.name.trim() || !addSvc.categoryId) return;
    const res = await fetch("/api/services", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: addSvc.categoryId, name: addSvc.name, price: addSvc.price }),
    });
    if (!res.ok) { const e = await res.json(); alert(JSON.stringify(e.error)); return; }
    setAddSvc(null); load();
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Dịch vụ" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ComponentCard title="Thêm danh mục">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label htmlFor="newCat">Tên danh mục</Label>
              <TextInput id="newCat" placeholder="VD: Sơn gel" value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addCategory(); }} />
            </div>
            <Button onClick={addCategory}>Thêm</Button>
          </div>
        </ComponentCard>

        <ComponentCard title="Thêm dịch vụ">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="svcCat">Danh mục</Label>
              <SelectMenu id="svcCat" value={form.categoryId}
                onChange={(v) => setForm({ ...form, categoryId: Number(v) })}
                options={cats.map((c) => ({ value: c.id, label: c.name }))} />
            </div>
            <div>
              <Label htmlFor="svcName">Tên dịch vụ</Label>
              <TextInput id="svcName" placeholder="VD: Sơn gel tay" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="svcPrice">Giá (₫)</Label>
              <MoneyInput id="svcPrice" placeholder="0" value={form.price}
                onValueChange={(n) => setForm({ ...form, price: n })} />
            </div>
            <div className="flex items-end">
              <Button onClick={addService} className="w-full">Thêm dịch vụ</Button>
            </div>
          </div>
        </ComponentCard>
      </div>

      <div className="mt-6 space-y-6">
        {cats.map((c) => {
          const editingCat = editCat?.id === c.id;
          const list = svcs.filter((s) => s.categoryId === c.id);
          return (
            <ComponentCard key={c.id} title={editingCat ? "Sửa danh mục" : c.name} headerClassName="bg-gray-50 dark:bg-white/[0.02] rounded-t-2xl">
              <div className="flex items-center justify-between gap-3 -mt-2">
                {editingCat ? (
                  <div className="flex flex-1 items-center gap-2">
                    <TextInput
                      value={editCat.name}
                      onChange={(e) => setEditCat({ ...editCat, name: e.target.value })}
                      onKeyDown={(e) => { if (e.key === "Enter") saveCategory(); if (e.key === "Escape") setEditCat(null); }}
                      autoFocus
                    />
                    <IconBtn variant="primary" label="Lưu" onClick={saveCategory}><CheckIcon /></IconBtn>
                    <IconBtn variant="outline" label="Hủy" onClick={() => setEditCat(null)}><XIcon /></IconBtn>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{list.length} dịch vụ</p>
                    <div className="flex gap-3">
                      <button onClick={() => setAddSvc({ categoryId: c.id, name: "", price: 0 })} className="text-sm font-medium text-brand-500 hover:underline">
                        Thêm dịch vụ
                      </button>
                      <button onClick={() => setEditCat({ id: c.id, name: c.name })} className="text-sm font-medium text-brand-500 hover:underline">
                        Sửa
                      </button>
                      <button onClick={() => deleteCategory(c.id)} className="text-sm font-medium text-error-500 hover:underline">
                        Xóa danh mục
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      <th className="px-4 py-3 text-left text-theme-xs font-medium text-gray-700 dark:text-gray-400">Dịch vụ</th>
                      <th className="px-4 py-3 text-right text-theme-xs font-medium text-gray-700 dark:text-gray-400">Giá</th>
                      <th className="px-4 py-3 text-right text-theme-xs font-medium text-gray-700 dark:text-gray-400"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {list.map((s) => {
                      const editingSvc = editSvc?.id === s.id;
                      if (editingSvc) {
                        return (
                          <tr key={s.id} className="bg-brand-50/40 dark:bg-white/[0.02]">
                            <td className="px-2 py-3 sm:px-4">
                              <TextInput
                                value={editSvc.name}
                                onChange={(e) => setEditSvc({ ...editSvc, name: e.target.value })}
                                onKeyDown={(e) => { if (e.key === "Enter") saveService(); if (e.key === "Escape") setEditSvc(null); }}
                                autoFocus
                              />
                            </td>
                            <td className="px-2 py-3 sm:px-4">
                              <MoneyInput
                                className="text-right"
                                value={editSvc.price}
                                onValueChange={(n) => setEditSvc({ ...editSvc, price: n })}
                                onKeyDown={(e) => { if (e.key === "Enter") saveService(); if (e.key === "Escape") setEditSvc(null); }}
                              />
                            </td>
                            <td className="w-px px-2 py-3 sm:px-4">
                              <div className="flex justify-end gap-2">
                                <IconBtn variant="primary" label="Lưu" onClick={saveService}><CheckIcon /></IconBtn>
                                <IconBtn variant="outline" label="Hủy" onClick={() => setEditSvc(null)}><XIcon /></IconBtn>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                      return (
                        <tr
                          key={s.id}
                          onClick={() => setEditSvc({ id: s.id, categoryId: s.categoryId, name: s.name, price: s.price })}
                          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
                          title="Bấm để sửa"
                        >
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-400">{s.name}</td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-400">{formatVND(s.price)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteService(s.id); }}
                              className="text-sm font-medium text-error-500 hover:underline"
                            >
                              Xóa
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {!list.length && !(addSvc?.categoryId === c.id) && (
                      <tr><td colSpan={3} className="px-4 py-4 text-center text-sm text-gray-400">Chưa có dịch vụ</td></tr>
                    )}
                    {addSvc?.categoryId === c.id && (
                      <tr className="bg-brand-50/40 dark:bg-white/[0.02]">
                        <td className="px-2 py-3 sm:px-4">
                          <TextInput
                            placeholder="Tên dịch vụ"
                            value={addSvc.name}
                            onChange={(e) => setAddSvc({ ...addSvc, name: e.target.value })}
                            onKeyDown={(e) => { if (e.key === "Enter") saveNewService(); if (e.key === "Escape") setAddSvc(null); }}
                            autoFocus
                          />
                        </td>
                        <td className="px-2 py-3 sm:px-4">
                          <MoneyInput
                            className="text-right"
                            placeholder="Giá"
                            value={addSvc.price}
                            onValueChange={(n) => setAddSvc({ ...addSvc, price: n })}
                            onKeyDown={(e) => { if (e.key === "Enter") saveNewService(); if (e.key === "Escape") setAddSvc(null); }}
                          />
                        </td>
                        <td className="w-px px-2 py-3 sm:px-4">
                          <div className="flex justify-end gap-2">
                            <IconBtn variant="primary" label="Lưu" onClick={saveNewService}><CheckIcon /></IconBtn>
                            <IconBtn variant="outline" label="Hủy" onClick={() => setAddSvc(null)}><XIcon /></IconBtn>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </ComponentCard>
          );
        })}
      </div>
    </div>
  );
}
