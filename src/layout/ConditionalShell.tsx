"use client";
import { usePathname } from "next/navigation";
import AppShell from "@/layout/AppShell";
import React from "react";

// Trang auth (login) hiển thị toàn màn hình, không có sidebar/header.
const BARE_ROUTES = ["/signin"];

export default function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = BARE_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));

  if (bare) return <>{children}</>;
  return <AppShell>{children}</AppShell>;
}
