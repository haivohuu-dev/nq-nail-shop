"use client";
import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatVND, formatDate } from "@/lib/format";

export interface InvoiceRow {
  id: number;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  total: number;
  createdAt: string;
}

type SortField = "invoiceNumber" | "customerName" | "createdAt" | "total";
type SortDirection = "asc" | "desc";

function RowActions({
  onView,
  onDelete,
}: {
  onView: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative flex justify-center">
      <button
        onClick={() => setOpen(!open)}
        className="text-gray-500 dark:text-gray-400"
        aria-label="Thao tác"
      >
        <svg className="fill-current" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" clipRule="evenodd" d="M5.99902 10.245C6.96552 10.245 7.74902 11.0285 7.74902 11.995V12.005C7.74902 12.9715 6.96552 13.755 5.99902 13.755C5.03253 13.755 4.24902 12.9715 4.24902 12.005V11.995C4.24902 11.0285 5.03253 10.245 5.99902 10.245ZM17.999 10.245C18.9655 10.245 19.749 11.0285 19.749 11.995V12.005C19.749 12.9715 18.9655 13.755 17.999 13.755C17.0325 13.755 16.249 12.9715 16.249 12.005V11.995C16.249 11.0285 17.0325 10.245 17.999 10.245ZM13.749 11.995C13.749 11.0285 12.9655 10.245 11.999 10.245C11.0325 10.245 10.249 11.0285 10.249 11.995V12.005C10.249 12.9715 11.0325 13.755 11.999 13.755C12.9655 13.755 13.749 12.9715 13.749 12.005V11.995Z" fill=""></path>
        </svg>
      </button>
      {open && (
        <div className="shadow-theme-lg absolute right-0 z-50 w-40 space-y-1 rounded-2xl border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-dark">
          <button
            onClick={() => { setOpen(false); onView(); }}
            className="text-theme-xs flex w-full rounded-lg px-3 py-2 text-left font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
          >
            Xem chi tiết
          </button>
          <button
            onClick={() => { setOpen(false); onDelete(); }}
            className="text-theme-xs flex w-full rounded-lg px-3 py-2 text-left font-medium text-error-500 hover:bg-error-50 dark:text-error-500 dark:hover:bg-error-500/10"
          >
            Xóa
          </button>
        </div>
      )}
    </div>
  );
}

function SortIcon({ field, sortBy, sortDirection }: { field: string; sortBy: string; sortDirection: string }) {
  return (
    <span className="flex flex-col gap-0.5">
      <svg className={sortBy === field && sortDirection === "asc" ? "text-brand-500" : "text-gray-300"} width="8" height="5" viewBox="0 0 8 5" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4.40962 0.585167C4.21057 0.300808 3.78943 0.300807 3.59038 0.585166L1.05071 4.21327C0.81874 4.54466 1.05582 5 1.46033 5H6.53967C6.94418 5 7.18126 4.54466 6.94929 4.21327L4.40962 0.585167Z" fill="currentColor"></path>
      </svg>
      <svg className={sortBy === field && sortDirection === "desc" ? "text-brand-500" : "text-gray-300"} width="8" height="5" viewBox="0 0 8 5" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4.40962 4.41483C4.21057 4.69919 3.78943 4.69919 3.59038 4.41483L1.05071 0.786732C0.81874 0.455343 1.05582 0 1.46033 0H6.53967C6.94418 0 7.18126 0.455342 6.94929 0.786731L4.40962 4.41483Z" fill="currentColor"></path>
      </svg>
    </span>
  );
}

function isToday(iso: string): boolean {
  const d = new Date(iso.replace(" ", "T") + "Z");
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export default function InvoiceList({ invoices }: { invoices: InvoiceRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const itemsPerPage = 10;

  // Thống kê tổng quan
  const stats = useMemo(() => {
    const todays = invoices.filter((i) => isToday(i.createdAt));
    const revenue = invoices.reduce((s, i) => s + i.total, 0);
    const revenueToday = todays.reduce((s, i) => s + i.total, 0);
    return {
      count: invoices.length,
      revenue,
      countToday: todays.length,
      revenueToday,
    };
  }, [invoices]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return invoices;
    const q = searchQuery.toLowerCase().trim();
    return invoices.filter(
      (i) =>
        i.invoiceNumber.toLowerCase().includes(q) ||
        i.customerName.toLowerCase().includes(q) ||
        i.customerPhone.toLowerCase().includes(q) ||
        i.total.toString().includes(q)
    );
  }, [invoices, searchQuery]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const valA = a[sortBy];
      const valB = b[sortBy];
      if (sortBy === "total") {
        return sortDirection === "asc" ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
      }
      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortBy, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sorted.slice(start, start + itemsPerPage);
  }, [sorted, currentPage]);

  const isAllSelected = paginated.length > 0 && paginated.every((i) => selected.includes(i.id));

  const visiblePages = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [currentPage, totalPages]);

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) setSelected([]);
    else setSelected(paginated.map((i) => i.id));
  }, [isAllSelected, paginated]);

  const toggleRow = useCallback((id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }, []);

  const sort = useCallback((field: SortField) => {
    if (sortBy === field) setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    else { setSortBy(field); setSortDirection("asc"); }
  }, [sortBy]);

  const goToPage = (page: number) => { if (page >= 1 && page <= totalPages) setCurrentPage(page); };
  const nextPage = () => { if (currentPage < totalPages) setCurrentPage((p) => p + 1); };
  const previousPage = () => { if (currentPage > 1) setCurrentPage((p) => p - 1); };

  const deleteInvoice = async (id: number) => {
    if (!confirm("Xóa hóa đơn này?")) return;
    setBusy(true);
    await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    setSelected((prev) => prev.filter((x) => x !== id));
    setBusy(false);
    router.refresh();
  };

  const deleteSelected = async () => {
    if (!selected.length) return;
    if (!confirm(`Xóa ${selected.length} hóa đơn đã chọn?`)) return;
    setBusy(true);
    await Promise.all(selected.map((id) => fetch(`/api/invoices/${id}`, { method: "DELETE" })));
    setSelected([]);
    setBusy(false);
    router.refresh();
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      {/* Tổng quan */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800 dark:text-white/90">Tổng quan</h2>
          </div>
          <div>
            <Link
              href="/invoices/new"
              className="bg-brand-500 shadow-theme-xs hover:bg-brand-600 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M5 10.0002H15.0006M10.0002 5V15.0006" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
              Tạo hóa đơn
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-1 rounded-xl border border-gray-200 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-y-0 dark:divide-gray-800 dark:border-gray-800">
          <div className="border-b p-5 sm:border-r lg:border-b-0 dark:border-gray-800">
            <p className="mb-1.5 text-sm text-gray-400 dark:text-gray-500">Tổng hóa đơn</p>
            <h3 className="text-3xl text-gray-800 dark:text-white/90">{stats.count}</h3>
          </div>
          <div className="border-b p-5 lg:border-b-0 dark:border-gray-800">
            <p className="mb-1.5 text-sm text-gray-400 dark:text-gray-500">Tổng doanh thu</p>
            <h3 className="text-3xl text-gray-800 dark:text-white/90">{formatVND(stats.revenue)}</h3>
          </div>
          <div className="border-b p-5 sm:border-r sm:border-b-0 dark:border-gray-800">
            <p className="mb-1.5 text-sm text-gray-400 dark:text-gray-500">Hóa đơn hôm nay</p>
            <h3 className="text-3xl text-gray-800 dark:text-white/90">{stats.countToday}</h3>
          </div>
          <div className="p-5">
            <p className="mb-1.5 text-sm text-gray-400 dark:text-gray-500">Doanh thu hôm nay</p>
            <h3 className="text-3xl text-gray-800 dark:text-white/90">{formatVND(stats.revenueToday)}</h3>
          </div>
        </div>
      </div>

      {/* Bảng */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Hóa đơn</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Danh sách hóa đơn gần đây</p>
          </div>
          <div className="flex items-center gap-3.5">
            {selected.length > 0 && (
              <button
                onClick={deleteSelected}
                disabled={busy}
                className="text-theme-sm inline-flex h-11 items-center gap-2 rounded-lg border border-error-300 bg-error-50 px-4 font-medium text-error-600 hover:bg-error-100 disabled:opacity-50 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-500"
              >
                Xóa ({selected.length})
              </button>
            )}
            <div className="relative">
              <span className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M3.04199 9.37363C3.04199 5.87693 5.87735 3.04199 9.37533 3.04199C12.8733 3.04199 15.7087 5.87693 15.7087 9.37363C15.7087 12.8703 12.8733 15.7053 9.37533 15.7053C5.87735 15.7053 3.04199 12.8703 3.04199 9.37363ZM9.37533 1.54199C5.04926 1.54199 1.54199 5.04817 1.54199 9.37363C1.54199 13.6991 5.04926 17.2053 9.37533 17.2053C11.2676 17.2053 13.0032 16.5344 14.3572 15.4176L17.1773 18.238C17.4702 18.5309 17.945 18.5309 18.2379 18.238C18.5308 17.9451 18.5309 17.4703 18.238 17.1773L15.4182 14.3573C16.5367 13.0033 17.2087 11.2669 17.2087 9.37363C17.2087 5.04817 13.7014 1.54199 9.37533 1.54199Z" fill=""></path>
                </svg>
              </span>
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="dark:bg-dark-900 shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 dark:focus:border-brand-800 h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pr-4 pl-11 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden xl:w-[300px] dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              />
            </div>
          </div>
        </div>

        <div className="custom-scrollbar overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="p-4 whitespace-nowrap text-left">
                  <div className="flex items-center gap-3">
                    <label className="flex cursor-pointer items-center select-none">
                      <span className="relative">
                        <input type="checkbox" className="sr-only" onChange={toggleSelectAll} checked={isAllSelected} />
                        <span className={`flex h-4 w-4 items-center justify-center rounded-sm border-[1.25px] ${isAllSelected ? "border-brand-500 bg-brand-500" : "bg-transparent border-gray-300 dark:border-gray-700"}`}>
                          <span className={isAllSelected ? "" : "opacity-0"}>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="1.6666" strokeLinecap="round" strokeLinejoin="round"></path>
                            </svg>
                          </span>
                        </span>
                      </span>
                    </label>
                    <button className="flex items-center gap-2" onClick={() => sort("invoiceNumber")}>
                      <p className="text-theme-xs font-medium text-gray-700 dark:text-gray-400">Mã hóa đơn</p>
                      <SortIcon field="invoiceNumber" sortBy={sortBy} sortDirection={sortDirection} />
                    </button>
                  </div>
                </th>
                <th className="cursor-pointer p-4 text-left" onClick={() => sort("customerName")}>
                  <div className="flex items-center gap-2">
                    <p className="text-theme-xs font-medium text-gray-700 dark:text-gray-400">Khách hàng</p>
                    <SortIcon field="customerName" sortBy={sortBy} sortDirection={sortDirection} />
                  </div>
                </th>
                <th className="p-4 text-left">
                  <p className="text-theme-xs font-medium text-gray-700 dark:text-gray-400">Số điện thoại</p>
                </th>
                <th className="cursor-pointer p-4 text-left" onClick={() => sort("createdAt")}>
                  <div className="flex items-center gap-2">
                    <p className="text-theme-xs font-medium text-gray-700 dark:text-gray-400">Ngày tạo</p>
                    <SortIcon field="createdAt" sortBy={sortBy} sortDirection={sortDirection} />
                  </div>
                </th>
                <th className="cursor-pointer p-4 text-left" onClick={() => sort("total")}>
                  <div className="flex items-center gap-2">
                    <p className="text-theme-xs font-medium text-gray-700 dark:text-gray-400">Tổng tiền</p>
                    <SortIcon field="total" sortBy={sortBy} sortDirection={sortDirection} />
                  </div>
                </th>
                <th className="p-4 text-left">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {paginated.map((inv) => (
                <tr
                  key={inv.id}
                  onDoubleClick={() => router.push(`/invoices/${inv.id}`)}
                  className="cursor-pointer transition hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <td className="p-4 whitespace-nowrap">
                    <div className="group flex items-center gap-3">
                      <label className="flex cursor-pointer items-center select-none" onClick={(e) => e.stopPropagation()}>
                        <span className="relative">
                          <input type="checkbox" className="sr-only" checked={selected.includes(inv.id)} onChange={() => toggleRow(inv.id)} />
                          <span className={`flex h-4 w-4 items-center justify-center rounded-sm border-[1.25px] ${selected.includes(inv.id) ? "border-brand-500 bg-brand-500" : "bg-transparent border-gray-300 dark:border-gray-700"}`}>
                            <span className={selected.includes(inv.id) ? "" : "opacity-0"}>
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="1.6666" strokeLinecap="round" strokeLinejoin="round"></path>
                              </svg>
                            </span>
                          </span>
                        </span>
                      </label>
                      <Link href={`/invoices/${inv.id}`} className="text-theme-xs font-medium text-brand-500 hover:underline">{inv.invoiceNumber}</Link>
                    </div>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-400">{inv.customerName || "—"}</span>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <p className="text-sm text-gray-700 dark:text-gray-400">{inv.customerPhone || "—"}</p>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <p className="text-sm text-gray-700 dark:text-gray-400">{formatDate(inv.createdAt)}</p>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-400">{formatVND(inv.total)}</p>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <RowActions
                      onView={() => router.push(`/invoices/${inv.id}`)}
                      onDelete={() => deleteInvoice(inv.id)}
                    />
                  </td>
                </tr>
              ))}
              {!paginated.length && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">Chưa có hóa đơn nào</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="flex flex-col items-center justify-between border-t border-gray-200 px-5 py-4 sm:flex-row dark:border-gray-800">
            <div className="pb-3 sm:pb-0">
              <span className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                Hiển thị{" "}
                <span className="text-gray-800 dark:text-white/90">{(currentPage - 1) * itemsPerPage + (paginated.length ? 1 : 0)}</span>
                {" "}–{" "}
                <span className="text-gray-800 dark:text-white/90">{(currentPage - 1) * itemsPerPage + paginated.length}</span>
                {" "}trong{" "}
                <span className="text-gray-800 dark:text-white/90">{filtered.length}</span>
              </span>
            </div>
            <div className="flex w-full items-center justify-between gap-2 rounded-lg bg-gray-50 p-4 sm:w-auto sm:justify-normal sm:bg-transparent sm:p-0 dark:bg-white/[0.03] dark:sm:bg-transparent">
              <button
                className={`shadow-theme-xs flex items-center gap-2 rounded-lg border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-50 sm:p-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 ${currentPage === 1 ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={previousPage}
                disabled={currentPage === 1}
              >
                <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M2.58203 9.99868C2.58174 10.1909 2.6549 10.3833 2.80152 10.53L7.79818 15.5301C8.09097 15.8231 8.56584 15.8233 8.85883 15.5305C9.15183 15.2377 9.152 14.7629 8.85921 14.4699L5.13911 10.7472L16.6665 10.7472C17.0807 10.7472 17.4165 10.4114 17.4165 9.99715C17.4165 9.58294 17.0807 9.24715 16.6665 9.24715L5.14456 9.24715L8.85919 5.53016C9.15199 5.23717 9.15184 4.7623 8.85885 4.4695C8.56587 4.1767 8.09099 4.17685 7.79819 4.46984L2.84069 9.43049C2.68224 9.568 2.58203 9.77087 2.58203 9.99715C2.58203 9.99766 2.58203 9.99817 2.58203 9.99868Z" fill=""></path>
                </svg>
              </button>
              <span className="block text-sm font-medium text-gray-700 sm:hidden dark:text-gray-400">Trang {currentPage} / {totalPages}</span>
              <ul className="hidden items-center gap-0.5 sm:flex">
                {visiblePages.map((page) => (
                  <li key={page}>
                    <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); goToPage(page); }}
                      className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium ${page === currentPage ? "bg-brand-500 text-white" : "hover:bg-brand-500 text-gray-700 hover:text-white dark:text-gray-400 dark:hover:text-white"}`}
                    >
                      {page}
                    </a>
                  </li>
                ))}
              </ul>
              <button
                className={`shadow-theme-xs flex items-center gap-2 rounded-lg border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-50 sm:p-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 ${currentPage === totalPages ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={nextPage}
                disabled={currentPage === totalPages}
              >
                <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M17.4165 9.9986C17.4168 10.1909 17.3437 10.3832 17.197 10.53L12.2004 15.5301C11.9076 15.8231 11.4327 15.8233 11.1397 15.5305C10.8467 15.2377 10.8465 14.7629 11.1393 14.4699L14.8594 10.7472L3.33203 10.7472C2.91782 10.7472 2.58203 10.4114 2.58203 9.99715C2.58203 9.58294 2.91782 9.24715 3.33203 9.24715L14.854 9.24715L11.1393 5.53016C10.8465 5.23717 10.8467 4.7623 11.1397 4.4695C11.4327 4.1767 11.9075 4.17685 12.2003 4.46984L17.1578 9.43049C17.3163 9.568 17.4165 9.77087 17.4165 9.99715C17.4165 9.99763 17.4165 9.99812 17.4165 9.9986Z" fill=""></path>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
