import jsPDF from "jspdf";
import { format } from "date-fns";
import type { RentalAgreement } from "@/hooks/use-rental-agreement";

// Logo asset path
const LOGO_PATH = "/c2c-logo.png";

interface ProtectionTerms {
  planId?: string;
  planName?: string;
  dailyRate?: number;
  total?: number;
  deductible?: string;
}

interface TermsJson {
  vehicle: {
    category?: string;
    make?: string | null;
    model?: string | null;
    year?: number | null;
    color?: string | null;
    licensePlate?: string | null;
    vin?: string | null;
    fuelType?: string | null;
    transmission?: string | null;
    seats?: number | null;
    tankCapacityLiters?: number | null;
  };
  condition: {
    odometerOut?: number | null;
    fuelLevelOut?: number | null;
  };
  rental: {
    startAt: string;
    endAt: string;
    totalDays: number;
    dailyRate: number;
  };
  locations: {
    pickup: { name?: string; address?: string; city?: string };
    deliveryAddress?: string | null;
    dropoff: { name?: string; address?: string; city?: string };
  };
  customer: {
    name?: string | null;
    email?: string | null;
  };
  protection?: ProtectionTerms;
  financial: {
    vehicleSubtotal: number;
    protectionTotal?: number;
    addOnsTotal: number;
    youngDriverFee: number;
    pvrtTotal: number;
    acsrchTotal: number;
    subtotalBeforeTax: number;
    pstAmount: number;
    gstAmount: number;
    totalTax: number;
    grandTotal: number;
    depositAmount: number;
    addOns: Array<{ name: string; price: number }>;
  };
  policies: {
    minAge: number;
    lateFeePercentOfDaily: number;
    gracePeriodMinutes: number;
    thirdPartyLiabilityIncluded: boolean;
    optionalCoverageAvailable: boolean;
    fuelReturnPolicy: string;
    smokingAllowed: boolean;
    petsAllowed: boolean;
    internationalTravel: boolean;
  };
  taxes: {
    pstRate: number;
    gstRate: number;
    pvrtDailyFee: number;
    acsrchDailyFee: number;
  };
}

// ── Load image as base64 ──

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

// ── Formatting helpers ──

function fmt(n: number): string {
  return `$${n.toFixed(2)}`;
}

function fmtDateFull(dateStr: string): string {
  try {
    return format(new Date(dateStr), "EEEE, MMMM d, yyyy 'at' h:mm a");
  } catch {
    return dateStr;
  }
}

function fmtDateLong(dateStr: string): string {
  try {
    return format(new Date(dateStr), "MMM d, yyyy 'at' h:mm a");
  } catch {
    return dateStr;
  }
}

function fmtDateShort(dateStr: string): string {
  try {
    return format(new Date(dateStr), "MMMM d, yyyy");
  } catch {
    return dateStr;
  }
}

// ── PDF Config ──

const MX = 24; // left/right margin
const PAGE_W = 612;
const PAGE_H = 792;
const CW = PAGE_W - MX * 2; // content width
const L = MX; // left edge
const R = PAGE_W - MX; // right edge
const MID = MX + CW * 0.5; // midpoint

// ── Main export ──

export async function generateRentalAgreementPdf(
  agreement: RentalAgreement,
  bookingId: string
): Promise<void> {
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const logoBase64 = await loadLogo();
  const terms = agreement.terms_json as unknown as TermsJson | null;

  // Load signature PNG if available
  const signaturePngUrl = (agreement as any)?.signature_png_url;
  let signatureBase64: string | null = null;
  if (signaturePngUrl) {
    signatureBase64 = await loadImageAsBase64(signaturePngUrl);
  }

  if (terms && terms.rental && terms.financial) {
    renderStructuredPdf(pdf, terms, agreement, bookingId, logoBase64, signatureBase64);
  } else {
    renderLegacyPdf(pdf, agreement, bookingId, logoBase64, signatureBase64);
  }

  const code = bookingId.slice(0, 8).toUpperCase();
  pdf.save(`C2C-Rental-${code}.pdf`);
}

// ══════════════════════════════════════════════════════════════
// STRUCTURED RENDERER — Professional single-page layout
// ══════════════════════════════════════════════════════════════

function renderStructuredPdf(
  pdf: jsPDF,
  t: TermsJson,
  agreement: RentalAgreement,
  bookingId: string,
  logoBase64: string | null,
  signatureBase64: string | null
) {
  let y = 20; // top margin
  const bookingCode = (t as any).bookingCode || bookingId.slice(0, 8).toUpperCase();

  // ── Spacing constants (balanced for readability) ──
  const SEC_GAP = 7;        // space after horizontal rule before next section
  const TITLE_GAP = 9;      // space after section title before content
  const ROW_H = 11;         // data row height
  const FIN_ROW_H = 10;     // financial row height
  const FIN_HEAD_H = 10;    // financial sub-header height

  // ── Font sizes ──
  const FONT_BASE = 7.5;    // ~10px — main body text
  const FONT_LABEL = 7.5;   // labels
  const FONT_SECTION = 8.5; // ~11.3px — section headers
  const FONT_FIN = 7.5;     // financial rows
  const FONT_TC = 6.5;      // terms & conditions
  const TC_LH = 8;          // T&C line height

  // ─────────────────────────────────────────────
  // HEADER
  // ─────────────────────────────────────────────
  if (logoBase64) {
    try { pdf.addImage(logoBase64, "PNG", L, y - 2, 48, 17); } catch { /* skip */ }
  }
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text("C2C CAR RENTAL", PAGE_W / 2, y + 7, { align: "center" });
  pdf.setFontSize(8);
  pdf.text("LEGAL VEHICLE RENTAL AGREEMENT", PAGE_W / 2, y + 18, { align: "center" });
  y += 24;

  // Contact info bar
  pdf.setFillColor(245, 245, 245);
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.rect(L, y - 2, CW, 11, "FD");
  pdf.setFontSize(5.5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(60, 60, 60);
  pdf.text(
    "Surrey, BC  |  Contact: (604) 771-3995  |  24/7 Support: (778) 580-0498  |  Roadside: (604) 771-3995",
    PAGE_W / 2, y + 4, { align: "center" }
  );
  pdf.setTextColor(0, 0, 0);
  y += 14;

  // Booking ref + date row
  pdf.setFontSize(FONT_LABEL);
  pdf.setFont("helvetica", "bold");
  pdf.text("Booking Reference:", L, y);
  pdf.setFont("helvetica", "normal");
  pdf.text(bookingCode, L + 82, y);
  pdf.setFont("helvetica", "bold");
  pdf.text("Agreement Date:", MID, y);
  pdf.setFont("helvetica", "normal");
  pdf.text(fmtDateShort(agreement.created_at), MID + 70, y);
  y += 9;

  hLine(pdf, y);
  y += SEC_GAP;

  // ─────────────────────────────────────────────
  // RENTER INFORMATION
  // ─────────────────────────────────────────────
  sectionTitle(pdf, "RENTER INFORMATION", L, y, FONT_SECTION);
  y += TITLE_GAP;

  const displayName = t.customer.name && !t.customer.name.includes("@")
    ? t.customer.name : "—";
  const displayEmail = t.customer.email || "—";

  labelValue(pdf, "Name:", displayName, L, y, FONT_LABEL);
  labelValue(pdf, "Email:", displayEmail, MID, y, FONT_LABEL);
  y += ROW_H;

  hLine(pdf, y);
  y += SEC_GAP;

  // ─────────────────────────────────────────────
  // LOCATIONS (two columns)
  // ─────────────────────────────────────────────
  sectionTitle(pdf, "LOCATIONS", L, y, FONT_SECTION);
  y += TITLE_GAP;

  const pickupLoc = t.locations.pickup;
  const dropoffLoc = t.locations.dropoff;
  const pickupAddrLines = formatAddressLines(pickupLoc.address, pickupLoc.city);
  const dropoffAddrLines = formatAddressLines(dropoffLoc.address, dropoffLoc.city);
  const pickupLabel = pickupLoc.name || "";
  const dropoffLabel = dropoffLoc.name || "";
  const pickupFull = pickupLabel ? [pickupLabel, ...pickupAddrLines] : pickupAddrLines;
  const dropoffRaw = dropoffLabel ? [dropoffLabel, ...dropoffAddrLines] : dropoffAddrLines;
  const isSameLoc = pickupFull.join("|") === dropoffRaw.join("|");
  const dropoffFull = isSameLoc ? [...dropoffRaw, "(Same as pickup)"] : dropoffRaw;

  pdf.setFontSize(FONT_LABEL);
  pdf.setFont("helvetica", "bold");
  pdf.text("Pickup Location:", L, y);
  pdf.text("Drop-off Location:", MID, y);
  y += 8;
  pdf.setFont("helvetica", "normal");
  const locLines = Math.max(pickupFull.length, dropoffFull.length);
  for (let i = 0; i < locLines; i++) {
    if (pickupFull[i]) pdf.text(pickupFull[i], L, y);
    if (dropoffFull[i]) pdf.text(dropoffFull[i], MID, y);
    y += 8;
  }

  if (t.locations.deliveryAddress) {
    pdf.setFont("helvetica", "bold");
    pdf.text("Delivery Address:", L, y);
    pdf.setFont("helvetica", "normal");
    const delAddrLines = pdf.splitTextToSize(t.locations.deliveryAddress, CW * 0.7);
    for (const dl of delAddrLines) {
      pdf.text(dl, L + 70, y);
      y += 8;
    }
  }

  hLine(pdf, y + 1);
  y += 1 + SEC_GAP;

  // ─────────────────────────────────────────────
  // VEHICLE DETAILS + CONDITION
  // ─────────────────────────────────────────────
  sectionTitle(pdf, "VEHICLE DETAILS", L, y, FONT_SECTION);
  y += TITLE_GAP;

  const makeModelParts = [t.vehicle.year, t.vehicle.make, t.vehicle.model].filter(Boolean);
  const vehicleDesc = t.vehicle.category || "—";

  labelValue(pdf, "Category:", vehicleDesc, L, y, FONT_LABEL);
  if (makeModelParts.length > 0) {
    labelValue(pdf, "Vehicle:", makeModelParts.join(" "), MID, y, FONT_LABEL);
  }
  y += ROW_H;

  labelValue(pdf, "Fuel Type:", t.vehicle.fuelType || "—", L, y, FONT_LABEL);
  labelValue(pdf, "Transmission:", t.vehicle.transmission || "—", MID, y, FONT_LABEL);
  y += ROW_H;

  labelValue(pdf, "Seats:", `${t.vehicle.seats || "—"} passengers`, L, y, FONT_LABEL);
  labelValue(pdf, "Tank Capacity:", `${t.vehicle.tankCapacityLiters || 50} litres`, MID, y, FONT_LABEL);
  y += ROW_H;

  // VIN / Plate / Color
  const hasVin = t.vehicle.vin && t.vehicle.vin !== "N/A";
  const hasPlate = t.vehicle.licensePlate && t.vehicle.licensePlate !== "N/A";
  const hasColor = !!t.vehicle.color;
  if (hasVin || hasPlate || hasColor) {
    if (hasVin) labelValue(pdf, "VIN:", t.vehicle.vin!, L, y, FONT_LABEL);
    if (hasPlate) labelValue(pdf, "Plate:", t.vehicle.licensePlate!, hasVin ? MID : L, y, FONT_LABEL);
    if (hasColor && !hasPlate) labelValue(pdf, "Color:", t.vehicle.color!, hasVin ? MID : L, y, FONT_LABEL);
    y += ROW_H;
    if (hasColor && hasPlate) {
      labelValue(pdf, "Color:", t.vehicle.color!, L, y, FONT_LABEL);
      y += ROW_H;
    }
  }

  // Condition at pickup (inline)
  pdf.setFontSize(FONT_LABEL);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(80, 80, 80);
  pdf.text("Condition at Pickup:", L, y);
  pdf.setTextColor(0, 0, 0);

  const odometerStr = t.condition.odometerOut != null
    ? `${t.condition.odometerOut.toLocaleString()} km` : "N/A";
  const fuelStr = t.condition.fuelLevelOut != null
    ? `${t.condition.fuelLevelOut}%` : "N/A";
  labelValue(pdf, "Km Out:", odometerStr, L + 90, y, FONT_LABEL);
  labelValue(pdf, "Fuel:", fuelStr, MID + 50, y, FONT_LABEL);
  y += ROW_H;

  hLine(pdf, y);
  y += SEC_GAP;

  // ─────────────────────────────────────────────
  // RENTAL PERIOD
  // ─────────────────────────────────────────────
  sectionTitle(pdf, "RENTAL PERIOD", L, y, FONT_SECTION);
  y += TITLE_GAP;

  labelValue(pdf, "Pick-up:", fmtDateFull(t.rental.startAt), L, y, FONT_LABEL);
  y += ROW_H;
  labelValue(pdf, "Return:", fmtDateFull(t.rental.endAt), L, y, FONT_LABEL);
  labelValue(pdf, "Duration:", `${t.rental.totalDays} day(s)`, MID + 80, y, FONT_LABEL);
  y += ROW_H;

  hLine(pdf, y);
  y += SEC_GAP;

  // ─────────────────────────────────────────────
  // FINANCIAL SUMMARY
  // ─────────────────────────────────────────────
  sectionTitle(pdf, "FINANCIAL SUMMARY", L, y, FONT_SECTION);
  y += TITLE_GAP;

  // Vehicle Rental
  finSectionHead(pdf, "VEHICLE RENTAL", L, y, FONT_FIN);
  y += FIN_HEAD_H;
  finRow(pdf, `Daily Rate: ${fmt(t.rental.dailyRate)} × ${t.rental.totalDays} days`, fmt(t.financial.vehicleSubtotal), y, FONT_FIN);
  y += FIN_ROW_H;

  // Protection plan
  const protName = t.protection?.planName || "No Extra Protection";
  const protTotal = t.protection?.total ?? t.financial.protectionTotal ?? 0;
  const protDaily = t.protection?.dailyRate ?? 0;

  finSectionHead(pdf, "PROTECTION PLAN", L, y, FONT_FIN);
  y += FIN_HEAD_H;
  if (protDaily > 0) {
    finRow(pdf, `${protName}: ${fmt(protDaily)}/day × ${t.rental.totalDays} days`, fmt(protTotal), y, FONT_FIN);
  } else {
    finRow(pdf, protName, "$0.00", y, FONT_FIN);
  }
  y += FIN_ROW_H;

  // Add-ons
  finSectionHead(pdf, "ADD-ONS & EXTRAS", L, y, FONT_FIN);
  y += FIN_HEAD_H;
  if (t.financial.addOns && t.financial.addOns.length > 0) {
    for (const addon of t.financial.addOns) {
      finRow(pdf, addon.name || "—", fmt(addon.price), y, FONT_FIN);
      y += FIN_ROW_H;
    }
  } else {
    pdf.setFontSize(FONT_FIN);
    pdf.setFont("helvetica", "normal");
    pdf.text("No add-ons selected", L + 8, y);
    y += FIN_ROW_H;
  }

  // Regulatory fees
  finSectionHead(pdf, "REGULATORY FEES", L, y, FONT_FIN);
  y += FIN_HEAD_H;
  finRow(pdf, `PVRT: ${fmt(t.taxes.pvrtDailyFee)}/day × ${t.rental.totalDays}`, fmt(t.financial.pvrtTotal), y, FONT_FIN);
  y += FIN_ROW_H;
  finRow(pdf, `ACSRCH: ${fmt(t.taxes.acsrchDailyFee)}/day × ${t.rental.totalDays}`, fmt(t.financial.acsrchTotal), y, FONT_FIN);
  y += FIN_ROW_H;

  // Young driver fee
  if (t.financial.youngDriverFee > 0) {
    finRow(pdf, "Young Driver Fee", fmt(t.financial.youngDriverFee), y, FONT_FIN);
    y += FIN_ROW_H;
  }

  // Subtotal divider
  pdf.setDrawColor(160, 160, 160);
  pdf.setLineWidth(0.3);
  pdf.line(L, y, R, y);
  y += 7;
  finRowBold(pdf, "SUBTOTAL:", fmt(t.financial.subtotalBeforeTax), y, FONT_FIN + 0.5);
  y += FIN_ROW_H;

  // Taxes
  finSectionHead(pdf, "TAXES", L, y, FONT_FIN);
  y += FIN_HEAD_H;
  finRow(pdf, `PST (${(t.taxes.pstRate * 100).toFixed(0)}%):`, fmt(t.financial.pstAmount), y, FONT_FIN);
  y += FIN_ROW_H;
  finRow(pdf, `GST (${(t.taxes.gstRate * 100).toFixed(0)}%):`, fmt(t.financial.gstAmount), y, FONT_FIN);
  y += FIN_ROW_H;

  // Total box
  pdf.setFillColor(240, 240, 240);
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.8);
  pdf.rect(L, y - 1, CW, 14, "FD");
  pdf.setFontSize(8.5);
  pdf.setFont("helvetica", "bold");
  pdf.text("TOTAL AMOUNT DUE:", L + 6, y + 8);
  pdf.text(`${fmt(t.financial.grandTotal)} CAD`, R - 6, y + 8, { align: "right" });
  y += 18;

  // Deposit
  pdf.setFontSize(FONT_FIN);
  pdf.setFont("helvetica", "normal");
  finRow(pdf, "Security Deposit:", `${fmt(t.financial.depositAmount)} (refundable)`, y, FONT_FIN);
  y += FIN_ROW_H;

  hLine(pdf, y);
  y += SEC_GAP;

  // ─────────────────────────────────────────────
  // TERMS AND CONDITIONS (two-column)
  // ─────────────────────────────────────────────
  sectionTitle(pdf, "TERMS AND CONDITIONS", L, y, FONT_SECTION);
  y += 7;

  const p = t.policies;

  const tcBlocks = [
    {
      title: "1. DRIVER REQUIREMENTS",
      items: [
        `Renter must be at least ${p.minAge} years of age.`,
        "Valid driver's license required at pickup.",
        "Government-issued photo ID required.",
        "Additional drivers must be registered.",
      ]
    },
    {
      title: "2. VEHICLE USE RESTRICTIONS",
      items: [
        "No smoking in the vehicle.",
        "No pets without prior written approval.",
        "No racing, towing, or off-road use.",
        "No international travel without authorization.",
      ]
    },
    {
      title: "3. FUEL POLICY",
      items: [
        "Return vehicle with same fuel level as pickup.",
        "Refueling charges apply if returned with less fuel.",
      ]
    },
    {
      title: "4. RETURN POLICY & LATE FEES",
      items: [
        `Grace period: ${p.gracePeriodMinutes} min past scheduled return.`,
        "25% surcharge of daily rate per extra hour (up to 2 hrs).",
        "After 2 hrs, full day charge per subsequent day.",
        "Extended rentals require prior approval.",
      ]
    },
    {
      title: "5. DAMAGE & LIABILITY",
      items: [
        "Renter responsible for all damage during rental.",
        "Security deposit may cover damages.",
        "Renter liable for traffic violations and tolls.",
      ]
    },
    {
      title: "6. INSURANCE & COVERAGE",
      items: [
        "Third-party liability comes standard.",
        "Optional coverages available at pickup.",
      ]
    },
    {
      title: "7. KILOMETRE ALLOWANCE",
      items: ["Unlimited kilometres included."]
    },
    {
      title: "8. TERMINATION",
      items: [
        "Rental may be terminated for violation of terms.",
        "Early return does not guarantee refund.",
      ]
    },
    {
      title: "9. TAX INFORMATION",
      items: [
        `PST: ${(t.taxes.pstRate * 100).toFixed(0)}%, GST: ${(t.taxes.gstRate * 100).toFixed(0)}%, PVRT: ${fmt(t.taxes.pvrtDailyFee)}/day, ACSRCH: ${fmt(t.taxes.acsrchDailyFee)}/day`,
      ]
    },
  ];

  // Render in two columns
  const colW = CW * 0.48;
  const col1X = L;
  const col2X = MID + 6;
  const tcStartY = y;

  const leftBlocks = tcBlocks.slice(0, 5);
  const rightBlocks = tcBlocks.slice(5);

  let ly = tcStartY;
  for (const block of leftBlocks) {
    ly = renderTcBlock(pdf, block.title, block.items, col1X, ly, colW, FONT_TC, TC_LH);
  }

  let ry = tcStartY;
  for (const block of rightBlocks) {
    ry = renderTcBlock(pdf, block.title, block.items, col2X, ry, colW, FONT_TC, TC_LH);
  }

  y = Math.max(ly, ry) + 3;

  hLine(pdf, y);
  y += SEC_GAP;

  // ─────────────────────────────────────────────
  // ACKNOWLEDGMENT AND SIGNATURE
  // ─────────────────────────────────────────────
  sectionTitle(pdf, "ACKNOWLEDGMENT AND SIGNATURE", L, y, FONT_SECTION);
  y += 7;

  pdf.setFontSize(6.5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(30, 30, 30);

  const ackPoints = [
    "I confirm I have read and understood all terms and conditions outlined in this Vehicle Rental Agreement.",
    "I acknowledge that my electronic signature has the same legal effect as a handwritten signature.",
  ];

  for (const point of ackPoints) {
    const lines = pdf.splitTextToSize(`• ${point}`, CW);
    for (const line of lines) {
      pdf.text(line, L, y);
      y += 7;
    }
  }

  y += 4;

  // Signature block
  pdf.setTextColor(0, 0, 0);
  if (agreement.customer_signature) {
    pdf.setFontSize(FONT_LABEL);
    pdf.setFont("helvetica", "bold");
    pdf.text("RENTER SIGNATURE:", L, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(agreement.customer_signature, L + 82, y);

    pdf.setFont("helvetica", "bold");
    pdf.text("DATE:", MID + 20, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(fmtDateLong(agreement.customer_signed_at!), MID + 46, y);
    y += 10;

    // Embed signature PNG image if available
    if (signatureBase64) {
      try {
        pdf.addImage(signatureBase64, "PNG", L, y, 110, 28);
        y += 32;
      } catch { /* skip */ }
    }

    if (agreement.staff_confirmed_at) {
      pdf.setFont("helvetica", "bold");
      pdf.text("CONFIRMED BY STAFF:", L, y);
      pdf.setFont("helvetica", "normal");
      pdf.text(fmtDateLong(agreement.staff_confirmed_at), L + 92, y);
      y += 10;
    }

    if (agreement.signed_manually) {
      pdf.setFontSize(5.5);
      pdf.setFont("helvetica", "italic");
      pdf.setTextColor(100, 100, 100);
      pdf.text("(Signed in person)", L, y);
    }
  } else {
    pdf.setFontSize(FONT_LABEL);
    pdf.setFont("helvetica", "normal");
    pdf.text("RENTER SIGNATURE:", L, y);
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.3);
    pdf.line(L + 84, y, L + 210, y);

    pdf.text("DATE:", MID + 30, y);
    pdf.line(MID + 54, y, MID + 155, y);
  }

  // ─────────────────────────────────────────────
  // FOOTER
  // ─────────────────────────────────────────────
  const footerY = PAGE_H - 16;
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.3);
  pdf.line(L, footerY - 6, R, footerY - 6);

  pdf.setFontSize(5.5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(120, 120, 120);
  pdf.text(
    `C2C Car Rental  |  Generated ${format(new Date(), "MMM d, yyyy")}  |  Record ${bookingCode}  |  Thank you for choosing us!`,
    PAGE_W / 2, footerY, { align: "center" }
  );
}

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

function sectionTitle(pdf: jsPDF, text: string, x: number, y: number, fontSize: number) {
  pdf.setFontSize(fontSize);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text(text, x, y);
}

function labelValue(pdf: jsPDF, label: string, value: string, x: number, y: number, fontSize: number) {
  pdf.setFontSize(fontSize);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(60, 60, 60);
  pdf.text(label, x, y);
  const labelW = pdf.getTextWidth(label);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0, 0, 0);
  pdf.text(value, x + labelW + 3, y);
}

function finSectionHead(pdf: jsPDF, text: string, x: number, y: number, fontSize: number) {
  pdf.setFontSize(fontSize);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text(text + ":", x, y);
}

function finRow(pdf: jsPDF, label: string, amount: string, y: number, fontSize: number) {
  pdf.setFontSize(fontSize);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0, 0, 0);
  pdf.text(label, L + 8, y);
  pdf.text(amount, R - 6, y, { align: "right" });
}

function finRowBold(pdf: jsPDF, label: string, amount: string, y: number, fontSize: number) {
  pdf.setFontSize(fontSize);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text(label, L, y);
  pdf.text(amount, R - 6, y, { align: "right" });
}

function formatAddressLines(address?: string, city?: string): string[] {
  const lines: string[] = [];
  if (address) lines.push(address);
  if (city) lines.push(`${city}, BC`);
  if (lines.length === 0) lines.push("—");
  return lines;
}

function hLine(pdf: jsPDF, y: number) {
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.3);
  pdf.line(L, y, R, y);
}

function renderTcBlock(
  pdf: jsPDF,
  title: string,
  items: string[],
  x: number,
  y: number,
  maxW: number,
  fontSize: number,
  lineH: number
): number {
  pdf.setFontSize(fontSize);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text(title, x, y);
  y += lineH + 1;

  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(30, 30, 30);
  for (const item of items) {
    const lines = pdf.splitTextToSize(`• ${item}`, maxW - 4);
    for (const line of lines) {
      pdf.text(line, x + 4, y);
      y += lineH;
    }
  }
  y += 3; // gap between T&C blocks
  return y;
}

// ══════════════════════════════════════════════════════
// LEGACY RENDERER — fallback for old agreements
// ══════════════════════════════════════════════════════

function renderLegacyPdf(
  pdf: jsPDF,
  agreement: RentalAgreement,
  bookingId: string,
  logoBase64: string | null,
  signatureBase64: string | null
) {
  let y = MX;
  const centerX = PAGE_W / 2;

  if (logoBase64) {
    try {
      pdf.addImage(logoBase64, "PNG", centerX - 37, y, 75, 28);
      y += 34;
    } catch {
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("C2C CAR RENTAL", centerX, y + 12, { align: "center" });
      y += 18;
    }
  } else {
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("C2C CAR RENTAL", centerX, y + 12, { align: "center" });
    y += 18;
  }

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text("LEGAL VEHICLE RENTAL AGREEMENT", centerX, y, { align: "center" });
  y += 14;

  pdf.setDrawColor(120, 120, 120);
  pdf.setLineWidth(0.5);
  pdf.line(MX, y, R, y);
  y += 8;

  const lines = agreement.agreement_content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || /^[▓═┌┐└┘─│]+$/.test(trimmed) || trimmed.includes("▓") || trimmed.includes("═══")) continue;

    if (line.includes("│")) {
      const headerText = trimmed.replace(/[┌┐└┘│─]/g, "").trim();
      if (headerText && headerText.length > 2) {
        y += 2;
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(50, 50, 50);
        pdf.text(headerText.toUpperCase(), MX, y);
        y += 8;
        pdf.setTextColor(0, 0, 0);
        continue;
      }
    }

    pdf.setFontSize(6);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);
    const wrapped = pdf.splitTextToSize(trimmed, CW);
    for (const w of wrapped) {
      if (y > PAGE_H - 40) break;
      pdf.text(w, MX, y);
      y += 6.5;
    }
  }

  y = Math.max(y + 10, 700);
  pdf.setDrawColor(120, 120, 120);
  pdf.setLineWidth(0.3);
  pdf.line(MX, y, R, y);
  y += 10;

  if (agreement.customer_signature) {
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    pdf.text("Signed By:", MX, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(agreement.customer_signature, MX + 55, y);
    y += 9;
    if (agreement.customer_signed_at) {
      pdf.setFont("helvetica", "bold");
      pdf.text("Date:", MX, y);
      pdf.setFont("helvetica", "normal");
      pdf.text(fmtDateLong(agreement.customer_signed_at), MX + 55, y);
      y += 10;
    }
    if (signatureBase64) {
      try {
        pdf.addImage(signatureBase64, "PNG", MX, y, 140, 35);
        y += 40;
      } catch { /* skip */ }
    }
  } else {
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    pdf.text("Customer Signature:", MX, y);
    pdf.line(MX + 80, y, MX + 230, y);
    y += 14;
    pdf.text("Date:", MX, y);
    pdf.line(MX + 80, y, MX + 170, y);
  }

  const footerY = PAGE_H - 18;
  pdf.setFontSize(5.5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(140, 140, 140);
  pdf.text(
    `C2C Car Rental  |  Generated ${format(new Date(), "MMM d, yyyy")}  |  Booking ${bookingId.slice(0, 8)}`,
    PAGE_W / 2, footerY, { align: "center" }
  );
}
