import { NextResponse } from "next/server";
import { db, sessions } from "@/db";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

export async function POST() {
  const store = await cookies();
  const token = store.get("token")?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("token", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
