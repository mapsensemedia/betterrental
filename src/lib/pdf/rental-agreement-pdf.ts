import jsPDF from "jspdf";
import { format } from "date-fns";
import type { RentalAgreement } from "@/hooks/use-rental-agreement";

// Logo asset path - will be loaded as base64
const LOGO_PATH = "/c2c-logo.png";

interface PdfConfig {
  pageWidth: number;
  pageHeight: number;
  margin: number;
  contentWidth: number;
  lineHeight: number;
  sectionGap: number;
}

interface PdfState {
  pdf: jsPDF;
  yPos: number;
  pageNum: number;
  totalPages: number;
  config: PdfConfig;
}

// Load logo as base64
async function loadLogo(): Promise<string | null> {
  try {
    // Try loading from public folder
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
    // Try loading from src/assets
    try {
      const module = await import("@/assets/c2c-logo.png");
      return module.default;
    } catch {
      return null;
    }
  }
}

// Initialize PDF with config
function initPdf(): PdfState {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "letter",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 40;

  return {
    pdf,
    yPos: margin,
    pageNum: 1,
    totalPages: 1,
    config: {
      pageWidth,
      pageHeight,
      margin,
      contentWidth: pageWidth - margin * 2,
      lineHeight: 1.3,
      sectionGap: 14,
    },
  };
}

// Check and handle page break
function checkPageBreak(state: PdfState, requiredHeight: number): void {
  const { pdf, config } = state;
  const footerSpace = 30;
  
  if (state.yPos + requiredHeight > config.pageHeight - config.margin - footerSpace) {
    addPageNumber(state);
    pdf.addPage();
    state.pageNum++;
    state.totalPages++;
    state.yPos = config.margin;
  }
}

// Add page number footer
function addPageNumber(state: PdfState): void {
  const { pdf, config, pageNum } = state;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(120, 120, 120);
  pdf.text(
    `Page ${pageNum}`,
    config.pageWidth - config.margin,
    config.pageHeight - 20,
    { align: "right" }
  );
  pdf.setTextColor(0, 0, 0);
}

// Add header with logo
async function addHeader(state: PdfState, logoBase64: string | null): Promise<void> {
  const { pdf, config } = state;
  const centerX = config.pageWidth / 2;

  // Add logo if available
  if (logoBase64) {
    try {
      const logoHeight = 45;
      const logoWidth = 120; // Approximate aspect ratio
      pdf.addImage(
        logoBase64,
        "PNG",
        centerX - logoWidth / 2,
        state.yPos,
        logoWidth,
        logoHeight
      );
      state.yPos += logoHeight + 12;
    } catch {
      // Fallback to text if logo fails
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text("C2C CAR RENTAL", centerX, state.yPos + 20, { align: "center" });
      state.yPos += 35;
    }
  } else {
    // Text fallback
    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");
    pdf.text("C2C CAR RENTAL", centerX, state.yPos + 20, { align: "center" });
    state.yPos += 35;
  }

  // Main title
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("VEHICLE RENTAL AGREEMENT", centerX, state.yPos, { align: "center" });
  state.yPos += 20;

  // Divider line
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.5);
  pdf.line(config.margin, state.yPos, config.pageWidth - config.margin, state.yPos);
  state.yPos += config.sectionGap;
}

// Add section heading
function addSectionHeading(state: PdfState, title: string): void {
  checkPageBreak(state, 30);
  const { pdf, config } = state;
  
  state.yPos += 6;
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(40, 40, 40);
  pdf.text(title.toUpperCase(), config.margin, state.yPos);
  state.yPos += 4;
  
  // Underline
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.3);
  pdf.line(config.margin, state.yPos, config.margin + 150, state.yPos);
  state.yPos += 10;
  pdf.setTextColor(0, 0, 0);
}

// Add key-value row (2-column layout)
function addKeyValueRow(state: PdfState, label: string, value: string): void {
  const { pdf, config } = state;
  const labelWidth = 140;
  
  checkPageBreak(state, 16);
  
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(80, 80, 80);
  pdf.text(label + ":", config.margin, state.yPos);
  
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0, 0, 0);
  
  const valueLines = pdf.splitTextToSize(value, config.contentWidth - labelWidth - 10);
  pdf.text(valueLines, config.margin + labelWidth, state.yPos);
  
  state.yPos += Math.max(14, valueLines.length * 12);
}

// Add paragraph text
function addParagraph(state: PdfState, text: string, indent: number = 0): void {
  const { pdf, config } = state;
  
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  
  const effectiveWidth = config.contentWidth - indent;
  const lines = pdf.splitTextToSize(text, effectiveWidth);
  
  for (const line of lines) {
    checkPageBreak(state, 12);
    pdf.text(line, config.margin + indent, state.yPos);
    state.yPos += 12;
  }
}

// Add bullet point
function addBulletPoint(state: PdfState, text: string): void {
  const { pdf, config } = state;
  const bulletIndent = 12;
  const textIndent = 24;
  
  checkPageBreak(state, 14);
  
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text("•", config.margin + bulletIndent, state.yPos);
  
  const lines = pdf.splitTextToSize(text, config.contentWidth - textIndent);
  pdf.text(lines[0], config.margin + textIndent, state.yPos);
  state.yPos += 12;
  
  for (let i = 1; i < lines.length; i++) {
    checkPageBreak(state, 12);
    pdf.text(lines[i], config.margin + textIndent, state.yPos);
    state.yPos += 12;
  }
}

// Add numbered item
function addNumberedItem(state: PdfState, number: string, text: string): void {
  const { pdf, config } = state;
  const numberWidth = 20;
  
  checkPageBreak(state, 16);
  
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text(number, config.margin, state.yPos);
  
  pdf.setFont("helvetica", "normal");
  const lines = pdf.splitTextToSize(text, config.contentWidth - numberWidth);
  pdf.text(lines[0], config.margin + numberWidth, state.yPos);
  state.yPos += 12;
  
  for (let i = 1; i < lines.length; i++) {
    checkPageBreak(state, 12);
    pdf.text(lines[i], config.margin + numberWidth, state.yPos);
    state.yPos += 12;
  }
}

// Add financial table row
function addFinancialRow(
  state: PdfState, 
  label: string, 
  amount: string, 
  isTotal: boolean = false
): void {
  const { pdf, config } = state;
  
  checkPageBreak(state, 18);
  
  if (isTotal) {
    // Total row with background
    pdf.setFillColor(245, 245, 245);
    pdf.rect(config.margin, state.yPos - 10, config.contentWidth, 16, "F");
    pdf.setFont("helvetica", "bold");
  } else {
    pdf.setFont("helvetica", "normal");
  }
  
  pdf.setFontSize(9);
  pdf.text(label, config.margin + 4, state.yPos);
  pdf.text(amount, config.pageWidth - config.margin - 4, state.yPos, { align: "right" });
  
  state.yPos += isTotal ? 18 : 14;
}

// Add checkbox item
function addCheckbox(state: PdfState, text: string, checked: boolean = false): void {
  const { pdf, config } = state;
  
  checkPageBreak(state, 16);
  
  // Draw checkbox
  pdf.setDrawColor(100, 100, 100);
  pdf.setLineWidth(0.5);
  pdf.rect(config.margin, state.yPos - 8, 10, 10);
  
  if (checked) {
    pdf.setFont("helvetica", "bold");
    pdf.text("✓", config.margin + 2, state.yPos);
  }
  
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  const lines = pdf.splitTextToSize(text, config.contentWidth - 20);
  pdf.text(lines, config.margin + 16, state.yPos);
  
  state.yPos += Math.max(14, lines.length * 11);
}

// Add signature block
function addSignatureBlock(state: PdfState, agreement: RentalAgreement): void {
  const { pdf, config } = state;
  
  // Ensure signature block stays together (don't split across pages)
  checkPageBreak(state, 100);
  
  state.yPos += 10;
  
  // Divider
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.5);
  pdf.line(config.margin, state.yPos, config.pageWidth - config.margin, state.yPos);
  state.yPos += 16;
  
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("ACKNOWLEDGMENT & SIGNATURE", config.margin, state.yPos);
  state.yPos += 18;
  
  if (agreement.customer_signature) {
    // Signed
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.text("Signed By:", config.margin, state.yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(agreement.customer_signature, config.margin + 60, state.yPos);
    state.yPos += 14;
    
    pdf.setFont("helvetica", "bold");
    pdf.text("Date:", config.margin, state.yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(
      format(new Date(agreement.customer_signed_at!), "MMMM d, yyyy 'at' h:mm a"),
      config.margin + 60,
      state.yPos
    );
    state.yPos += 14;
    
    if (agreement.staff_confirmed_at) {
      pdf.setFont("helvetica", "bold");
      pdf.text("Confirmed:", config.margin, state.yPos);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        format(new Date(agreement.staff_confirmed_at), "MMMM d, yyyy 'at' h:mm a"),
        config.margin + 60,
        state.yPos
      );
      state.yPos += 14;
    }
  } else {
    // Unsigned - show signature lines
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    
    pdf.text("Customer Signature:", config.margin, state.yPos);
    pdf.line(config.margin + 100, state.yPos, config.margin + 280, state.yPos);
    state.yPos += 20;
    
    pdf.text("Date:", config.margin, state.yPos);
    pdf.line(config.margin + 100, state.yPos, config.margin + 200, state.yPos);
    state.yPos += 20;
  }
}

// Parse and render agreement content
function parseAndRenderContent(state: PdfState, content: string): void {
  const lines = content.split("\n");
  let currentSection = "";
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip decorative lines
    if (trimmed.includes("▓") || trimmed.includes("═══") || trimmed.includes("───")) {
      continue;
    }
    
    // Skip box characters
    if (/^[┌┐└┘─]+$/.test(trimmed)) {
      continue;
    }
    
    // Section headers in boxes
    if (line.includes("│") && trimmed.length > 2) {
      const headerText = trimmed.replace(/[┌┐└┘│─]/g, "").trim();
      if (headerText && headerText.length > 2) {
        addSectionHeading(state, headerText);
        currentSection = headerText.toLowerCase();
        continue;
      }
    }
    
    // Empty lines
    if (!trimmed) {
      state.yPos += 6;
      continue;
    }
    
    // Key-value pairs (Label: Value)
    if (trimmed.includes(":") && !trimmed.startsWith("http")) {
      const colonIndex = trimmed.indexOf(":");
      const label = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();
      
      if (label && value && label.length < 40) {
        // Financial items - right align amounts
        if (
          currentSection.includes("financial") ||
          currentSection.includes("charges") ||
          label.includes("Total") ||
          label.includes("Subtotal") ||
          label.includes("Tax") ||
          label.includes("Fee")
        ) {
          const isTotal = label.toLowerCase().includes("total") && 
                         !label.toLowerCase().includes("subtotal");
          addFinancialRow(state, label, value, isTotal);
        } else {
          addKeyValueRow(state, label, value);
        }
        continue;
      }
    }
    
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
    
    // Indented text (sub-items)
    if (line.startsWith("   ") || line.startsWith("\t")) {
      addParagraph(state, trimmed, 20);
      continue;
    }
    
    // Regular paragraph
    addParagraph(state, trimmed);
  }
}

// Main export function
export async function generateRentalAgreementPdf(
  agreement: RentalAgreement,
  bookingId: string
): Promise<void> {
  const state = initPdf();
  
  // Load logo
  const logoBase64 = await loadLogo();
  
  // Add header with logo
  await addHeader(state, logoBase64);
  
  // Parse and render the agreement content
  parseAndRenderContent(state, agreement.agreement_content);
  
  // Add signature block
  addSignatureBlock(state, agreement);
  
  // Add page numbers to all pages
  const totalPages = state.pageNum;
  for (let p = 1; p <= totalPages; p++) {
    state.pdf.setPage(p);
    state.pdf.setFontSize(9);
    state.pdf.setFont("helvetica", "normal");
    state.pdf.setTextColor(120, 120, 120);
    state.pdf.text(
      `Page ${p} of ${totalPages}`,
      state.config.pageWidth - state.config.margin,
      state.config.pageHeight - 20,
      { align: "right" }
    );
  }
  
  // Save
  state.pdf.save(`C2C-Rental-Agreement-${bookingId.slice(0, 8)}.pdf`);
}
