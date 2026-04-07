/**
 * Export active & completed bookings to Excel with full details.
 */
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { format } from "date-fns";

interface ExportRow {
  "Booking ID": string;
  "Customer Name": string;
  "Customer Email": string;
  "Customer Phone": string;
  "Booking Source": string;
  "Car Category": string;
  VIN: string;
  "License Plate": string;
  Color: string;
  "Pickup Location": string;
  "Return Location": string;
  "Start Date": string;
  "End Date": string;
  "Actual Return": string;
  "Total Days": number;
  "Daily Rate ($)": number;
  "Subtotal ($)": number;
  "Tax ($)": number;
  "Deposit Amount ($)": number;
  "Protection Plan": string;
  "Total Charged ($)": number;
  "Payment Method": string;
  "Transaction IDs": string;
  "Card Last 4": string;
  "Deposit Status": string;
  "Booking Status": string;
  "Created Date": string;
  Notes: string;
}

function fmtDate(d: string | null): string {
  if (!d) return "";
  try { return format(new Date(d), "yyyy-MM-dd"); } catch { return ""; }
}

export async function exportBookingsExcel() {
  // 1. Fetch bookings
  const { data: bookings, error: bErr } = await supabase
    .from("bookings")
    .select("*, locations!location_id(id, name)")
    .in("status", ["active", "completed"])
    .limit(1000);
  if (bErr) throw new Error("Failed to fetch bookings");
  if (!bookings?.length) throw new Error("No active or completed bookings found");

  const bookingIds = bookings.map((b) => b.id);

  // 2. Fetch payments for these bookings
  const { data: payments } = await supabase
    .from("payments")
    .select("booking_id, amount, status, payment_method, transaction_id")
    .in("booking_id", bookingIds)
    .in("status", ["completed", "captured"]);

  // Group payments by booking
  const paymentsByBooking = new Map<string, typeof payments>();
  for (const p of payments || []) {
    const arr = paymentsByBooking.get(p.booking_id) || [];
    arr.push(p);
    paymentsByBooking.set(p.booking_id, arr);
  }

  // Filter completed bookings: must have at least one completed payment
  const validBookings = bookings.filter((b) => {
    if (b.status === "active") return true;
    return (paymentsByBooking.get(b.id)?.length ?? 0) > 0;
  });

  if (!validBookings.length) throw new Error("No bookings with completed payments found");

  // 3. Fetch related data in parallel
  const customerIds = [...new Set(validBookings.map((b) => b.customer_id).filter(Boolean))] as string[];
  const userIds = [...new Set(validBookings.map((b) => b.user_id))];
  const categoryIds = [...new Set(validBookings.map((b) => b.vehicle_id).filter(Boolean))];
  const unitIds = [...new Set(validBookings.map((b) => b.assigned_unit_id).filter(Boolean))] as string[];
  const returnLocIds = [...new Set(validBookings.map((b) => b.return_location_id).filter(Boolean))] as string[];

  const [customersRes, profilesRes, categoriesRes, unitsRes, returnLocsRes] = await Promise.all([
    customerIds.length ? supabase.from("customers").select("id, full_name, email, phone").in("id", customerIds) : { data: [] },
    supabase.from("profiles").select("id, full_name, email, phone").in("id", userIds),
    categoryIds.length ? supabase.from("vehicle_categories").select("id, name").in("id", categoryIds) : { data: [] },
    unitIds.length ? supabase.from("vehicle_units").select("id, vin, license_plate, color").in("id", unitIds) : { data: [] },
    returnLocIds.length ? supabase.from("locations").select("id, name").in("id", returnLocIds) : { data: [] },
  ]);

  const customersMap = new Map((customersRes.data || []).map((c) => [c.id, c]));
  const profilesMap = new Map((profilesRes.data || []).map((p) => [p.id, p]));
  const categoriesMap = new Map((categoriesRes.data || []).map((c) => [c.id, c]));
  const unitsMap = new Map((unitsRes.data || []).map((u) => [u.id, u]));
  const returnLocsMap = new Map((returnLocsRes.data || []).map((l) => [l.id, l]));

  // 4. Build rows
  function buildRow(b: (typeof validBookings)[0]): ExportRow {
    const customer = b.customer_id ? customersMap.get(b.customer_id) : null;
    const profile = profilesMap.get(b.user_id);
    const category = categoriesMap.get(b.vehicle_id);
    const unit = b.assigned_unit_id ? unitsMap.get(b.assigned_unit_id) : null;
    const pickupLoc = (b as any).locations;
    const returnLoc = b.return_location_id ? returnLocsMap.get(b.return_location_id) : null;
    const bPayments = paymentsByBooking.get(b.id) || [];

    const totalCharged = bPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const methods = [...new Set(bPayments.map((p) => p.payment_method).filter(Boolean))].join(", ");
    const txnIds = bPayments.map((p) => p.transaction_id).filter(Boolean).join(", ");

    return {
      "Booking ID": b.booking_code,
      "Customer Name": customer?.full_name || profile?.full_name || "",
      "Customer Email": customer?.email || profile?.email || "",
      "Customer Phone": customer?.phone || profile?.phone || "",
      "Booking Source": b.booking_source === "walk_in" ? "Walk-In" : "Online",
      "Car Category": category?.name || "",
      VIN: unit?.vin || "",
      "License Plate": unit?.license_plate || "",
      Color: (unit as any)?.color || "",
      "Pickup Location": pickupLoc?.name || "",
      "Return Location": returnLoc?.name || pickupLoc?.name || "",
      "Start Date": fmtDate(b.start_at),
      "End Date": fmtDate(b.end_at),
      "Actual Return": fmtDate(b.actual_return_at),
      "Total Days": b.total_days,
      "Daily Rate ($)": Number(b.daily_rate),
      "Subtotal ($)": Number(b.subtotal),
      "Tax ($)": Number(b.tax_amount || 0),
      "Deposit Amount ($)": Number(b.deposit_amount || 0),
      "Protection Plan": b.protection_plan || "none",
      "Total Charged ($)": totalCharged,
      "Payment Method": methods,
      "Transaction IDs": txnIds,
      "Card Last 4": b.card_last_four || "",
      "Deposit Status": b.deposit_status || "",
      "Booking Status": b.status,
      "Created Date": fmtDate(b.created_at),
      Notes: b.notes || "",
    };
  }

  const activeRows = validBookings.filter((b) => b.status === "active").map(buildRow);
  const completedRows = validBookings.filter((b) => b.status === "completed").map(buildRow);

  // 5. Create workbook
  const wb = XLSX.utils.book_new();

  const ws1 = XLSX.utils.json_to_sheet(activeRows.length ? activeRows : [{}]);
  XLSX.utils.book_append_sheet(wb, ws1, "Active Rentals");

  const ws2 = XLSX.utils.json_to_sheet(completedRows.length ? completedRows : [{}]);
  XLSX.utils.book_append_sheet(wb, ws2, "Completed Rentals");

  // Auto-width columns
  for (const ws of [ws1, ws2]) {
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
    const colWidths: number[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      let max = 10;
      for (let r = range.s.r; r <= range.e.r; r++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if (cell?.v) max = Math.max(max, String(cell.v).length + 2);
      }
      colWidths.push(Math.min(max, 40));
    }
    ws["!cols"] = colWidths.map((w) => ({ wch: w }));
  }

  const filename = `C2C-Rentals-Export-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
  XLSX.writeFile(wb, filename);
}
