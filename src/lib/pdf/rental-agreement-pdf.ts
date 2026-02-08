import jsPDF from "jspdf";
import { format } from "date-fns";
import type { RentalAgreement } from "@/hooks/use-rental-agreement";

// Logo asset path
const LOGO_PATH = "/c2c-logo.png";

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

function fmtDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), "MM-dd-yy HHmm");
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

function pad(str: string, len: number): string {
  return str.substring(0, len).padEnd(len);
}

// ── PDF Config ──

const MARGIN = 36;
const PAGE_W = 612; // letter width in pt
const PAGE_H = 792; // letter height in pt
const CONTENT_W = PAGE_W - MARGIN * 2;
const COL_LEFT = MARGIN;
const COL_MID = MARGIN + CONTENT_W * 0.5;
const COL_RIGHT_END = PAGE_W - MARGIN;

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

// ══════════════════════════════════════════════════════
// STRUCTURED RENDERER — Hertz-style dense single-page
// ══════════════════════════════════════════════════════

function renderStructuredPdf(
  pdf: jsPDF,
  t: TermsJson,
  agreement: RentalAgreement,
  bookingId: string,
  logoBase64: string | null
) {
  let y = MARGIN;
  const bookingCode = bookingId.slice(0, 8).toUpperCase();

  // ── HEADER ──
  if (logoBase64) {
    try {
      pdf.addImage(logoBase64, "PNG", COL_LEFT, y - 4, 70, 26);
    } catch { /* ignore */ }
  }

  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text("RENTAL RECORD", PAGE_W / 2, y + 14, { align: "center" });

  // Booking # right
  pdf.setFontSize(8);
  pdf.setFont("courier", "bold");
  pdf.text(`RENTAL RECORD:  ${bookingCode}`, COL_RIGHT_END, y + 6, { align: "right" });
  pdf.setFontSize(7);
  pdf.setFont("courier", "normal");
  pdf.text(`FORM#           ${bookingCode}-01`, COL_RIGHT_END, y + 16, { align: "right" });

  y += 30;

  // Thick line under header
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(1.5);
  pdf.line(COL_LEFT, y, COL_RIGHT_END, y);
  y += 6;

  // ── CUSTOMER NAME (large, left) ──
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text((t.customer.name || "N/A").toUpperCase(), COL_LEFT, y + 10);

  // ── RENTAL / DUE dates (right side) ──
  const pickupLoc = t.locations.pickup;
  const locStr = (pickupLoc.name || pickupLoc.city || "").toUpperCase();

  pdf.setFontSize(7);
  pdf.setFont("courier", "bold");
  const rentalLine = `RENTAL: ${fmtDate(t.rental.startAt)} ${locStr}`;
  const dueLine = `DUE:    ${fmtDate(t.rental.endAt)} ${locStr}`;
  pdf.text(rentalLine, COL_MID, y + 4);
  pdf.text(dueLine, COL_MID, y + 13);

  y += 20;

  // Thin separator
  pdf.setLineWidth(0.5);
  pdf.line(COL_LEFT, y, COL_RIGHT_END, y);
  y += 8;

  // ── VEHICLE INFO GRID (monospaced dense) ──
  const LH = 9; // line height
  pdf.setFontSize(7);
  pdf.setFont("courier", "normal");

  // Row 1: Vehicle class & Make/Model
  const vehClass = `VEH CLASS: ${(t.vehicle.category || "N/A").toUpperCase()}`;
  const makeModel = t.vehicle.make || t.vehicle.model
    ? `MODEL: ${[t.vehicle.year, t.vehicle.make, t.vehicle.model].filter(Boolean).join(" ").toUpperCase()}`
    : "";
  const colorStr = t.vehicle.color ? `COLOR: ${t.vehicle.color.toUpperCase()}` : "";
  monoLine(pdf, vehClass, COL_LEFT, y);
  monoLine(pdf, makeModel, COL_MID, y);
  if (colorStr) monoLine(pdf, colorStr, COL_MID + 180, y);
  y += LH;

  // Row 2: VIN & Plate
  const vinStr = t.vehicle.vin ? `VIN#: ${t.vehicle.vin.toUpperCase()}` : "VIN#: N/A";
  const plateStr = t.vehicle.licensePlate ? `PLATE: ${t.vehicle.licensePlate.toUpperCase()}` : "";
  monoLine(pdf, vinStr, COL_LEFT, y);
  if (plateStr) monoLine(pdf, plateStr, COL_MID, y);
  y += LH;

  // Row 3: Fuel/Trans/Seats & KMs Out / Fuel Level
  const fuelTrans = `FUEL: ${(t.vehicle.fuelType || "N/A").toUpperCase()}  TRANS: ${(t.vehicle.transmission || "N/A").toUpperCase()}  SEATS: ${t.vehicle.seats || "N/A"}`;
  monoLine(pdf, fuelTrans, COL_LEFT, y);
  const kmsOut = t.condition.odometerOut != null ? t.condition.odometerOut.toLocaleString() : "N/A";
  monoLine(pdf, `KMS OUT: ${kmsOut}`, COL_MID, y);
  y += LH;

  // Row 4: Tank capacity & Fuel level
  const tankStr = `TANK CAP: ${t.vehicle.tankCapacityLiters || 50}L`;
  const fuelLvl = t.condition.fuelLevelOut != null ? `${t.condition.fuelLevelOut}%` : "100%";
  monoLine(pdf, tankStr, COL_LEFT, y);
  monoLine(pdf, `FUEL LVL: ${fuelLvl}`, COL_MID, y);
  y += LH + 2;

  // Separator
  pdf.setLineWidth(0.5);
  pdf.line(COL_LEFT, y, COL_RIGHT_END, y);
  y += 6;

  // ── LOCATION INFO ──
  pdf.setFontSize(7);
  pdf.setFont("courier", "normal");

  const pickupAddr = [pickupLoc.name, pickupLoc.address, pickupLoc.city].filter(Boolean).join(", ");
  monoLine(pdf, `PICKUP:   ${pickupAddr.toUpperCase()}`, COL_LEFT, y);
  y += LH;

  if (t.locations.deliveryAddress) {
    monoLine(pdf, `DELIVERY: ${t.locations.deliveryAddress.toUpperCase()}`, COL_LEFT, y);
    y += LH;
  }

  const dropoff = t.locations.dropoff;
  const dropoffAddr = [dropoff.name, dropoff.address, dropoff.city].filter(Boolean).join(", ");
  const dropoffText = dropoffAddr === pickupAddr ? "SAME AS PICKUP" : dropoffAddr.toUpperCase();
  monoLine(pdf, `RETURN:   ${dropoffText}`, COL_LEFT, y);
  y += LH;

  // Duration
  monoLine(pdf, `DURATION: ${t.rental.totalDays} DAY(S)`, COL_LEFT, y);
  y += LH + 2;

  // Separator
  pdf.setLineWidth(0.5);
  pdf.line(COL_LEFT, y, COL_RIGHT_END, y);
  y += 8;

  // ── CHARGES LEFT COLUMN ──
  const chargesStartY = y;
  pdf.setFontSize(7.5);
  pdf.setFont("courier", "bold");
  pdf.text("CHARGE DESCRIPTION", COL_LEFT, y);
  y += LH + 2;

  pdf.setFont("courier", "normal");
  pdf.setFontSize(7);

  // Daily rate
  const rateDesc = `DAYS        ${fmt(t.rental.dailyRate).padStart(8)}  ${String(t.rental.totalDays).padStart(2)} DAY(S)`;
  monoLine(pdf, rateDesc, COL_LEFT, y);
  y += LH;

  // Vehicle subtotal
  monoLine(pdf, `VEHICLE     ${fmt(t.financial.vehicleSubtotal).padStart(8)}`, COL_LEFT, y);
  y += LH;

  // Add-ons
  if (t.financial.addOns && t.financial.addOns.length > 0) {
    for (const addon of t.financial.addOns) {
      const addonName = (addon.name || "ADD-ON").toUpperCase().substring(0, 12);
      monoLine(pdf, `${addonName.padEnd(12)}${fmt(addon.price).padStart(8)}`, COL_LEFT, y);
      y += LH;
    }
  }
  monoLine(pdf, `ADD-ONS     ${fmt(t.financial.addOnsTotal).padStart(8)}`, COL_LEFT, y);
  y += LH;

  // Young driver fee
  if (t.financial.youngDriverFee > 0) {
    monoLine(pdf, `YOUNG DRV   ${fmt(t.financial.youngDriverFee).padStart(8)}`, COL_LEFT, y);
    y += LH;
  }

  // Subtotal before tax
  y += 2;
  pdf.setFont("courier", "bold");
  monoLine(pdf, `SUBTOTAL    ${fmt(t.financial.subtotalBeforeTax).padStart(8)}`, COL_LEFT, y);
  pdf.setFont("courier", "normal");
  y += LH;

  const chargesEndY = y;

  // ── SERVICE CHARGES / TAXES — RIGHT COLUMN ──
  let ry = chargesStartY;
  pdf.setFontSize(7.5);
  pdf.setFont("courier", "bold");
  pdf.text("SERVICE CHARGES/TAXES", COL_MID, ry);
  ry += LH + 2;

  pdf.setFont("courier", "normal");
  pdf.setFontSize(7);

  monoLine(pdf, `PVRT     ${fmt(t.taxes.pvrtDailyFee).padStart(7)}/DAY         (G)`, COL_MID, ry);
  ry += LH;
  monoLine(pdf, `ACSRCH   ${fmt(t.taxes.acsrchDailyFee).padStart(7)}/DAY         (S)`, COL_MID, ry);
  ry += LH;
  monoLine(pdf, `GST      ${(t.taxes.gstRate * 100).toFixed(1).padStart(6)}%            (N)`, COL_MID, ry);
  ry += LH;
  monoLine(pdf, `PST      ${(t.taxes.pstRate * 100).toFixed(1).padStart(6)}%            (N)`, COL_MID, ry);
  ry += LH + 4;

  // Tax amounts
  pdf.setFont("courier", "bold");
  monoLine(pdf, `PVRT TOTAL   ${fmt(t.financial.pvrtTotal).padStart(8)}`, COL_MID, ry);
  ry += LH;
  monoLine(pdf, `ACSRCH TOTAL ${fmt(t.financial.acsrchTotal).padStart(8)}`, COL_MID, ry);
  ry += LH;
  monoLine(pdf, `GST AMOUNT   ${fmt(t.financial.gstAmount).padStart(8)}`, COL_MID, ry);
  ry += LH;
  monoLine(pdf, `PST AMOUNT   ${fmt(t.financial.pstAmount).padStart(8)}`, COL_MID, ry);
  ry += LH;

  y = Math.max(chargesEndY, ry) + 4;

  // ── TOTAL BOX ──
  pdf.setLineWidth(1);
  pdf.setDrawColor(0, 0, 0);
  pdf.rect(COL_LEFT, y, CONTENT_W, 18);
  pdf.setFillColor(245, 245, 245);
  pdf.rect(COL_LEFT, y, CONTENT_W, 18, "F");

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text("TOTAL:", COL_LEFT + 8, y + 12);
  pdf.text(`${fmt(t.financial.grandTotal)} CAD`, COL_LEFT + 80, y + 12);
  pdf.setFontSize(7);
  pdf.setFont("courier", "normal");
  pdf.text(`DEPOSIT: ${fmt(t.financial.depositAmount)} (REFUNDABLE)`, COL_MID, y + 12);

  // Border on total box
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.5);
  pdf.rect(COL_LEFT, y, CONTENT_W, 18);

  y += 26;

  // ── TERMS & CONDITIONS (very compact) ──
  pdf.setLineWidth(0.5);
  pdf.line(COL_LEFT, y, COL_RIGHT_END, y);
  y += 6;

  const p = t.policies;
  const termsText =
    `TERMS: Driver must be ${p.minAge}+ with valid license & govt ID. Additional drivers must be registered. ` +
    `No smoking, pets (without approval), racing, towing, off-road use, or international travel without authorization. ` +
    `Return vehicle with same fuel level as pickup (tank: ${t.vehicle.tankCapacityLiters || 50}L). Refueling charges apply if returned low. ` +
    `Grace period: ${p.gracePeriodMinutes} min past scheduled return. Late fee: ${p.lateFeePercentOfDaily}% of daily rate/hr after grace. ` +
    `Renter responsible for all damage during rental period; report immediately. Security deposit may cover damages. ` +
    `Renter liable for traffic violations & tolls. Third party liability included. Optional coverage available at pickup. ` +
    `Unlimited kilometres. Early return does not guarantee refund. ` +
    `Taxes: PST ${(t.taxes.pstRate * 100).toFixed(0)}%, GST ${(t.taxes.gstRate * 100).toFixed(0)}%, ` +
    `PVRT $${t.taxes.pvrtDailyFee.toFixed(2)}/day, ACSRCH $${t.taxes.acsrchDailyFee.toFixed(2)}/day.`;

  pdf.setFontSize(5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(40, 40, 40);

  const termsLines = pdf.splitTextToSize(termsText, CONTENT_W);
  for (const line of termsLines) {
    pdf.text(line, COL_LEFT, y);
    y += 5.5;
  }

  y += 4;

  // ── ACKNOWLEDGMENT CLAUSE ──
  pdf.setFontSize(5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(40, 40, 40);
  const ackText =
    `BY SIGNING BELOW, I (1) ACKNOWLEDGE THAT I HAVE READ, UNDERSTAND, ACCEPT AND AGREE TO THE ABOVE AND THE RENTAL ` +
    `AGREEMENT TERMS AND CONDITIONS. (2) I ACKNOWLEDGE RECEIPT OF THE RENTAL VEHICLE IN THE CONDITION DESCRIBED. ` +
    `(3) I AGREE TO RETURN THE VEHICLE BY THE DUE DATE AND TIME SPECIFIED ABOVE. (4) I CERTIFY THAT I AM A VALID DRIVER'S ` +
    `LICENSE HOLDER AND THAT ANY PERSON WHO OPERATES THE VEHICLE IS AUTHORIZED TO DO SO.`;
  const ackLines = pdf.splitTextToSize(ackText, CONTENT_W);
  for (const line of ackLines) {
    pdf.text(line, COL_LEFT, y);
    y += 5.5;
  }

  y += 6;

  // ── SIGNATURE BLOCK ──
  // Ensure signature doesn't overflow - position at minimum Y
  y = Math.max(y, 620);
  // But also cap it to avoid going off page
  if (y > 700) y = 700;

  pdf.setLineWidth(0.5);
  pdf.line(COL_LEFT, y, COL_RIGHT_END, y);
  y += 10;

  if (agreement.customer_signature) {
    pdf.setFontSize(7);
    pdf.setFont("courier", "bold");
    pdf.text("SIGNED BY:", COL_LEFT, y);
    pdf.setFont("courier", "normal");
    pdf.text(agreement.customer_signature.toUpperCase(), COL_LEFT + 65, y);

    pdf.setFont("courier", "bold");
    pdf.text("DATE:", COL_MID, y);
    pdf.setFont("courier", "normal");
    pdf.text(
      fmtDateLong(agreement.customer_signed_at!),
      COL_MID + 35,
      y
    );
    y += 12;

    if (agreement.staff_confirmed_at) {
      pdf.setFont("courier", "bold");
      pdf.text("CONFIRMED:", COL_LEFT, y);
      pdf.setFont("courier", "normal");
      pdf.text(fmtDateLong(agreement.staff_confirmed_at), COL_LEFT + 65, y);
      y += 12;
    }

    if (agreement.signed_manually) {
      pdf.setFontSize(6);
      pdf.setFont("helvetica", "italic");
      pdf.setTextColor(100, 100, 100);
      pdf.text("(Signed in person)", COL_LEFT, y);
      y += 10;
    }
  } else {
    pdf.setFontSize(7);
    pdf.setFont("courier", "normal");
    pdf.setTextColor(0, 0, 0);

    pdf.text("CUSTOMER SIGNATURE:", COL_LEFT, y);
    pdf.setDrawColor(0);
    pdf.line(COL_LEFT + 110, y, COL_LEFT + 250, y);

    pdf.text("DATE:", COL_MID + 20, y);
    pdf.line(COL_MID + 55, y, COL_MID + 170, y);
    y += 16;
  }

  // ── FOOTER ──
  const footerY = PAGE_H - 18;
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.3);
  pdf.line(COL_LEFT, footerY - 6, COL_RIGHT_END, footerY - 6);

  pdf.setFontSize(5.5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(120, 120, 120);
  pdf.text(
    `C2C Car Rental  |  Generated ${format(new Date(), "MMM d, yyyy")}  |  Record ${bookingCode}`,
    PAGE_W / 2,
    footerY,
    { align: "center" }
  );
}

// ── Monospaced text helper ──

function monoLine(pdf: jsPDF, text: string, x: number, y: number, size = 7) {
  pdf.setFontSize(size);
  pdf.setFont("courier", "normal");
  pdf.setTextColor(0, 0, 0);
  pdf.text(text, x, y);
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
  let y = MARGIN;
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
  pdf.line(MARGIN, y, COL_RIGHT_END, y);
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
        pdf.text(headerText.toUpperCase(), MARGIN, y);
        y += 8;
        pdf.setTextColor(0, 0, 0);
        continue;
      }
    }

    pdf.setFontSize(6);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);
    const wrapped = pdf.splitTextToSize(trimmed, CONTENT_W);
    for (const w of wrapped) {
      if (y > PAGE_H - 40) break;
      pdf.text(w, MARGIN, y);
      y += 6.5;
    }
  }

  // Signature
  y = Math.max(y + 10, 700);
  pdf.setDrawColor(120, 120, 120);
  pdf.setLineWidth(0.3);
  pdf.line(MARGIN, y, COL_RIGHT_END, y);
  y += 10;

  if (agreement.customer_signature) {
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    pdf.text("Signed By:", MARGIN, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(agreement.customer_signature, MARGIN + 55, y);
    y += 9;
    if (agreement.customer_signed_at) {
      pdf.setFont("helvetica", "bold");
      pdf.text("Date:", MARGIN, y);
      pdf.setFont("helvetica", "normal");
      pdf.text(fmtDateLong(agreement.customer_signed_at), MARGIN + 55, y);
    }
  } else {
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    pdf.text("Customer Signature:", MARGIN, y);
    pdf.line(MARGIN + 80, y, MARGIN + 230, y);
    y += 14;
    pdf.text("Date:", MARGIN, y);
    pdf.line(MARGIN + 80, y, MARGIN + 170, y);
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
