export type CalcItem = { priceSnapshot: number; qty: number };

export type CalcInput = {
  items: CalcItem[];
  discountType: "percent" | "fixed";
  discountValue: number; // percent: % thật (10 = 10%); fixed: đồng
  taxRate: number;       // % thật (10 = 10%)
  tipAmount: number;     // đồng
};

export type CalcResult = {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
};

export function computeInvoice(input: CalcInput): CalcResult {
  const subtotal = input.items.reduce((s, it) => s + it.priceSnapshot * it.qty, 0);

  let discountAmount =
    input.discountType === "percent"
      ? Math.round((subtotal * input.discountValue) / 100)
      : input.discountValue;
  discountAmount = Math.max(0, Math.min(discountAmount, subtotal)); // kẹp trong [0, subtotal]

  const taxable = subtotal - discountAmount;
  const taxAmount = Math.round((taxable * input.taxRate) / 100);
  const total = taxable + taxAmount + input.tipAmount;

  return { subtotal, discountAmount, taxAmount, total };
}
