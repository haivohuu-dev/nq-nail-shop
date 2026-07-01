# Thứ tự thực hiện — Nail Salon Invoice

> File này là **lộ trình chạy tay từng bước**. Đọc kèm 2 file gốc:
> - Design: `docs/superpowers/specs/2026-07-01-nail-salon-invoice-design.md`
> - Plan chi tiết (có full code từng task): `docs/superpowers/plans/2026-07-01-nail-salon-invoice.md`
>
> Nguyên tắc: làm **tuần tự** theo số thứ tự. Mỗi task xong phải **verify + commit** rồi mới sang task sau. Không nhảy cóc — task sau phụ thuộc output task trước.

---

## 0. Chuẩn bị môi trường (làm 1 lần, trước Task 1)

- [ ] **0.1** Node.js ≥ 20 — check: `node -v`. Nếu thiếu, cài trước.
- [ ] **0.2** Git đã có — check: `git --version`. Repo đã init sẵn (`git status` clean, branch `feat/nail-salon-invoice`).
- [ ] **0.3** Thư mục làm việc: `D:/07. Nextjs` (đã tồn tại, có sẵn `docs/`).
- [ ] **0.4** Đọc **Global Constraints** trong plan gốc. Ghi nhớ 3 điều dễ sai:
  - Tiền = **INTEGER (đồng VND)** mọi nơi. **Không float**.
  - `percent` và `tax_rate` lưu **phần nghìn** (85 = 8.5%). Đổi hệ số: `rate/1000`.
  - Thứ tự tính: `taxable = subtotal − discount` → `tax = taxable × rate` → `total = taxable + tax + tip`. **Tip không bị đánh thuế.**

---

## Bản đồ phụ thuộc (dependency graph)

```
Task 1 (init) ──> Task 2 (schema/db) ──> Task 3 (libs) ──┬─> Task 4 (settings API+page)
                                                          ├─> Task 5 (categories API)
                                                          ├─> Task 6 (services API)
                                                          └─> Task 8 (invoices API)

Task 5 + Task 6 ──> Task 7 (services page UI)
Task 4 + 5 + 6 + 8 ──> Task 9 (create invoice page)
Task 8 ──> Task 10 (list + detail page)
Task 8 + Task 4 ──> Task 11 (PDF export)
```

Đường tối thiểu để chạy được app: **1 → 2 → 3 → 5 → 6 → 8** rồi mới đến UI. Nhưng làm đúng thứ tự số bên dưới là an toàn nhất (Settings trước vì PDF cần).

---

## Thứ tự thực hiện chi tiết

Ký hiệu cổng: **[VERIFY]** = phải chạy và thấy kết quả đúng trước khi qua. **[COMMIT]** = commit ngay.

---

### Task 1 — Init project + deps + env
**Mục tiêu:** dự án Next.js chạy được `npm run dev`, có nav bar, `/` redirect `/invoices`.
**Phụ thuộc:** không.

1. [ ] Scaffold: `npx create-next-app@latest . --typescript --tailwind --app --src-dir --no-eslint --import-alias "@/*"`
   - Thư mục không rỗng (có `docs/`, `.git/`) → nếu bị từ chối, scaffold ra thư mục tạm rồi copy đè vào, giữ lại `docs/` và `.git/`.
2. [ ] Cài deps: `npm install drizzle-orm @libsql/client zod @react-pdf/renderer`
   - Rồi `npm install -D drizzle-kit`
   - Nếu `@react-pdf/renderer` xung đột peer dep React 19 → `npm install @react-pdf/renderer --legacy-peer-deps`. **Ghi lại** nếu gặp.
3. [ ] Bỏ qua tạo Turso (dev dùng file SQLite local).
4. [ ] Tạo `.env.example` (commit) + `.env.local` (KHÔNG commit): `TURSO_DATABASE_URL=file:local.db`, `TURSO_AUTH_TOKEN=` (rỗng).
5. [ ] `.gitignore` thêm: `.env.local`, `local.db`, `local.db-*`.
6. [ ] `src/app/layout.tsx` (nav bar) + `src/app/page.tsx` (`redirect("/invoices")`) — copy từ plan gốc Task 1 Step 6.
7. [ ] **[VERIFY]** `npm run dev` → mở `http://localhost:3000` → redirect `/invoices` (trang 404/trống OK), nav bar hiện.
8. [ ] **[COMMIT]** `chore: init Next.js project with deps and Turso env`

---

### Task 2 — DB schema + Drizzle client + migrate
**Mục tiêu:** 5 bảng tồn tại trong `local.db`; export `db` + các bảng.
**Phụ thuộc:** Task 1.

1. [ ] `src/db/schema.ts` — 5 bảng: `settings`, `categories`, `services`, `invoices`, `invoiceItems`. Copy đúng từ plan gốc Task 2 Step 1. **Chú ý:** giá/tiền là `integer`; `discountType` enum `["percent","fixed"]`; `active` mode boolean.
2. [ ] `src/db/index.ts` — libsql client + drizzle instance, `authToken` = `undefined` cho file local. Re-export schema.
3. [ ] `drizzle.config.ts` — `dialect: "turso"`, đọc env.
4. [ ] `package.json` thêm scripts: `"db:push": "drizzle-kit push"`, `"db:studio": "drizzle-kit studio"`.
5. [ ] Push schema: `TURSO_DATABASE_URL=file:local.db npm run db:push` (Git Bash — env inline).
   - Windows PowerShell thay bằng: `$env:TURSO_DATABASE_URL="file:local.db"; npm run db:push`
6. [ ] **[VERIFY]** File `local.db` xuất hiện, size > 0. Hoặc mở studio thấy 5 bảng: `categories`, `invoice_items`, `invoices`, `services`, `settings`.
7. [ ] **[COMMIT]** `feat: add Drizzle schema and Turso client, push to db`

---

### Task 3 — Shared libs (format, calc, invoice-number, validation)
**Mục tiêu:** hàm dùng chung cho cả API và UI. **Đây là lõi logic — làm cẩn thận.**
**Phụ thuộc:** Task 2 (invoice-number đọc `db`).

1. [ ] `src/lib/format.ts` — `formatVND(n)` → `"150.000 ₫"`; `formatDate(iso)` (parse UTC sqlite → vi-VN).
2. [ ] `src/lib/calc.ts` — `computeInvoice(input)`. **Điểm chốt logic:**
   - `subtotal = Σ(priceSnapshot × qty)`
   - discount percent = `round(subtotal × value / 1000)`; fixed = `value`. **Kẹp `[0, subtotal]`**.
   - `taxable = subtotal − discount`; `tax = round(taxable × rate / 1000)`; `total = taxable + tax + tip`.
3. [ ] `src/lib/invoice-number.ts` — `generateInvoiceNumber()` sinh `YYYYMMDD-NNN`, đếm hóa đơn cùng ngày `like 'prefix-%'`.
4. [ ] `src/lib/validation.ts` — zod: `categoryInput`, `serviceInput`, `settingsInput`, `invoiceInput`. **`invoiceInput.items.min(1)`** (chặn hóa đơn rỗng).
5. [ ] **[VERIFY]** `npx tsc --noEmit` → 0 lỗi type.
6. [ ] **[COMMIT]** `feat: add format, calc, invoice-number and zod validation libs`

---

### Task 4 — Settings API + page
**Mục tiêu:** lưu info shop + logo + tax mặc định. Làm **trước** vì PDF (Task 11) và Create invoice (Task 9) cần.
**Phụ thuộc:** Task 2, 3.

1. [ ] `src/app/api/settings/route.ts` — `GET` (getOrCreate 1 dòng), `PUT` (validate + update).
2. [ ] `src/app/settings/page.tsx` — client component: form shop name/address/phone/tax + upload logo (FileReader → base64 data URL).
3. [ ] **[VERIFY]** `/settings`: điền + upload logo + Lưu → "Đã lưu ✓". Reload → giá trị còn (đã vào DB).
4. [ ] **[COMMIT]** `feat: settings API and page (shop info, logo, default tax)`

---

### Task 5 — Categories API
**Mục tiêu:** CRUD danh mục, **chặn xóa nếu còn service** (HTTP 409).
**Phụ thuộc:** Task 2, 3.

1. [ ] `src/app/api/categories/route.ts` — `GET` (order by sortOrder), `POST`.
2. [ ] `src/app/api/categories/[id]/route.ts` — `PUT`, `DELETE` (check `services` con → 409 nếu còn).
3. [ ] **[VERIFY]** curl POST tạo "Sơn gel" → có `id`; GET trả mảng chứa nó.
4. [ ] **[COMMIT]** `feat: categories CRUD API with delete guard`

---

### Task 6 — Services API
**Mục tiêu:** CRUD dịch vụ.
**Phụ thuộc:** Task 2, 3.

1. [ ] `src/app/api/services/route.ts` — `GET`, `POST`.
2. [ ] `src/app/api/services/[id]/route.ts` — `PUT`, `DELETE` (xóa thẳng — hóa đơn cũ an toàn nhờ snapshot).
3. [ ] **[VERIFY]** curl POST service `categoryId:1, price:150000` → tạo được; GET liệt kê.
4. [ ] **[COMMIT]** `feat: services CRUD API`

---

### Task 7 — Services management page (UI)
**Mục tiêu:** màn quản lý danh mục + dịch vụ (thêm/xóa; chưa có sửa — YAGNI).
**Phụ thuộc:** Task 5, 6.

1. [ ] `src/app/services/page.tsx` — client: list danh mục + service theo nhóm, form thêm, nút xóa. Xóa danh mục còn service → `alert` lỗi từ API.
2. [ ] **[VERIFY]** `/services`: thêm "Sơn gel" + "Sơn gel tay" 150000 → hiện `150.000 ₫` đúng nhóm. Xóa danh mục còn dịch vụ → alert "Danh mục còn dịch vụ, không thể xóa".
3. [ ] **[COMMIT]** `feat: services management page (categories + services CRUD UI)`

---

### Task 8 — Invoices API (create/list/get/delete)
**Mục tiêu:** tạo hóa đơn + items, **server tự tính lại** (không tin total client).
**Phụ thuộc:** Task 2, 3.

1. [ ] `src/app/api/invoices/route.ts` — `GET` (list desc), `POST`: validate → `computeInvoice` → `generateInvoiceNumber` → insert invoice → insert items (kèm snapshot).
2. [ ] `src/app/api/invoices/[id]/route.ts` — `GET` (`{invoice, items}`), `DELETE` (xóa items trước, rồi invoice).
3. [ ] **[VERIFY]** curl POST 1 item price 150000 qty 2 → `invoiceNumber` dạng `20260701-001`, `subtotal=300000`, `total=300000`. POST `items:[]` → 400 "Hóa đơn phải có ít nhất 1 dịch vụ".
4. [ ] **[COMMIT]** `feat: invoices API (create with server-side calc, list, get, delete)`

---

### Task 9 — Create invoice page (giỏ + tính tiền live)
**Mục tiêu:** chọn service → giỏ → chỉnh qty → discount/tax/tip → tổng live → Lưu → redirect chi tiết.
**Phụ thuộc:** Task 4, 5, 6, 8.

1. [ ] `src/app/invoices/new/page.tsx` — client: fetch categories/services/settings (lấy `defaultTaxRate`). Giỏ hàng: add/qty/remove. `useMemo(computeInvoice)` cho tổng live. Save POST `/api/invoices` → `router.push(/invoices/[id])`.
2. [ ] **[VERIFY]** `/invoices/new`: bấm dịch vụ → vào giỏ; tăng qty → tổng đổi; set tax 85 → dòng Thuế đúng; Lưu → redirect chi tiết.
3. [ ] **[COMMIT]** `feat: create invoice page with cart and live totals`

---

### Task 10 — Invoice list + detail page
**Mục tiêu:** danh sách lịch sử + trang chi tiết (nút xóa + link tải PDF).
**Phụ thuộc:** Task 8.

1. [ ] `src/app/invoices/page.tsx` — **server component**, `export const dynamic = "force-dynamic"`, query trực tiếp `db`, bảng list.
2. [ ] `src/app/invoices/[id]/page.tsx` — client: fetch chi tiết, bảng items + tổng, nút Xóa (confirm), link `Tải PDF` (chưa chạy tới Task 11).
3. [ ] **[VERIFY]** `/invoices`: thấy hóa đơn Task 9. Bấm mã → chi tiết, items + tổng khớp.
4. [ ] **[COMMIT]** `feat: invoice list and detail pages`

---

### Task 11 — PDF export (document + route + font)
**Mục tiêu:** stream PDF A5 có branding shop + tiếng Việt + "₫" đúng.
**Phụ thuộc:** Task 8, 4.

1. [ ] Tải font vào `public/fonts/`: `Roboto-Regular.ttf`, `Roboto-Bold.ttf` (curl từ googlefonts repo — xem plan gốc Task 11 Step 1). **Bắt buộc** — Helvetica mặc định không có dấu tiếng Việt.
2. [ ] `src/pdf/InvoiceDocument.tsx` — component react-pdf: `Font.register` Roboto (dùng `path.join(process.cwd(), ...)`), header shop + logo, bảng items, khối tổng.
3. [ ] `src/app/api/invoices/[id]/pdf/route.tsx` (**đuôi `.tsx`** vì có JSX) — `export const runtime = "nodejs"`, load invoice + items + settings, `renderToBuffer`, trả `application/pdf` inline.
4. [ ] **[VERIFY]** Chi tiết hóa đơn → "Tải PDF" → tab mới hiện PDF: tên shop + logo, bảng, tổng, tiếng Việt + "₫" không lỗi ô vuông.
5. [ ] **[COMMIT]** `feat: PDF invoice export with Roboto font and shop branding`

---

## Cổng nghiệm thu cuối (sau Task 11)

Chạy end-to-end 1 lần:

- [ ] `/settings` — set shop name + logo + tax mặc định.
- [ ] `/services` — tạo ≥ 1 danh mục + ≥ 2 dịch vụ.
- [ ] `/invoices/new` — chọn dịch vụ, set discount + tip, Lưu.
- [ ] `/invoices` — thấy hóa đơn mới.
- [ ] Chi tiết → Tải PDF → PDF đẹp, số khớp, tiếng Việt OK.
- [ ] Xóa 1 hóa đơn → biến mất khỏi list.
- [ ] Sửa giá 1 service → mở lại hóa đơn CŨ → giá **giữ nguyên** (snapshot OK).
- [ ] `npx tsc --noEmit` → 0 lỗi.

## Bẫy hay gặp (đọc trước khi code)

| Bẫy | Cách tránh |
|---|---|
| Dùng float cho tiền | Luôn integer đồng. `Math.round` khi chia. |
| Quên phần nghìn | 8.5% = `85`, chia `/1000`. UI ghi rõ label "phần nghìn". |
| Tip bị đánh thuế | `total = taxable + tax + tip` — tip cộng SAU tax. |
| Client gửi total giả | Server `computeInvoice` tính lại, bỏ total client. |
| PDF route đuôi `.ts` | Có JSX → phải `.tsx`. |
| Font PDF lỗi tiếng Việt | Bắt buộc nhúng Roboto, không dùng Helvetica. |
| Xóa hóa đơn còn FK items | Xóa `invoice_items` trước, rồi `invoices`. |
| `@react-pdf` peer dep React 19 | `--legacy-peer-deps`. |

## Chưa làm giai đoạn này (ngoài scope)

- Auth — không có.
- Unit test tự động — không.
- Deploy Vercel — sau, khi user yêu cầu (đổi env sang `libsql://...` + token Turso, code không đổi).
- Sửa (edit) service/category inline — API `PUT` đã sẵn, UI thêm sau nếu cần.
