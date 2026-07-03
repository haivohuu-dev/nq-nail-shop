# Deploy lên Vercel (DB libSQL / Turso)

## Tin tốt

Dự án **đã dùng libSQL (Turso)**, không phải SQLite thuần. Code sẵn sàng cho cloud, **không cần sửa code**.

- `src/db/index.ts` → `createClient` đọc `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`
- `drizzle.config.ts` → `dialect: "turso"`
- `.env.example` đã ghi chú: `# Dev: file local. Deploy: đổi sang libsql://... + token Turso`

Ở local dùng `file:local.db`. Lên production đổi sang libSQL remote (chạy qua HTTP, stateless, hợp serverless của Vercel).

### Vì sao SQLite thuần KHÔNG chạy được trên Vercel

Vercel serverless = filesystem tạm thời (ephemeral) + chỉ đọc (trừ `/tmp`). File `.db` không được lưu, ghi mất sau mỗi lần gọi. → Phải dùng DB remote. Turso giải quyết việc này.

---

## Bước 1 — Tạo DB trên Turso

```bash
# Cài CLI (chỉ 1 lần)
curl -sSfL https://tur.so/install.sh | bash   # hoặc: winget install turso.turso

turso auth signup
turso db create nail-salon-invoice
turso db show nail-salon-invoice --url        # → libsql://...
turso db tokens create nail-salon-invoice     # → auth token
```

## Bước 2 — Push schema lên Turso

Đặt 2 biến trong `.env.local` sang giá trị Turso, rồi chạy:

```bash
npx drizzle-kit push
```

(Config sẵn `dialect: "turso"`, tự đọc `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`.)

## Bước 3 — Khai báo biến môi trường trên Vercel

Project → Settings → Environment Variables:

| Key | Value |
|-----|-------|
| `TURSO_DATABASE_URL` | `libsql://...turso.io` |
| `TURSO_AUTH_TOKEN` | token từ Bước 1 |

Thêm các biến khác app cần (`AUTH_SECRET`, v.v. — kiểm tra `.env.local`).

## Bước 4 — Deploy

Push branch → import project vào Vercel → Deploy.

---

## Lưu ý

- `local.db` đã nằm trong `.gitignore` → không lộ dữ liệu. Tốt.
- Dữ liệu local **không tự chuyển** lên Turso. Nếu cần seed production:
  - Chạy lại seed script trỏ vào Turso URL, hoặc
  - `turso db shell nail-salon-invoice < dump.sql`
- Turso free tier đủ dùng cho app hóa đơn.
- `file:local.db` chỉ dùng cho dev — production luôn dùng URL `libsql://...`.
