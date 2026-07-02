import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Chặn mọi route: chưa có cookie token -> đẩy về /signin.
// Bỏ qua: /signin, /api/auth/*, tài nguyên tĩnh (đã loại ở matcher bên dưới).
export function proxy(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (token) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // API khác auth: trả 401 thay vì redirect (fetch không nên nhận HTML).
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/signin";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Áp dụng cho tất cả trừ: signin, api/auth, _next, favicon, images
    "/((?!signin|api/auth|_next/static|_next/image|favicon.ico|images).*)",
  ],
};
