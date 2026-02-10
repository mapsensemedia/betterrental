import jsPDF from "jspdf";
import { format } from "date-fns";

interface ReceiptPdfData {
  receiptNumber: string;
  status: string;
  issuedAt: string | null;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  bookingCode: string;
  vehicleName: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  dailyRate: number;
  lineItems: { description: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  tax: number;
  total: number;
  depositAmount: number | null;
  differentDropoffFee: number;
  notes: string | null;
}

export function generateReceiptPdf(data: ReceiptPdfData) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const W = pdf.internal.pageSize.getWidth();
  const L = 50; // left margin
  const R = W - 50; // right margin
  let y = 50;

  // Header
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text("RECEIPT", L, y);
  
  // Status badge
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  const statusText = data.status.toUpperCase();
  const statusW = pdf.getTextWidth(statusText) + 12;
  pdf.setFillColor(data.status === "issued" ? 34 : 150, data.status === "issued" ? 197 : 150, data.status === "issued" ? 94 : 150);
  pdf.roundedRect(R - statusW, y - 12, statusW, 16, 3, 3, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.text(statusText, R - statusW + 6, y);
  pdf.setTextColor(0, 0, 0);

  y += 25;
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(100, 100, 100);
  pdf.text("Receipt Number", L, y);
  y += 14;
  pdf.setFontSize(12);
  pdf.setFont("courier", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text(data.receiptNumber, L, y);

  y += 10;
  pdf.setDrawColor(220, 220, 220);
  pdf.line(L, y, R, y);
  y += 18;

  // Date
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(100, 100, 100);
  pdf.text("Date Issued", L, y);
  pdf.text("Booking Code", L + 200, y);
  y += 14;
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "bold");
  const dateStr = data.issuedAt
    ? format(new Date(data.issuedAt), "MMM d, yyyy")
    : format(new Date(data.createdAt), "MMM d, yyyy");
  pdf.text(dateStr, L, y);
  pdf.setFont("courier", "bold");
  pdf.text(data.bookingCode, L + 200, y);

  y += 25;
  // Customer & Vehicle
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);
  pdf.text("Customer", L, y);
  pdf.text("Vehicle", L + 200, y);
  y += 14;
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "bold");
  pdf.text(data.customerName || "N/A", L, y);
  pdf.text(data.vehicleName || "N/A", L + 200, y);
  y += 14;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(80, 80, 80);
  pdf.text(data.customerEmail || "", L, y);

  y += 20;
  // Rental Period
  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);
  pdf.text("Rental Period", L, y);
  y += 14;
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  const startStr = data.startDate ? format(new Date(data.startDate), "MMM d, yyyy") : "N/A";
  const endStr = data.endDate ? format(new Date(data.endDate), "MMM d, yyyy") : "N/A";
  pdf.text(`${startStr}  →  ${endStr}  (${data.totalDays} day${data.totalDays !== 1 ? "s" : ""})`, L, y);

  y += 25;
  pdf.line(L, y, R, y);
  y += 15;

  // Line Items Header
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(100, 100, 100);
  pdf.text("Description", L, y);
  pdf.text("Qty", L + 280, y);
  pdf.text("Unit Price", L + 330, y);
  pdf.text("Total", R - 10, y, { align: "right" });
  y += 5;
  pdf.line(L, y, R, y);
  y += 14;

  // Line Items
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(9);
  
  for (const item of data.lineItems) {
    pdf.text(item.description, L, y);
    pdf.text(String(item.quantity), L + 285, y);
    pdf.text(`$${item.unitPrice.toFixed(2)}`, L + 330, y);
    pdf.text(`$${item.total.toFixed(2)}`, R - 10, y, { align: "right" });
    y += 16;
  }

  y += 5;
  pdf.line(L, y, R, y);
  y += 18;

  // Totals
  const totalsX = L + 300;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text("Subtotal", totalsX, y);
  pdf.text(`$${data.subtotal.toFixed(2)}`, R - 10, y, { align: "right" });
  y += 16;

  if (data.differentDropoffFee > 0) {
    pdf.text("Different Drop-off Fee", totalsX, y);
    pdf.text(`$${data.differentDropoffFee.toFixed(2)}`, R - 10, y, { align: "right" });
    y += 16;
  }

  pdf.text("Tax (HST/GST)", totalsX, y);
  pdf.text(`$${data.tax.toFixed(2)}`, R - 10, y, { align: "right" });
  y += 5;
  pdf.line(totalsX, y, R, y);
  y += 16;

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("Total", totalsX, y);
  pdf.text(`$${data.total.toFixed(2)}`, R - 10, y, { align: "right" });

  if (data.depositAmount && data.depositAmount > 0) {
    y += 20;
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Security Deposit: $${data.depositAmount.toFixed(2)}`, totalsX, y);
    pdf.setTextColor(0, 0, 0);
  }

  // Notes
  if (data.notes) {
    y += 30;
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
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

  pdf.save(`Receipt-${data.receiptNumber}.pdf`);
}
