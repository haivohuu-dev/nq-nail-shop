import { Document, Page, Text, View, StyleSheet, Font, Image } from "@react-pdf/renderer";
import path from "path";
import { formatDate } from "@/lib/format";

Font.register({
  family: "Roboto",
  fonts: [
    { src: path.join(process.cwd(), "public/fonts/Roboto-Regular.ttf") },
    { src: path.join(process.cwd(), "public/fonts/Roboto-Bold.ttf"), fontWeight: "bold" },
  ],
});

const vnd = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n));

const s = StyleSheet.create({
  page: { fontFamily: "Roboto", fontSize: 11, padding: 32, color: "#111" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  shop: { fontSize: 16, fontWeight: "bold" },
  muted: { color: "#555", fontSize: 10 },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 4, textAlign: "right" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderBottom: "1px solid #eee" },
  th: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottom: "1px solid #333", fontWeight: "bold" },
  numCol: { width: 20 },
  nameCol: { flex: 1 },
  totals: { marginTop: 12, marginLeft: "auto", width: 220 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  grand: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderTop: "1px solid #333", fontWeight: "bold", fontSize: 13 },
  logo: { height: 48, marginBottom: 6 },
  signature: { marginTop: 24, marginLeft: "auto", width: 160, alignItems: "flex-end" },
  signatureImg: { width: 140, height: 60, objectFit: "contain" },
});

type Shop = {
  shopName: string; address: string; phone: string; logo: string | null;
  showDiscount?: boolean; showTax?: boolean; showTip?: boolean; showLogo?: boolean;
  finalQrImage?: string | null;
  showSignature?: boolean; signature?: string | null;
};
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
            {shop.showLogo !== false && shop.logo ? <Image src={shop.logo} style={s.logo} /> : null}
            <Text style={s.shop}>{shop.shopName || "Nail Salon"}</Text>
            <Text style={s.muted}>{shop.address}</Text>
            <Text style={s.muted}>{shop.phone}</Text>
          </View>
          <View>
            <Text style={s.title}>HÓA ĐƠN</Text>
            <Text style={s.muted}>{invoice.invoiceNumber}</Text>
            <Text style={s.muted}>{formatDate(invoice.createdAt)}</Text>
          </View>
        </View>

        <Text style={s.muted}>Khách: {invoice.customerName || "—"}  ·  {invoice.customerPhone}</Text>

        <View style={{ marginTop: 10 }}>
          <View style={s.th}>
            <Text style={s.numCol}>#</Text>
            <Text style={s.nameCol}>Dịch vụ</Text>
            <Text>Thành tiền (VNĐ)</Text>
          </View>
          {items.map((it, i) => (
            <View style={s.row} key={i}>
              <Text style={s.numCol}>{i + 1}</Text>
              <Text style={s.nameCol}>{it.nameSnapshot} × {it.qty}</Text>
              <Text>{vnd(it.priceSnapshot * it.qty)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totals}>
          <View style={s.totalRow}><Text>Tạm tính (VNĐ)</Text><Text>{vnd(invoice.subtotal)}</Text></View>
          {shop.showDiscount !== false ? (
            <View style={s.totalRow}><Text>Giảm giá (VNĐ)</Text><Text>-{vnd(invoice.discountAmount)}</Text></View>
          ) : null}
          {shop.showTax !== false ? (
            <View style={s.totalRow}><Text>Thuế (VNĐ)</Text><Text>{vnd(invoice.taxAmount)}</Text></View>
          ) : null}
          {shop.showTip !== false ? (
            <View style={s.totalRow}><Text>Tip (VNĐ)</Text><Text>{vnd(invoice.tipAmount)}</Text></View>
          ) : null}
          <View style={s.grand}><Text>Tổng (VNĐ)</Text><Text>{vnd(invoice.total)}</Text></View>
        </View>

        {invoice.note ? <Text style={[s.muted, { marginTop: 12 }]}>Ghi chú: {invoice.note}</Text> : null}

        {shop.showSignature && shop.signature ? (
          <View style={s.signature}>
            <Text style={s.muted}>Chữ ký</Text>
            <Image src={shop.signature} style={s.signatureImg} />
          </View>
        ) : null}

        {shop.finalQrImage ? (
          <View style={{ marginTop: 20, alignItems: "center" }}>
            <Image src={shop.finalQrImage} style={{ width: 100, height: 100, marginBottom: 8 }} />
            <Text style={s.muted}>Quét mã để thanh toán / liên kết</Text>
          </View>
        ) : (
          <Text style={[s.muted, { marginTop: 20, textAlign: "center" }]}>Cảm ơn quý khách!</Text>
        )}

      </Page>
    </Document>
  );
}
