/**
 * PriceTooltip - Reusable info popover for price line items.
 * Works on both desktop (hover/click) and mobile (tap).
 * Uses Popover instead of Tooltip so touch events open/close it correctly.
 */
import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface PriceTooltipProps {
  /** Plain string content shown in the popover body. */
  content?: string;
  /** Optional rich JSX content (overrides `content`). */
  children?: React.ReactNode;
}

export function PriceTooltip({ content, children }: PriceTooltipProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {/* min-w/h ensures a 44px-ish tap target on mobile */}
        <button
          type="button"
          aria-label="More information"
          className="inline-flex items-center justify-center ml-1 shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ minWidth: 28, minHeight: 28 }}
        >
          <Info className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={6}
        className="max-w-[280px] text-xs leading-relaxed normal-case bg-popover text-popover-foreground border border-border shadow-lg z-[9999] p-3"
        // Stop clicks inside the popover from propagating and accidentally
        // triggering parent buttons/links (important in checkout flow).
        onClick={(e) => e.stopPropagation()}
      >
        {children ?? content}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Centralized tooltip descriptions for all charge line items.
 * Single source of truth — import this wherever price breakdowns are shown.
 */
export const PRICE_TOOLTIPS = {
  vehicleRental: "Base rental charge calculated as daily rate × number of rental days.",
  weekendSurcharge: "A 15% surcharge applies for each Friday, Saturday, or Sunday within your rental range.",
  weeklyDiscount: "A 10% discount is applied for rentals of 7 days or longer.",
  monthlyDiscount: "A 20% discount is applied for rentals of 21 days or longer.",
  protection: (name: string) =>
    `${name} protection plan. Covers damage to the rental vehicle with varying deductible levels.`,
  protectionNone: "No additional protection selected. You are responsible for all damage during the rental period.",
  addOns: "Optional extras and equipment added to your rental. Each add-on is charged per day or as a one-time fee.",
  additionalDrivers: "Fee for registering additional drivers on the rental. Rate is set by the rental company.",
  youngDriverFee: "A $15 CAD/day fee applies for primary drivers aged 20–24, charged for every day of the rental.",
  youngDriverAdditional: "A $15 CAD/day fee applies for each additional driver aged 20–24, charged for every day of the rental.",
  deliveryFee: "Fee for delivering the vehicle to your specified address instead of pickup at a branch location.",
  pvrt: "Passenger Vehicle Rental Tax (PVRT) — a mandatory BC provincial fee of $1.50/day on all vehicle rentals.",
  acsrch: "Air Conditioner Surcharge (ACSRCH) — a mandatory regulatory fee of $1.00/day on all vehicle rentals.",
  dailyFees: "Combined mandatory regulatory fees: PVRT ($1.50/day) + ACSRCH ($1.00/day).",
  pst: "Provincial Sales Tax (BC) at 7%, applied to the rental subtotal.",
  gst: "Goods and Services Tax (federal) at 5%, applied to the rental subtotal.",
  totalTax: "Combined taxes: PST (7%) + GST (5%) = 12% applied to the rental subtotal.",
  deposit: "A refundable security deposit held on your credit card during the rental period. Released after vehicle return inspection.",
  fuelAddon: (tankLiters: number, savings: number) =>
    `Pre-purchase a full tank (${tankLiters}L) at a discounted rate and save $${savings.toFixed(2)} CAD vs. market price.`,
  pointsDiscount: "Discount applied from your C2C loyalty points balance.",
  subtotal: "Sum of all charges before taxes are applied.",
  total: "Final amount due including all charges, taxes, and any discounts applied.",
} as const;
