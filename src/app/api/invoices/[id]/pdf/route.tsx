import { renderToBuffer } from "@react-pdf/renderer";
import { db, invoices, invoiceItems, settings } from "@/db";
import { eq } from "drizzle-orm";
import { InvoiceDocument } from "@/pdf/InvoiceDocument";

export const runtime = "nodejs"; // react-pdf cần Node runtime (fs cho font), không Edge

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, Number(id)));
  if (!invoice) return new Response("Không tìm thấy", { status: 404 });
  const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoice.id));
  const [shop] = await db.select().from(settings).limit(1);

  const buffer = await renderToBuffer(
    <InvoiceDocument
      shop={shop ?? { shopName: "", address: "", phone: "", logo: null, showDiscount: true, showTax: true, showTip: true, showLogo: true }}
      invoice={invoice}
      items={items}
    />
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
    },
  });
}
