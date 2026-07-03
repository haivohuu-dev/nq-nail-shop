import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
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

  let finalQrImage: string | null = null;
  if (shop?.enableQr) {
    if (shop.qrImage) {
      finalQrImage = shop.qrImage;
    } else if (shop.qrText) {
      try {
        finalQrImage = await QRCode.toDataURL(shop.qrText, { margin: 1 });
      } catch (err) {
        console.error("QR Generate error:", err);
      }
    }
  }

  const shopProps = shop ? { ...shop, finalQrImage } : { shopName: "", address: "", phone: "", logo: null, showDiscount: true, showTax: true, showTip: true, showLogo: true, showSignature: false, signature: null, finalQrImage: null };

  const buffer = await renderToBuffer(
    <InvoiceDocument
      shop={shopProps}
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
