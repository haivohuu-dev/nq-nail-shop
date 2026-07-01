import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = { title: "Nail Salon", description: "Quản lý hóa đơn tiệm nail" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <nav className="flex gap-4 border-b bg-white px-6 py-3 text-sm font-medium">
          <Link href="/invoices">Hóa đơn</Link>
          <Link href="/invoices/new">Tạo hóa đơn</Link>
          <Link href="/services">Dịch vụ</Link>
          <Link href="/settings">Cài đặt</Link>
        </nav>
        <main className="mx-auto max-w-5xl p-6">{children}</main>
      </body>
    </html>
  );
}
