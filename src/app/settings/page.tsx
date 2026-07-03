"use client";
import { useEffect, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import { Label, TextInput } from "@/components/form/Field";
import SignaturePad from "@/components/form/SignaturePad";

type Settings = {
  shopName: string; address: string; phone: string;
  logo: string | null; defaultTaxRate: number;
  showDiscount: boolean; showTax: boolean; showTip: boolean; showLogo: boolean;
  enableQr: boolean; qrImage: string | null; qrText: string;
  showSignature: boolean; signature: string | null;
};

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-400">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-700"}`}
      >
        <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
      </button>
    </label>
  );
}

export default function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { fetch("/api/settings").then((r) => r.json()).then(setS); }, []);

  async function save() {
    const res = await fetch("/api/settings", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopName: s!.shopName, address: s!.address, phone: s!.phone,
        logo: s!.logo, defaultTaxRate: s!.defaultTaxRate,
        showDiscount: s!.showDiscount, showTax: s!.showTax,
        showTip: s!.showTip, showLogo: s!.showLogo,
        enableQr: s!.enableQr, qrImage: s!.qrImage, qrText: s!.qrText,
        showSignature: s!.showSignature, signature: s!.signature,
      }),
    });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  }

  function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setS({ ...s!, logo: reader.result as string });
    reader.readAsDataURL(file); // base64 data URL
  }

  return (
    <div>
      {saved && (
        <div className="fixed left-1/2 top-6 z-[100000] -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-lg bg-success-500 px-4 py-3 text-sm font-medium text-white shadow-lg">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M16.25 5.625L8.125 13.75L3.75 9.375" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Đã lưu thành công
          </div>
        </div>
      )}
      <PageBreadcrumb pageTitle="Cài đặt" />
      {!s ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Đang tải…</p>
      ) : (
        <div className="mx-auto max-w-3xl">
          <ComponentCard title="Thông tin cửa hàng" desc="Thông tin hiển thị trên hóa đơn và PDF">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <Label htmlFor="shopName">Tên shop</Label>
                <TextInput id="shopName" value={s.shopName}
                  onChange={(e) => setS({ ...s, shopName: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="phone">SĐT</Label>
                <TextInput id="phone" value={s.phone}
                  onChange={(e) => setS({ ...s, phone: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="address">Địa chỉ</Label>
                <TextInput id="address" value={s.address}
                  onChange={(e) => setS({ ...s, address: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="tax">Thuế mặc định (%)</Label>
                <TextInput id="tax" type="number" min={0} max={100} value={s.defaultTaxRate}
                  onChange={(e) => setS({ ...s, defaultTaxRate: Number(e.target.value) })} />
              </div>
            </div>

            <div>
              <Label>Logo</Label>
              <div className="flex flex-wrap items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={onLogo}
                  className="max-w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-500 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-white hover:file:bg-brand-600 dark:text-gray-400"
                />
                {s.logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.logo} alt="logo" className="h-16 rounded-lg border border-gray-200 dark:border-gray-800" />
                )}
              </div>
            </div>

          </ComponentCard>

          <div className="mt-6">
            <ComponentCard title="Mã QR Thanh Toán / Liên Kết" desc="Cài đặt mã QR hiển thị trên hoá đơn PDF">
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                <Toggle label="Bật hiển thị mã QR trên PDF" checked={!!s.enableQr} onChange={(v) => setS({ ...s, enableQr: v })} />
              </div>
              
              {s.enableQr && (
                <div className="mt-4 flex flex-col gap-4">
                  <div>
                    <Label>Ảnh QR (Ưu tiên)</Label>
                    <div className="flex flex-wrap items-center gap-4 mt-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => setS({ ...s, qrImage: reader.result as string });
                          reader.readAsDataURL(file);
                        }}
                        className="max-w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-500 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-white hover:file:bg-brand-600 dark:text-gray-400"
                      />
                      {s.qrImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.qrImage} alt="QR" className="h-16 rounded-lg border border-gray-200 dark:border-gray-800" />
                      )}
                      {s.qrImage && (
                        <Button variant="outline" size="sm" onClick={() => setS({ ...s, qrImage: null })}>Xoá ảnh</Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="qrText">Nội dung mã QR (Nếu không có ảnh QR, hệ thống sẽ tự tạo từ nội dung này)</Label>
                    <TextInput
                      id="qrText"
                      value={s.qrText || ""}
                      onChange={(e) => setS({ ...s, qrText: e.target.value })}
                      placeholder="VD: STK ngân hàng, đường link..."
                    />
                  </div>
                </div>
              )}
            </ComponentCard>
          </div>

          <div className="mt-6">
            <ComponentCard title="Hiển thị trên hóa đơn PDF" desc="Bật/tắt các mục hiển thị khi xuất PDF">
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                <Toggle label="Logo" checked={s.showLogo} onChange={(v) => setS({ ...s, showLogo: v })} />
                <Toggle label="Giảm giá" checked={s.showDiscount} onChange={(v) => setS({ ...s, showDiscount: v })} />
                <Toggle label="Thuế" checked={s.showTax} onChange={(v) => setS({ ...s, showTax: v })} />
                <Toggle label="Tip" checked={s.showTip} onChange={(v) => setS({ ...s, showTip: v })} />
              </div>
            </ComponentCard>
          </div>

          <div className="mt-6">
            <ComponentCard title="Chữ ký" desc="Chữ ký hiển thị góc phải cuối hoá đơn PDF">
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                <Toggle label="Bật hiển thị chữ ký trên PDF" checked={!!s.showSignature} onChange={(v) => setS({ ...s, showSignature: v })} />
              </div>
              {s.showSignature && (
                <div className="mt-4">
                  <Label>Ký tại đây (dùng chuột hoặc chạm để ký)</Label>
                  <SignaturePad value={s.signature} onChange={(dataUrl) => setS({ ...s, signature: dataUrl })} />
                </div>
              )}
            </ComponentCard>
          </div>

          <div className="mt-6">
            <Button onClick={save}>Lưu</Button>
          </div>
        </div>
      )}
    </div>
  );
}
