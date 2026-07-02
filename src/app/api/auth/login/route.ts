import { NextResponse } from "next/server";
import { db, users, sessions } from "@/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { verifyPassword, generateToken } from "@/lib/auth";

const loginInput = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(1, "Mật khẩu bắt buộc"),
});

const SESSION_DAYS = 7;

export async function POST(req: Request) {
  const parsed = loginInput.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Email hoặc mật khẩu không đúng" }, { status: 401 });
  }

  const token = generateToken();
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  const expiresAt = new Date(Date.now() + maxAge * 1000).toISOString();
  await db.insert(sessions).values({ userId: user.id, token, expiresAt });

  const res = NextResponse.json({
    token,
    expiresAt,
    user: { id: user.id, email: user.email, name: user.name },
  });
  // Cookie httpOnly để middleware chặn route; client không đọc được (an toàn hơn).
  res.cookies.set("token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
