import { NextResponse } from "next/server";
import { db, users, sessions } from "@/db";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";
import { hashPassword } from "@/lib/auth";

const profileInput = z.object({
  name: z.string().min(1, "Tên bắt buộc"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự").optional(),
});

export async function PUT(req: Request) {
  const store = await cookies();
  const token = store.get("token")?.value;
  if (!token) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const [session] = await db.select().from(sessions).where(eq(sessions.token, token));
  if (!session) return NextResponse.json({ error: "Phiên không hợp lệ" }, { status: 401 });

  const parsed = profileInput.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const patch: { name: string; passwordHash?: string } = { name: parsed.data.name };
  if (parsed.data.password) patch.passwordHash = hashPassword(parsed.data.password);

  const [updated] = await db
    .update(users)
    .set(patch)
    .where(eq(users.id, session.userId))
    .returning();

  return NextResponse.json({ user: { id: updated.id, email: updated.email, name: updated.name } });
}
