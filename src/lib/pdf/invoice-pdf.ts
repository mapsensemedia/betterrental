import jsPDF from "jspdf";
import { format } from "date-fns";

// ── Logo loader (shared pattern with rental-agreement-pdf) ──

const LOGO_PATH = "/c2c-logo.png";

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Image not found");
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function loadLogo(): Promise<string | null> {
  const result = await loadImageAsBase64(LOGO_PATH);
  if (result) return result;
  try {
    const module = await import("@/assets/c2c-logo.png");
    return module.default;
  } catch {
    return null;
  }
}

// ── PDF Config (matches rental agreement) ──

const M = 28;
const PAGE_W = 612;
const PAGE_H = 792;
const CW = PAGE_W - M * 2;
const L = M;
const R = PAGE_W - M;
const MID = M + CW * 0.5;

// ── Formatting helpers ──

function fmt(n: number): string {
  return `$${n.toFixed(2)}`;
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "MMMM d, yyyy");
  } catch {
    return dateStr;
  }
}

function fmtDateShort(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

// ── Shared drawing helpers (same as rental agreement) ──

function hLine(pdf: jsPDF, y: number) {
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.3);
  pdf.line(L, y, R, y);
}

function sectionTitle(pdf: jsPDF, text: string, x: number, y: number) {
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text(text, x, y);
}

function labelValue(pdf: jsPDF, label: string, value: string, x: number, y: number) {
  pdf.setFontSize(7.5);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(60, 60, 60);
  pdf.text(label, x, y);
  const labelW = pdf.getTextWidth(label);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0, 0, 0);
  pdf.text(value, x + labelW + 3, y);
}

function finRow(pdf: jsPDF, label: string, amount: string, y: number, indent = 8) {
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0, 0, 0);
  pdf.text(label, L + indent, y);
  pdf.text(amount, R - 4, y, { align: "right" });
}

function finRowBold(pdf: jsPDF, label: string, amount: string, y: number) {
  pdf.setFontSize(7.5);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text(label, L, y);
  pdf.text(amount, R - 4, y, { align: "right" });
}

// ── Data interface ──

export interface InvoicePdfData {
  invoiceNumber: string;
  status: string;
  issuedAt: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  bookingCode: string;
  vehicleName: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  pickupLocation?: string;
  returnLocation?: string;
  dailyRate?: number;
  protectionPlan?: string;
  protectionDailyRate?: number;
  protectionTotal?: number;
  deliveryFee?: number;
  lineItems: { description: string; amount: number; qty?: number; rate?: number; days?: number }[];
  rentalSubtotal: number;
  differentDropoffFee: number;
  addonsTotal: number;
  feesTotal: number;
  taxesTotal: number;
  pstAmount?: number;
  gstAmount?: number;
  lateFees: number;
  damageCharges: number;
  grandTotal: number;
  paymentsReceived: number;
  amountDue: number;
  depositHeld: number;
  depositReleased: number;
  depositCaptured: number;
  notes: string | null;
}

// ── Main export (now async for logo loading) ──

export async function generateInvoicePdf(data: InvoicePdfData) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const logoBase64 = await loadLogo();

  const SEC_GAP = 8;
  const TITLE_GAP = 11;
  const ROW_H = 11;
  const FIN_ROW_H = 10;
  const FIN_HEAD_H = 11;

  let y = M;

  // ─────────────────────────────────────────────
  // HEADER
  // ─────────────────────────────────────────────
  if (logoBase64) {
    try { pdf.addImage(logoBase64, "PNG", L, y - 2, 55, 20); } catch { /* skip */ }
  }
  pdf.setFontSize(15);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text("C2C CAR RENTAL", PAGE_W / 2, y + 8, { align: "center" });
  pdf.setFontSize(8.5);
  pdf.text("INVOICE", PAGE_W / 2, y + 20, { align: "center" });

  // Status badge (top right)
  const statusText = (data.status || "draft").toUpperCase();
  pdf.setFontSize(7);
  const statusW = pdf.getTextWidth(statusText) + 12;
  const isPaid = data.status === "paid";
  const isIssued = data.status === "issued" || isPaid;
  pdf.setFillColor(isPaid ? 34 : isIssued ? 200 : 150, isPaid ? 197 : isIssued ? 140 : 150, isPaid ? 94 : isIssued ? 30 : 150);
  pdf.roundedRect(R - statusW, y - 2, statusW, 14, 3, 3, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.text(statusText, R - statusW + 6, y + 8);
  pdf.setTextColor(0, 0, 0);

  y += 26;

  // Contact info bar (same as rental agreement)
  pdf.setFillColor(245, 245, 245);
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.rect(L, y - 3, CW, 11, "FD");
  pdf.setFontSize(5.5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(60, 60, 60);
  pdf.text(
    "Surrey, BC  |  Contact: (604) 771-3995  |  24/7 Support: (778) 580-0498  |  Roadside: (604) 771-3995",
    PAGE_W / 2, y + 4, { align: "center" }
  );
  pdf.setTextColor(0, 0, 0);
  y += 13;

  // Invoice number + date row
  pdf.setFontSize(7.5);
  pdf.setFont("helvetica", "bold");
  pdf.text("Invoice Number:", L, y);
  pdf.setFont("helvetica", "normal");
  pdf.text(data.invoiceNumber, L + 72, y);
  pdf.setFont("helvetica", "bold");
  pdf.text("Date Issued:", MID, y);
  pdf.setFont("helvetica", "normal");
  pdf.text(fmtDate(data.issuedAt), MID + 55, y);
  y += 10;

  hLine(pdf, y);
  y += SEC_GAP;

  // ─────────────────────────────────────────────
  // CUSTOMER INFORMATION
  // ─────────────────────────────────────────────
  sectionTitle(pdf, "CUSTOMER INFORMATION", L, y);
  y += TITLE_GAP;

  const displayName = data.customerName && !data.customerName.includes("@")
    ? data.customerName : "—";
  labelValue(pdf, "Name:", displayName, L, y);
  labelValue(pdf, "Email:", data.customerEmail || "—", MID, y);
  y += ROW_H;

  if (data.customerPhone) {
    labelValue(pdf, "Phone:", data.customerPhone, L, y);
    y += ROW_H;
  }

  y += 2;
  hLine(pdf, y);
  y += SEC_GAP;

  // ─────────────────────────────────────────────
  // BOOKING DETAILS
  // ─────────────────────────────────────────────
  sectionTitle(pdf, "BOOKING DETAILS", L, y);
  y += TITLE_GAP;

  labelValue(pdf, "Booking Code:", data.bookingCode, L, y);
  labelValue(pdf, "Vehicle:", data.vehicleName || "—", MID, y);
  y += ROW_H;

  if (data.pickupLocation || data.returnLocation) {
    labelValue(pdf, "Pickup:", data.pickupLocation || "—", L, y);
    labelValue(pdf, "Return:", data.returnLocation || data.pickupLocation || "—", MID, y);
    y += ROW_H;
  }

  const startStr = fmtDateShort(data.startDate);
  const endStr = fmtDateShort(data.endDate);
  labelValue(pdf, "Rental Period:", `${startStr} — ${endStr} (${data.totalDays} days)`, L, y);
  y += ROW_H;

  y += 2;
  hLine(pdf, y);
  y += SEC_GAP;

  // ─────────────────────────────────────────────
  // LINE ITEMS TABLE
  // ─────────────────────────────────────────────
  sectionTitle(pdf, "CHARGES", L, y);
  y += TITLE_GAP;

  // Table header
  pdf.setFillColor(245, 245, 245);
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.rect(L, y - 6, CW, 13, "FD");
  pdf.setFontSize(6.5);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(60, 60, 60);
  pdf.text("Description", L + 4, y + 2);
  pdf.text("Amount", R - 4, y + 2, { align: "right" });
  pdf.setTextColor(0, 0, 0);
  y += 12;

  // Table rows
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);

  for (const item of data.lineItems) {
    if (y > PAGE_H - 120) {
      pdf.addPage();
      y = M;
    }
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);
    pdf.text(item.description, L + 4, y);
    pdf.text(fmt(item.amount), R - 4, y, { align: "right" });

    // Subtle row separator
    pdf.setDrawColor(230, 230, 230);
    pdf.setLineWidth(0.2);
    pdf.line(L, y + 4, R, y + 4);
    y += 12;
  }

  y += 4;
  hLine(pdf, y);
  y += SEC_GAP;

  // ─────────────────────────────────────────────
  // FINANCIAL SUMMARY
  // ─────────────────────────────────────────────
  sectionTitle(pdf, "FINANCIAL SUMMARY", L, y);
  y += TITLE_GAP;

  // Rental subtotal
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.text("RENTAL CHARGES:", L, y);
  pdf.setFont("helvetica", "normal");
  y += FIN_HEAD_H;

  if (data.dailyRate && data.dailyRate > 0) {
    finRow(pdf, `Vehicle Rental: ${fmt(data.dailyRate)}/day × ${data.totalDays} days`, fmt(data.dailyRate * data.totalDays), y);
  } else {
    finRow(pdf, "Vehicle Rental", fmt(data.rentalSubtotal), y);
  }
  y += FIN_ROW_H;

  // Protection
  if (data.protectionTotal && data.protectionTotal > 0) {
    if (data.protectionDailyRate && data.protectionDailyRate > 0) {
      finRow(pdf, `${data.protectionPlan || "Protection"}: ${fmt(data.protectionDailyRate)}/day × ${data.totalDays} days`, fmt(data.protectionTotal), y);
    } else {
      finRow(pdf, data.protectionPlan || "Protection Plan", fmt(data.protectionTotal), y);
    }
    y += FIN_ROW_H;
  }

  // Add-ons
  if (data.addonsTotal > 0) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.text("ADD-ONS:", L, y);
    pdf.setFont("helvetica", "normal");
    y += FIN_HEAD_H;

    // Render individual add-on line items if available
    const addonItems = data.lineItems.filter(i =>
      !i.description.toLowerCase().includes("rental") &&
      !i.description.toLowerCase().includes("tax") &&
      !i.description.toLowerCase().includes("pvrt") &&
      !i.description.toLowerCase().includes("acsrch") &&
      !i.description.toLowerCase().includes("protection") &&
      !i.description.toLowerCase().includes("driver") &&
      !i.description.toLowerCase().includes("drop-off") &&
      !i.description.toLowerCase().includes("delivery") &&
      !i.description.toLowerCase().includes("late") &&
      !i.description.toLowerCase().includes("damage")
    );
    if (addonItems.length > 0) {
      for (const addon of addonItems) {
        finRow(pdf, addon.description, fmt(addon.amount), y);
        y += FIN_ROW_H;
      }
    } else {
      finRow(pdf, "Add-ons Total", fmt(data.addonsTotal), y);
      y += FIN_ROW_H;
    }
  }

  // Delivery fee
  if (data.deliveryFee && data.deliveryFee > 0) {
    finRow(pdf, "Delivery Fee", fmt(data.deliveryFee), y);
    y += FIN_ROW_H;
  }

  // Drop-off fee
  if (data.differentDropoffFee > 0) {
    finRow(pdf, "Different Drop-off Location Fee", fmt(data.differentDropoffFee), y);
    y += FIN_ROW_H;
  }

  // Regulatory fees
  if (data.feesTotal > 0) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.text("REGULATORY FEES:", L, y);
    pdf.setFont("helvetica", "normal");
    y += FIN_HEAD_H;
    finRow(pdf, "PVRT, ACSRCH & Other Fees", fmt(data.feesTotal), y);
    y += FIN_ROW_H;
  }

  // Late fees
  if (data.lateFees > 0) {
    finRow(pdf, "Late Return Fees", fmt(data.lateFees), y);
    y += FIN_ROW_H;
  }

  // Damage charges
  if (data.damageCharges > 0) {
    pdf.setTextColor(200, 50, 50);
    finRow(pdf, "Damage Charges", fmt(data.damageCharges), y);
    pdf.setTextColor(0, 0, 0);
    y += FIN_ROW_H;
  }

  // Subtotal line
  pdf.setDrawColor(160, 160, 160);
  pdf.setLineWidth(0.3);
  pdf.line(L, y, R, y);
  y += 8;
  finRowBold(pdf, "SUBTOTAL:", fmt(data.rentalSubtotal), y);
  y += FIN_ROW_H + 2;

  // Taxes
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.text("TAXES:", L, y);
  pdf.setFont("helvetica", "normal");
  y += FIN_HEAD_H;

  if (data.pstAmount != null && data.gstAmount != null && (data.pstAmount > 0 || data.gstAmount > 0)) {
    finRow(pdf, "PST (7%):", fmt(data.pstAmount), y);
    y += FIN_ROW_H;
    finRow(pdf, "GST (5%):", fmt(data.gstAmount), y);
    y += FIN_ROW_H;
  } else {
    finRow(pdf, "Taxes (PST + GST)", fmt(data.taxesTotal), y);
    y += FIN_ROW_H;
  }

  y += 2;

  // Grand total box (matches rental agreement style)
  pdf.setFillColor(240, 240, 240);
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.8);
  pdf.rect(L, y - 1, CW, 14, "FD");
  pdf.setFontSize(8.5);
  pdf.setFont("helvetica", "bold");
  pdf.text("GRAND TOTAL:", L + 4, y + 8);
  pdf.text(`${fmt(data.grandTotal)} CAD`, R - 4, y + 8, { align: "right" });
  y += 20;

  // Deposit info
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "normal");
  if (data.depositHeld > 0) {
    finRow(pdf, "Security Deposit (held):", fmt(data.depositHeld), y, 0);
    y += FIN_ROW_H;
  }
  if (data.depositCaptured > 0) {
    finRow(pdf, "Deposit Captured:", fmt(data.depositCaptured), y, 0);
    y += FIN_ROW_H;
  }
  if (data.depositReleased > 0) {
    finRow(pdf, "Deposit Released:", fmt(data.depositReleased), y, 0);
    y += FIN_ROW_H;
  }

  y += 2;
  hLine(pdf, y);
  y += SEC_GAP;

  // ─────────────────────────────────────────────
  // PAYMENT SUMMARY
  // ─────────────────────────────────────────────
  sectionTitle(pdf, "PAYMENT SUMMARY", L, y);
  y += TITLE_GAP;

  finRow(pdf, "Grand Total:", fmt(data.grandTotal), y, 0);
  y += FIN_ROW_H;
  if (data.paymentsReceived > 0) {
    finRow(pdf, "Payments Received:", fmt(data.paymentsReceived), y, 0);
    y += FIN_ROW_H;
  }

  if (data.amountDue > 0) {
    y += 2;
    pdf.setFillColor(255, 240, 240);
    pdf.setDrawColor(200, 50, 50);
    pdf.setLineWidth(0.5);
    pdf.rect(L, y - 1, CW, 14, "FD");
    pdf.setFontSize(8.5);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(200, 50, 50);
    pdf.text("AMOUNT DUE:", L + 4, y + 8);
    pdf.text(`${fmt(data.amountDue)} CAD`, R - 4, y + 8, { align: "right" });
    pdf.setTextColor(0, 0, 0);
    y += 20;
  } else {
    y += 2;
    pdf.setFillColor(240, 255, 240);
    pdf.setDrawColor(34, 197, 94);
    pdf.setLineWidth(0.5);
    pdf.rect(L, y - 1, CW, 14, "FD");
    pdf.setFontSize(8.5);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(34, 130, 60);
    pdf.text("PAID IN FULL", L + 4, y + 8);
    pdf.text("$0.00", R - 4, y + 8, { align: "right" });
    pdf.setTextColor(0, 0, 0);
    y += 20;
  }

  // ─────────────────────────────────────────────
  // NOTES
  // ─────────────────────────────────────────────
  if (data.notes) {
    hLine(pdf, y);
    y += SEC_GAP;
    sectionTitle(pdf, "NOTES", L, y);
    y += TITLE_GAP;
    pdf.setFontSize(6.5);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(60, 60, 60);
    const noteLines = pdf.splitTextToSize(data.notes, CW);
    for (const nl of noteLines) {
      if (y > PAGE_H - 50) { pdf.addPage(); y = M; }
      pdf.text(nl, L, y);
      y += 8;
    }
    pdf.setTextColor(0, 0, 0);
    y += 4;
  }

  // ─────────────────────────────────────────────
  // CONTACT / POLICY FOOTER
  // ─────────────────────────────────────────────
  if (y < PAGE_H - 60) {
    hLine(pdf, y);
    y += SEC_GAP;
    pdf.setFontSize(5.5);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 100, 100);
    pdf.text(`This invoice is generated for booking ${data.bookingCode}.`, L, y);
    y += 7;
    pdf.text("For questions, contact us at (604) 771-3995 or visit c2ccarrental.ca.", L, y);
    y += 7;
    pdf.text("Refund and cancellation policies apply as per your rental agreement terms.", L, y);
    pdf.setTextColor(0, 0, 0);
  }

  // ─────────────────────────────────────────────
  // PAGE FOOTER (matches rental agreement)
  // ─────────────────────────────────────────────
  const footerY = PAGE_H - 14;
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.3);
  pdf.line(L, footerY - 6, R, footerY - 6);

  pdf.setFontSize(5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(120, 120, 120);
  pdf.text(
    `C2C Car Rental  |  Invoice ${data.invoiceNumber}  |  Generated ${format(new Date(), "MMM d, yyyy")}  |  Thank you for choosing us!`,
    PAGE_W / 2, footerY, { align: "center" }
  );

  pdf.save(`Invoice-${data.invoiceNumber}.pdf`);
}
