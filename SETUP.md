# Hướng dẫn chạy source & tạo Database

App quản lý hoá đơn tiệm nail. Stack: **Next.js 16 + Drizzle ORM + libSQL/Turso** (dev dùng file SQLite local).

## 1. Yêu cầu

- Node.js **20+**
- npm (đi kèm Node)

## 2. Cài dependencies

```bash
npm install
```

## 3. Cấu hình biến môi trường

Tạo file `.env.local` từ mẫu:

```bash
cp .env.example .env.local
```

Nội dung `.env.local` (dev — dùng file SQLite local, không cần token):

```env
TURSO_DATABASE_URL=file:local.db
TURSO_AUTH_TOKEN=
```

> Deploy production: đổi `TURSO_DATABASE_URL` sang `libsql://...` và điền `TURSO_AUTH_TOKEN` của Turso.

## 4. Tạo Database

Chạy theo thứ tự:

```bash
# 4.1 Tạo bảng từ schema (categories, services, invoices, invoice_items, settings)
npm run db:push

# 4.2 Tạo bảng users/sessions + tài khoản admin
npm run db:auth

# 4.3 (tuỳ chọn) Seed dữ liệu mẫu tiếng Việt
npm run db:seed
```

Sau bước này có file `local.db` ở thư mục gốc = database.

**Tài khoản admin mặc định** (từ `db:auth`):

| Field | Value |
|-------|-------|
| Email | `admin@nail.local` |
| Password | `admin123` |

## 5. Chạy dev server

```bash
npm run dev
```

Mở http://localhost:3000

## Scripts khác

| Lệnh | Việc |
|------|------|
| `npm run db:push` | Đồng bộ schema (`src/db/schema.ts`) → DB |
| `npm run db:studio` | Mở Drizzle Studio (xem/sửa data qua UI) |
| `npm run db:auth` | Tạo bảng auth + admin |
| `npm run db:seed` | Nạp lại data mẫu (xoá data cũ trước) |
| `npm run build` | Build production |
| `npm run start` | Chạy bản build |

## Reset DB (làm lại từ đầu)

```bash
rm local.db
npm run db:push && npm run db:auth && npm run db:seed
```

## Lưu ý

- `db:seed` **xoá sạch** categories/services/invoices/settings trước khi nạp — đừng chạy trên data thật.
- Tiếng Việt: script đọc UTF-8 nên không lỗi encoding. Đảm bảo terminal dùng UTF-8.
- Windows PowerShell: thay `cp` bằng `Copy-Item .env.example .env.local`, `rm` bằng `Remove-Item local.db`.
