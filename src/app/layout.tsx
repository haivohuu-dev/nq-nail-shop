import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import ConditionalShell from "@/layout/ConditionalShell";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export const metadata: Metadata = {
  title: "Nail Salon",
  description: "Quản lý hóa đơn tiệm nail",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={`${inter.className} dark:bg-gray-900`}>
        <ThemeProvider>
          <SidebarProvider>
            <ConditionalShell>{children}</ConditionalShell>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
