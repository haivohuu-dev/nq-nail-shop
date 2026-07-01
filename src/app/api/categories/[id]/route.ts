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
