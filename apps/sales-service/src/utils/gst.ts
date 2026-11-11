import { INVOICE_NUMBER_PREFIXES, INVOICE_TYPES } from "@crm-platform/shared-types";

export type DiscountType = "percentage" | "flat";

export interface TaxableItem {
  quantity: number;
  rate: number;
  discount: number;
  discountType: DiscountType;
  taxRate: number;
}

export function isInterStateTransaction(sellerState?: string, buyerState?: string): boolean {
  if (!sellerState || !buyerState) return false;
  return sellerState.toLowerCase() !== buyerState.toLowerCase();
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateTax(taxableAmount: number, taxRate: number, isInterState: boolean) {
  if (isInterState) {
    const igst = round2((taxableAmount * taxRate) / 100);
    return { cgst: 0, sgst: 0, igst, totalTax: igst };
  }
  const halfRate = taxRate / 2;
  const cgst = round2((taxableAmount * halfRate) / 100);
  const sgst = round2((taxableAmount * halfRate) / 100);
  return { cgst, sgst, igst: 0, totalTax: cgst + sgst };
}

export function calculateInvoiceTotals<T extends TaxableItem>(items: T[], isInterState: boolean) {
  let subtotal = 0;
  let totalDiscount = 0;
  let taxableAmount = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalTax = 0;

  const processedItems = items.map((item) => {
    const gross = item.quantity * item.rate;
    const discountAmount = item.discountType === "percentage" ? gross * (item.discount / 100) : item.discount;
    const itemTaxable = Math.max(0, gross - discountAmount);
    const tax = calculateTax(itemTaxable, item.taxRate, isInterState);

    subtotal += gross;
    totalDiscount += discountAmount;
    taxableAmount += itemTaxable;
    totalCgst += tax.cgst;
    totalSgst += tax.sgst;
    totalIgst += tax.igst;
    totalTax += tax.totalTax;

    return { ...item, taxAmount: tax.totalTax, amount: itemTaxable + tax.totalTax };
  });

  const grandTotalExact = taxableAmount + totalTax;
  const grandTotal = Math.round(grandTotalExact);
  const roundOff = round2(grandTotal - grandTotalExact);

  return {
    items: processedItems,
    subtotal: round2(subtotal),
    totalDiscount: round2(totalDiscount),
    taxableAmount: round2(taxableAmount),
    cgst: round2(totalCgst),
    sgst: round2(totalSgst),
    igst: round2(totalIgst),
    totalTax: round2(totalTax),
    roundOff,
    grandTotal,
  };
}

export function currentFinancialYear(now = new Date()): string {
  const year = now.getFullYear();
  return now.getMonth() >= 3
    ? `${year}-${String(year + 1).slice(2)}`
    : `${year - 1}-${String(year).slice(2)}`;
}

export function invoicePrefixFor(type?: string): string {
  const key = (INVOICE_TYPES as readonly string[]).includes(type || "")
    ? (type as (typeof INVOICE_TYPES)[number])
    : "tax_invoice";
  return INVOICE_NUMBER_PREFIXES[key];
}

export function formatInvoiceNumber(prefix: string, sequence: number, financialYear = currentFinancialYear()): string {
  return `${prefix}/${financialYear}/${String(sequence).padStart(4, "0")}`;
}

export function nextSequenceFrom(lastNumber?: string | null): number {
  if (!lastNumber) return 1;
  const parts = lastNumber.split("/");
  const lastSeq = parseInt(parts[parts.length - 1], 10);
  return Number.isNaN(lastSeq) ? 1 : lastSeq + 1;
}
