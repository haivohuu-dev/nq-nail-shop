import { db, invoices } from "@/db";
import { desc } from "drizzle-orm";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import InvoiceList from "@/components/invoice/InvoiceList";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const rows = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      customerName: invoices.customerName,
      customerPhone: invoices.customerPhone,
      total: invoices.total,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .orderBy(desc(invoices.id));

  return (
    <div>
      <PageBreadcrumb pageTitle="Hóa đơn" />
      <div className="space-y-6">
        <InvoiceList invoices={rows} />
      </div>
    </div>
  );
}
