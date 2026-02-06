import jsPDF from "jspdf";
import { format } from "date-fns";
import type { RentalAgreement } from "@/hooks/use-rental-agreement";

// Logo asset path
const LOGO_PATH = "/c2c-logo.png";

interface PdfConfig {
  pageWidth: number;
  pageHeight: number;
  margin: number;
  contentWidth: number;
}

interface PdfState {
  pdf: jsPDF;
  yPos: number;
  config: PdfConfig;
}

// Load logo as base64
async function loadLogo(): Promise<string | null> {
  try {
    const response = await fetch(LOGO_PATH);
    if (!response.ok) throw new Error("Logo not found");
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    try {
      const module = await import("@/assets/c2c-logo.png");
      return module.default;
    } catch {
      return null;
    }
  }
}

// Initialize PDF - single page, compact layout
function initPdf(): PdfState {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "letter",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 28;

  return {
    pdf,
    yPos: margin,
    config: {
      pageWidth,
      pageHeight,
      margin,
      contentWidth: pageWidth - margin * 2,
    },
  };
}

// Add compact header with logo
async function addHeader(state: PdfState, logoBase64: string | null): Promise<void> {
  const { pdf, config } = state;
  const centerX = config.pageWidth / 2;

  if (logoBase64) {
    try {
      const logoHeight = 28;
      const logoWidth = 75;
      pdf.addImage(logoBase64, "PNG", centerX - logoWidth / 2, state.yPos, logoWidth, logoHeight);
      state.yPos += logoHeight + 6;
    } catch {
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("C2C CAR RENTAL", centerX, state.yPos + 12, { align: "center" });
      state.yPos += 18;
    }
  } else {
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("C2C CAR RENTAL", centerX, state.yPos + 12, { align: "center" });
    state.yPos += 18;
  }

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text("VEHICLE RENTAL AGREEMENT", centerX, state.yPos, { align: "center" });
  state.yPos += 10;

  // Thin divider
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.3);
  pdf.line(config.margin, state.yPos, config.pageWidth - config.margin, state.yPos);
  state.yPos += 6;
}

// Compact section heading
function addSectionHeading(state: PdfState, title: string): void {
  const { pdf, config } = state;
  state.yPos += 3;
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(50, 50, 50);
  pdf.text(title.toUpperCase(), config.margin, state.yPos);
  state.yPos += 2;
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.2);
  pdf.line(config.margin, state.yPos, config.margin + 100, state.yPos);
  state.yPos += 5;
  pdf.setTextColor(0, 0, 0);
}

// Compact key-value row
function addKeyValueRow(state: PdfState, label: string, value: string): void {
  const { pdf, config } = state;
  const labelWidth = 105;

  pdf.setFontSize(6.5);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(80, 80, 80);
  pdf.text(label + ":", config.margin, state.yPos);

  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0, 0, 0);

  const valueLines = pdf.splitTextToSize(value, config.contentWidth - labelWidth - 5);
  pdf.text(valueLines, config.margin + labelWidth, state.yPos);

  state.yPos += Math.max(8, valueLines.length * 7.5);
}

// Two-column key-value rows (side by side)
function addKeyValuePair(
  state: PdfState,
  label1: string, value1: string,
  label2: string, value2: string
): void {
  const { pdf, config } = state;
  const halfWidth = config.contentWidth / 2;
  const labelWidth = 80;

  pdf.setFontSize(6.5);

  // Left column
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(80, 80, 80);
  pdf.text(label1 + ":", config.margin, state.yPos);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0, 0, 0);
  pdf.text(value1, config.margin + labelWidth, state.yPos);

  // Right column
  const rightStart = config.margin + halfWidth;
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(80, 80, 80);
  pdf.text(label2 + ":", rightStart, state.yPos);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0, 0, 0);
  pdf.text(value2, rightStart + labelWidth, state.yPos);

  state.yPos += 8;
}

// Compact paragraph text
function addParagraph(state: PdfState, text: string, indent: number = 0): void {
  const { pdf, config } = state;
  pdf.setFontSize(6);
  pdf.setFont("helvetica", "normal");

  const effectiveWidth = config.contentWidth - indent;
  const lines = pdf.splitTextToSize(text, effectiveWidth);

  for (const line of lines) {
    pdf.text(line, config.margin + indent, state.yPos);
    state.yPos += 7;
  }
}

// Compact bullet point
function addBulletPoint(state: PdfState, text: string): void {
  const { pdf, config } = state;
  const textIndent = 14;

  pdf.setFontSize(6);
  pdf.setFont("helvetica", "normal");
  pdf.text("•", config.margin + 6, state.yPos);

  const lines = pdf.splitTextToSize(text, config.contentWidth - textIndent);
  pdf.text(lines[0], config.margin + textIndent, state.yPos);
  state.yPos += 7;

  for (let i = 1; i < lines.length; i++) {
    pdf.text(lines[i], config.margin + textIndent, state.yPos);
    state.yPos += 7;
  }
}

// Compact numbered item
function addNumberedItem(state: PdfState, number: string, text: string): void {
  const { pdf, config } = state;
  const numberWidth = 14;

  pdf.setFontSize(6);
  pdf.setFont("helvetica", "bold");
  pdf.text(number, config.margin, state.yPos);

  pdf.setFont("helvetica", "normal");
  const lines = pdf.splitTextToSize(text, config.contentWidth - numberWidth);
  pdf.text(lines[0], config.margin + numberWidth, state.yPos);
  state.yPos += 7;

  for (let i = 1; i < lines.length; i++) {
    pdf.text(lines[i], config.margin + numberWidth, state.yPos);
    state.yPos += 7;
  }
}

// Financial row
function addFinancialRow(state: PdfState, label: string, amount: string, isTotal: boolean = false): void {
  const { pdf, config } = state;

  if (isTotal) {
    pdf.setFillColor(240, 240, 240);
    pdf.rect(config.margin, state.yPos - 6, config.contentWidth, 10, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
  } else {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
  }

  pdf.text(label, config.margin + 2, state.yPos);
  pdf.text(amount, config.pageWidth - config.margin - 2, state.yPos, { align: "right" });

  state.yPos += isTotal ? 11 : 8;
}

// Checkbox item
function addCheckbox(state: PdfState, text: string, checked: boolean = false): void {
  const { pdf, config } = state;

  pdf.setDrawColor(120, 120, 120);
  pdf.setLineWidth(0.3);
  pdf.rect(config.margin, state.yPos - 5, 6, 6);

  if (checked) {
    pdf.setFontSize(6);
    pdf.setFont("helvetica", "bold");
    pdf.text("✓", config.margin + 1, state.yPos - 0.5);
  }

  pdf.setFontSize(6);
  pdf.setFont("helvetica", "normal");
  const lines = pdf.splitTextToSize(text, config.contentWidth - 14);
  pdf.text(lines, config.margin + 10, state.yPos);

  state.yPos += Math.max(8, lines.length * 6.5);
}

// Compact signature block
function addSignatureBlock(state: PdfState, agreement: RentalAgreement): void {
  const { pdf, config } = state;

  state.yPos += 4;
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.3);
  pdf.line(config.margin, state.yPos, config.pageWidth - config.margin, state.yPos);
  state.yPos += 8;

  pdf.setFontSize(7);
  pdf.setFont("helvetica", "bold");
  pdf.text("ACKNOWLEDGMENT & SIGNATURE", config.margin, state.yPos);
  state.yPos += 10;

  if (agreement.customer_signature) {
    pdf.setFontSize(6.5);
    pdf.setFont("helvetica", "bold");
    pdf.text("Signed By:", config.margin, state.yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(agreement.customer_signature, config.margin + 50, state.yPos);
    state.yPos += 8;

    pdf.setFont("helvetica", "bold");
    pdf.text("Date:", config.margin, state.yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(
      format(new Date(agreement.customer_signed_at!), "MMM d, yyyy 'at' h:mm a"),
      config.margin + 50,
      state.yPos
    );
    state.yPos += 8;

    if (agreement.staff_confirmed_at) {
      pdf.setFont("helvetica", "bold");
      pdf.text("Confirmed:", config.margin, state.yPos);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        format(new Date(agreement.staff_confirmed_at), "MMM d, yyyy 'at' h:mm a"),
        config.margin + 50,
        state.yPos
      );
      state.yPos += 8;
    }
  } else {
    pdf.setFontSize(6.5);
    pdf.setFont("helvetica", "normal");

    pdf.text("Customer Signature:", config.margin, state.yPos);
    pdf.line(config.margin + 75, state.yPos, config.margin + 220, state.yPos);
    state.yPos += 12;

    pdf.text("Date:", config.margin, state.yPos);
    pdf.line(config.margin + 75, state.yPos, config.margin + 160, state.yPos);
    state.yPos += 12;
  }
}

// Parse and render agreement content - optimized for single page
function parseAndRenderContent(state: PdfState, content: string): void {
  const lines = content.split("\n");
  let currentSection = "";
  // Collect key-value pairs for potential two-column layout
  const kvBuffer: Array<{ label: string; value: string }> = [];

  function flushKvBuffer(): void {
    // Render pairs side by side when possible
    while (kvBuffer.length >= 2) {
      const a = kvBuffer.shift()!;
      const b = kvBuffer.shift()!;
      addKeyValuePair(state, a.label, a.value, b.label, b.value);
    }
    // Render any remaining single item
    if (kvBuffer.length === 1) {
      const item = kvBuffer.shift()!;
      addKeyValueRow(state, item.label, item.value);
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip decorative lines
    if (trimmed.includes("▓") || trimmed.includes("═══") || trimmed.includes("───")) {
      continue;
    }
    if (/^[┌┐└┘─]+$/.test(trimmed)) {
      continue;
    }

    // Section headers in boxes
    if (line.includes("│") && trimmed.length > 2) {
      const headerText = trimmed.replace(/[┌┐└┘│─]/g, "").trim();
      if (headerText && headerText.length > 2) {
        flushKvBuffer();
        addSectionHeading(state, headerText);
        currentSection = headerText.toLowerCase();
        continue;
      }
    }

    // Empty lines - minimal gap
    if (!trimmed) {
      flushKvBuffer();
      state.yPos += 2;
      continue;
    }

    // Key-value pairs
    if (trimmed.includes(":") && !trimmed.startsWith("http")) {
      const colonIndex = trimmed.indexOf(":");
      const label = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();

      if (label && value && label.length < 40) {
        if (
          currentSection.includes("financial") ||
          currentSection.includes("charges") ||
          label.includes("Total") ||
          label.includes("Subtotal") ||
          label.includes("Tax") ||
          label.includes("Fee")
        ) {
          flushKvBuffer();
          const isTotal = label.toLowerCase().includes("total") &&
            !label.toLowerCase().includes("subtotal");
          addFinancialRow(state, label, value, isTotal);
        } else {
          // Buffer key-value pairs for two-column rendering
          kvBuffer.push({ label, value });
        }
        continue;
      }
    }

    flushKvBuffer();

    // Checkbox items
    if (trimmed.startsWith("☐") || trimmed.startsWith("☑")) {
      const checked = trimmed.startsWith("☑");
      const text = trimmed.replace(/^[☐☑]\s*/, "");
      addCheckbox(state, text, checked);
      continue;
    }

    // Numbered items
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      addNumberedItem(state, numberedMatch[1] + ".", numberedMatch[2]);
      continue;
    }

    // Bullet points
    if (trimmed.startsWith("•") || trimmed.startsWith("-")) {
      const text = trimmed.replace(/^[•\-]\s*/, "");
      addBulletPoint(state, text);
      continue;
    }

    // Indented text
    if (line.startsWith("   ") || line.startsWith("\t")) {
      addParagraph(state, trimmed, 12);
      continue;
    }

    // Regular paragraph
    addParagraph(state, trimmed);
  }

  flushKvBuffer();
}

// Main export function - single page PDF
export async function generateRentalAgreementPdf(
  agreement: RentalAgreement,
  bookingId: string
): Promise<void> {
  const state = initPdf();

  // Load logo
  const logoBase64 = await loadLogo();

  // Add header
  await addHeader(state, logoBase64);

  // Parse and render content
  parseAndRenderContent(state, agreement.agreement_content);

  // Add signature block
  addSignatureBlock(state, agreement);

  // Single page footer
  const { pdf, config } = state;
  pdf.setFontSize(5.5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(140, 140, 140);
  pdf.text(
    `C2C Car Rental | Agreement generated ${format(new Date(), "MMM d, yyyy")} | Booking ${bookingId.slice(0, 8)}`,
    config.pageWidth / 2,
    config.pageHeight - 14,
    { align: "center" }
  );

  // Save
  pdf.save(`C2C-Rental-Agreement-${bookingId.slice(0, 8)}.pdf`);
}
