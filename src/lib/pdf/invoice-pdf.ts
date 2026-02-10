import jsPDF from "jspdf";
import { format } from "date-fns";

export interface InvoicePdfData {
  invoiceNumber: string;
  status: string;
  issuedAt: string | null;
  customerName: string;
  customerEmail: string;
  bookingCode: string;
  vehicleName: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  lineItems: { description: string; amount: number }[];
  rentalSubtotal: number;
  addonsTotal: number;
  feesTotal: number;
  taxesTotal: number;
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

export function generateInvoicePdf(data: InvoicePdfData) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const W = pdf.internal.pageSize.getWidth();
  const L = 50;
  const R = W - 50;
  let y = 50;

  // Header
  pdf.setFontSize(22);
  pdf.setFont("helvetica", "bold");
  pdf.text("INVOICE", L, y);

  // Status badge
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  const statusText = (data.status || "draft").toUpperCase();
  const statusW = pdf.getTextWidth(statusText) + 12;
  const isIssued = data.status === "issued" || data.status === "paid";
  pdf.setFillColor(isIssued ? 34 : 150, isIssued ? 197 : 150, isIssued ? 94 : 150);
  pdf.roundedRect(R - statusW, y - 12, statusW, 16, 3, 3, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.text(statusText, R - statusW + 6, y);
  pdf.setTextColor(0, 0, 0);

  y += 28;
  // Invoice number
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  pdf.text("Invoice Number", L, y);
  pdf.text("Date Issued", L + 250, y);
  y += 14;
  pdf.setFontSize(12);
  pdf.setFont("courier", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text(data.invoiceNumber, L, y);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  const dateStr = data.issuedAt
    ? format(new Date(data.issuedAt), "MMM d, yyyy")
    : "Draft";
  pdf.text(dateStr, L + 250, y);

  y += 8;
  pdf.setDrawColor(220, 220, 220);
  pdf.line(L, y, R, y);
  y += 18;

  // Customer & Vehicle
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);
  pdf.text("Customer", L, y);
  pdf.text("Vehicle", L + 250, y);
  y += 14;
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "bold");
  pdf.text(data.customerName || "N/A", L, y);
  pdf.text(data.vehicleName || "N/A", L + 250, y);
  y += 14;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(80, 80, 80);
  pdf.text(data.customerEmail || "", L, y);

  y += 18;
  // Booking & Rental Period
  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);
  pdf.text("Booking Code", L, y);
  pdf.text("Rental Period", L + 250, y);
  y += 14;
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont("courier", "bold");
  pdf.text(data.bookingCode, L, y);
  pdf.setFont("helvetica", "normal");
  const startStr = data.startDate ? format(new Date(data.startDate), "MMM d, yyyy") : "N/A";
  const endStr = data.endDate ? format(new Date(data.endDate), "MMM d, yyyy") : "N/A";
  pdf.text(`${startStr} → ${endStr} (${data.totalDays} days)`, L + 250, y);

  y += 20;
  pdf.line(L, y, R, y);
  y += 15;

  // Line Items
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(100, 100, 100);
  pdf.text("Description", L, y);
  pdf.text("Amount", R - 10, y, { align: "right" });
  y += 5;
  pdf.line(L, y, R, y);
  y += 14;

  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(9);

  for (const item of data.lineItems) {
    if (y > pdf.internal.pageSize.getHeight() - 120) {
      pdf.addPage();
      y = 50;
    }
    pdf.text(item.description, L, y);
    pdf.text(`$${item.amount.toFixed(2)}`, R - 10, y, { align: "right" });
    y += 16;
  }

  y += 5;
  pdf.line(L, y, R, y);
  y += 18;

  // Summary section
  const tX = L + 280;
  const addRow = (label: string, amount: number, opts?: { bold?: boolean; destructive?: boolean }) => {
    if (y > pdf.internal.pageSize.getHeight() - 60) {
      pdf.addPage();
      y = 50;
    }
    pdf.setFont("helvetica", opts?.bold ? "bold" : "normal");
    pdf.setFontSize(opts?.bold ? 11 : 9);
    if (opts?.destructive) pdf.setTextColor(200, 50, 50);
    else pdf.setTextColor(0, 0, 0);
    pdf.text(label, tX, y);
    pdf.text(`$${amount.toFixed(2)}`, R - 10, y, { align: "right" });
    y += opts?.bold ? 18 : 15;
  };

  addRow("Rental Subtotal", data.rentalSubtotal);
  if (data.addonsTotal > 0) addRow("Add-ons", data.addonsTotal);
  if (data.feesTotal > 0) addRow("Fees (PVRT, ACSRCH, Young Driver)", data.feesTotal);
  if (data.lateFees > 0) addRow("Late Fees", data.lateFees);
  if (data.damageCharges > 0) addRow("Damage Charges", data.damageCharges, { destructive: true });
  addRow("Taxes (PST + GST)", data.taxesTotal);

  pdf.line(tX, y - 4, R, y - 4);
  y += 4;
  addRow("Grand Total", data.grandTotal, { bold: true });

  y += 4;
  if (data.paymentsReceived > 0) addRow("Payments Received", data.paymentsReceived);
  if (data.depositCaptured > 0) addRow("Deposit Captured", data.depositCaptured);
  if (data.depositReleased > 0) addRow("Deposit Released", data.depositReleased);

  if (data.amountDue > 0) {
    y += 2;
    addRow("Amount Due", data.amountDue, { bold: true, destructive: true });
  }

  // Notes
  if (data.notes) {
    y += 15;
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.setFont("helvetica", "normal");
    pdf.text("Notes", L, y);
    y += 14;
    pdf.setTextColor(0, 0, 0);
    const lines = pdf.splitTextToSize(data.notes, R - L);
    pdf.text(lines, L, y);
  }

  // Footer
  const footerY = pdf.internal.pageSize.getHeight() - 40;
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text("Thank you for choosing Better Rental.", W / 2, footerY, { align: "center" });

  pdf.save(`Invoice-${data.invoiceNumber}.pdf`);
}
