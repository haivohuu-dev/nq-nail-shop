import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shopName: text("shop_name").notNull().default(""),
  address: text("address").notNull().default(""),
  phone: text("phone").notNull().default(""),
  logo: text("logo"), // base64 data URL hoặc URL, nullable
  currency: text("currency").notNull().default("VND"),
  defaultTaxRate: integer("default_tax_rate").notNull().default(0), // phần nghìn: 85 = 8.5%
});

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const services = sqliteTable("services", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id").notNull().references(() => categories.id),
  name: text("name").notNull(),
  price: integer("price").notNull().default(0), // VND, đồng
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const invoices = sqliteTable("invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceNumber: text("invoice_number").notNull().unique(),
  customerName: text("customer_name").notNull().default(""),
  customerPhone: text("customer_phone").notNull().default(""),
  subtotal: integer("subtotal").notNull(),
  discountType: text("discount_type", { enum: ["percent", "fixed"] }).notNull().default("fixed"),
  discountValue: integer("discount_value").notNull().default(0), // percent: phần nghìn; fixed: đồng
  discountAmount: integer("discount_amount").notNull().default(0),
  taxRate: integer("tax_rate").notNull().default(0), // phần nghìn
  taxAmount: integer("tax_amount").notNull().default(0),
  tipAmount: integer("tip_amount").notNull().default(0),
  total: integer("total").notNull(),
  note: text("note").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const invoiceItems = sqliteTable("invoice_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id),
  serviceId: integer("service_id").references(() => services.id), // nullable
  nameSnapshot: text("name_snapshot").notNull(),
  priceSnapshot: integer("price_snapshot").notNull(),
  qty: integer("qty").notNull().default(1),
});
