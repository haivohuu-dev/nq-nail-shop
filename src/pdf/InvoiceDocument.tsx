import { Document, Page, Text, View, StyleSheet, Font, Image } from "@react-pdf/renderer";
import path from "path";

Font.register({
  family: "Roboto",
  fonts: [
    { src: path.join(process.cwd(), "public/fonts/Roboto-Regular.ttf") },
    { src: path.join(process.cwd(), "public/fonts/Roboto-Bold.ttf"), fontWeight: "bold" },
  ],
});

const vnd = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n)) + " ₫";

const s = StyleSheet.create({
  page: { fontFamily: "Roboto", fontSize: 11, padding: 32, color: "#111" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  shop: { fontSize: 16, fontWeight: "bold" },
  muted: { color: "#555", fontSize: 10 },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 4, textAlign: "right" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderBottom: "1px solid #eee" },
  th: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottom: "1px solid #333", fontWeight: "bold" },
  totals: { marginTop: 12, marginLeft: "auto", width: 220 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  grand: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderTop: "1px solid #333", fontWeight: "bold", fontSize: 13 },
  logo: { height: 48, marginBottom: 6 },
});

type Shop = { shopName: string; address: string; phone: string; logo: string | null };
type Invoice = {
  invoiceNumber: string; customerName: string; customerPhone: string; createdAt: string;
  subtotal: number; discountAmount: number; taxAmount: number; tipAmount: number; total: number; note: string;
};
type Item = { nameSnapshot: string; priceSnapshot: number; qty: number };

export function InvoiceDocument({ shop, invoice, items }: { shop: Shop; invoice: Invoice; items: Item[] }) {
  return (
    <Document>
      <Page size="A5" style={s.page}>
        <View style={s.header}>
          <View>
            {shop.logo ? <Image src={shop.logo} style={s.logo} /> : null}
            <Text style={s.shop}>{shop.shopName || "Nail Salon"}</Text>
            <Text style={s.muted}>{shop.address}</Text>
            <Text style={s.muted}>{shop.phone}</Text>
          </View>
          <View>
            <Text style={s.title}>HÓA ĐƠN</Text>
            <Text style={s.muted}>{invoice.invoiceNumber}</Text>
            <Text style={s.muted}>{invoice.createdAt}</Text>
          </View>
        </View>

        <Text style={s.muted}>Khách: {invoice.customerName || "—"}  ·  {invoice.customerPhone}</Text>

        <View style={{ marginTop: 10 }}>
          <View style={s.th}><Text>Dịch vụ</Text><Text>Thành tiền</Text></View>
          {items.map((it, i) => (
            <View style={s.row} key={i}>
              <Text>{it.nameSnapshot} × {it.qty}</Text>
              <Text>{vnd(it.priceSnapshot * it.qty)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totals}>
          <View style={s.totalRow}><Text>Tạm tính</Text><Text>{vnd(invoice.subtotal)}</Text></View>
          <View style={s.totalRow}><Text>Giảm giá</Text><Text>-{vnd(invoice.discountAmount)}</Text></View>
          <View style={s.totalRow}><Text>Thuế</Text><Text>{vnd(invoice.taxAmount)}</Text></View>
          <View style={s.totalRow}><Text>Tip</Text><Text>{vnd(invoice.tipAmount)}</Text></View>
          <View style={s.grand}><Text>Tổng</Text><Text>{vnd(invoice.total)}</Text></View>
        </View>

        {invoice.note ? <Text style={[s.muted, { marginTop: 12 }]}>Ghi chú: {invoice.note}</Text> : null}
        <Text style={[s.muted, { marginTop: 20, textAlign: "center" }]}>Cảm ơn quý khách!</Text>
      </Page>
    </Document>
  );
}
