import { NextResponse } from "next/server";
import { db, invoices, invoiceItems } from "@/db";
import { eq } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, Number(id)));
  if (!invoice) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoice.id));
  return NextResponse.json({ invoice, items });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, Number(id)));
  await db.delete(invoices).where(eq(invoices.id, Number(id)));
  return NextResponse.json({ ok: true });
}
