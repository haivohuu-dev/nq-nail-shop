# Nail Salon Invoice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web app nội bộ để tiệm nail quản lý danh mục/dịch vụ, tạo hóa đơn cho khách và xuất PDF gửi khách.

**Architecture:** Next.js 15 App Router full-stack — UI (React Server/Client Components) + API (route handlers) trong một codebase. Dữ liệu lưu ở Turso (libSQL/SQLite cloud) qua Drizzle ORM. PDF sinh server-side bằng `@react-pdf/renderer` với font Roboto nhúng để hiện tiếng Việt.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS v4, Drizzle ORM, `@libsql/client`, `@react-pdf/renderer`, zod.

## Global Constraints

- Node.js ≥ 20.
- Tiền tệ **VND**, lưu dưới dạng **INTEGER (đồng)** ở mọi bảng — không dùng float ở bất kỳ đâu.
- **Không** auth ở giai đoạn này.
- **Không** viết unit test tự động. Mỗi task verify thủ công (chạy dev server + curl / mở browser).
- Chưa deploy. Chỉ chạy local (`npm run dev`) cho tới khi user yêu cầu deploy.
- **Dev DB = file SQLite local** qua libSQL: `TURSO_DATABASE_URL=file:local.db`, không cần `TURSO_AUTH_TOKEN`. Khi deploy sẽ đổi sang URL + token Turso thật — code không đổi. File `local.db` phải nằm trong `.gitignore`.
- Commit sau mỗi task.
- `invoice_items` luôn lưu snapshot `name_snapshot` + `price_snapshot`; không đọc giá live từ `services` khi hiển thị hóa đơn cũ.
- Thứ tự tính tiền cố định: `taxable = subtotal − discount`; `tax = taxable × tax_rate`; `total = taxable + tax + tip` (tip không bị đánh thuế).

---

## File Structure

```
D:/07. Nextjs/
├── package.json
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── drizzle.config.ts
├── .env.local                         # TURSO_DATABASE_URL, TURSO_AUTH_TOKEN (không commit)
├── .env.example                       # mẫu env (commit)
├── src/
│   ├── db/
│   │   ├── schema.ts                   # 5 bảng Drizzle
│   │   └── index.ts                    # libsql client + drizzle instance
│   ├── lib/
│   │   ├── format.ts                   # format VND, format ngày
│   │   ├── calc.ts                     # tính subtotal/discount/tax/total
│   │   ├── invoice-number.ts           # sinh mã hóa đơn YYYYMMDD-NNN
│   │   └── validation.ts               # zod schemas cho API
│   ├── app/
│   │   ├── layout.tsx                  # layout gốc + nav
│   │   ├── globals.css                 # Tailwind
│   │   ├── page.tsx                    # redirect -> /invoices
│   │   ├── services/page.tsx           # CRUD danh mục + dịch vụ
│   │   ├── invoices/page.tsx           # list hóa đơn
│   │   ├── invoices/new/page.tsx       # tạo hóa đơn
│   │   ├── invoices/[id]/page.tsx      # chi tiết + tải PDF
│   │   ├── settings/page.tsx           # info shop
│   │   └── api/
│   │       ├── categories/route.ts
│   │       ├── categories/[id]/route.ts
│   │       ├── services/route.ts
│   │       ├── services/[id]/route.ts
│   │       ├── invoices/route.ts
│   │       ├── invoices/[id]/route.ts
│   │       ├── invoices/[id]/pdf/route.ts
│   │       └── settings/route.ts
│   └── pdf/
│       └── InvoiceDocument.tsx         # component react-pdf
└── public/
    └── fonts/                          # Roboto-Regular.ttf, Roboto-Bold.ttf
```

---

## Task 1: Init project + dependencies + Turso

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, `.env.example`, `.env.local`, `.gitignore`

- [ ] **Step 1: Scaffold Next.js**

Chạy trong `D:/07. Nextjs` (thư mục đã tồn tại — nếu `create-next-app` từ chối vì thư mục không rỗng, scaffold ra thư mục tạm rồi copy vào, hoặc dùng `.`):

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --no-eslint --import-alias "@/*"
```

Chọn: App Router = yes, Turbopack = yes (mặc định OK).

- [ ] **Step 2: Cài dependencies**

```bash
npm install drizzle-orm @libsql/client zod @react-pdf/renderer
npm install -D drizzle-kit
```

- [ ] **Step 3: (Bỏ) Không tạo Turso ở giai đoạn dev**

Dev dùng file SQLite local — không cần tài khoản/CLI Turso. Sang Step 4.

- [ ] **Step 4: Tạo `.env.example` và `.env.local`**

`.env.example` (commit):

```
# Dev: file local. Deploy: đổi sang libsql://... + token Turso
TURSO_DATABASE_URL=file:local.db
TURSO_AUTH_TOKEN=
```

`.env.local` (KHÔNG commit):

```
TURSO_DATABASE_URL=file:local.db
TURSO_AUTH_TOKEN=
```

- [ ] **Step 5: Đảm bảo `.gitignore` chặn env + db file**

Kiểm tra `.gitignore` có dòng `.env*.local` (create-next-app thêm sẵn). Thêm thủ công:

```
.env.local
local.db
local.db-*
```

- [ ] **Step 6: Root layout + redirect trang chủ**

`src/app/layout.tsx`:

```tsx
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
```

`src/app/page.tsx`:

```tsx
import { redirect } from "next/navigation";
export default function Home() { redirect("/invoices"); }
```

- [ ] **Step 7: Verify dev server chạy**

Run: `npm run dev`
Expected: mở `http://localhost:3000` → tự redirect sang `/invoices` (trang sẽ 404/trống vì chưa tạo — chấp nhận). Nav bar hiển thị.

- [ ] **Step 8: Commit**

```bash
git init
git add -A
git commit -m "chore: init Next.js project with deps and Turso env"
```

---

## Task 2: Database schema + Drizzle client + migrate

**Files:**
- Create: `src/db/schema.ts`, `src/db/index.ts`, `drizzle.config.ts`

**Interfaces:**
- Produces: `db` (drizzle instance) từ `src/db/index.ts`; bảng `settings`, `categories`, `services`, `invoices`, `invoiceItems` từ `src/db/schema.ts`.

- [ ] **Step 1: Viết schema**

`src/db/schema.ts`:

```ts
import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shopName: text("shop_name").notNull().default(""),
  address: text("address").notNull().default(""),
  phone: text("phone").notNull().default(""),
  logo: text("logo"), // base64 data URL hoặc URL, nullable
  currency: text("currency").notNull().default("VND"),
  defaultTaxRate: integer("default_tax_rate").notNull().default(0), // phần nghìn: 85 = 8.5%
});

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const services = sqliteTable("services", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id").notNull().references(() => categories.id),
  name: text("name").notNull(),
  price: integer("price").notNull().default(0), // VND, đồng
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const invoices = sqliteTable("invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceNumber: text("invoice_number").notNull().unique(),
  customerName: text("customer_name").notNull().default(""),
  customerPhone: text("customer_phone").notNull().default(""),
  subtotal: integer("subtotal").notNull(),
  discountType: text("discount_type", { enum: ["percent", "fixed"] }).notNull().default("fixed"),
  discountValue: integer("discount_value").notNull().default(0), // percent: phần nghìn; fixed: đồng
  discountAmount: integer("discount_amount").notNull().default(0),
  taxRate: integer("tax_rate").notNull().default(0), // phần nghìn
  taxAmount: integer("tax_amount").notNull().default(0),
  tipAmount: integer("tip_amount").notNull().default(0),
  total: integer("total").notNull(),
  note: text("note").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const invoiceItems = sqliteTable("invoice_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id),
  serviceId: integer("service_id").references(() => services.id), // nullable
  nameSnapshot: text("name_snapshot").notNull(),
  priceSnapshot: integer("price_snapshot").notNull(),
  qty: integer("qty").notNull().default(1),
});
```

> Ghi chú: percent và tax_rate lưu **phần nghìn** (integer) để giữ 1 chữ số thập phân mà vẫn integer. VD 8.5% = `85`. Đổi ra hệ số: `rate/1000`.

- [ ] **Step 2: Drizzle client**

`src/db/index.ts`:

```ts
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN || undefined, // undefined cho file local
});

export const db = drizzle(client, { schema });
export * from "./schema";
```

- [ ] **Step 3: drizzle-kit config**

`drizzle.config.ts`:

```ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN || undefined, // file local không cần token
  },
} satisfies Config;
```

- [ ] **Step 4: Thêm script push vào package.json**

Thêm vào `"scripts"`:

```json
"db:push": "drizzle-kit push",
"db:studio": "drizzle-kit studio"
```

- [ ] **Step 5: Push schema vào file DB local**

drizzle-kit cần env. Chạy với env inline (Git Bash):

```bash
TURSO_DATABASE_URL=file:local.db npm run db:push
```

Expected: drizzle-kit báo tạo 5 bảng thành công; file `local.db` xuất hiện ở gốc project.

- [ ] **Step 6: Verify bảng tồn tại**

Run: `TURSO_DATABASE_URL=file:local.db npx drizzle-kit studio` (mở browser), hoặc kiểm tra file `local.db` đã tạo và có kích thước > 0.
Expected: thấy `categories`, `invoice_items`, `invoices`, `services`, `settings`.

- [ ] **Step 7: Commit**

```bash
git add src/db drizzle.config.ts package.json drizzle
git commit -m "feat: add Drizzle schema and Turso client, push to db"
```

---

## Task 3: Shared libs (format, calc, invoice-number, validation)

**Files:**
- Create: `src/lib/format.ts`, `src/lib/calc.ts`, `src/lib/invoice-number.ts`, `src/lib/validation.ts`

**Interfaces:**
- Produces:
  - `formatVND(amount: number): string` — vd `formatVND(150000)` → `"150.000 ₫"`
  - `computeInvoice(input: CalcInput): CalcResult` từ `calc.ts`
  - `generateInvoiceNumber(db): Promise<string>` từ `invoice-number.ts`
  - zod schemas: `categoryInput`, `serviceInput`, `invoiceInput`, `settingsInput` từ `validation.ts`

- [ ] **Step 1: format.ts**

`src/lib/format.ts`:

```ts
export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(amount)) + " ₫";
}

export function formatDate(iso: string): string {
  // iso dạng "2026-07-01 09:30:00" (UTC từ sqlite) -> hiển thị vi-VN
  const d = new Date(iso.replace(" ", "T") + "Z");
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(d);
}
```

- [ ] **Step 2: calc.ts**

`src/lib/calc.ts`:

```ts
export type CalcItem = { priceSnapshot: number; qty: number };

export type CalcInput = {
  items: CalcItem[];
  discountType: "percent" | "fixed";
  discountValue: number; // percent: phần nghìn (85 = 8.5%); fixed: đồng
  taxRate: number;       // phần nghìn (85 = 8.5%)
  tipAmount: number;     // đồng
};

export type CalcResult = {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
};

export function computeInvoice(input: CalcInput): CalcResult {
  const subtotal = input.items.reduce((s, it) => s + it.priceSnapshot * it.qty, 0);

  let discountAmount =
    input.discountType === "percent"
      ? Math.round((subtotal * input.discountValue) / 1000)
      : input.discountValue;
  discountAmount = Math.max(0, Math.min(discountAmount, subtotal)); // kẹp trong [0, subtotal]

  const taxable = subtotal - discountAmount;
  const taxAmount = Math.round((taxable * input.taxRate) / 1000);
  const total = taxable + taxAmount + input.tipAmount;

  return { subtotal, discountAmount, taxAmount, total };
}
```

- [ ] **Step 3: invoice-number.ts**

`src/lib/invoice-number.ts`:

```ts
import { sql } from "drizzle-orm";
import { db, invoices } from "@/db";

// Sinh mã YYYYMMDD-NNN, NNN = số thứ tự trong ngày (theo giờ local server)
export async function generateInvoiceNumber(): Promise<string> {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const prefix = `${y}${m}${d}`;

  const rows = await db
    .select({ n: sql<number>`count(*)` })
    .from(invoices)
    .where(sql`${invoices.invoiceNumber} like ${prefix + "-%"}`);

  const seq = (rows[0]?.n ?? 0) + 1;
  return `${prefix}-${String(seq).padStart(3, "0")}`;
}
```

- [ ] **Step 4: validation.ts**

`src/lib/validation.ts`:

```ts
import { z } from "zod";

export const categoryInput = z.object({
  name: z.string().min(1, "Tên danh mục bắt buộc"),
  sortOrder: z.number().int().optional(),
});

export const serviceInput = z.object({
  categoryId: z.number().int(),
  name: z.string().min(1, "Tên dịch vụ bắt buộc"),
  price: z.number().int().min(0),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const settingsInput = z.object({
  shopName: z.string(),
  address: z.string(),
  phone: z.string(),
  logo: z.string().nullable(),
  defaultTaxRate: z.number().int().min(0),
});

export const invoiceInput = z.object({
  customerName: z.string(),
  customerPhone: z.string(),
  discountType: z.enum(["percent", "fixed"]),
  discountValue: z.number().int().min(0),
  taxRate: z.number().int().min(0),
  tipAmount: z.number().int().min(0),
  note: z.string(),
  items: z
    .array(
      z.object({
        serviceId: z.number().int().nullable(),
        nameSnapshot: z.string().min(1),
        priceSnapshot: z.number().int().min(0),
        qty: z.number().int().min(1),
      })
    )
    .min(1, "Hóa đơn phải có ít nhất 1 dịch vụ"),
});
```

- [ ] **Step 5: Verify build**

Run: `npx tsc --noEmit`
Expected: không lỗi type.

- [ ] **Step 6: Commit**

```bash
git add src/lib
git commit -m "feat: add format, calc, invoice-number and zod validation libs"
```

---

## Task 4: Settings API + page

**Files:**
- Create: `src/app/api/settings/route.ts`, `src/app/settings/page.tsx`

**Interfaces:**
- Consumes: `db`, `settings` (Task 2); `settingsInput` (Task 3).
- Produces: `GET /api/settings` → object settings (tạo mặc định nếu chưa có); `PUT /api/settings` → cập nhật.

- [ ] **Step 1: Settings API**

`src/app/api/settings/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db, settings } from "@/db";
import { settingsInput } from "@/lib/validation";
import { eq } from "drizzle-orm";

async function getOrCreate() {
  const rows = await db.select().from(settings).limit(1);
  if (rows.length) return rows[0];
  const [created] = await db.insert(settings).values({}).returning();
  return created;
}

export async function GET() {
  return NextResponse.json(await getOrCreate());
}

export async function PUT(req: Request) {
  const parsed = settingsInput.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const current = await getOrCreate();
  const [updated] = await db
    .update(settings)
    .set(parsed.data)
    .where(eq(settings.id, current.id))
    .returning();
  return NextResponse.json(updated);
}
```

- [ ] **Step 2: Settings page (client component)**

`src/app/settings/page.tsx`:

```tsx
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
        shopName: s.shopName, address: s.address, phone: s.phone,
        logo: s.logo, defaultTaxRate: s.defaultTaxRate,
      }),
    });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 1500); }
  }

  function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setS({ ...s, logo: reader.result as string });
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
```

- [ ] **Step 3: Verify**

Run: `npm run dev`, mở `/settings`. Điền tên shop + tax + upload logo → Lưu → thấy "Đã lưu ✓". Reload trang → giá trị còn nguyên (đã lưu DB).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/settings src/app/settings
git commit -m "feat: settings API and page (shop info, logo, default tax)"
```

---

## Task 5: Categories API

**Files:**
- Create: `src/app/api/categories/route.ts`, `src/app/api/categories/[id]/route.ts`

**Interfaces:**
- Consumes: `db`, `categories`, `services` (Task 2); `categoryInput` (Task 3).
- Produces: `GET /api/categories` (list, kèm services); `POST /api/categories`; `PUT /api/categories/[id]`; `DELETE /api/categories/[id]` (chặn nếu còn service).

- [ ] **Step 1: Collection route**

`src/app/api/categories/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db, categories } from "@/db";
import { categoryInput } from "@/lib/validation";
import { asc } from "drizzle-orm";

export async function GET() {
  const rows = await db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.id));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const parsed = categoryInput.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const [created] = await db.insert(categories).values(parsed.data).returning();
  return NextResponse.json(created, { status: 201 });
}
```

- [ ] **Step 2: Item route**

`src/app/api/categories/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db, categories, services } from "@/db";
import { categoryInput } from "@/lib/validation";
import { eq } from "drizzle-orm";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = categoryInput.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const [updated] = await db.update(categories).set(parsed.data).where(eq(categories.id, Number(id))).returning();
  if (!updated) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const kids = await db.select().from(services).where(eq(services.categoryId, Number(id))).limit(1);
  if (kids.length) {
    return NextResponse.json({ error: "Danh mục còn dịch vụ, không thể xóa" }, { status: 409 });
  }
  await db.delete(categories).where(eq(categories.id, Number(id)));
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Verify bằng curl**

Run (dev server đang chạy):

```bash
curl -X POST localhost:3000/api/categories -H "Content-Type: application/json" -d '{"name":"Sơn gel"}'
curl localhost:3000/api/categories
```

Expected: POST trả object có `id`; GET trả mảng chứa danh mục vừa tạo.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/categories
git commit -m "feat: categories CRUD API with delete guard"
```

---

## Task 6: Services API

**Files:**
- Create: `src/app/api/services/route.ts`, `src/app/api/services/[id]/route.ts`

**Interfaces:**
- Consumes: `db`, `services` (Task 2); `serviceInput` (Task 3).
- Produces: `GET /api/services` (list); `POST /api/services`; `PUT /api/services/[id]`; `DELETE /api/services/[id]`.

- [ ] **Step 1: Collection route**

`src/app/api/services/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db, services } from "@/db";
import { serviceInput } from "@/lib/validation";
import { asc } from "drizzle-orm";

export async function GET() {
  const rows = await db.select().from(services).orderBy(asc(services.sortOrder), asc(services.id));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const parsed = serviceInput.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const [created] = await db.insert(services).values(parsed.data).returning();
  return NextResponse.json(created, { status: 201 });
}
```

- [ ] **Step 2: Item route**

`src/app/api/services/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db, services } from "@/db";
import { serviceInput } from "@/lib/validation";
import { eq } from "drizzle-orm";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = serviceInput.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const [updated] = await db.update(services).set(parsed.data).where(eq(services.id, Number(id))).returning();
  if (!updated) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(services).where(eq(services.id, Number(id)));
  return NextResponse.json({ ok: true });
}
```

> Ghi chú: xóa service không ảnh hưởng hóa đơn cũ vì `invoice_items` giữ snapshot. `service_id` trên item cũ vẫn trỏ tới id đã xóa nhưng không được join khi hiển thị (chỉ dùng snapshot).

- [ ] **Step 3: Verify bằng curl**

```bash
curl -X POST localhost:3000/api/services -H "Content-Type: application/json" -d '{"categoryId":1,"name":"Sơn gel tay","price":150000}'
curl localhost:3000/api/services
```

Expected: tạo được service, GET liệt kê ra.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/services
git commit -m "feat: services CRUD API"
```

---

## Task 7: Services management page (CRUD UI)

**Files:**
- Create: `src/app/services/page.tsx`

**Interfaces:**
- Consumes: các API `/api/categories`, `/api/services` (Task 5, 6).

- [ ] **Step 1: Trang quản lý danh mục + dịch vụ**

`src/app/services/page.tsx`:

```tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { formatVND } from "@/lib/format";

type Category = { id: number; name: string };
type Service = { id: number; categoryId: number; name: string; price: number; active: boolean };

export default function ServicesPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [svcs, setSvcs] = useState<Service[]>([]);
  const [newCat, setNewCat] = useState("");
  const [form, setForm] = useState({ categoryId: 0, name: "", price: 0 });

  const load = useCallback(async () => {
    const [c, s] = await Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/services").then((r) => r.json()),
    ]);
    setCats(c); setSvcs(s);
    if (c.length && !form.categoryId) setForm((f) => ({ ...f, categoryId: c[0].id }));
  }, [form.categoryId]);

  useEffect(() => { load(); }, [load]);

  async function addCategory() {
    if (!newCat.trim()) return;
    await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCat }) });
    setNewCat(""); load();
  }

  async function deleteCategory(id: number) {
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (!res.ok) { const e = await res.json(); alert(e.error); return; }
    load();
  }

  async function addService() {
    if (!form.name.trim() || !form.categoryId) return;
    await fetch("/api/services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setForm({ ...form, name: "", price: 0 }); load();
  }

  async function deleteService(id: number) {
    await fetch(`/api/services/${id}`, { method: "DELETE" }); load();
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Danh mục & dịch vụ</h1>

      <section className="space-y-2">
        <h2 className="font-semibold">Thêm danh mục</h2>
        <div className="flex gap-2">
          <input className="rounded border p-2" placeholder="Tên danh mục" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
          <button onClick={addCategory} className="rounded bg-blue-600 px-4 text-white">Thêm</button>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Thêm dịch vụ</h2>
        <div className="flex flex-wrap gap-2">
          <select className="rounded border p-2" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className="rounded border p-2" placeholder="Tên dịch vụ" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input type="number" className="w-32 rounded border p-2" placeholder="Giá" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          <button onClick={addService} className="rounded bg-blue-600 px-4 text-white">Thêm</button>
        </div>
      </section>

      {cats.map((c) => (
        <section key={c.id} className="space-y-1">
          <div className="flex items-center justify-between border-b pb-1">
            <h3 className="font-semibold">{c.name}</h3>
            <button onClick={() => deleteCategory(c.id)} className="text-sm text-red-600">Xóa danh mục</button>
          </div>
          <ul>
            {svcs.filter((s) => s.categoryId === c.id).map((s) => (
              <li key={s.id} className="flex items-center justify-between py-1">
                <span>{s.name} — {formatVND(s.price)}</span>
                <button onClick={() => deleteService(s.id)} className="text-sm text-red-600">Xóa</button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
```

> YAGNI: chưa làm nút sửa (edit inline) ở MVP — chỉ thêm/xóa. API PUT đã sẵn để thêm sau nếu cần.

- [ ] **Step 2: Verify**

Mở `/services`: thêm danh mục "Sơn gel", thêm dịch vụ "Sơn gel tay" giá 150000 → hiện dưới đúng danh mục với giá `150.000 ₫`. Thử xóa danh mục còn dịch vụ → alert báo "Danh mục còn dịch vụ, không thể xóa".

- [ ] **Step 3: Commit**

```bash
git add src/app/services
git commit -m "feat: services management page (categories + services CRUD UI)"
```

---

## Task 8: Invoices API (create, list, get, delete)

**Files:**
- Create: `src/app/api/invoices/route.ts`, `src/app/api/invoices/[id]/route.ts`

**Interfaces:**
- Consumes: `db`, `invoices`, `invoiceItems` (Task 2); `invoiceInput` (Task 3); `computeInvoice` (Task 3); `generateInvoiceNumber` (Task 3).
- Produces:
  - `POST /api/invoices` → tạo hóa đơn + items, trả `{ id, invoiceNumber, ... }`
  - `GET /api/invoices` → list (không kèm items)
  - `GET /api/invoices/[id]` → `{ invoice, items }`
  - `DELETE /api/invoices/[id]`

- [ ] **Step 1: Collection route**

`src/app/api/invoices/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db, invoices, invoiceItems } from "@/db";
import { invoiceInput } from "@/lib/validation";
import { computeInvoice } from "@/lib/calc";
import { generateInvoiceNumber } from "@/lib/invoice-number";
import { desc } from "drizzle-orm";

export async function GET() {
  const rows = await db.select().from(invoices).orderBy(desc(invoices.id));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const parsed = invoiceInput.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const calc = computeInvoice({
    items: data.items.map((i) => ({ priceSnapshot: i.priceSnapshot, qty: i.qty })),
    discountType: data.discountType,
    discountValue: data.discountValue,
    taxRate: data.taxRate,
    tipAmount: data.tipAmount,
  });

  const invoiceNumber = await generateInvoiceNumber();

  const [invoice] = await db.insert(invoices).values({
    invoiceNumber,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    subtotal: calc.subtotal,
    discountType: data.discountType,
    discountValue: data.discountValue,
    discountAmount: calc.discountAmount,
    taxRate: data.taxRate,
    taxAmount: calc.taxAmount,
    tipAmount: data.tipAmount,
    total: calc.total,
    note: data.note,
  }).returning();

  await db.insert(invoiceItems).values(
    data.items.map((i) => ({
      invoiceId: invoice.id,
      serviceId: i.serviceId,
      nameSnapshot: i.nameSnapshot,
      priceSnapshot: i.priceSnapshot,
      qty: i.qty,
    }))
  );

  return NextResponse.json(invoice, { status: 201 });
}
```

> Ghi chú: server **tự tính lại** (`computeInvoice`) — không tin số total client gửi. Client chỉ gửi items + tham số.

- [ ] **Step 2: Item route**

`src/app/api/invoices/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db, invoices, invoiceItems } from "@/db";
import { eq } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, Number(id)));
  if (!invoice) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoice.id));
  return NextResponse.json({ invoice, items });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, Number(id)));
  await db.delete(invoices).where(eq(invoices.id, Number(id)));
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Verify bằng curl**

```bash
curl -X POST localhost:3000/api/invoices -H "Content-Type: application/json" -d '{"customerName":"A","customerPhone":"090","discountType":"fixed","discountValue":0,"taxRate":0,"tipAmount":0,"note":"","items":[{"serviceId":1,"nameSnapshot":"Sơn gel tay","priceSnapshot":150000,"qty":2}]}'
```

Expected: trả invoice có `invoiceNumber` dạng `20260701-001`, `subtotal=300000`, `total=300000`. Thử gửi `items: []` → trả 400 "Hóa đơn phải có ít nhất 1 dịch vụ".

- [ ] **Step 4: Commit**

```bash
git add src/app/api/invoices
git commit -m "feat: invoices API (create with server-side calc, list, get, delete)"
```

---

## Task 9: Create invoice page (giỏ + tính tiền)

**Files:**
- Create: `src/app/invoices/new/page.tsx`

**Interfaces:**
- Consumes: `/api/categories`, `/api/services`, `/api/settings`, `POST /api/invoices`; `computeInvoice`, `formatVND`.

- [ ] **Step 1: Trang tạo hóa đơn**

`src/app/invoices/new/page.tsx`:

```tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { computeInvoice } from "@/lib/calc";
import { formatVND } from "@/lib/format";

type Category = { id: number; name: string };
type Service = { id: number; categoryId: number; name: string; price: number; active: boolean };
type CartLine = { serviceId: number | null; nameSnapshot: string; priceSnapshot: number; qty: number };

export default function NewInvoicePage() {
  const router = useRouter();
  const [cats, setCats] = useState<Category[]>([]);
  const [svcs, setSvcs] = useState<Service[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("fixed");
  const [discountValue, setDiscountValue] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [tipAmount, setTipAmount] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/services").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]).then(([c, s, st]) => { setCats(c); setSvcs(s); setTaxRate(st.defaultTaxRate ?? 0); });
  }, []);

  function addToCart(s: Service) {
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.serviceId === s.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], qty: next[idx].qty + 1 }; return next; }
      return [...prev, { serviceId: s.id, nameSnapshot: s.name, priceSnapshot: s.price, qty: 1 }];
    });
  }
  function setQty(i: number, qty: number) {
    setCart((prev) => prev.map((l, idx) => idx === i ? { ...l, qty: Math.max(1, qty) } : l));
  }
  function removeLine(i: number) { setCart((prev) => prev.filter((_, idx) => idx !== i)); }

  const calc = useMemo(() => computeInvoice({
    items: cart.map((l) => ({ priceSnapshot: l.priceSnapshot, qty: l.qty })),
    discountType, discountValue, taxRate, tipAmount,
  }), [cart, discountType, discountValue, taxRate, tipAmount]);

  async function save() {
    if (!cart.length) { alert("Chưa chọn dịch vụ nào"); return; }
    setSaving(true);
    const res = await fetch("/api/invoices", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerName, customerPhone, discountType, discountValue, taxRate, tipAmount, note, items: cart }),
    });
    setSaving(false);
    if (!res.ok) { const e = await res.json(); alert(JSON.stringify(e.error)); return; }
    const inv = await res.json();
    router.push(`/invoices/${inv.id}`);
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Tạo hóa đơn</h1>
        {cats.map((c) => (
          <div key={c.id}>
            <h3 className="font-semibold">{c.name}</h3>
            <div className="flex flex-wrap gap-2">
              {svcs.filter((s) => s.categoryId === c.id && s.active).map((s) => (
                <button key={s.id} onClick={() => addToCart(s)} className="rounded border px-3 py-1 hover:bg-blue-50">
                  {s.name} · {formatVND(s.price)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded border bg-white p-4">
        <input className="w-full rounded border p-2" placeholder="Tên khách" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        <input className="w-full rounded border p-2" placeholder="SĐT khách" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />

        <table className="w-full text-sm">
          <tbody>
            {cart.map((l, i) => (
              <tr key={i} className="border-b">
                <td>{l.nameSnapshot}</td>
                <td><input type="number" className="w-14 rounded border p-1" value={l.qty} onChange={(e) => setQty(i, Number(e.target.value))} /></td>
                <td className="text-right">{formatVND(l.priceSnapshot * l.qty)}</td>
                <td><button onClick={() => removeLine(i)} className="text-red-600">×</button></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex gap-2">
          <select className="rounded border p-2" value={discountType} onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed")}>
            <option value="fixed">Giảm (đồng)</option>
            <option value="percent">Giảm (%, phần nghìn)</option>
          </select>
          <input type="number" className="w-full rounded border p-2" placeholder="Giá trị giảm" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} />
        </div>
        <label className="block text-sm">Thuế (phần nghìn, 85=8.5%)
          <input type="number" className="w-full rounded border p-2" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
        </label>
        <label className="block text-sm">Tip (đồng)
          <input type="number" className="w-full rounded border p-2" value={tipAmount} onChange={(e) => setTipAmount(Number(e.target.value))} />
        </label>
        <textarea className="w-full rounded border p-2" placeholder="Ghi chú" value={note} onChange={(e) => setNote(e.target.value)} />

        <div className="space-y-1 border-t pt-2 text-sm">
          <div className="flex justify-between"><span>Tạm tính</span><span>{formatVND(calc.subtotal)}</span></div>
          <div className="flex justify-between"><span>Giảm giá</span><span>-{formatVND(calc.discountAmount)}</span></div>
          <div className="flex justify-between"><span>Thuế</span><span>{formatVND(calc.taxAmount)}</span></div>
          <div className="flex justify-between"><span>Tip</span><span>{formatVND(tipAmount)}</span></div>
          <div className="flex justify-between text-lg font-bold"><span>Tổng</span><span>{formatVND(calc.total)}</span></div>
        </div>

        <button onClick={save} disabled={saving} className="w-full rounded bg-green-600 py-2 text-white disabled:opacity-50">
          {saving ? "Đang lưu…" : "Lưu hóa đơn"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Mở `/invoices/new`: bấm 1 dịch vụ → vào giỏ, tăng qty → tổng cập nhật live. Nhập tên khách, set thuế 85 → thấy dòng Thuế đúng. Bấm Lưu → redirect sang `/invoices/[id]`.

- [ ] **Step 3: Commit**

```bash
git add src/app/invoices/new
git commit -m "feat: create invoice page with cart and live totals"
```

---

## Task 10: Invoice list + detail page

**Files:**
- Create: `src/app/invoices/page.tsx`, `src/app/invoices/[id]/page.tsx`

**Interfaces:**
- Consumes: `GET /api/invoices`, `GET /api/invoices/[id]`, `DELETE /api/invoices/[id]`; `formatVND`, `formatDate`.

- [ ] **Step 1: List page (server component)**

`src/app/invoices/page.tsx`:

```tsx
import Link from "next/link";
import { db, invoices } from "@/db";
import { desc } from "drizzle-orm";
import { formatVND, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const rows = await db.select().from(invoices).orderBy(desc(invoices.id));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hóa đơn</h1>
        <Link href="/invoices/new" className="rounded bg-green-600 px-4 py-2 text-white">+ Tạo hóa đơn</Link>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left"><th className="py-2">Mã</th><th>Khách</th><th>Ngày</th><th className="text-right">Tổng</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b hover:bg-gray-50">
              <td className="py-2"><Link href={`/invoices/${r.id}`} className="text-blue-600">{r.invoiceNumber}</Link></td>
              <td>{r.customerName || "—"}</td>
              <td>{formatDate(r.createdAt)}</td>
              <td className="text-right">{formatVND(r.total)}</td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={4} className="py-4 text-gray-500">Chưa có hóa đơn nào</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Detail page (client component — có nút xóa + tải PDF)**

`src/app/invoices/[id]/page.tsx`:

```tsx
"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatVND, formatDate } from "@/lib/format";

type Invoice = {
  id: number; invoiceNumber: string; customerName: string; customerPhone: string;
  subtotal: number; discountAmount: number; taxAmount: number; tipAmount: number;
  total: number; note: string; createdAt: string;
};
type Item = { id: number; nameSnapshot: string; priceSnapshot: number; qty: number };

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<{ invoice: Invoice; items: Item[] } | null>(null);

  useEffect(() => { fetch(`/api/invoices/${id}`).then((r) => r.json()).then(setData); }, [id]);
  if (!data) return <p>Đang tải…</p>;
  const { invoice, items } = data;

  async function remove() {
    if (!confirm("Xóa hóa đơn này?")) return;
    await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    router.push("/invoices");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hóa đơn {invoice.invoiceNumber}</h1>
        <div className="flex gap-2">
          <a href={`/api/invoices/${id}/pdf`} target="_blank" className="rounded bg-blue-600 px-4 py-2 text-white">Tải PDF</a>
          <button onClick={remove} className="rounded bg-red-600 px-4 py-2 text-white">Xóa</button>
        </div>
      </div>
      <p className="text-sm text-gray-600">{formatDate(invoice.createdAt)} · {invoice.customerName || "—"} · {invoice.customerPhone}</p>

      <table className="w-full text-sm">
        <thead><tr className="border-b text-left"><th className="py-2">Dịch vụ</th><th>SL</th><th className="text-right">Thành tiền</th></tr></thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="border-b">
              <td className="py-1">{it.nameSnapshot}</td>
              <td>{it.qty}</td>
              <td className="text-right">{formatVND(it.priceSnapshot * it.qty)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto max-w-xs space-y-1 text-sm">
        <div className="flex justify-between"><span>Tạm tính</span><span>{formatVND(invoice.subtotal)}</span></div>
        <div className="flex justify-between"><span>Giảm giá</span><span>-{formatVND(invoice.discountAmount)}</span></div>
        <div className="flex justify-between"><span>Thuế</span><span>{formatVND(invoice.taxAmount)}</span></div>
        <div className="flex justify-between"><span>Tip</span><span>{formatVND(invoice.tipAmount)}</span></div>
        <div className="flex justify-between text-lg font-bold"><span>Tổng</span><span>{formatVND(invoice.total)}</span></div>
      </div>
      {invoice.note && <p className="text-sm text-gray-600">Ghi chú: {invoice.note}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Mở `/invoices`: thấy hóa đơn đã tạo ở Task 9. Bấm mã → sang chi tiết, thấy danh sách dịch vụ + tổng khớp. (Nút Tải PDF chưa hoạt động — Task 11.)

- [ ] **Step 4: Commit**

```bash
git add src/app/invoices/page.tsx "src/app/invoices/[id]/page.tsx"
git commit -m "feat: invoice list and detail pages"
```

---

## Task 11: PDF export (document + route + font)

**Files:**
- Create: `src/pdf/InvoiceDocument.tsx`, `src/app/api/invoices/[id]/pdf/route.ts`, `public/fonts/Roboto-Regular.ttf`, `public/fonts/Roboto-Bold.ttf`

**Interfaces:**
- Consumes: `GET` data hóa đơn từ DB; `settings` cho branding; `formatVND`, `formatDate`.

- [ ] **Step 1: Tải font Roboto**

Tải 2 file TTF vào `public/fonts/`:
- `Roboto-Regular.ttf`, `Roboto-Bold.ttf` từ Google Fonts (`https://fonts.google.com/specimen/Roboto` → Download family) hoặc:

```bash
curl -L -o public/fonts/Roboto-Regular.ttf https://github.com/googlefonts/roboto-2/raw/main/src/hinted/Roboto-Regular.ttf
curl -L -o public/fonts/Roboto-Bold.ttf https://github.com/googlefonts/roboto-2/raw/main/src/hinted/Roboto-Bold.ttf
```

> Roboto hỗ trợ đầy đủ tiếng Việt + ký tự "₫". Bắt buộc nhúng — font mặc định của react-pdf (Helvetica) không có dấu tiếng Việt.

- [ ] **Step 2: Invoice PDF document**

`src/pdf/InvoiceDocument.tsx`:

```tsx
import { Document, Page, Text, View, StyleSheet, Font, Image } from "@react-pdf/renderer";
import path from "path";

Font.register({
  family: "Roboto",
  fonts: [
    { src: path.join(process.cwd(), "public/fonts/Roboto-Regular.ttf") },
    { src: path.join(process.cwd(), "public/fonts/Roboto-Bold.ttf"), fontWeight: "bold" },
  ],
});

const vnd = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n)) + " ₫";

const s = StyleSheet.create({
  page: { fontFamily: "Roboto", fontSize: 11, padding: 32, color: "#111" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  shop: { fontSize: 16, fontWeight: "bold" },
  muted: { color: "#555", fontSize: 10 },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 4, textAlign: "right" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderBottom: "1px solid #eee" },
  th: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottom: "1px solid #333", fontWeight: "bold" },
  totals: { marginTop: 12, marginLeft: "auto", width: 220 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  grand: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderTop: "1px solid #333", fontWeight: "bold", fontSize: 13 },
  logo: { height: 48, marginBottom: 6 },
});

type Shop = { shopName: string; address: string; phone: string; logo: string | null };
type Invoice = {
  invoiceNumber: string; customerName: string; customerPhone: string; createdAt: string;
  subtotal: number; discountAmount: number; taxAmount: number; tipAmount: number; total: number; note: string;
};
type Item = { nameSnapshot: string; priceSnapshot: number; qty: number };

export function InvoiceDocument({ shop, invoice, items }: { shop: Shop; invoice: Invoice; items: Item[] }) {
  return (
    <Document>
      <Page size="A5" style={s.page}>
        <View style={s.header}>
          <View>
            {shop.logo ? <Image src={shop.logo} style={s.logo} /> : null}
            <Text style={s.shop}>{shop.shopName || "Nail Salon"}</Text>
            <Text style={s.muted}>{shop.address}</Text>
            <Text style={s.muted}>{shop.phone}</Text>
          </View>
          <View>
            <Text style={s.title}>HÓA ĐƠN</Text>
            <Text style={s.muted}>{invoice.invoiceNumber}</Text>
            <Text style={s.muted}>{invoice.createdAt}</Text>
          </View>
        </View>

        <Text style={s.muted}>Khách: {invoice.customerName || "—"}  ·  {invoice.customerPhone}</Text>

        <View style={{ marginTop: 10 }}>
          <View style={s.th}><Text>Dịch vụ</Text><Text>Thành tiền</Text></View>
          {items.map((it, i) => (
            <View style={s.row} key={i}>
              <Text>{it.nameSnapshot} × {it.qty}</Text>
              <Text>{vnd(it.priceSnapshot * it.qty)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totals}>
          <View style={s.totalRow}><Text>Tạm tính</Text><Text>{vnd(invoice.subtotal)}</Text></View>
          <View style={s.totalRow}><Text>Giảm giá</Text><Text>-{vnd(invoice.discountAmount)}</Text></View>
          <View style={s.totalRow}><Text>Thuế</Text><Text>{vnd(invoice.taxAmount)}</Text></View>
          <View style={s.totalRow}><Text>Tip</Text><Text>{vnd(invoice.tipAmount)}</Text></View>
          <View style={s.grand}><Text>Tổng</Text><Text>{vnd(invoice.total)}</Text></View>
        </View>

        {invoice.note ? <Text style={[s.muted, { marginTop: 12 }]}>Ghi chú: {invoice.note}</Text> : null}
        <Text style={[s.muted, { marginTop: 20, textAlign: "center" }]}>Cảm ơn quý khách!</Text>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 3: PDF route**

`src/app/api/invoices/[id]/pdf/route.ts`:

```ts
import { renderToBuffer } from "@react-pdf/renderer";
import { db, invoices, invoiceItems, settings } from "@/db";
import { eq } from "drizzle-orm";
import { InvoiceDocument } from "@/pdf/InvoiceDocument";

export const runtime = "nodejs"; // react-pdf cần Node runtime (fs cho font), không Edge

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, Number(id)));
  if (!invoice) return new Response("Không tìm thấy", { status: 404 });
  const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoice.id));
  const [shop] = await db.select().from(settings).limit(1);

  const buffer = await renderToBuffer(
    <InvoiceDocument
      shop={shop ?? { shopName: "", address: "", phone: "", logo: null }}
      invoice={invoice}
      items={items}
    />
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
    },
  });
}
```

> Route dùng JSX → file `.tsx`? Route handlers hỗ trợ TSX nếu đặt tên `route.tsx`. **Đổi tên file thành `route.tsx`** (Next chấp nhận cả `.ts` và `.tsx` cho route handler). Đường dẫn: `src/app/api/invoices/[id]/pdf/route.tsx`.

- [ ] **Step 4: Verify**

Mở chi tiết 1 hóa đơn → bấm "Tải PDF" → tab mới hiện PDF: có tên shop + logo, bảng dịch vụ, tổng tiền, chữ tiếng Việt + "₫" hiển thị đúng (không bị ô vuông/thiếu dấu).

- [ ] **Step 5: Commit**

```bash
git add src/pdf "src/app/api/invoices/[id]/pdf" public/fonts
git commit -m "feat: PDF invoice export with Roboto font and shop branding"
```

---

## Self-Review

**Spec coverage:**
- CRUD danh mục + dịch vụ → Task 5, 6, 7 ✓
- Tạo hóa đơn → Task 8, 9 ✓
- Xuất PDF → Task 11 ✓
- Tax / discount / tip / info khách → schema Task 2, calc Task 3, UI Task 9 ✓
- Lịch sử hóa đơn → Task 10 ✓
- Config shop + logo trên PDF → Task 4, 11 ✓
- Turso + Drizzle → Task 1, 2 ✓
- VND integer → Global Constraints + schema ✓
- Snapshot giá → schema Task 2, POST Task 8 ✓
- Không auth, không unit test, chưa deploy → tuân theo suốt plan ✓

**Placeholder scan:** không có TBD/TODO; mọi step có code thật hoặc lệnh cụ thể.

**Type consistency:** `computeInvoice(CalcInput) → CalcResult` dùng nhất quán ở Task 8 (API) và Task 9 (UI). `generateInvoiceNumber()` không tham số, đọc `db` nội bộ — gọi đúng ở Task 8. Schema field names (`nameSnapshot`, `priceSnapshot`, `discountAmount`...) khớp giữa schema, API, UI, PDF.

**Lưu ý dependency ngoài tầm:** `@react-pdf/renderer` peer dep React — nếu cài báo xung đột với React 19, dùng `npm install @react-pdf/renderer --legacy-peer-deps`. Ghi lại nếu gặp.
