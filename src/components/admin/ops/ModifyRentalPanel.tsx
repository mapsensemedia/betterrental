/**
 * ModifyRentalPanel — the single place staff change anything about a booking.
 *
 * One box, identical on every booking screen: dates & duration (priced +
 * recorded as an extension), vehicle upgrade, protection, extras & drivers,
 * and rate / location. Which sections are enabled depends only on the booking
 * status — never on which screen the staff member happens to be on.
 */
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Car, Shield, ShoppingCart, DollarSign, Lock, SlidersHorizontal } from "lucide-react";
import { BookingModificationPanel } from "./BookingModificationPanel";
import { VehicleUpgradePanel } from "./VehicleUpgradePanel";
import { ProtectionChangePanel } from "./ProtectionChangePanel";
import { CounterUpsellPanel } from "./CounterUpsellPanel";
import { RateLocationPanel } from "./RateLocationPanel";

export interface ModifyRentalBooking {
  id: string;
  booking_code?: string | null;
  start_at: string;
  end_at: string;
  daily_rate: number;
  total_days: number;
  total_amount: number;
  subtotal: number;
  tax_amount: number | null;
  driver_age_band: string | null;
  protection_plan: string | null;
  young_driver_fee: number | null;
  status: string;
  location_id: string;
  vehicle_id?: string | null;
  assigned_unit_id?: string | null;
  upgrade_daily_fee?: number | null;
  upgrade_category_label?: string | null;
  upgrade_visible_to_customer?: boolean | null;
  vehicles?: { category?: string | null } | null;
  vehicle_categories?: { name?: string | null } | null;
}

interface ModifyRentalPanelProps {
  booking: ModifyRentalBooking;
  /** Optionally hide sections that don't apply to a screen (rarely needed). */
  hide?: Array<"dates" | "vehicle" | "protection" | "extras" | "rate">;
  defaultTab?: "dates" | "vehicle" | "protection" | "extras" | "rate";
}

export function ModifyRentalPanel({ booking, hide = [], defaultTab = "dates" }: ModifyRentalPanelProps) {
  const isTerminal = ["completed", "cancelled"].includes(booking.status);
  const categoryName = booking.vehicle_categories?.name ?? booking.vehicles?.category ?? null;

  const sections = (["dates", "vehicle", "protection", "extras", "rate"] as const).filter(
    (s) => !hide.includes(s),
  );
  const activeDefault = sections.includes(defaultTab) ? defaultTab : sections[0];

  if (isTerminal) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Modify Rental
            <Badge variant="outline" className="text-xs">Read-Only</Badge>
          </CardTitle>
          <CardDescription>
            This booking is {booking.status}. Rentals can no longer be modified.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" />
          Modify Rental
        </CardTitle>
        <CardDescription>
          Dates, vehicle, protection, extras and rates — all priced server-side and recorded.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={activeDefault} className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto gap-1 justify-start">
            {sections.includes("dates") && (
              <TabsTrigger value="dates" className="gap-1.5 text-xs">
                <Calendar className="w-3.5 h-3.5" /> Dates
              </TabsTrigger>
            )}
            {sections.includes("vehicle") && (
              <TabsTrigger value="vehicle" className="gap-1.5 text-xs">
                <Car className="w-3.5 h-3.5" /> Vehicle
              </TabsTrigger>
            )}
            {sections.includes("protection") && (
              <TabsTrigger value="protection" className="gap-1.5 text-xs">
                <Shield className="w-3.5 h-3.5" /> Protection
              </TabsTrigger>
            )}
            {sections.includes("extras") && (
              <TabsTrigger value="extras" className="gap-1.5 text-xs">
                <ShoppingCart className="w-3.5 h-3.5" /> Extras & Drivers
              </TabsTrigger>
            )}
            {sections.includes("rate") && (
              <TabsTrigger value="rate" className="gap-1.5 text-xs">
                <DollarSign className="w-3.5 h-3.5" /> Rate & Location
              </TabsTrigger>
            )}
          </TabsList>

          {sections.includes("dates") && (
            <TabsContent value="dates" className="mt-4">
              <BookingModificationPanel booking={booking} />
            </TabsContent>
          )}

          {sections.includes("vehicle") && (
            <TabsContent value="vehicle" className="mt-4">
              <VehicleUpgradePanel
                booking={{
                  id: booking.id,
                  booking_code: booking.booking_code || "",
                  total_days: booking.total_days,
                  daily_rate: booking.daily_rate,
                  subtotal: booking.subtotal,
                  total_amount: booking.total_amount,
                  location_id: booking.location_id,
                  vehicle_id: booking.vehicle_id || "",
                  assigned_unit_id: booking.assigned_unit_id,
                  upgrade_daily_fee: booking.upgrade_daily_fee,
                  upgrade_category_label: booking.upgrade_category_label,
                  upgrade_visible_to_customer: booking.upgrade_visible_to_customer,
                  driver_age_band: booking.driver_age_band,
                  start_at: booking.start_at,
                }}
              />
            </TabsContent>
          )}

          {sections.includes("protection") && (
            <TabsContent value="protection" className="mt-4">
              <ProtectionChangePanel
                bookingId={booking.id}
                booking={booking}
                categoryName={categoryName}
              />
            </TabsContent>
          )}

          {sections.includes("extras") && (
            <TabsContent value="extras" className="mt-4">
              <CounterUpsellPanel bookingId={booking.id} rentalDays={booking.total_days || 1} />
            </TabsContent>
          )}

          {sections.includes("rate") && (
            <TabsContent value="rate" className="mt-4">
              <RateLocationPanel booking={booking} />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
