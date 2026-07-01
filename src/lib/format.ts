export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(amount)) + " ₫";
}

export function formatDate(iso: string): string {
  // iso dạng "2026-07-01 09:30:00" (UTC từ sqlite) -> hiển thị vi-VN
  const d = new Date(iso.replace(" ", "T") + "Z");
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(d);
}
