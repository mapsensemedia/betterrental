/**
 * AgreementStructuredView - Professional legal document layout
 * for displaying rental agreement data. Presentation only.
 */
import { format } from "date-fns";
import type { RentalAgreement, AgreementTermsJson } from "@/hooks/use-rental-agreement";

interface AgreementStructuredViewProps {
  agreement: RentalAgreement;
  bookingId: string;
}

function fmt(n: number | string | null | undefined): string {
  const num = Number(n ?? 0);
  return `$${(isNaN(num) ? 0 : num).toFixed(2)}`;
}

function fmtDate(dateStr: string, pattern = "MMMM d, yyyy"): string {
  try { return format(new Date(dateStr), pattern); } catch { return dateStr; }
}

function fmtDateTime(dateStr: string): string {
  try { return format(new Date(dateStr), "EEEE, MMMM d, yyyy 'at' h:mm a"); } catch { return dateStr; }
}

function fmtDateTimeLong(dateStr: string): string {
  try { return format(new Date(dateStr), "MMM d, yyyy 'at' h:mm a"); } catch { return dateStr; }
}

export function AgreementStructuredView({ agreement, bookingId }: AgreementStructuredViewProps) {
  const t = agreement.terms_json as unknown as AgreementTermsJson | null;

  if (!t || !t.rental || !t.financial) {
    return (
      <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80">
        {agreement.agreement_content}
      </pre>
    );
  }

  const bookingCode = (t as any).bookingCode || bookingId.slice(0, 8).toUpperCase();
  const p = t.policies;
  const tankCap = t.vehicle.tankCapacityLiters || 50;
  const displayName = t.customer.name && !t.customer.name.includes("@") ? t.customer.name : "—";
  const protName = t.protection?.planName || "No Extra Protection";
  const protTotal = t.protection?.total ?? (t.financial as any).protectionTotal ?? 0;
  const protDaily = t.protection?.dailyRate ?? 0;
  const protDeductible = (t.protection as any)?.deductible ?? null;

  const pickupLines = [t.locations.pickup.name, t.locations.pickup.address, t.locations.pickup.city ? `${t.locations.pickup.city}, BC` : null].filter(Boolean);
  const dropoffLines = [t.locations.dropoff.name, t.locations.dropoff.address, t.locations.dropoff.city ? `${t.locations.dropoff.city}, BC` : null].filter(Boolean);
  const makeModel = [t.vehicle.year, t.vehicle.make, t.vehicle.model].filter(Boolean).join(" ");

  const isSigned = !!agreement.customer_signature;

  return (
    <article className="bg-white text-gray-900 max-w-[816px] mx-auto font-['Georgia',_'Times_New_Roman',_serif] text-[13px] leading-relaxed">

      {/* ═══ HEADER ═══ */}
      <header className="text-center border-b-2 border-gray-900 pb-4 mb-1">
        <h1 className="text-xl font-bold tracking-widest uppercase mb-0.5">C2C Car Rental</h1>
        <h2 className="text-sm font-bold tracking-wide uppercase text-gray-700">Vehicle Rental Agreement</h2>
        <div className="mt-3 bg-gray-100 border border-gray-300 rounded px-3 py-1.5 text-[10px] text-gray-500 tracking-wide">
          Surrey, BC &nbsp;·&nbsp; Contact: (604) 771-3995 &nbsp;·&nbsp; 24/7 Support: (778) 580-0498 &nbsp;·&nbsp; Roadside: (604) 771-3995
        </div>
      </header>

      <div className="flex justify-between text-[11px] text-gray-600 py-2 border-b border-gray-200 mb-4">
        <span><strong className="text-gray-900">Booking Reference:</strong> {bookingCode}</span>
        <span><strong className="text-gray-900">Date:</strong> {fmtDate(agreement.created_at)}</span>
      </div>

      {/* ═══ RENTER INFORMATION ═══ */}
      <Section title="Renter Information">
        <FieldGrid>
          <Field label="Full Name" value={displayName} />
          <Field label="Email" value={t.customer.email || "—"} />
        </FieldGrid>
      </Section>

      {/* ═══ RENTAL DETAILS ═══ */}
      <Section title="Rental Details">
        <FieldGrid>
          <Field label="Pickup Date & Time" value={fmtDateTime(t.rental.startAt)} />
          <Field label="Return Date & Time" value={fmtDateTime(t.rental.endAt)} />
          <Field label="Total Days" value={`${t.rental.totalDays}`} />
        </FieldGrid>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 mt-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Pickup Location</span>
            <p className="mt-1 whitespace-pre-line leading-snug">{pickupLines.join("\n") || "—"}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Drop-off Location</span>
            <p className="mt-1 whitespace-pre-line leading-snug">
              {dropoffLines.join("\n") === pickupLines.join("\n")
                ? `${dropoffLines.join("\n")}\n(Same as pickup)`
                : (dropoffLines.join("\n") || "—")}
            </p>
          </div>
        </div>
        {t.locations.deliveryAddress && (
          <div className="mt-3">
            <Field label="Delivery Address" value={t.locations.deliveryAddress} />
          </div>
        )}
      </Section>

      {/* ═══ VEHICLE INFORMATION ═══ */}
      <Section title="Vehicle Information">
        <FieldGrid cols={2}>
          <Field label="Category" value={t.vehicle.category || "—"} />
          {makeModel && <Field label="Year / Make / Model" value={makeModel} />}
          {t.vehicle.color && <Field label="Color" value={t.vehicle.color} />}
          {t.vehicle.licensePlate && t.vehicle.licensePlate !== "N/A" && <Field label="License Plate" value={t.vehicle.licensePlate} />}
          {t.vehicle.vin && t.vehicle.vin !== "N/A" && <Field label="VIN" value={t.vehicle.vin} />}
          <Field label="Fuel Type" value={t.vehicle.fuelType || "—"} />
          <Field label="Transmission" value={t.vehicle.transmission || "—"} />
          <Field label="Seats" value={`${t.vehicle.seats || "—"} passengers`} />
          <Field label="Tank Capacity" value={`${tankCap} litres`} />
        </FieldGrid>

        <div className="mt-3 pt-3 border-t border-gray-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Condition at Pickup</span>
          <FieldGrid cols={2} className="mt-1.5">
            <Field label="Odometer (KM Out)" value={t.condition.odometerOut != null ? `${t.condition.odometerOut.toLocaleString()} km` : "N/A"} />
            <Field label="Fuel Level Out" value={t.condition.fuelLevelOut != null ? `${t.condition.fuelLevelOut}%` : "N/A"} />
          </FieldGrid>
        </div>
      </Section>

      {/* ═══ PROTECTION PLAN ═══ */}
      <Section title="Protection Plan">
        <FieldGrid cols={2}>
          <Field label="Plan Name" value={protName} />
          <Field label="Daily Rate" value={protDaily > 0 ? fmt(protDaily) : "—"} />
          <Field label="Total" value={fmt(protTotal)} />
          {protDeductible != null && <Field label="Deductible" value={fmt(protDeductible)} />}
        </FieldGrid>
      </Section>

      {/* ═══ FINANCIAL SUMMARY ═══ */}
      <Section title="Financial Summary">
        <table className="w-full text-[12px]">
          <tbody>
            <FinRow label="Vehicle Subtotal" value={fmt(t.financial.vehicleSubtotal)} />
            <FinRow label="Protection Total" value={fmt(protTotal)} />
            <FinRow label="Add-ons Total" value={fmt(t.financial.addOns?.reduce((s, a) => s + a.price, 0) ?? 0)} />
            {t.financial.youngDriverFee > 0 && <FinRow label="Young Driver Fee" value={fmt(t.financial.youngDriverFee)} />}
            <FinRow label={`PVRT (${fmt(t.taxes.pvrtDailyFee)}/day × ${t.rental.totalDays})`} value={fmt(t.financial.pvrtTotal)} />
            <FinRow label={`ACSRCH (${fmt(t.taxes.acsrchDailyFee)}/day × ${t.rental.totalDays})`} value={fmt(t.financial.acsrchTotal)} />
            <tr><td colSpan={2} className="py-1"><div className="border-t border-gray-200" /></td></tr>
            <FinRow label="Subtotal Before Tax" value={fmt(t.financial.subtotalBeforeTax)} bold />
            <FinRow label={`GST (${(t.taxes.gstRate * 100).toFixed(0)}%)`} value={fmt(t.financial.gstAmount)} />
            <FinRow label={`PST (${(t.taxes.pstRate * 100).toFixed(0)}%)`} value={fmt(t.financial.pstAmount)} />
            <FinRow label="Total Tax" value={fmt(t.financial.gstAmount + t.financial.pstAmount)} />
            <tr><td colSpan={2} className="py-1"><div className="border-t-2 border-gray-900" /></td></tr>
            <tr className="text-[14px] font-bold">
              <td className="py-1.5">Grand Total</td>
              <td className="py-1.5 text-right">{fmt(t.financial.grandTotal)} CAD</td>
            </tr>
            <tr><td colSpan={2} className="py-0.5"><div className="border-t border-gray-200" /></td></tr>
            <FinRow label="Security Deposit (refundable)" value={fmt(t.financial.depositAmount)} />
          </tbody>
        </table>
      </Section>

      {/* ═══ ADD-ONS ═══ */}
      <Section title="Add-ons">
        {t.financial.addOns && t.financial.addOns.length > 0 ? (
          <ul className="space-y-1.5">
            {t.financial.addOns.map((addon, i) => (
              <li key={i} className="flex justify-between">
                <span>• {addon.name || "—"}</span>
                <span className="font-medium">{fmt(addon.price)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400 italic">No add-ons selected</p>
        )}
      </Section>

      {/* ═══ POLICIES ═══ */}
      <Section title="Policies">
        <ul className="space-y-1.5 list-disc pl-5 text-[12px] text-gray-700">
          <li>Minimum age: {p.minAge} years with valid driver's license and government-issued photo ID.</li>
          <li>Grace period: {p.gracePeriodMinutes} minutes past the scheduled return time.</li>
          <li>A twenty-five percent surcharge of the daily rate will be applied for each additional hour, up to two hours beyond the grace period.</li>
          <li>After exceeding two hours, an extra full day charge will be applied for each subsequent day.</li>
          <li>Fuel return: Vehicle must be returned with the same fuel level as at pickup.</li>
          <li>No smoking in the vehicle at any time.</li>
          <li>No pets without prior written approval.</li>
          <li>No international travel without prior authorization.</li>
          <li>Third-party liability comes standard with all rentals.</li>
          <li>Optional rental coverages available at pickup.</li>
          <li>No racing, towing, or off-road use permitted.</li>
          <li>Renter is responsible for all traffic violations and tolls during the rental period.</li>
          <li>Unlimited kilometres included.</li>
        </ul>
      </Section>

      {/* ═══ SIGNATURE ═══ */}
      <Section title="Acknowledgment & Signature">
        <div className="space-y-3 mb-6">
          <p className="text-[13px] text-gray-700 leading-relaxed">
            • I confirm I have read and understood all terms and conditions outlined in this Vehicle Rental Agreement.
          </p>
          <p className="text-[13px] text-gray-700 leading-relaxed">
            • I acknowledge that my electronic signature has the same legal effect as a handwritten signature.
          </p>
        </div>

        {isSigned ? (
          <div className="grid grid-cols-2 gap-8">
            <SignatureBlock
              title="Customer Signature"
              name={agreement.customer_signature!}
              date={fmtDateTimeLong(agreement.customer_signed_at!)}
              imageUrl={(agreement as any)?.signature_png_url}
            />
            <SignatureBlock
              title="Staff Confirmation"
              name={agreement.staff_confirmed_at ? "Confirmed" : "Pending"}
              date={agreement.staff_confirmed_at ? fmtDateTimeLong(agreement.staff_confirmed_at) : "—"}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-8">
            <SignatureBlock title="Customer Signature" />
            <SignatureBlock title="Staff Confirmation" />
          </div>
        )}

        {agreement.signed_manually && (
          <p className="text-[10px] text-gray-400 italic mt-2">(Signed in person)</p>
        )}
      </Section>

      {/* ═══ FOOTER ═══ */}
      <footer className="mt-6 pt-3 border-t border-gray-300 text-center text-[9px] text-gray-400 leading-relaxed">
        <p>
          This document constitutes a legally binding agreement between the renter and C2C Car Rental.
          All disputes shall be governed by the laws of British Columbia, Canada.
          For questions, contact support at (778) 580-0498.
        </p>
      </footer>
    </article>
  );
}

/* ─── Sub-components ─── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="text-[13px] font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1.5 mb-3">
        {title}
      </h3>
      <div>{children}</div>
    </section>
  );
}

function FieldGrid({ children, cols = 2, className = "" }: { children: React.ReactNode; cols?: number; className?: string }) {
  return (
    <div className={`grid gap-x-8 gap-y-2.5 ${cols === 2 ? "grid-cols-2" : "grid-cols-1"} ${className}`}>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
      <span className="text-[12px] text-gray-900 mt-0.5">{value}</span>
    </div>
  );
}

function FinRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <tr className={bold ? "font-bold" : ""}>
      <td className="py-0.5 pr-4">{label}</td>
      <td className="py-0.5 text-right">{value}</td>
    </tr>
  );
}

function SignatureBlock({ title, name, date, imageUrl }: { title: string; name?: string; date?: string; imageUrl?: string }) {
  return (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{title}</span>
      {imageUrl && (
        <img src={imageUrl} alt="Signature" className="max-h-10 w-auto bg-white rounded border border-gray-200 p-1 mt-1.5" />
      )}
      <div className="mt-2 border-b border-gray-400 w-full" />
      <div className="mt-1.5 text-[11px] space-y-0.5">
        <p><strong>Name:</strong> {name || "____________________"}</p>
        <p><strong>Date:</strong> {date || "____________________"}</p>
      </div>
    </div>
  );
}
