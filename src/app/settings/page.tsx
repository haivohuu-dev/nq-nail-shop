"use client";
import { useEffect, useState } from "react";

type Settings = {
  shopName: string; address: string; phone: string;
  logo: string | null; defaultTaxRate: number;
};

export default function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { fetch("/api/settings").then((r) => r.json()).then(setS); }, []);

  if (!s) return <p>Đang tải…</p>;

  async function save() {
    const res = await fetch("/api/settings", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopName: s!.shopName, address: s!.address, phone: s!.phone,
        logo: s!.logo, defaultTaxRate: s!.defaultTaxRate,
      }),
    });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 1500); }
  }

  function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setS({ ...s!, logo: reader.result as string });
    reader.readAsDataURL(file); // base64 data URL
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Cài đặt shop</h1>
      <label className="block">Tên shop
        <input className="mt-1 w-full rounded border p-2" value={s.shopName}
          onChange={(e) => setS({ ...s, shopName: e.target.value })} />
      </label>
      <label className="block">Địa chỉ
        <input className="mt-1 w-full rounded border p-2" value={s.address}
          onChange={(e) => setS({ ...s, address: e.target.value })} />
      </label>
      <label className="block">SĐT
        <input className="mt-1 w-full rounded border p-2" value={s.phone}
          onChange={(e) => setS({ ...s, phone: e.target.value })} />
      </label>
      <label className="block">Thuế mặc định (phần nghìn, 85 = 8.5%)
        <input type="number" className="mt-1 w-full rounded border p-2" value={s.defaultTaxRate}
          onChange={(e) => setS({ ...s, defaultTaxRate: Number(e.target.value) })} />
      </label>
      <label className="block">Logo
        <input type="file" accept="image/*" className="mt-1 block" onChange={onLogo} />
      </label>
      {s.logo && <img src={s.logo} alt="logo" className="h-20" />}
      <button onClick={save} className="rounded bg-blue-600 px-4 py-2 text-white">Lưu</button>
      {saved && <span className="ml-2 text-green-600">Đã lưu ✓</span>}
    </div>
  );
}
