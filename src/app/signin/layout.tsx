import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";
import Link from "next/link";
import React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative min-h-screen w-full bg-brand-950 bg-cover bg-center"
      style={{ backgroundImage: "url('/images/background.jpg')" }}
    >
      {/* Lớp phủ tối để chữ dễ đọc trên ảnh nền */}
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-1 flex min-h-screen w-full flex-col items-center justify-center p-6">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-white">NQ Nail Manager</h1>
          </Link>
          <p className="mt-1 text-gray-200">Hệ thống quản lý hóa đơn tiệm nail</p>
        </div>

        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 sm:p-8">
          {children}
        </div>
      </div>

      <div className="fixed right-6 bottom-6 z-50 hidden sm:block">
        <ThemeTogglerTwo />
      </div>
    </div>
  );
}
