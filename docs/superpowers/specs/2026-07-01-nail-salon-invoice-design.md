# Thiết kế: Web tính tiền & xuất hóa đơn PDF cho tiệm nail

- **Ngày:** 2026-07-01
- **Trạng thái:** Đã duyệt design, chuẩn bị viết plan

## 1. Tổng quan

Web app nội bộ để tiệm nail tính tiền cho khách và xuất PDF hóa đơn gửi khách.

Hai chức năng chính:
1. Quản lý danh mục + dịch vụ kèm phí (CRUD).
2. Tạo hóa đơn cho khách, xuất PDF.

## 2. Quyết định đã chốt

| Vấn đề | Quyết định |
|---|---|
| Lưu trữ dữ liệu | Turso (libSQL / SQLite cloud) — giữ SQLite thật, deploy free được |
| Xác thực (auth) | Không có. App nội bộ, một mình chủ tiệm dùng. Có thể thêm sau |
| Nội dung hóa đơn | Thuế (tax), giảm giá (discount), tip, thông tin khách, lưu lịch sử |
| Tiền tệ | VND |
| Branding PDF | Có logo + thông tin shop (tên, địa chỉ, SDT), cấu hình được trong Settings |
| Unit test | Không làm ở giai đoạn này |
| Deploy | Chưa deploy. Thực hiện Vercel khi được yêu cầu sau |

## 3. Stack công nghệ

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS** cho UI
- **Drizzle ORM** + `@libsql/client` kết nối Turso
- **@react-pdf/renderer** sinh PDF, nhúng font **Roboto** để hiển thị chữ tiếng Việt và ký hiệu "đ"
- **zod** validate dữ liệu API

Lý do chọn Next.js full-stack: một codebase lo cả UI + API (route handlers), một repo, deploy free dễ (Vercel), PDF sinh được cả server/client mà không cần headless Chrome.

## 4. Data model

Năm bảng:

### settings (một dòng duy nhất)
- `id`
- `shop_name`, `address`, `phone`
- `logo` (base64 hoặc URL)
- `currency` = 'VND'
- `default_tax_rate`

### categories — danh mục
- `id`, `name`, `sort_order`, `created_at`

### services — dịch vụ
- `id`
- `category_id` → categories
- `name`
- `price` (INTEGER, đơn vị đồng VND — **không dùng float**, tránh sai số)
- `active`, `sort_order`

### invoices — hóa đơn (lịch sử)
- `id`
- `invoice_number` (tự sinh, dạng `20260701-001`)
- `customer_name`, `customer_phone`
- `subtotal`
- `discount_type` ('percent' | 'fixed'), `discount_value`, `discount_amount`
- `tax_rate`, `tax_amount`
- `tip_amount`
- `total`
- `note`, `created_at`

### invoice_items — dòng dịch vụ trong hóa đơn
- `id`
- `invoice_id` → invoices
- `service_id` (nullable)
- `name_snapshot`, `price_snapshot`, `qty`

**Snapshot:** `invoice_items` lưu **bản sao** tên + giá dịch vụ tại thời điểm bán (`name_snapshot`, `price_snapshot`). Sau này sửa/xóa service, hóa đơn cũ giữ nguyên. Đúng chuẩn kế toán.

## 5. Cấu trúc trang (routes)

| Route | Chức năng |
|---|---|
| `/` | redirect → `/invoices` |
| `/services` | CRUD danh mục + dịch vụ (màn quản lý chính) |
| `/invoices` | danh sách lịch sử hóa đơn |
| `/invoices/new` | tạo hóa đơn |
| `/invoices/[id]` | xem chi tiết + tải PDF |
| `/settings` | thông tin shop, logo, tax mặc định |

## 6. API (route handlers)

```
GET/POST      /api/categories          + /[id] PUT DELETE
GET/POST      /api/services            + /[id] PUT DELETE
GET/POST      /api/invoices            + /[id] GET DELETE
GET/PUT       /api/settings
GET           /api/invoices/[id]/pdf   → stream PDF
```

- Validate input bằng zod → lỗi trả HTTP 400.
- DB lỗi → HTTP 500.

## 7. Flow tạo hóa đơn

1. Chọn service từ danh sách theo danh mục → thêm vào giỏ, chỉnh số lượng (qty).
2. Nhập tên + SDT khách.
3. Set giảm giá (percent hoặc số tiền cố định), tax rate (mặc định lấy từ settings), tip.
4. Tính tiền:

```
subtotal  = Σ(price × qty)
discount  = discount_type = 'percent' ? subtotal × value%  :  value (số cố định)
taxable   = subtotal − discount
tax       = taxable × tax_rate
total     = taxable + tax + tip
```

**Thứ tự tính:** giảm giá áp trước thuế; tip cộng sau thuế và KHÔNG bị đánh thuế.

5. Lưu → sinh `invoice_number` → redirect `/invoices/[id]`.
6. Tải PDF gửi khách.

## 8. Xử lý lỗi / edge case

- Hóa đơn rỗng (không có dòng dịch vụ nào) → không cho lưu.
- Xóa danh mục còn chứa service → chặn, báo lỗi (không cascade xóa service).
- Font PDF load fail → fallback font mặc định.

## 9. Milestone thực hiện

1. Init Next.js + Tailwind + Drizzle + Turso; định nghĩa schema + migrate.
2. Trang Settings (cần thông tin shop trước để PDF dùng).
3. Services CRUD (danh mục + dịch vụ).
4. Logic tính tiền (`calc.ts`).
5. Tạo hóa đơn (`/invoices/new`): giỏ + tính tiền + lưu.
6. Danh sách + chi tiết hóa đơn.
7. Xuất PDF.
8. (Sau, khi được yêu cầu) Deploy Vercel: env `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`.
