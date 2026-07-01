import { NextResponse } from "next/server";
import { db, invoices, invoiceItems } from "@/db";
import { invoiceInput } from "@/lib/validation";
import { computeInvoice } from "@/lib/calc";
import { generateInvoiceNumber } from "@/lib/invoice-number";
import { desc } from "drizzle-orm";

export async function GET() {
  const rows = await db.select().from(invoices).orderBy(desc(invoices.id));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const parsed = invoiceInput.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const calc = computeInvoice({
    items: data.items.map((i) => ({ priceSnapshot: i.priceSnapshot, qty: i.qty })),
    discountType: data.discountType,
    discountValue: data.discountValue,
    taxRate: data.taxRate,
    tipAmount: data.tipAmount,
  });

  const invoiceNumber = await generateInvoiceNumber();

  const [invoice] = await db.insert(invoices).values({
    invoiceNumber,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    subtotal: calc.subtotal,
    discountType: data.discountType,
    discountValue: data.discountValue,
    discountAmount: calc.discountAmount,
    taxRate: data.taxRate,
    taxAmount: calc.taxAmount,
    tipAmount: data.tipAmount,
    total: calc.total,
    note: data.note,
  }).returning();

  await db.insert(invoiceItems).values(
    data.items.map((i) => ({
      invoiceId: invoice.id,
      serviceId: i.serviceId,
      nameSnapshot: i.nameSnapshot,
      priceSnapshot: i.priceSnapshot,
      qty: i.qty,
    }))
  );

  return NextResponse.json(invoice, { status: 201 });
}
