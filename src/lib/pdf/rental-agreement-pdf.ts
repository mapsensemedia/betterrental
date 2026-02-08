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
  colWidth: number;
  rightColX: number;
}

interface PdfState {
  pdf: jsPDF;
  yPos: number;
  config: PdfConfig;
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
  financial: {
    vehicleSubtotal: number;
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

// Initialize PDF
function initPdf(): PdfState {
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const contentWidth = pageWidth - margin * 2;

  return {
    pdf,
    yPos: margin,
    config: {
      pageWidth,
      pageHeight,
      margin,
      contentWidth,
      colWidth: contentWidth / 2 - 4,
      rightColX: margin + contentWidth / 2 + 4,
    },
  };
}

// ── Drawing helpers ──

function drawHorizontalRule(state: PdfState, color = [180, 180, 180]) {
  const { pdf, config } = state;
  pdf.setDrawColor(color[0], color[1], color[2]);
  pdf.setLineWidth(0.3);
  pdf.line(config.margin, state.yPos, config.pageWidth - config.margin, state.yPos);
  state.yPos += 4;
}

function sectionLabel(state: PdfState, text: string, x: number) {
  const { pdf } = state;
  pdf.setFontSize(6.5);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(60, 60, 60);
  pdf.text(text.toUpperCase(), x, state.yPos);
}

function kvLine(
  state: PdfState,
  label: string,
  value: string,
  x: number,
  maxW: number,
  lineH = 7.5
) {
  const { pdf } = state;
  const labelW = 70;
  pdf.setFontSize(6);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(80, 80, 80);
  pdf.text(label + ":", x, state.yPos);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0, 0, 0);
  const lines = pdf.splitTextToSize(value || "N/A", maxW - labelW - 2);
  pdf.text(lines, x + labelW, state.yPos);
  return Math.max(lineH, lines.length * lineH);
}

function kvLineAt(
  pdf: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  labelW = 70,
  maxW = 200
) {
  pdf.setFontSize(6);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(80, 80, 80);
  pdf.text(label + ":", x, y);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0, 0, 0);
  const lines = pdf.splitTextToSize(value || "N/A", maxW - labelW - 2);
  pdf.text(lines, x + labelW, y);
  return lines.length * 7.5;
}

// ── Header ──

async function addHeader(
  state: PdfState,
  logoBase64: string | null,
  bookingCode: string
): Promise<void> {
  const { pdf, config } = state;

  // Logo left
  if (logoBase64) {
    try {
      pdf.addImage(logoBase64, "PNG", config.margin, state.yPos, 60, 22);
    } catch { /* ignore logo errors */ }
  }

  // Title center
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text("RENTAL RECORD", config.pageWidth / 2, state.yPos + 10, { align: "center" });

  // Booking code right
  pdf.setFontSize(6.5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(80, 80, 80);
  pdf.text(`Booking: ${bookingCode}`, config.pageWidth - config.margin, state.yPos + 10, {
    align: "right",
  });

  state.yPos += 28;
  drawHorizontalRule(state, [120, 120, 120]);
}

// ── Section: Renter + Rental Period ──

function addRenterAndPeriod(state: PdfState, t: TermsJson) {
  const { config } = state;
  const savedY = state.yPos;

  // Left: Renter
  sectionLabel(state, "Renter", config.margin);
  state.yPos += 9;
  const h1 = kvLine(state, "Name", t.customer.name || "N/A", config.margin, config.colWidth);
  state.yPos += h1;
  const h2 = kvLine(state, "Email", t.customer.email || "N/A", config.margin, config.colWidth);
  const leftBottom = state.yPos + h2;

  // Right: Rental Period
  state.yPos = savedY;
  sectionLabel(state, "Rental Period", config.rightColX);
  state.yPos += 9;

  const startFmt = formatDateCompact(t.rental.startAt);
  const endFmt = formatDateCompact(t.rental.endAt);

  const rh1 = kvLine(state, "Pickup", startFmt, config.rightColX, config.colWidth);
  state.yPos += rh1;
  const rh2 = kvLine(state, "Return", endFmt, config.rightColX, config.colWidth);
  state.yPos += rh2;
  const rh3 = kvLine(state, "Duration", `${t.rental.totalDays} day(s)`, config.rightColX, config.colWidth);
  const rightBottom = state.yPos + rh3;

  state.yPos = Math.max(leftBottom, rightBottom) + 2;
  drawHorizontalRule(state);
}

// ── Section: Vehicle + Locations ──

function addVehicleAndLocations(state: PdfState, t: TermsJson) {
  const { config } = state;
  const savedY = state.yPos;
  const lh = 7.5;

  // Left: Vehicle
  sectionLabel(state, "Vehicle", config.margin);
  state.yPos += 9;

  const vehicleFields: [string, string][] = [
    ["Category", t.vehicle.category || "N/A"],
  ];
  if (t.vehicle.make || t.vehicle.model) {
    vehicleFields.push(["Make/Model", [t.vehicle.make, t.vehicle.model].filter(Boolean).join(" ")]);
  }
  if (t.vehicle.year || t.vehicle.color) {
    vehicleFields.push(["Year / Color", [t.vehicle.year, t.vehicle.color].filter(Boolean).join(" / ")]);
  }
  if (t.vehicle.licensePlate) vehicleFields.push(["Plate", t.vehicle.licensePlate]);
  if (t.vehicle.vin) vehicleFields.push(["VIN", t.vehicle.vin]);
  vehicleFields.push(["Fuel / Trans", `${t.vehicle.fuelType || "N/A"} / ${t.vehicle.transmission || "N/A"}`]);
  vehicleFields.push(["Tank / Seats", `${t.vehicle.tankCapacityLiters || 50}L / ${t.vehicle.seats || "N/A"} seats`]);

  for (const [label, value] of vehicleFields) {
    kvLine(state, label, value, config.margin, config.colWidth, lh);
    state.yPos += lh;
  }
  const leftBottom = state.yPos;

  // Right: Locations + Condition
  state.yPos = savedY;
  sectionLabel(state, "Locations", config.rightColX);
  state.yPos += 9;

  const pickupLoc = t.locations.pickup;
  kvLine(state, "Pickup", pickupLoc.name || "N/A", config.rightColX, config.colWidth, lh);
  state.yPos += lh;
  kvLine(state, "Address", `${pickupLoc.address || ""}, ${pickupLoc.city || ""}`, config.rightColX, config.colWidth, lh);
  state.yPos += lh;

  if (t.locations.deliveryAddress) {
    kvLine(state, "Delivery To", t.locations.deliveryAddress, config.rightColX, config.colWidth, lh);
    state.yPos += lh;
  }

  const dropoff = t.locations.dropoff;
  kvLine(state, "Drop-off", dropoff.name || "Same as pickup", config.rightColX, config.colWidth, lh);
  state.yPos += lh + 3;

  // Condition at pickup
  sectionLabel(state, "Condition at Pickup", config.rightColX);
  state.yPos += 9;
  const odoVal = t.condition.odometerOut != null ? `${t.condition.odometerOut.toLocaleString()} km` : "N/A";
  const fuelVal = t.condition.fuelLevelOut != null ? `${t.condition.fuelLevelOut}%` : "100%";
  kvLine(state, "KMs Out", odoVal, config.rightColX, config.colWidth, lh);
  state.yPos += lh;
  kvLine(state, "Fuel Level", fuelVal, config.rightColX, config.colWidth, lh);
  const rightBottom = state.yPos + lh;

  state.yPos = Math.max(leftBottom, rightBottom) + 2;
  drawHorizontalRule(state);
}

// ── Section: Charges + Taxes ──

function addChargesAndTaxes(state: PdfState, t: TermsJson) {
  const { pdf, config } = state;
  const savedY = state.yPos;
  const lh = 7.5;
  const f = t.financial;
  const tx = t.taxes;

  // Left: Charges
  sectionLabel(state, "Charges", config.margin);
  state.yPos += 9;

  const fmt = (n: number) => `$${n.toFixed(2)}`;

  kvLine(state, "Daily Rate", `${fmt(t.rental.dailyRate)} × ${t.rental.totalDays}`, config.margin, config.colWidth, lh);
  state.yPos += lh;
  kvLine(state, "Vehicle Subtotal", fmt(f.vehicleSubtotal), config.margin, config.colWidth, lh);
  state.yPos += lh;

  if (f.addOns && f.addOns.length > 0) {
    for (const addon of f.addOns) {
      kvLine(state, addon.name || "Add-on", fmt(addon.price), config.margin, config.colWidth, lh);
      state.yPos += lh;
    }
  }
  kvLine(state, "Add-ons Total", fmt(f.addOnsTotal), config.margin, config.colWidth, lh);
  state.yPos += lh;

  if (f.youngDriverFee > 0) {
    kvLine(state, "Young Driver Fee", fmt(f.youngDriverFee), config.margin, config.colWidth, lh);
    state.yPos += lh;
  }

  // Total highlight
  state.yPos += 3;
  pdf.setFillColor(240, 240, 240);
  pdf.rect(config.margin, state.yPos - 6, config.colWidth + 4, 12, "F");
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text("TOTAL:", config.margin + 2, state.yPos);
  pdf.text(`${fmt(f.grandTotal)} CAD`, config.margin + config.colWidth, state.yPos, { align: "right" });
  const leftBottom = state.yPos + 10;

  // Right: Service charges / Taxes
  state.yPos = savedY;
  sectionLabel(state, "Service Charges / Taxes", config.rightColX);
  state.yPos += 9;

  kvLine(state, `PVRT $${tx.pvrtDailyFee}/day`, fmt(f.pvrtTotal), config.rightColX, config.colWidth, lh);
  state.yPos += lh;
  kvLine(state, `ACSRCH $${tx.acsrchDailyFee}/day`, fmt(f.acsrchTotal), config.rightColX, config.colWidth, lh);
  state.yPos += lh;
  kvLine(state, `GST ${(tx.gstRate * 100).toFixed(0)}%`, fmt(f.gstAmount), config.rightColX, config.colWidth, lh);
  state.yPos += lh;
  kvLine(state, `PST ${(tx.pstRate * 100).toFixed(0)}%`, fmt(f.pstAmount), config.rightColX, config.colWidth, lh);
  state.yPos += lh + 3;

  kvLine(state, "Deposit", `${fmt(f.depositAmount)} (refundable)`, config.rightColX, config.colWidth, lh);
  const rightBottom = state.yPos + lh;

  state.yPos = Math.max(leftBottom, rightBottom) + 2;
  drawHorizontalRule(state);
}

// ── Section: Condensed Terms ──

function addCondensedTerms(state: PdfState, t: TermsJson) {
  const { pdf, config } = state;

  sectionLabel(state, "Terms & Conditions", config.margin);
  state.yPos += 8;

  const p = t.policies;
  const termsText =
    `Driver must be at least ${p.minAge} years of age with a valid driver's license and government-issued photo ID. ` +
    `Additional drivers must be registered and approved. ` +
    `No smoking, no pets without prior approval, no racing, towing, or off-road use. No international travel without authorization. ` +
    `Vehicle must be returned with the same fuel level as at pickup (tank: ${t.vehicle.tankCapacityLiters || 50}L). Refueling charges apply if returned with less fuel. ` +
    `Grace period: ${p.gracePeriodMinutes} minutes past scheduled return. Late fee: ${p.lateFeePercentOfDaily}% of daily rate per hour after grace period. Extended rentals require prior approval. ` +
    `Renter is responsible for all damage during rental period and must report any damage immediately. Security deposit may be applied to cover damages. Renter is liable for all traffic violations and tolls. ` +
    `Third party liability coverage is included with all rentals. Optional rental coverage is available at pickup. ` +
    `Unlimited kilometres included. Rental company may terminate agreement for violation of terms. Early return does not guarantee refund. ` +
    `Taxes: PST ${(t.taxes.pstRate * 100).toFixed(0)}%, GST ${(t.taxes.gstRate * 100).toFixed(0)}%, PVRT $${t.taxes.pvrtDailyFee.toFixed(2)}/day, ACSRCH $${t.taxes.acsrchDailyFee.toFixed(2)}/day.`;

  pdf.setFontSize(5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(60, 60, 60);

  const lines = pdf.splitTextToSize(termsText, config.contentWidth);
  for (const line of lines) {
    pdf.text(line, config.margin, state.yPos);
    state.yPos += 5.5;
  }

  state.yPos += 2;
  drawHorizontalRule(state);
}

// ── Section: Signature ──

function addSignatureBlock(state: PdfState, agreement: RentalAgreement) {
  const { pdf, config } = state;

  // Ensure signature area is at a fixed minimum Y to avoid overlap
  const sigAreaY = Math.max(state.yPos, 680);
  state.yPos = sigAreaY;

  sectionLabel(state, "Acknowledgment & Signature", config.margin);
  state.yPos += 9;

  if (agreement.customer_signature) {
    pdf.setFontSize(6.5);

    kvLineAt(pdf, "Signed By", agreement.customer_signature, config.margin, state.yPos, 60, config.colWidth);
    kvLineAt(
      pdf,
      "Date",
      format(new Date(agreement.customer_signed_at!), "MMM d, yyyy 'at' h:mm a"),
      config.rightColX,
      state.yPos,
      60,
      config.colWidth
    );
    state.yPos += 9;

    if (agreement.staff_confirmed_at) {
      kvLineAt(
        pdf,
        "Confirmed",
        format(new Date(agreement.staff_confirmed_at), "MMM d, yyyy 'at' h:mm a"),
        config.margin,
        state.yPos,
        60,
        config.colWidth
      );
      state.yPos += 9;
    }

    if (agreement.signed_manually) {
      pdf.setFontSize(5.5);
      pdf.setFont("helvetica", "italic");
      pdf.setTextColor(100, 100, 100);
      pdf.text("(Signed in person)", config.margin, state.yPos);
      state.yPos += 7;
    }
  } else {
    pdf.setFontSize(6.5);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);

    pdf.text("Customer Signature:", config.margin, state.yPos);
    pdf.setDrawColor(120, 120, 120);
    pdf.line(config.margin + 70, state.yPos, config.margin + 200, state.yPos);

    pdf.text("Date:", config.rightColX, state.yPos);
    pdf.line(config.rightColX + 30, state.yPos, config.rightColX + 140, state.yPos);
    state.yPos += 12;
  }
}

// ── Footer ──

function addFooter(state: PdfState, bookingCode: string) {
  const { pdf, config } = state;
  const footerY = config.pageHeight - 14;

  pdf.setFontSize(5.5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(140, 140, 140);
  pdf.text(
    `C2C Car Rental  |  Generated ${format(new Date(), "MMM d, yyyy")}  |  Booking ${bookingCode}`,
    config.pageWidth / 2,
    footerY,
    { align: "center" }
  );
}

// ── Date formatting helper ──

function formatDateCompact(dateStr: string): string {
  try {
    return format(new Date(dateStr), "MMM d, yyyy h:mm a");
  } catch {
    return dateStr;
  }
}

// ── Main export ──

export async function generateRentalAgreementPdf(
  agreement: RentalAgreement,
  bookingId: string
): Promise<void> {
  const state = initPdf();
  const logoBase64 = await loadLogo();

  // Try to use terms_json first for structured single-page layout
  const terms = agreement.terms_json as unknown as TermsJson | null;

  if (terms && terms.rental && terms.financial) {
    // Derive booking code from bookingId (first 8 chars)
    const bookingCode = bookingId.slice(0, 8).toUpperCase();

    await addHeader(state, logoBase64, bookingCode);
    addRenterAndPeriod(state, terms);
    addVehicleAndLocations(state, terms);
    addChargesAndTaxes(state, terms);
    addCondensedTerms(state, terms);
    addSignatureBlock(state, agreement);
    addFooter(state, bookingCode);

    state.pdf.save(`C2C-Rental-Agreement-${bookingCode}.pdf`);
  } else {
    // Fallback: legacy text-based rendering for old agreements without terms_json
    await addLegacyHeader(state, logoBase64);
    renderLegacyContent(state, agreement.agreement_content);
    addLegacySignatureBlock(state, agreement);
    addFooter(state, bookingId.slice(0, 8));

    state.pdf.save(`C2C-Rental-Agreement-${bookingId.slice(0, 8)}.pdf`);
  }
}

// ── Legacy fallback functions (for old agreements without terms_json) ──

async function addLegacyHeader(state: PdfState, logoBase64: string | null) {
  const { pdf, config } = state;
  const centerX = config.pageWidth / 2;

  if (logoBase64) {
    try {
      pdf.addImage(logoBase64, "PNG", centerX - 37, state.yPos, 75, 28);
      state.yPos += 34;
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
  drawHorizontalRule(state);
}

function renderLegacyContent(state: PdfState, content: string) {
  const { pdf, config } = state;
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || /^[▓═┌┐└┘─│]+$/.test(trimmed) || trimmed.includes("▓") || trimmed.includes("═══")) continue;

    if (line.includes("│")) {
      const headerText = trimmed.replace(/[┌┐└┘│─]/g, "").trim();
      if (headerText && headerText.length > 2) {
        state.yPos += 2;
        pdf.setFontSize(6.5);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(50, 50, 50);
        pdf.text(headerText.toUpperCase(), config.margin, state.yPos);
        state.yPos += 7;
        pdf.setTextColor(0, 0, 0);
        continue;
      }
    }

    pdf.setFontSize(5.5);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);
    const wrapped = pdf.splitTextToSize(trimmed, config.contentWidth);
    for (const w of wrapped) {
      if (state.yPos > config.pageHeight - 30) break;
      pdf.text(w, config.margin, state.yPos);
      state.yPos += 6;
    }
  }
}

function addLegacySignatureBlock(state: PdfState, agreement: RentalAgreement) {
  const { pdf, config } = state;
  state.yPos = Math.max(state.yPos, 700);
  drawHorizontalRule(state);

  if (agreement.customer_signature) {
    pdf.setFontSize(6.5);
    pdf.setFont("helvetica", "bold");
    pdf.text("Signed By:", config.margin, state.yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(agreement.customer_signature, config.margin + 50, state.yPos);
    state.yPos += 8;
    if (agreement.customer_signed_at) {
      pdf.setFont("helvetica", "bold");
      pdf.text("Date:", config.margin, state.yPos);
      pdf.setFont("helvetica", "normal");
      pdf.text(format(new Date(agreement.customer_signed_at), "MMM d, yyyy 'at' h:mm a"), config.margin + 50, state.yPos);
    }
  } else {
    pdf.setFontSize(6.5);
    pdf.setFont("helvetica", "normal");
    pdf.text("Customer Signature:", config.margin, state.yPos);
    pdf.line(config.margin + 75, state.yPos, config.margin + 220, state.yPos);
    state.yPos += 12;
    pdf.text("Date:", config.margin, state.yPos);
    pdf.line(config.margin + 75, state.yPos, config.margin + 160, state.yPos);
  }
}
