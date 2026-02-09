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

// ── Load logo ──

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

const M = 28; // tight margin
const PAGE_W = 612;
const PAGE_H = 792;
const CW = PAGE_W - M * 2; // content width
const L = M; // left edge
const R = PAGE_W - M; // right edge
const MID = M + CW * 0.5; // midpoint

// ── Main export ──

export async function generateRentalAgreementPdf(
  agreement: RentalAgreement,
  bookingId: string
): Promise<void> {
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const logoBase64 = await loadLogo();
  const terms = agreement.terms_json as unknown as TermsJson | null;

  if (terms && terms.rental && terms.financial) {
    renderStructuredPdf(pdf, terms, agreement, bookingId, logoBase64);
  } else {
    renderLegacyPdf(pdf, agreement, bookingId, logoBase64);
  }

  const code = bookingId.slice(0, 8).toUpperCase();
  pdf.save(`C2C-Rental-${code}.pdf`);
}

// ══════════════════════════════════════════════════════════════
// STRUCTURED RENDERER — Full agreement, single page, dense
// ══════════════════════════════════════════════════════════════

function renderStructuredPdf(
  pdf: jsPDF,
  t: TermsJson,
  agreement: RentalAgreement,
  bookingId: string,
  logoBase64: string | null
) {
  let y = M;
  const bookingCode = bookingId.slice(0, 8).toUpperCase();

  // ─────────────────────────────────────────────
  // HEADER
  // ─────────────────────────────────────────────
  if (logoBase64) {
    try { pdf.addImage(logoBase64, "PNG", L, y - 2, 55, 20); } catch { /* skip */ }
  }
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text("C2C CAR RENTAL", PAGE_W / 2, y + 8, { align: "center" });
  pdf.setFontSize(8);
  pdf.text("VEHICLE LEGAL AGREEMENT", PAGE_W / 2, y + 18, { align: "center" });
  y += 24;

  // Booking ref + date (right-aligned row)
  pdf.setFontSize(6.5);
  pdf.setFont("helvetica", "normal");
  const refLine = `Booking Reference: ${bookingCode}`;
  const dateLine = `Agreement Date: ${fmtDateShort(agreement.created_at)}`;
  pdf.setFont("helvetica", "bold");
  pdf.text("Booking Reference:", L, y);
  pdf.setFont("helvetica", "normal");
  pdf.text(bookingCode, L + 78, y);
  pdf.setFont("helvetica", "bold");
  pdf.text("Agreement Date:", MID, y);
  pdf.setFont("helvetica", "normal");
  pdf.text(fmtDateShort(agreement.created_at), MID + 68, y);
  y += 6;

  hLine(pdf, y);
  y += 5;

  // ─────────────────────────────────────────────
  // RENTER INFORMATION
  // ─────────────────────────────────────────────
  sectionTitle(pdf, "RENTER INFORMATION", L, y);
  y += 8;

  const displayName = t.customer.name && !t.customer.name.includes("@")
    ? t.customer.name : "—";
  const displayEmail = t.customer.email || "—";

  labelValue(pdf, "Name:", displayName, L, y);
  labelValue(pdf, "Email:", displayEmail, MID, y);
  y += 8;

  hLine(pdf, y);
  y += 5;

  // ─────────────────────────────────────────────
  // LOCATIONS (two columns)
  // ─────────────────────────────────────────────
  sectionTitle(pdf, "LOCATIONS", L, y);
  y += 8;

  const pickupLoc = t.locations.pickup;
  const dropoffLoc = t.locations.dropoff;
  const pickupAddr = [pickupLoc.name, pickupLoc.address, pickupLoc.city].filter(Boolean).join(", ");
  const dropoffAddr = [dropoffLoc.name, dropoffLoc.address, dropoffLoc.city].filter(Boolean).join(", ");

  pdf.setFontSize(6);
  pdf.setFont("helvetica", "bold");
  pdf.text("Pickup Location:", L, y);
  pdf.text("Drop-off Location:", MID, y);
  y += 7;
  pdf.setFont("helvetica", "normal");
  // Wrap pickup address
  const pickupLines = pdf.splitTextToSize(pickupAddr || "—", CW * 0.48);
  const dropoffLines = pdf.splitTextToSize(
    dropoffAddr === pickupAddr ? `${dropoffAddr} (Same as pickup)` : (dropoffAddr || "—"),
    CW * 0.48
  );
  const locLines = Math.max(pickupLines.length, dropoffLines.length);
  for (let i = 0; i < locLines; i++) {
    if (pickupLines[i]) pdf.text(pickupLines[i], L, y);
    if (dropoffLines[i]) pdf.text(dropoffLines[i], MID, y);
    y += 6;
  }

  if (t.locations.deliveryAddress) {
    pdf.setFont("helvetica", "bold");
    pdf.text("Delivery Address:", L, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(t.locations.deliveryAddress, L + 68, y);
    y += 6;
  }

  y += 1;
  hLine(pdf, y);
  y += 5;

  // ─────────────────────────────────────────────
  // VEHICLE DETAILS + CONDITION (two columns)
  // ─────────────────────────────────────────────
  sectionTitle(pdf, "VEHICLE DETAILS", L, y);
  y += 8;

  const makeModelParts = [t.vehicle.year, t.vehicle.make, t.vehicle.model].filter(Boolean);
  const vehicleDesc = t.vehicle.category || "—";

  labelValue(pdf, "Category:", vehicleDesc, L, y);
  if (makeModelParts.length > 0) {
    labelValue(pdf, "Vehicle:", makeModelParts.join(" "), MID, y);
  }
  y += 7;

  labelValue(pdf, "Fuel Type:", t.vehicle.fuelType || "—", L, y);
  labelValue(pdf, "Transmission:", t.vehicle.transmission || "—", MID, y);
  y += 7;

  labelValue(pdf, "Seats:", `${t.vehicle.seats || "—"} passengers`, L, y);
  labelValue(pdf, "Tank Capacity:", `${t.vehicle.tankCapacityLiters || 50} litres`, MID, y);
  y += 7;

  // VIN / Plate / Color (only if present)
  const hasVin = t.vehicle.vin && t.vehicle.vin !== "N/A";
  const hasPlate = t.vehicle.licensePlate && t.vehicle.licensePlate !== "N/A";
  const hasColor = !!t.vehicle.color;
  if (hasVin || hasPlate || hasColor) {
    if (hasVin) labelValue(pdf, "VIN:", t.vehicle.vin!, L, y);
    if (hasPlate) labelValue(pdf, "Plate:", t.vehicle.licensePlate!, hasVin ? MID : L, y);
    if (hasColor && !hasPlate) labelValue(pdf, "Color:", t.vehicle.color!, hasVin ? MID : L, y);
    y += 7;
    if (hasColor && hasPlate) {
      labelValue(pdf, "Color:", t.vehicle.color!, L, y);
      y += 7;
    }
  }

  // Condition at pickup
  pdf.setFontSize(6);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(60, 60, 60);
  pdf.text("CONDITION AT PICKUP:", L, y);
  pdf.setTextColor(0, 0, 0);
  y += 7;

  const odometerStr = t.condition.odometerOut != null
    ? `${t.condition.odometerOut.toLocaleString()} km` : "N/A";
  const fuelStr = t.condition.fuelLevelOut != null
    ? `${t.condition.fuelLevelOut}%` : "N/A";

  labelValue(pdf, "Kilometres Out:", odometerStr, L, y);
  labelValue(pdf, "Fuel Level:", fuelStr, MID, y);
  y += 6;

  hLine(pdf, y);
  y += 5;

  // ─────────────────────────────────────────────
  // RENTAL PERIOD
  // ─────────────────────────────────────────────
  sectionTitle(pdf, "RENTAL PERIOD", L, y);
  y += 8;

  labelValue(pdf, "Pick-up Date/Time:", fmtDateFull(t.rental.startAt), L, y);
  y += 7;
  labelValue(pdf, "Return Date/Time:", fmtDateFull(t.rental.endAt), L, y);
  y += 7;
  labelValue(pdf, "Duration:", `${t.rental.totalDays} day(s)`, L, y);
  y += 6;

  hLine(pdf, y);
  y += 5;

  // ─────────────────────────────────────────────
  // FINANCIAL SUMMARY
  // ─────────────────────────────────────────────
  sectionTitle(pdf, "FINANCIAL SUMMARY", L, y);
  y += 8;

  const FS = 5.5; // financial font size
  pdf.setFontSize(FS);

  // Vehicle Rental
  pdf.setFont("helvetica", "bold");
  pdf.text("VEHICLE RENTAL:", L, y);
  pdf.setFont("helvetica", "normal");
  y += 7;
  finRow(pdf, `Daily Rate: ${fmt(t.rental.dailyRate)} × ${t.rental.totalDays} days`, fmt(t.financial.vehicleSubtotal), y);
  y += 6;

  // Protection plan
  const protName = t.protection?.planName || "No Extra Protection";
  const protTotal = t.protection?.total ?? t.financial.protectionTotal ?? 0;
  const protDaily = t.protection?.dailyRate ?? 0;

  pdf.setFont("helvetica", "bold");
  pdf.text("PROTECTION PLAN:", L, y);
  pdf.setFont("helvetica", "normal");
  y += 7;
  if (protDaily > 0) {
    finRow(pdf, `${protName}: ${fmt(protDaily)}/day × ${t.rental.totalDays} days`, fmt(protTotal), y);
  } else {
    finRow(pdf, protName, "$0.00", y);
  }
  y += 6;

  // Add-ons
  pdf.setFont("helvetica", "bold");
  pdf.text("ADD-ONS & EXTRAS:", L, y);
  pdf.setFont("helvetica", "normal");
  y += 7;

  if (t.financial.addOns && t.financial.addOns.length > 0) {
    for (const addon of t.financial.addOns) {
      finRow(pdf, addon.name || "—", fmt(addon.price), y);
      y += 6;
    }
  } else {
    pdf.text("No add-ons selected", L + 8, y);
    y += 6;
  }

  // Regulatory fees
  pdf.setFont("helvetica", "bold");
  pdf.text("REGULATORY FEES:", L, y);
  pdf.setFont("helvetica", "normal");
  y += 7;
  finRow(pdf, `PVRT (Passenger Vehicle Rental Tax): ${fmt(t.taxes.pvrtDailyFee)}/day × ${t.rental.totalDays}`, fmt(t.financial.pvrtTotal), y);
  y += 6;
  finRow(pdf, `ACSRCH (AC Surcharge): ${fmt(t.taxes.acsrchDailyFee)}/day × ${t.rental.totalDays}`, fmt(t.financial.acsrchTotal), y);
  y += 6;

  // Young driver fee
  if (t.financial.youngDriverFee > 0) {
    finRow(pdf, "Young Driver Fee", fmt(t.financial.youngDriverFee), y);
    y += 6;
  }

  // Subtotal
  pdf.setDrawColor(160, 160, 160);
  pdf.setLineWidth(0.3);
  pdf.line(L, y, R, y);
  y += 5;
  finRowBold(pdf, "SUBTOTAL:", fmt(t.financial.subtotalBeforeTax), y);
  y += 7;

  // Taxes
  pdf.setFont("helvetica", "bold");
  pdf.text("TAXES:", L, y);
  pdf.setFont("helvetica", "normal");
  y += 7;
  finRow(pdf, `PST (${(t.taxes.pstRate * 100).toFixed(0)}%):`, fmt(t.financial.pstAmount), y);
  finRow(pdf, `GST (${(t.taxes.gstRate * 100).toFixed(0)}%):`, fmt(t.financial.gstAmount), y, MID);
  y += 7;

  // Total box
  pdf.setFillColor(240, 240, 240);
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.8);
  pdf.rect(L, y - 1, CW, 12, "FD");
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "bold");
  pdf.text("TOTAL AMOUNT DUE:", L + 4, y + 7);
  pdf.text(`${fmt(t.financial.grandTotal)} CAD`, R - 4, y + 7, { align: "right" });
  y += 14;

  // Deposit
  pdf.setFontSize(FS);
  pdf.setFont("helvetica", "normal");
  finRow(pdf, "Security Deposit:", `${fmt(t.financial.depositAmount)} (refundable)`, y);
  y += 6;

  hLine(pdf, y);
  y += 4;

  // ─────────────────────────────────────────────
  // TERMS AND CONDITIONS (two-column, ultra-compact)
  // ─────────────────────────────────────────────
  sectionTitle(pdf, "TERMS AND CONDITIONS", L, y);
  y += 6;

  const p = t.policies;
  const tankCap = t.vehicle.tankCapacityLiters || 50;

  // Build all T&C as compact numbered blocks
  const tcBlocks = [
    {
      title: "1. DRIVER REQUIREMENTS",
      items: [
        `Renter must be at least ${p.minAge} years of age.`,
        "Valid driver's license required at time of pickup.",
        "Government-issued photo ID required for signature.",
        "Additional drivers must be registered and approved.",
      ]
    },
    {
      title: "2. VEHICLE USE RESTRICTIONS",
      items: [
        "No smoking in the vehicle.",
        "No pets without prior written approval.",
        "No racing, towing, or off-road use.",
        "No international travel without prior authorization.",
      ]
    },
    {
      title: "3. FUEL POLICY",
      items: [
        `Return vehicle with same fuel level as pickup (Tank: ${tankCap}L).`,
        "Refueling charges apply if returned with less fuel.",
      ]
    },
    {
      title: "4. RETURN POLICY & LATE FEES",
      items: [
        `Grace period: ${p.gracePeriodMinutes} min past scheduled return.`,
        `Late fee: ${p.lateFeePercentOfDaily}% of daily rate per hour after grace.`,
        "Extended rentals require prior approval.",
      ]
    },
    {
      title: "5. DAMAGE & LIABILITY",
      items: [
        "Renter responsible for all damage during rental period; report immediately.",
        "Security deposit may be applied to cover damages.",
        "Renter liable for all traffic violations and tolls.",
      ]
    },
    {
      title: "6. INSURANCE & COVERAGE",
      items: [
        "Third party liability included with all rentals.",
        "Optional rental coverage available at pickup.",
      ]
    },
    {
      title: "7. KILOMETRE ALLOWANCE",
      items: ["Unlimited kilometres included."]
    },
    {
      title: "8. TERMINATION",
      items: [
        "Rental company may terminate for violation of terms.",
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
  const TF = 4.5; // terms font size
  const TLH = 5.2; // terms line height
  const colW = CW * 0.48;
  const col1X = L;
  const col2X = MID + 4;
  const tcStartY = y;

  // Split blocks into two columns (left: 1-5, right: 6-9)
  const leftBlocks = tcBlocks.slice(0, 5);
  const rightBlocks = tcBlocks.slice(5);

  let ly = tcStartY;
  for (const block of leftBlocks) {
    ly = renderTcBlock(pdf, block.title, block.items, col1X, ly, colW, TF, TLH);
  }

  let ry = tcStartY;
  for (const block of rightBlocks) {
    ry = renderTcBlock(pdf, block.title, block.items, col2X, ry, colW, TF, TLH);
  }

  y = Math.max(ly, ry) + 2;

  hLine(pdf, y);
  y += 4;

  // ─────────────────────────────────────────────
  // ACKNOWLEDGMENT AND SIGNATURE
  // ─────────────────────────────────────────────
  sectionTitle(pdf, "ACKNOWLEDGMENT AND SIGNATURE", L, y);
  y += 6;

  const ackFontSize = 4.5;
  const ackLH = 5.2;
  pdf.setFontSize(ackFontSize);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(30, 30, 30);

  const ackPoints = [
    "I confirm I have read and understood all terms and conditions outlined in this Vehicle Legal Agreement.",
    `I confirm I am at least ${p.minAge} years of age.`,
    "I acknowledge that my electronic signature has the same legal effect as a handwritten signature.",
    "I understand that third party liability coverage is included and optional rental coverage is available at pickup.",
    `I agree to return the vehicle with the same fuel level as at pickup.`,
    `I understand late fees will be charged at ${p.lateFeePercentOfDaily}% of the daily rate per hour after the ${p.gracePeriodMinutes}-minute grace period.`,
  ];

  for (const point of ackPoints) {
    const lines = pdf.splitTextToSize(`• ${point}`, CW);
    for (const line of lines) {
      pdf.text(line, L, y);
      y += ackLH;
    }
  }

  y += 3;

  // Signature block
  pdf.setTextColor(0, 0, 0);
  if (agreement.customer_signature) {
    pdf.setFontSize(6);
    pdf.setFont("helvetica", "bold");
    pdf.text("RENTER SIGNATURE:", L, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(agreement.customer_signature, L + 80, y);

    pdf.setFont("helvetica", "bold");
    pdf.text("DATE:", MID + 20, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(fmtDateLong(agreement.customer_signed_at!), MID + 48, y);
    y += 8;

    if (agreement.staff_confirmed_at) {
      pdf.setFont("helvetica", "bold");
      pdf.text("CONFIRMED BY STAFF:", L, y);
      pdf.setFont("helvetica", "normal");
      pdf.text(fmtDateLong(agreement.staff_confirmed_at), L + 88, y);
      y += 8;
    }

    if (agreement.signed_manually) {
      pdf.setFontSize(5);
      pdf.setFont("helvetica", "italic");
      pdf.setTextColor(100, 100, 100);
      pdf.text("(Signed in person)", L, y);
      y += 6;
    }
  } else {
    pdf.setFontSize(6);
    pdf.setFont("helvetica", "normal");
    pdf.text("RENTER SIGNATURE:", L, y);
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.3);
    pdf.line(L + 82, y, L + 220, y);

    pdf.text("DATE:", MID + 30, y);
    pdf.line(MID + 56, y, MID + 160, y);
    y += 10;
  }

  // ─────────────────────────────────────────────
  // FOOTER
  // ─────────────────────────────────────────────
  const footerY = PAGE_H - 14;
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.3);
  pdf.line(L, footerY - 6, R, footerY - 6);

  pdf.setFontSize(5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(120, 120, 120);
  pdf.text(
    `C2C Car Rental  |  Generated ${format(new Date(), "MMM d, yyyy")}  |  Record ${bookingCode}  |  Thank you for choosing us!`,
    PAGE_W / 2,
    footerY,
    { align: "center" }
  );
}

// ── Helper: Section title ──
function sectionTitle(pdf: jsPDF, text: string, x: number, y: number) {
  pdf.setFontSize(6.5);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text(text, x, y);
}

// ── Helper: Label + value pair ──
function labelValue(pdf: jsPDF, label: string, value: string, x: number, y: number) {
  pdf.setFontSize(6);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(60, 60, 60);
  pdf.text(label, x, y);
  const labelW = pdf.getTextWidth(label);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0, 0, 0);
  pdf.text(value, x + labelW + 3, y);
}

// ── Helper: Financial row (label left, amount right) ──
function finRow(pdf: jsPDF, label: string, amount: string, y: number, startX?: number) {
  const x = startX || L;
  pdf.setFontSize(5.5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0, 0, 0);
  pdf.text(label, x + 8, y);
  pdf.text(amount, R - 4, y, { align: "right" });
}

function finRowBold(pdf: jsPDF, label: string, amount: string, y: number) {
  pdf.setFontSize(6);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text(label, L, y);
  pdf.text(amount, R - 4, y, { align: "right" });
}

// ── Helper: Horizontal line ──
function hLine(pdf: jsPDF, y: number) {
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.3);
  pdf.line(L, y, R, y);
}

// ── Helper: Render a T&C block (title + bullet items) ──
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
  y += lineH;

  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(30, 30, 30);
  for (const item of items) {
    const lines = pdf.splitTextToSize(`• ${item}`, maxW - 4);
    for (const line of lines) {
      pdf.text(line, x + 3, y);
      y += lineH;
    }
  }
  y += 1; // gap between blocks
  return y;
}

// ══════════════════════════════════════════════════════
// LEGACY RENDERER — fallback for old agreements
// ══════════════════════════════════════════════════════

function renderLegacyPdf(
  pdf: jsPDF,
  agreement: RentalAgreement,
  bookingId: string,
  logoBase64: string | null
) {
  let y = M;
  const centerX = PAGE_W / 2;

  // Header
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
  pdf.text("VEHICLE RENTAL AGREEMENT", centerX, y, { align: "center" });
  y += 14;

  pdf.setDrawColor(120, 120, 120);
  pdf.setLineWidth(0.5);
  pdf.line(M, y, R, y);
  y += 8;

  // Content
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
        pdf.text(headerText.toUpperCase(), M, y);
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
      pdf.text(w, M, y);
      y += 6.5;
    }
  }

  // Signature
  y = Math.max(y + 10, 700);
  pdf.setDrawColor(120, 120, 120);
  pdf.setLineWidth(0.3);
  pdf.line(M, y, R, y);
  y += 10;

  if (agreement.customer_signature) {
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    pdf.text("Signed By:", M, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(agreement.customer_signature, M + 55, y);
    y += 9;
    if (agreement.customer_signed_at) {
      pdf.setFont("helvetica", "bold");
      pdf.text("Date:", M, y);
      pdf.setFont("helvetica", "normal");
      pdf.text(fmtDateLong(agreement.customer_signed_at), M + 55, y);
    }
  } else {
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    pdf.text("Customer Signature:", M, y);
    pdf.line(M + 80, y, M + 230, y);
    y += 14;
    pdf.text("Date:", M, y);
    pdf.line(M + 80, y, M + 170, y);
  }

  // Footer
  const footerY = PAGE_H - 18;
  pdf.setFontSize(5.5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(140, 140, 140);
  pdf.text(
    `C2C Car Rental  |  Generated ${format(new Date(), "MMM d, yyyy")}  |  Booking ${bookingId.slice(0, 8)}`,
    PAGE_W / 2,
    footerY,
    { align: "center" }
  );
}
