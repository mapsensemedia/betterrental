/**
 * AgreementStructuredView - Renders rental agreement from terms_json
 * to match the PDF layout exactly.
 */
import { format } from "date-fns";
import type { RentalAgreement, AgreementTermsJson } from "@/hooks/use-rental-agreement";
import { Separator } from "@/components/ui/separator";

interface AgreementStructuredViewProps {
  agreement: RentalAgreement;
  bookingId: string;
}

function fmt(n: number): string {
  return `$${n.toFixed(2)}`;
}

function fmtDateFull(dateStr: string): string {
  try { return format(new Date(dateStr), "EEEE, MMMM d, yyyy 'at' h:mm a"); } catch { return dateStr; }
}

function fmtDateShort(dateStr: string): string {
  try { return format(new Date(dateStr), "MMMM d, yyyy"); } catch { return dateStr; }
}

function fmtDateLong(dateStr: string): string {
  try { return format(new Date(dateStr), "MMM d, yyyy 'at' h:mm a"); } catch { return dateStr; }
}

export function AgreementStructuredView({ agreement, bookingId }: AgreementStructuredViewProps) {
  const t = agreement.terms_json as unknown as AgreementTermsJson | null;

  // Fallback to raw text if no structured data
  if (!t || !t.rental || !t.financial) {
    return (
      <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80">
        {agreement.agreement_content}
      </pre>
    );
  }

  const bookingCode = bookingId.slice(0, 8).toUpperCase();
  const p = t.policies;
  const tankCap = t.vehicle.tankCapacityLiters || 50;
  const displayName = t.customer.name && !t.customer.name.includes("@") ? t.customer.name : "—";
  const pickupAddrParts = [t.locations.pickup.name, t.locations.pickup.address, t.locations.pickup.city ? `${t.locations.pickup.city}, BC` : null].filter(Boolean);
  const dropoffAddrParts = [t.locations.dropoff.name, t.locations.dropoff.address, t.locations.dropoff.city ? `${t.locations.dropoff.city}, BC` : null].filter(Boolean);
  const pickupAddr = pickupAddrParts.join("\n");
  const dropoffAddr = dropoffAddrParts.join("\n");
  const makeModelParts = [t.vehicle.year, t.vehicle.make, t.vehicle.model].filter(Boolean);
  const protName = t.protection?.planName || "No Extra Protection";
  const protTotal = t.protection?.total ?? (t.financial as any).protectionTotal ?? 0;
  const protDaily = t.protection?.dailyRate ?? 0;

  return (
    <div className="text-xs space-y-3 font-mono">
      {/* Header */}
      <div className="text-center space-y-0.5">
        <h2 className="text-sm font-bold tracking-wide">C2C CAR RENTAL</h2>
        <p className="text-[10px] font-bold text-muted-foreground">LEGAL VEHICLE RENTAL AGREEMENT</p>
      </div>

      {/* Contact info bar */}
      <div className="bg-muted/50 border rounded px-3 py-1 text-[9px] text-center text-muted-foreground">
        Surrey, BC &nbsp;|&nbsp; Contact: (604) 771-3995 &nbsp;|&nbsp; 24/7 Support: (778) 580-0498 &nbsp;|&nbsp; Roadside: (604) 771-3995
      </div>

      <div className="flex justify-between text-[10px]">
        <span><strong>Booking Reference:</strong> {bookingCode}</span>
        <span><strong>Agreement Date:</strong> {fmtDateShort(agreement.created_at)}</span>
      </div>

      <Separator />

      {/* Renter Information */}
      <Section title="RENTER INFORMATION">
        <Row label="Name" value={displayName} />
        <Row label="Email" value={t.customer.email || "—"} />
      </Section>

      {/* Locations */}
      <Section title="LOCATIONS">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="font-bold text-muted-foreground">Pickup Location:</span>
            <p className="mt-0.5 whitespace-pre-line">{pickupAddr || "—"}</p>
          </div>
          <div>
            <span className="font-bold text-muted-foreground">Drop-off Location:</span>
            <p className="mt-0.5 whitespace-pre-line">{dropoffAddr === pickupAddr ? `${dropoffAddr}\n(Same as pickup)` : (dropoffAddr || "—")}</p>
          </div>
        </div>
        {t.locations.deliveryAddress && (
          <Row label="Delivery Address" value={t.locations.deliveryAddress} />
        )}
      </Section>

      {/* Vehicle Details */}
      <Section title="VEHICLE DETAILS">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <Row label="Category" value={t.vehicle.category || "—"} />
          {makeModelParts.length > 0 && <Row label="Vehicle" value={makeModelParts.join(" ")} />}
          <Row label="Fuel Type" value={t.vehicle.fuelType || "—"} />
          <Row label="Transmission" value={t.vehicle.transmission || "—"} />
          <Row label="Seats" value={`${t.vehicle.seats || "—"} passengers`} />
          <Row label="Tank Capacity" value={`${tankCap} litres`} />
          {t.vehicle.vin && t.vehicle.vin !== "N/A" && <Row label="VIN" value={t.vehicle.vin} />}
          {t.vehicle.licensePlate && t.vehicle.licensePlate !== "N/A" && <Row label="Plate" value={t.vehicle.licensePlate} />}
          {t.vehicle.color && <Row label="Color" value={t.vehicle.color} />}
        </div>
        <div className="mt-2">
          <p className="font-bold text-muted-foreground text-[10px]">CONDITION AT PICKUP:</p>
          <div className="grid grid-cols-2 gap-x-4 mt-0.5">
            <Row label="Kilometres Out" value={t.condition.odometerOut != null ? `${t.condition.odometerOut.toLocaleString()} km` : "N/A"} />
            <Row label="Fuel Level" value={t.condition.fuelLevelOut != null ? `${t.condition.fuelLevelOut}%` : "N/A"} />
          </div>
        </div>
      </Section>

      {/* Rental Period */}
      <Section title="RENTAL PERIOD">
        <Row label="Pick-up Date/Time" value={fmtDateFull(t.rental.startAt)} />
        <Row label="Return Date/Time" value={fmtDateFull(t.rental.endAt)} />
        <Row label="Duration" value={`${t.rental.totalDays} day(s)`} />
      </Section>

      {/* Financial Summary */}
      <Section title="FINANCIAL SUMMARY">
        <FinSubSection title="VEHICLE RENTAL:">
          <FinRow label={`Daily Rate: ${fmt(t.rental.dailyRate)} × ${t.rental.totalDays} days`} amount={fmt(t.financial.vehicleSubtotal)} />
        </FinSubSection>

        <FinSubSection title="PROTECTION PLAN:">
          {protDaily > 0
            ? <FinRow label={`${protName}: ${fmt(protDaily)}/day × ${t.rental.totalDays} days`} amount={fmt(protTotal)} />
            : <FinRow label={protName} amount="$0.00" />
          }
        </FinSubSection>

        <FinSubSection title="ADD-ONS & EXTRAS:">
          {t.financial.addOns && t.financial.addOns.length > 0
            ? t.financial.addOns.map((addon, i) => (
                <FinRow key={i} label={addon.name || "—"} amount={fmt(addon.price)} />
              ))
            : <p className="pl-2 text-muted-foreground">No add-ons selected</p>
          }
        </FinSubSection>

        <FinSubSection title="REGULATORY FEES:">
          <FinRow label={`PVRT: ${fmt(t.taxes.pvrtDailyFee)}/day × ${t.rental.totalDays}`} amount={fmt(t.financial.pvrtTotal)} />
          <FinRow label={`ACSRCH: ${fmt(t.taxes.acsrchDailyFee)}/day × ${t.rental.totalDays}`} amount={fmt(t.financial.acsrchTotal)} />
          {t.financial.youngDriverFee > 0 && (
            <FinRow label="Young Driver Fee" amount={fmt(t.financial.youngDriverFee)} />
          )}
        </FinSubSection>

        <Separator className="my-1" />
        <div className="flex justify-between font-bold">
          <span>SUBTOTAL:</span>
          <span>{fmt(t.financial.subtotalBeforeTax)}</span>
        </div>

        <FinSubSection title="TAXES:">
          <div className="flex gap-6 pl-2">
            <span>PST ({(t.taxes.pstRate * 100).toFixed(0)}%): {fmt(t.financial.pstAmount)}</span>
            <span>GST ({(t.taxes.gstRate * 100).toFixed(0)}%): {fmt(t.financial.gstAmount)}</span>
          </div>
        </FinSubSection>

        <div className="flex justify-between font-bold text-sm bg-muted/60 rounded px-2 py-1.5 border mt-1">
          <span>TOTAL AMOUNT DUE:</span>
          <span>{fmt(t.financial.grandTotal)} CAD</span>
        </div>

        <FinRow label="Security Deposit:" amount={`${fmt(t.financial.depositAmount)} (refundable)`} />
      </Section>

      {/* Terms and Conditions */}
      <Section title="TERMS AND CONDITIONS">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[10px]">
          <TcBlock title="1. DRIVER REQUIREMENTS" items={[
            `Renter must be at least ${p.minAge} years of age.`,
            "Valid driver's license required at time of pickup.",
            "Government-issued photo ID required for signature.",
            "Additional drivers must be registered and approved.",
          ]} />
          <TcBlock title="2. VEHICLE USE RESTRICTIONS" items={[
            "No smoking in the vehicle.",
            "No pets without prior written approval.",
            "No racing, towing, or off-road use.",
            "No international travel without prior authorization.",
          ]} />
          <TcBlock title="3. FUEL POLICY" items={[
            `Return vehicle with same fuel level as pickup (Tank: ${tankCap}L).`,
            "Refueling charges apply if returned with less fuel.",
          ]} />
          <TcBlock title="4. RETURN POLICY & LATE FEES" items={[
            `Grace period: ${p.gracePeriodMinutes} min past scheduled return.`,
            `Late fee: ${p.lateFeePercentOfDaily}% of daily rate per hour after grace.`,
            "Extended rentals require prior approval.",
          ]} />
          <TcBlock title="5. DAMAGE & LIABILITY" items={[
            "Renter responsible for all damage during rental period; report immediately.",
            "Security deposit may be applied to cover damages.",
            "Renter liable for all traffic violations and tolls.",
          ]} />
          <TcBlock title="6. INSURANCE & COVERAGE" items={[
            "Third party liability included with all rentals.",
            "Optional rental coverage available at pickup.",
          ]} />
          <TcBlock title="7. KILOMETRE ALLOWANCE" items={["Unlimited kilometres included."]} />
          <TcBlock title="8. TERMINATION" items={[
            "Rental company may terminate for violation of terms.",
            "Early return does not guarantee refund.",
          ]} />
          <TcBlock title="9. TAX INFORMATION" items={[
            `PST: ${(t.taxes.pstRate * 100).toFixed(0)}%, GST: ${(t.taxes.gstRate * 100).toFixed(0)}%, PVRT: ${fmt(t.taxes.pvrtDailyFee)}/day, ACSRCH: ${fmt(t.taxes.acsrchDailyFee)}/day`,
          ]} />
        </div>
      </Section>

      {/* Acknowledgment */}
      <Section title="ACKNOWLEDGMENT AND SIGNATURE">
        <ul className="space-y-0.5 text-[10px] list-disc pl-4">
          <li>I confirm I have read and understood all terms and conditions outlined in this Vehicle Legal Agreement.</li>
          <li>I confirm I am at least {p.minAge} years of age.</li>
          <li>I acknowledge that my electronic signature has the same legal effect as a handwritten signature.</li>
          <li>I understand that third party liability coverage is included and optional rental coverage is available at pickup.</li>
          <li>I agree to return the vehicle with the same fuel level as at pickup.</li>
          <li>I understand late fees will be charged at {p.lateFeePercentOfDaily}% of the daily rate per hour after the {p.gracePeriodMinutes}-minute grace period.</li>
        </ul>

        {/* Signature display */}
        {agreement.customer_signature && (
          <div className="mt-3 pt-3 border-t space-y-1">
            <div className="flex gap-8">
              <span><strong>RENTER SIGNATURE:</strong> {agreement.customer_signature}</span>
              <span><strong>DATE:</strong> {fmtDateLong(agreement.customer_signed_at!)}</span>
            </div>
            {/* Show signature image */}
            {(agreement as any)?.signature_png_url && (
              <img
                src={(agreement as any).signature_png_url}
                alt="Customer signature"
                className="max-h-12 w-auto bg-white rounded border p-1 mt-1"
              />
            )}
            {agreement.staff_confirmed_at && (
              <p><strong>CONFIRMED BY STAFF:</strong> {fmtDateLong(agreement.staff_confirmed_at)}</p>
            )}
            {agreement.signed_manually && (
              <p className="text-muted-foreground italic">(Signed in person)</p>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}

// ── Sub-components ──

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Separator />
      <h3 className="font-bold text-[11px] tracking-wide">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5">
      <span className="font-bold text-muted-foreground shrink-0">{label}:</span>
      <span>{value}</span>
    </div>
  );
}

function FinRow({ label, amount }: { label: string; amount: string }) {
  return (
    <div className="flex justify-between pl-2">
      <span>{label}</span>
      <span className="font-medium">{amount}</span>
    </div>
  );
}

function FinSubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="font-bold text-[10px]">{title}</p>
      {children}
    </div>
  );
}

function TcBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="font-bold">{title}</p>
      <ul className="list-disc pl-4 space-y-0.5">
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  );
}
