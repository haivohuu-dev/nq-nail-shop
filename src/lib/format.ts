export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(amount));
}

export function formatDate(iso: string): string {
  // iso dạng "2026-07-01 09:30:00" (UTC từ sqlite) -> hiển thị vi-VN
  if (!iso) return "";
  const d = new Date(iso.replace(" ", "T") + "Z");
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${h}:${m} ${day}/${month}/${year}`;
}
