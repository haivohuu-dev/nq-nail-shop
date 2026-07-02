"use client";
import React, { useEffect, useRef, useState } from "react";

// Class dùng chung cho input/select — lấy style từ template TailAdmin, nhưng controlled.
export const inputClass =
  "h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800";

export function Label({
  children,
  htmlFor,
  className = "",
}: {
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={`mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400 ${className}`}
    >
      {children}
    </label>
  );
}

export function TextInput({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${className}`} />;
}

export function Select({
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${inputClass} pr-11 ${className}`}>
      {children}
    </select>
  );
}

// Dropdown custom: panel bo góc mềm, animate, đánh dấu mục đang chọn.
export type SelectOption = { value: string | number; label: string };
export function SelectMenu({
  value,
  onChange,
  options,
  id,
  placeholder = "Chọn...",
  className = "",
}: {
  value: string | number;
  onChange: (value: string) => void;
  options: SelectOption[];
  id?: string;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const selected = options.find((o) => String(o.value) === String(value));

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${inputClass} flex items-center justify-between pr-4 text-left ${selected ? "" : "text-gray-400"}`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <svg className={`ml-2 shrink-0 text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`} width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div
        className={`absolute left-0 right-0 z-50 mt-1.5 origin-top rounded-xl border border-gray-200 bg-white p-1.5 shadow-theme-lg transition-all duration-150 dark:border-gray-800 dark:bg-gray-dark ${open ? "visible scale-100 opacity-100" : "pointer-events-none invisible scale-95 opacity-0"}`}
      >
        <ul className="custom-scrollbar max-h-60 space-y-0.5 overflow-y-auto" role="listbox">
          {options.map((o) => {
            const active = String(o.value) === String(value);
            return (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => { onChange(String(o.value)); setOpen(false); }}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${active ? "bg-brand-50 font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"}`}
                >
                  <span className="truncate">{o.label}</span>
                  {active && (
                    <svg className="shrink-0" width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M16.25 5.625L8.125 13.75L3.75 9.375" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  )}
                </button>
              </li>
            );
          })}
          {!options.length && (
            <li className="px-3 py-2 text-sm text-gray-400">Không có dữ liệu</li>
          )}
        </ul>
      </div>
    </div>
  );
}

// Ô nhập tiền VND: hiển thị có dấu chấm phân cách nghìn, trả về số nguyên đồng.
export function MoneyInput({
  value,
  onValueChange,
  className = "",
  ...props
}: {
  value: number;
  onValueChange: (n: number) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  const display = value ? new Intl.NumberFormat("vi-VN").format(value) : "";
  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      value={display}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "");
        onValueChange(digits ? parseInt(digits, 10) : 0);
      }}
      className={`${inputClass} ${className}`}
    />
  );
}

export function TextArea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 ${className}`}
    />
  );
}
