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
