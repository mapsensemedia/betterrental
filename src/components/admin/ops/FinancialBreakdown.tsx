/**
 * Shared FinancialBreakdown component
 * Deterministic, DB-driven itemized breakdown used across all booking summary surfaces.
 */
import { useState } from "react";
import { useDriverFeeSettings } from "@/hooks/use-driver-fee-settings";
import { Separator } from "@/components/ui/separator";
import { Info, ChevronDown, ChevronRight } from "lucide-react";
import { PVRT_DAILY_FEE, ACSRCH_DAILY_FEE } from "@/lib/pricing";
import { getProtectionRateForCategory } from "@/lib/protection-groups";

// Protection plan display labels
const PROTECTION_PLAN_LABELS: Record<string, string> = {
  premium: "All Inclusive Coverage",
  smart: "Smart Coverage",
  basic: "Basic Coverage",
  none: "No Coverage",
};

// Bookings created after this date MUST have all charges as explicit DB rows.
const FIX_DEPLOY_DATE = "2026-02-12T00:00:00Z";

function toCents(n: number | string | null | undefined): number {
  return Math.round(Number(n || 0) * 100);
}
function fromCents(c: number): string {
  return (c / 100).toFixed(2);
}

export function FinancialBreakdown({ booking }: { booking: any }) {
  const [showAdjustmentDetails, setShowAdjustmentDetails] = useState(false);
  const { data: driverFeeSettings } = useDriverFeeSettings();
  const driverDailyRate = driverFeeSettings?.additionalDriverDailyRate ?? 14.99;
  const youngDriverDailyRate = driverFeeSettings?.youngAdditionalDriverDailyRate ?? 19.99;
  const totalDays = booking.total_days ?? 0;

  const bookingAddOns: any[] = booking.addOns ?? booking.booking_add_ons ?? [];
  const additionalDrivers: any[] = booking.additionalDrivers ?? booking.booking_additional_drivers ?? [];

  const vehicleBaseCents = toCents(booking.daily_rate) * totalDays;

  const vehicleCat = booking.vehicles?.category || "";
  const plan = booking.protection_plan && booking.protection_plan !== "none"
    ? getProtectionRateForCategory(booking.protection_plan, vehicleCat)
    : null;
  const protectionCents = plan ? toCents(plan.rate) * totalDays : 0;

  // booking_add_ons.price is the SERVER-COMPUTED LINE TOTAL (already includes qty, days, one-time fee)
  const addOnsCents = bookingAddOns.reduce((sum: number, a: any) => {
    return sum + toCents(a.price);
  }, 0);

  const driversCents = additionalDrivers.reduce((sum: number, d: any) => {
    const fee = Number(d.young_driver_fee);
    if (fee > 0) return sum + toCents(fee);
    const rate = d.driver_age_band === "20_24" ? youngDriverDailyRate : driverDailyRate;
    return sum + toCents(rate) * totalDays;
  }, 0);

  const youngRenterCents = toCents(booking.young_driver_fee);
  const dropoffCents = toCents(booking.different_dropoff_fee);
  const deliveryCents = toCents(booking.delivery_fee ?? booking.deliveryFee ?? 0);
  const upgradeDailyCents = toCents(booking.upgrade_daily_fee);
  const upgradeCents = upgradeDailyCents > 0 ? upgradeDailyCents * totalDays : 0;
  const pvrtCents = toCents(PVRT_DAILY_FEE) * totalDays;
  const acsrchCents = toCents(ACSRCH_DAILY_FEE) * totalDays;

  // Derive effective vehicle total as remainder from DB subtotal minus all other known line items.
  // This absorbs weekend surcharges and duration discounts without needing stored columns.
  const dbSubtotalCents = toCents(booking.subtotal);
  const nonVehicleCents = protectionCents + addOnsCents + driversCents
    + youngRenterCents + dropoffCents + deliveryCents + upgradeCents + pvrtCents + acsrchCents;
  const vehicleRemainderCents = dbSubtotalCents - nonVehicleCents;

  // Sanity: use remainder if positive and within 10x of base (guards against corrupt legacy data)
  const useRemainder = vehicleRemainderCents > 0 && vehicleRemainderCents <= vehicleBaseCents * 10;
  const vehicleCents = useRemainder ? vehicleRemainderCents : vehicleBaseCents;
  const vehicleHasAdjustments = useRemainder && vehicleRemainderCents !== vehicleBaseCents;

  // Detect missing join rows: if no add-ons/drivers but vehicle remainder is much larger than base
  const extrasLikelyMissing = bookingAddOns.length === 0
    && additionalDrivers.length === 0
    && vehicleRemainderCents > vehicleBaseCents * 1.5
    && vehicleRemainderCents > 0;

  if (extrasLikelyMissing) {
    console.warn(
      `[OPS_BREAKDOWN] Missing join rows for booking ${booking.booking_code || booking.id}: ` +
      `base=$${fromCents(vehicleBaseCents)}, remainder=$${fromCents(vehicleRemainderCents)}, ` +
      `unpersisted_extras=$${fromCents(vehicleRemainderCents - vehicleBaseCents)}`
    );
  }

  const itemizedCents = vehicleCents + nonVehicleCents;

  const deltaCents = dbSubtotalCents - itemizedCents;

  let inferredRow: { label: string; cents: number } | null = null;
  let manualAdjustmentCents = 0;

  const isPostFix = booking.created_at && new Date(booking.created_at).getTime() >= new Date(FIX_DEPLOY_DATE).getTime();

  if (deltaCents > 0 && additionalDrivers.length === 0) {
    let matched = false;
    for (const { rate, label } of [
      { rate: driverDailyRate, label: "Standard" },
      { rate: youngDriverDailyRate, label: "Young" },
    ]) {
      const perDriverCents = toCents(rate) * totalDays;
      if (perDriverCents <= 0) continue;
      for (let n = 1; n <= 4; n++) {
        const expected = perDriverCents * n;
        if (Math.abs(deltaCents - expected) <= 1) {
          inferredRow = {
            label: `Additional Driver${n > 1 ? "s" : ""} – ${label} (${n} × $${rate.toFixed(2)}/day × ${totalDays}d)`,
            cents: expected,
          };
          matched = true;
          break;
        }
      }
      if (matched) break;
    }
    if (!matched) {
      if (isPostFix) {
        console.error(`[OPS_BREAKDOWN_ERROR] Post-fix booking ${booking.booking_code} has unresolved delta: ${deltaCents} cents`);
      } else {
        manualAdjustmentCents = deltaCents;
      }
    }
  } else if (deltaCents > 0) {
    if (isPostFix) {
      console.error(`[OPS_BREAKDOWN_ERROR] Post-fix booking ${booking.booking_code} has unresolved delta: ${deltaCents} cents`);
    } else {
      manualAdjustmentCents = deltaCents;
    }
  }

  const dbTaxCents = toCents(booking.tax_amount);
  const dbTotalCents = toCents(booking.total_amount);

  return (
    <div className="space-y-1.5 text-xs">
      {/* Warning: extras not persisted */}
      {extrasLikelyMissing && (
        <div className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded px-2 py-1 mb-1">
          <Info className="h-3 w-3 shrink-0" />
          <span>Add-ons/drivers not persisted — breakdown may be inaccurate</span>
        </div>
      )}

      {/* Vehicle — only show base when extras are missing (don't inflate) */}
      <div className="flex justify-between">
        <span className="text-muted-foreground">
          Vehicle{vehicleHasAdjustments && !extrasLikelyMissing ? " (incl. surcharges/discounts)" : ` (${totalDays}d × $${Number(booking.daily_rate).toFixed(2)}/day)`}
        </span>
        <span>${fromCents(extrasLikelyMissing ? vehicleBaseCents : vehicleCents)}</span>
      </div>
      {vehicleHasAdjustments && !extrasLikelyMissing && (
        <p className="text-[10px] text-muted-foreground pl-2">
          Base: {totalDays}d × ${Number(booking.daily_rate).toFixed(2)}/day = ${fromCents(vehicleBaseCents)}
        </p>
      )}
      {/* Show unpersisted extras remainder when join rows are missing */}
      {extrasLikelyMissing && (
        <div className="flex justify-between text-amber-600">
          <span className="flex items-center gap-1">
            <Info className="h-3 w-3" />
            Extras (not itemized — missing DB rows)
          </span>
          <span>${fromCents(vehicleRemainderCents - vehicleBaseCents)}</span>
        </div>
      )}

      {/* Protection */}
      {plan && protectionCents > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            {PROTECTION_PLAN_LABELS[booking.protection_plan] || plan.name} (${plan.rate.toFixed(2)}/day × {totalDays}d)
          </span>
          <span>${fromCents(protectionCents)}</span>
        </div>
      )}

      {/* Add-ons from DB rows */}
      {bookingAddOns.map((addon: any) => {
        const qty = Number(addon.quantity) || 1;
        const lineTotalCents = toCents(addon.price);
        const unitCents = qty > 1 ? Math.round(lineTotalCents / qty) : 0;
        return (
          <div key={addon.id} className="flex justify-between">
            <span className="text-muted-foreground">
              {addon.add_ons?.name || "Add-on"}{qty > 1 ? ` ×${qty}` : ""}
              {qty > 1 && unitCents > 0 && (
                <span className="text-[10px] ml-1">(~${fromCents(unitCents)} each)</span>
              )}
            </span>
            <span>${fromCents(lineTotalCents)}</span>
          </div>
        );
      })}

      {/* Additional Drivers from DB rows */}
      {additionalDrivers.map((d: any, i: number) => {
        const isYoung = d.driver_age_band === "20_24";
        const fee = Number(d.young_driver_fee);
        const rate = isYoung ? youngDriverDailyRate : driverDailyRate;
        const displayCents = fee > 0 ? toCents(fee) : toCents(rate) * totalDays;
        const rateLabel = isYoung ? `Young $${youngDriverDailyRate.toFixed(2)}` : `Standard $${driverDailyRate.toFixed(2)}`;
        return (
          <div key={d.id || i} className="flex justify-between">
            <span className="text-muted-foreground">
              {d.driver_name || `Driver ${i + 1}`} ({rateLabel}/day × {totalDays}d)
            </span>
            <span>${fromCents(displayCents)}</span>
          </div>
        );
      })}

      {/* Young Renter Fee (primary renter) */}
      {youngRenterCents > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            Young Renter Fee{totalDays > 0 ? ` (~$${fromCents(Math.round(youngRenterCents / totalDays))}/day × ${totalDays}d)` : ""}
          </span>
          <span>${fromCents(youngRenterCents)}</span>
        </div>
      )}

      {/* Different Drop-off */}
      {dropoffCents > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Different Drop-off Fee</span>
          <span>${fromCents(dropoffCents)}</span>
        </div>
      )}

      {/* Delivery Fee */}
      {deliveryCents > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Delivery Fee</span>
          <span>${fromCents(deliveryCents)}</span>
        </div>
      )}

      {/* Upgrade */}
      {upgradeCents > 0 && (
        <div className="flex justify-between text-emerald-600">
          <span>Upgrade (${Number(booking.upgrade_daily_fee).toFixed(2)}/day × {totalDays}d)</span>
          <span>${fromCents(upgradeCents)}</span>
        </div>
      )}

      {/* Regulatory fees */}
      <div className="flex justify-between">
        <span className="text-muted-foreground flex items-center gap-1">
          PVRT <span className="text-[10px]">(${PVRT_DAILY_FEE.toFixed(2)}/day)</span>
        </span>
        <span>${fromCents(pvrtCents)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground flex items-center gap-1">
          ACSRCH <span className="text-[10px]">(${ACSRCH_DAILY_FEE.toFixed(2)}/day)</span>
        </span>
        <span>${fromCents(acsrchCents)}</span>
      </div>

      {/* Inferred Additional Driver (strict match only) */}
      {inferredRow && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">{inferredRow.label}</span>
          <span>${fromCents(inferredRow.cents)}</span>
        </div>
      )}

      {/* Manual Adjustment (legacy-only fallback) */}
      {manualAdjustmentCents > 0 && (
        <div className="space-y-0.5">
          <div
            className="flex justify-between text-amber-600 cursor-pointer select-none"
            onClick={() => setShowAdjustmentDetails(!showAdjustmentDetails)}
          >
            <span className="flex items-center gap-1">
              {showAdjustmentDetails ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <Info className="h-3 w-3" />
              Manual Adjustment (Legacy)
            </span>
            <span>${fromCents(manualAdjustmentCents)}</span>
          </div>
          {showAdjustmentDetails && (
            <div className="pl-5 space-y-0.5">
              <p className="text-[10px] text-muted-foreground">
                Itemized total: ${fromCents(itemizedCents)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Subtotal: ${fromCents(dbSubtotalCents)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Delta: ${fromCents(manualAdjustmentCents)}
              </p>
              {!isPostFix && (
                <p className="text-[10px] text-muted-foreground/70">
                  Reason: booking created before itemized line-items were persisted in DB.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <Separator className="my-1" />

      {/* Subtotal */}
      <div className="flex justify-between">
        <span className="text-muted-foreground">Subtotal</span>
        <span>${fromCents(dbSubtotalCents)}</span>
      </div>

      {/* Tax — single DB-driven line */}
      {dbTaxCents > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax (PST+GST)</span>
          <span>${fromCents(dbTaxCents)}</span>
        </div>
      )}

      <Separator className="my-1" />

      {/* Total */}
      <div className="flex justify-between font-semibold text-sm">
        <span>Total</span>
        <span>${fromCents(dbTotalCents)}</span>
      </div>

      {/* Deposit */}
      {toCents(booking.deposit_amount) > 0 && (
        <div className="flex justify-between text-muted-foreground">
          <span>Deposit</span>
          <span>${fromCents(toCents(booking.deposit_amount))}</span>
        </div>
      )}

      {/* Late Return Fee */}
      {toCents(booking.late_return_fee) > 0 && (
        <div className="flex justify-between text-destructive">
          <span>Late Return Fee</span>
          <span>${fromCents(toCents(booking.late_return_fee))}</span>
        </div>
      )}
    </div>
  );
}
