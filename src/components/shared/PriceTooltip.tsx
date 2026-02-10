/**
 * PriceTooltip - Reusable tooltip for price line items
 * Provides contextual help text explaining each charge
 */
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PriceTooltipProps {
  content: string;
}

export function PriceTooltip({ content }: PriceTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help inline-block ml-1 shrink-0" />
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[260px] text-xs leading-relaxed bg-popover text-popover-foreground border border-border shadow-md z-50"
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Centralized tooltip descriptions for all charge line items.
 * Single source of truth — import this wherever price breakdowns are shown.
 */
export const PRICE_TOOLTIPS = {
  vehicleRental: "Base rental charge calculated as daily rate × number of rental days.",
  weekendSurcharge: "A 15% surcharge applies for rentals picked up on Friday, Saturday, or Sunday.",
  weeklyDiscount: "A 10% discount is applied for rentals of 7 days or longer.",
  monthlyDiscount: "A 20% discount is applied for rentals of 21 days or longer.",
  protection: (name: string) =>
    `${name} protection plan. Covers damage to the rental vehicle with varying deductible levels.`,
  protectionNone: "No additional protection selected. You are responsible for all damage during the rental period.",
  addOns: "Optional extras and equipment added to your rental. Each add-on is charged per day or as a one-time fee.",
  additionalDrivers: "Fee for registering additional drivers on the rental. Each additional driver is $15.99/day.",
  youngDriverFee: "A $15 CAD/day fee applies for primary drivers aged 20–24, charged for every day of the rental.",
  youngDriverAdditional: "A $15 CAD/day fee applies for each additional driver aged 20–24, charged for every day of the rental.",
  deliveryFee: "Fee for delivering the vehicle to your specified address instead of pickup at a branch location.",
  pvrt: "Passenger Vehicle Rental Tax — a mandatory BC provincial fee of $1.50/day on all vehicle rentals.",
  acsrch: "Airport Concession Surcharge — a mandatory regulatory fee of $1.00/day on all vehicle rentals.",
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
