import { z } from "zod";

export const categoryInput = z.object({
  name: z.string().min(1, "Tên danh mục bắt buộc"),
  sortOrder: z.number().int().optional(),
});

export const serviceInput = z.object({
  categoryId: z.number().int(),
  name: z.string().min(1, "Tên dịch vụ bắt buộc"),
  price: z.number().int().min(0),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const settingsInput = z.object({
  shopName: z.string(),
  address: z.string(),
  phone: z.string(),
  logo: z.string().nullable(),
  defaultTaxRate: z.number().int().min(0),
  showDiscount: z.boolean().optional(),
  showTax: z.boolean().optional(),
  showTip: z.boolean().optional(),
  showLogo: z.boolean().optional(),
  enableQr: z.boolean().optional(),
  qrImage: z.string().nullable().optional(),
  qrText: z.string().optional(),
  showSignature: z.boolean().optional(),
  signature: z.string().nullable().optional(),
});

export const invoiceInput = z.object({
  customerName: z.string(),
  customerPhone: z.string(),
  discountType: z.enum(["percent", "fixed"]),
  discountValue: z.number().int().min(0),
  taxRate: z.number().int().min(0),
  tipAmount: z.number().int().min(0),
  note: z.string(),
  items: z
    .array(
      z.object({
        serviceId: z.number().int().nullable(),
        nameSnapshot: z.string().min(1),
        priceSnapshot: z.number().int().min(0),
        qty: z.number().int().min(1),
      })
    )
    .min(1, "Hóa đơn phải có ít nhất 1 dịch vụ"),
});
