# 04 — DATA LAYER

Parsed from the actual hook, domain, and library files. Query text, cache
settings and formulas are quoted from source with line numbers.

---

## 1. Custom hooks

Hook/data files scanned: **112**.

### `src/hooks/use-abandoned-carts.ts`

**Exports:** `getCartSessionId`, `useAbandonedCarts`, `useSaveAbandonedCart`, `useMarkCartConverted`, `useUpdateAbandonedCart`, `useDeleteAbandonedCart`

**Query keys:**

- L59: `queryKey: ["abandoned-carts", options?.showConverted],`
- L179: `queryClient.invalidateQueries({ queryKey: ["abandoned-carts"] });`
- L209: `queryClient.invalidateQueries({ queryKey: ["abandoned-carts"] });`
- L229: `queryClient.invalidateQueries({ queryKey: ["abandoned-carts"] });`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
62: .from("abandoned_carts")
63: .select(`
67: .order("abandoned_at", { ascending: false });
104: .from("abandoned_carts")
105: .select("id")
106: .eq("session_id", sessionId)
132: .from("abandoned_carts")
133: .update(payload as any)
134: .eq("id", existing.id);
141: .from("abandoned_carts")
142: .insert(payload as any)
143: .select("id")
168: .from("abandoned_carts")
169: .update({
173: .eq("session_id", sessionId)
199: .from("abandoned_carts")
200: .update({
204: .eq("id", cartId);
222: .from("abandoned_carts")
223: .delete()
224: .eq("id", cartId);
```

**Cache invalidation on success:**

- L179: `queryClient.invalidateQueries({ queryKey: ["abandoned-carts"] });`
- L209: `queryClient.invalidateQueries({ queryKey: ["abandoned-carts"] });`
- L229: `queryClient.invalidateQueries({ queryKey: ["abandoned-carts"] });`

**Error handling:**

- L75: `if (error) throw error;`
- L135: `if (error) throw error;`
- L176: `if (error) throw error;`
- L206: `if (error) throw error;`
- L210: `toast({ title: "Cart updated" });`
- L226: `if (error) throw error;`
- L230: `toast({ title: "Cart deleted" });`

**Consumed by:** `src/pages/NewCheckout.tsx`, `src/pages/admin/AbandonedCarts.tsx`

### `src/hooks/use-active-rental-detail.ts`

**File header:** Fetch detailed info for a single active rental

**Exports:** `useActiveRentalDetail`, `calculateDuration`

**Query keys:**

- L99: `queryKey: ["active-rental-detail", bookingId],`

**Cache / fetch settings:**

- L302: `enabled: !!bookingId,`
- L303: `staleTime: 30000,`
- L304: `refetchInterval: 60000, // Auto-refresh every minute`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
105: .from("bookings")
106: .select(`
111: .eq("id", bookingId)
112: .in("status", ["active", "confirmed"])
125: .from("vehicle_categories")
126: .select("id, name, description, image_url, daily_rate, seats, fuel_type, transmission")
127: .eq("id", booking.vehicle_id)
133: .from("profiles")
134: .select("id, full_name, email, phone, is_verified, driver_license_number, driver_license_front_url, driver_license_back_url, driver_license_status, driver_license_expiry")
135: .eq("id", booking.user_id)
142: .from("customers")
143: .select("full_name, email, phone")
144: .eq("id", booking.customer_id)
159: .from("payments")
160: .select("*")
161: .eq("booking_id", bookingId)
162: .eq("status", "completed"),
164: .from("verification_requests")
165: .select("*")
166: .eq("booking_id", bookingId)
167: .eq("status", "verified"),
169: .from("rental_agreements")
170: .select("*")
171: .eq("booking_id", bookingId)
174: .from("walkaround_inspections")
175: .select("*")
176: .eq("booking_id", bookingId)
177: .eq("inspection_complete", true),
179: .from("admin_alerts")
180: .select("id, title, alert_type, status, created_at")
181: .eq("booking_id", bookingId)
182: .in("status", ["pending", "acknowledged"])
183: .order("created_at", { ascending: false })
184: .limit(5),
186: .from("tickets")
187: .select("id, subject, status, created_at")
188: .eq("booking_id", bookingId)
189: .in("status", ["open", "in_progress"])
190: .order("created_at", { ascending: false })
191: .limit(5),
```

**Error handling:**

- L116: `console.error("Error fetching active rental:", error);`
- L117: `throw error;`

**Return shape(s):** `{elapsedHours,
    elapsedMinutes,
    elapsedSeconds: elapsedSecondsRemainder,
    remainingHours,
    remainingMinutes,
    remainingSeconds: remainingSecondsRemainder,
    isOverdue,
    totalElapse}`

**Consumed by:** `src/pages/admin/ActiveRentalDetail.tsx`

### `src/hooks/use-active-rentals.ts`

**File header:** Fetch all active rentals with duration and overdue risk tracking

**Exports:** `useActiveRentals`, `useActiveRentalStats`

**Query keys:**

- L55: `queryKey: ["active-rentals", locationId ?? "all"],`

**Cache / fetch settings:**

- L56: `enabled: isReady && !isUnassignedManager,`
- L170: `staleTime: 30000, // 30 seconds`
- L171: `refetchInterval: 60000, // Safety net if a realtime event is missed`
- L172: `refetchOnWindowFocus: true,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
59: .from("bookings")
60: .select(`
65: .eq("status", "active");
68: baseQuery = baseQuery.eq("location_id", locationId);
71: const { data, error } = await baseQuery.order("end_at", { ascending: true });
82: .from("vehicle_categories")
83: .select("id, name, image_url")
84: .in("id", categoryIds)
92: ? await supabase.from("customers").select("id, full_name, email, phone").in("id", customerIds)
99: .from("profiles")
100: .select("id, full_name, email, phone")
101: .in("id", userIds);
```

**Error handling:**

- L74: `console.error("Error fetching active rentals:", error);`
- L75: `throw error;`

**Return shape(s):** `{stats, rentals, ...rest}`

**Consumed by:** `src/pages/admin/ActiveRentals.tsx`

### `src/hooks/use-add-ons.ts`

**File header:** Check if an add-on is the fuel service add-on

**Exports:** `isFuelAddOn`, `isAdditionalDriverAddOn`, `isSeatAddOn`, `useAddOns`, `calculateAddOnsCost`

**Query keys:**

- L43: `queryKey: ["add-ons"],`

**Cache / fetch settings:**

- L65: `staleTime: 60000, // 1 minute`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
46: .from("add_ons")
47: .select("*")
48: .eq("is_active", true)
49: .order("name");
```

**Error handling:**

- L52: `console.error("Error fetching add-ons:", error);`

**Return shape(s):** `{id: addon.id, name: addon.name, total: fuelCost.ourPrice}`; `{id: addon.id, name: addon.name, total, quantity: qty}`; `{itemized, total, fuelPricing}`

**Consumed by:** `src/components/admin/AddOnsPricingPanel.tsx`, `src/components/admin/ops/CounterUpsellPanel.tsx`, `src/components/rental/BookingSummaryPanel.tsx`, `src/components/shared/TotalBar.tsx`, `src/pages/AddOns.tsx`, `src/pages/NewCheckout.tsx`, `supabase/functions/_shared/booking-core.ts`

### `src/hooks/use-admin-notify.ts`

**File header:** Send admin email notification for important events. This is fire-and-forget - errors are logged but don't block the caller.

**Exports:** `notifyAdmin`, `useAdminNotify`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
38: const { data, error } = await supabase.functions.invoke("notify-admin", {
```

**Error handling:**

- L43: `console.error("[Admin Notify] Error:", error);`
- L48: `console.error("[Admin Notify] Failed to send notification:", err);`

**Return shape(s):** `{sendNotification}`

**Consumed by:** `src/hooks/use-alerts.ts`, `src/hooks/use-damages.ts`, `src/hooks/use-license-upload.ts`, `src/hooks/use-tickets.ts`

### `src/hooks/use-admin.ts`

**File header:** Check if current user has admin/staff access

**Exports:** `useIsAdmin`, `useUserRoles`, `createAuditLog`, `useAuditLog`

**Query keys:**

- L22: `queryKey: ["user-is-admin", user?.id],`
- L51: `queryKey: ["user-roles", user?.id],`

**Cache / fetch settings:**

- L39: `enabled: !!user,`
- L40: `staleTime: 60000, // 1 minute`
- L72: `enabled: !!user,`
- L73: `staleTime: 60000,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
27: .from("user_roles")
28: .select("role")
29: .eq("user_id", user.id)
30: .in("role", ["super_admin", "manager", "admin", "staff", "cleaner", "finance"]);
56: .from("user_roles")
57: .select("*")
58: .eq("user_id", user.id);
91: const { error } = await supabase.from("audit_logs").insert([{
```

**Error handling:**

- L33: `console.error("Error checking admin status:", error);`
- L61: `console.error("Error fetching roles:", error);`
- L101: `console.error("Error creating audit log:", error);`

**Return shape(s):** `{logAction}`

**Consumed by:** `src/components/admin/AdminProtectedRoute.tsx`, `src/components/admin/ops/steps/StepPayment.tsx`, `src/components/delivery/DeliveryShell.tsx`, `src/components/layout/SupportShell.tsx`, `src/domain/bookings/mutations.ts`, `src/domain/fleet/mutations.ts`, `src/hooks/use-alerts.ts`, `src/hooks/use-checkin.ts`, `src/hooks/use-damages.ts`, `src/hooks/use-inventory.ts`, `src/hooks/use-receipts.ts`, `src/hooks/use-tickets.ts`, `src/pages/CheckIn.tsx`

### `src/hooks/use-alerts.ts`

**File header:** Support ticket this alert was raised for, when any.

**Exports:** `isLifecycleNotice`, `getAlertPriority`, `getExpiresAt`, `useAdminAlerts`, `useResolveAlert`, `useAcknowledgeAlert`, `useBulkResolveAlerts`, `autoResolveBookingAlerts`, `useCreateAlert`

**Query keys:**

- L112: `queryKey: ["admin-alerts", filters, locationId, isSuperAdmin],`
- L217: `queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });`
- L218: `queryClient.invalidateQueries({ queryKey: ["pending-alerts-count"] });`
- L248: `queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });`
- L249: `queryClient.invalidateQueries({ queryKey: ["pending-alerts-count"] });`
- L278: `queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });`
- L279: `queryClient.invalidateQueries({ queryKey: ["pending-alerts-count"] });`
- L390: `queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });`
- L391: `queryClient.invalidateQueries({ queryKey: ["pending-alerts-count"] });`

**Cache / fetch settings:**

- L113: `enabled: isReady && !isUnassignedManager,`
- L186: `staleTime: 10000,`
- L187: `refetchInterval: 15000,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
116: .from("admin_alerts")
117: .select("*")
118: .order("created_at", { ascending: false });
121: query = query.eq("status", filters.status);
124: query = query.in("status", ["pending", "acknowledged"]);
128: query = query.eq("alert_type", filters.alertType);
138: query = query.or("expires_at.is.null,expires_at.gt.now()");
140: const { data, error } = await query.limit(300);
154: .from("bookings")
155: .select("id, location_id")
156: .in("id", bookingIds);
204: .from("admin_alerts")
205: .update({
210: .eq("id", alertId);
235: .from("admin_alerts")
236: .update({
241: .eq("id", alertId);
266: .from("admin_alerts")
267: .update({
272: .in("id", alertIds);
297: .from("admin_alerts")
298: .update({
303: .eq("booking_id", bookingId)
304: .in("alert_type", autoResolveTypes)
305: .in("status", ["pending", "acknowledged"]);
333: .from("vehicles")
334: .select("id")
335: .eq("id", alert.vehicleId)
341: .from("admin_alerts")
342: .insert([{
352: .select()
```

**Cache invalidation on success:**

- L217: `queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });`
- L218: `queryClient.invalidateQueries({ queryKey: ["pending-alerts-count"] });`
- L248: `queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });`
- L249: `queryClient.invalidateQueries({ queryKey: ["pending-alerts-count"] });`
- L278: `queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });`
- L279: `queryClient.invalidateQueries({ queryKey: ["pending-alerts-count"] });`
- L390: `queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });`
- L391: `queryClient.invalidateQueries({ queryKey: ["pending-alerts-count"] });`

**Error handling:**

- L143: `console.error("Error fetching alerts:", error);`
- L212: `if (error) throw error;`
- L243: `if (error) throw error;`
- L274: `if (error) throw error;`
- L308: `console.error("Error auto-resolving alerts:", error);`
- L355: `if (error) throw error;`
- L384: `}).catch(console.error);`

**Consumed by:** `src/components/admin/RealtimeAlertsPanel.tsx`, `src/components/admin/return-ops/steps/StepReturnFlags.tsx`, `src/components/admin/return-ops/steps/StepReturnIssues.tsx`, `src/hooks/use-pending-alerts-count.ts`, `src/hooks/use-sidebar-counts.ts`, `src/pages/admin/ActiveRentalDetail.tsx`, `src/pages/admin/Alerts.tsx`, `src/pages/admin/Handovers.tsx`, `src/pages/admin/Overview.tsx`, `src/pages/admin/Pickups.tsx`, `src/pages/ops/OpsPickups.tsx`, `supabase/functions/check-rental-alerts/index.ts`

### `src/hooks/use-analytics-events.ts`

**File header:** Hook to query analytics_events from Supabase for admin dashboards.

**Exports:** `useAnalyticsEvents`

**Query keys:**

- L24: `queryKey: ["analytics-events", startDate.toISOString(), endDate.toISOString()],`

**Cache / fetch settings:**

- L37: `staleTime: 60_000,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
27: .from("analytics_events")
28: .select("*")
31: .order("created_at", { ascending: false })
32: .limit(5000);
```

**Error handling:**

- L34: `if (error) throw error;`

**Consumed by:** `src/components/admin/AnalyticsPanel.tsx`, `src/pages/admin/Analytics.tsx`, `src/pages/admin/Reports.tsx`

### `src/hooks/use-assign-driver.ts`

**File header:** Assign a driver to a delivery booking Validates dispatch readiness before allowing assignment

**Exports:** `useAssignDriver`, `useUnassignDriver`

**Query keys:**

- L88: `queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });`
- L89: `queryClient.invalidateQueries({ queryKey: ["unassigned-deliveries"] });`
- L90: `queryClient.invalidateQueries({ queryKey: ["all-deliveries"] });`
- L91: `queryClient.invalidateQueries({ queryKey: ["delivery-detail"] });`
- L92: `queryClient.invalidateQueries({ queryKey: ["dispatch-readiness"] });`
- L127: `queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });`
- L128: `queryClient.invalidateQueries({ queryKey: ["unassigned-deliveries"] });`
- L129: `queryClient.invalidateQueries({ queryKey: ["all-deliveries"] });`
- L130: `queryClient.invalidateQueries({ queryKey: ["delivery-detail"] });`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
27: .from("bookings")
28: .select("id, deposit_status, assigned_unit_id, wl_transaction_id")
29: .eq("id", bookingId)
38: .from("condition_photos")
39: .select("id", { count: "exact", head: true })
40: .eq("booking_id", bookingId)
41: .eq("phase", "pickup");
59: .from("bookings")
60: .update({
64: .eq("id", bookingId);
71: await supabase.from("audit_logs").insert({
116: .from("bookings")
117: .update({
121: .eq("id", bookingId);
```

**Cache invalidation on success:**

- L88: `queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });`
- L89: `queryClient.invalidateQueries({ queryKey: ["unassigned-deliveries"] });`
- L90: `queryClient.invalidateQueries({ queryKey: ["all-deliveries"] });`
- L91: `queryClient.invalidateQueries({ queryKey: ["delivery-detail"] });`
- L92: `queryClient.invalidateQueries({ queryKey: ["dispatch-readiness"] });`
- L127: `queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });`
- L128: `queryClient.invalidateQueries({ queryKey: ["unassigned-deliveries"] });`
- L129: `queryClient.invalidateQueries({ queryKey: ["all-deliveries"] });`
- L130: `queryClient.invalidateQueries({ queryKey: ["delivery-detail"] });`

**Error handling:**

- L100: `onError: (error) => {`
- L101: `console.error("Failed to assign driver:", error);`
- L102: `toast.error(error.message || "Failed to assign driver");`
- L123: `if (error) throw error;`
- L133: `onError: (error) => {`
- L134: `console.error("Failed to unassign driver:", error);`
- L135: `toast.error("Failed to unassign driver");`

**Return shape(s):** `{bookingId, driverId, readiness}`

**Consumed by:** `src/components/admin/BookingOpsDrawer.tsx`, `src/components/admin/DeliveryDetailsCard.tsx`, `src/components/delivery/AssignDriverDialog.tsx`

### `src/hooks/use-audit-logs.ts`

**File header:** Hook to fetch and manage audit logs Tracks all admin changes: who, what, when

**Exports:** `useAuditLogs`, `useBookingAuditLogs`, `useAuditStats`, `useCreateAuditLog`

**Query keys:**

- L39: `queryKey: ["audit-logs", { entityType, entityId, userId, action, limit, offset }],`
- L127: `queryKey: ["audit-stats"],`
- L199: `queryClient.invalidateQueries({ queryKey: ["audit-logs"] });`
- L200: `queryClient.invalidateQueries({ queryKey: ["audit-stats"] });`

**Cache / fetch settings:**

- L107: `staleTime: 30000, // 30 seconds`
- L157: `staleTime: 60000, // 1 minute`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
42: .from("audit_logs")
43: .select(`
54: .order("created_at", { ascending: false })
55: .range(offset, offset + limit - 1);
58: query = query.eq("entity_type", entityType);
61: query = query.eq("entity_id", entityId);
64: query = query.eq("user_id", userId);
67: query = query.eq("action", action);
83: .from("profiles")
84: .select("id, full_name, email")
85: .in("id", userIds);
134: .from("audit_logs")
135: .select("action, entity_type, created_at")
187: const { error } = await supabase.from("audit_logs").insert([{
```

**Cache invalidation on success:**

- L199: `queryClient.invalidateQueries({ queryKey: ["audit-logs"] });`
- L200: `queryClient.invalidateQueries({ queryKey: ["audit-stats"] });`

**Error handling:**

- L73: `console.error("Error fetching audit logs:", error);`
- L74: `throw error;`
- L139: `console.error("Error fetching audit stats:", error);`
- L196: `if (error) throw error;`

**Return shape(s):** `{total: 0, byAction: {}`; `{total: data?.length || 0,
        byAction,
        byEntity,}`

**Consumed by:** `src/components/admin/return-ops/steps/StepReturnDeposit.tsx`, `src/pages/admin/AuditLogs.tsx`

### `src/hooks/use-auth.ts`

**File header:** Hook to get current auth state

**Exports:** `useAuth`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
46: .from("profiles")
47: .select("id, email, full_name, phone")
48: .eq("id", user.id)
79: .from("profiles")
80: .upsert(payload as any, { onConflict: "id" });
```

**Error handling:**

- L53: `console.error("Error checking profile:", existingError);`
- L83: `console.error("Error ensuring profile:", upsertError);`
- L86: `console.error("Unexpected error ensuring profile:", err);`

**Return shape(s):** `{user, session, isLoading}`

**Consumed by:** `src/auth/capabilities.ts`, `src/components/admin/AdminProtectedRoute.tsx`, `src/components/admin/VehicleUnitDetail.tsx`, `src/components/admin/WalkInBookingDialog.tsx`, `src/components/admin/return-ops/steps/StepReturnIntake.tsx`, `src/components/delivery/DeliveryProtectedRoute.tsx`, `src/components/delivery/DeliveryShell.tsx`, `src/components/layout/AdminShell.tsx`, `src/components/layout/SupportShell.tsx`, `src/components/layout/TopNav.tsx`, `src/components/ops/OpsProtectedRoute.tsx`, `src/components/ops/OpsShell.tsx`, `src/components/support/SupportProtectedRoute.tsx`, `src/features/delivery/context/DeliveryContext.tsx`, `src/features/delivery/hooks/use-delivery-list.ts`, `src/hooks/use-admin.ts`, `src/hooks/use-delivery-access.ts`, `src/hooks/use-incidents.ts`, `src/hooks/use-my-deliveries.ts`, `src/hooks/use-offers.ts`, `src/hooks/use-pending-ticket-notice.ts`, `src/hooks/use-points.ts`, `src/hooks/use-require-auth.ts`, `src/hooks/use-return-state.ts`, `src/hooks/use-staff-location.ts`, `src/hooks/use-support-access.ts`, `src/hooks/use-support-v2.ts`, `src/pages/Auth.tsx`, `src/pages/BookingDetail.tsx`, `src/pages/CompleteSignup.tsx`, `src/pages/Dashboard.tsx`, `src/pages/NewCheckout.tsx`, `src/pages/admin/SupportV2.tsx`, `src/pages/admin/Vendors.tsx`, `src/pages/admin/Verifications.tsx`, `src/pages/booking/BookingAgreement.tsx`, `src/pages/booking/BookingConfirmed.tsx`, `src/pages/booking/BookingLicense.tsx`, `src/pages/booking/BookingPass.tsx`, `src/pages/booking/BookingPickup.tsx`, `src/pages/booking/BookingReturn.tsx`, `src/pages/support/SupportTickets.tsx`

### `src/hooks/use-availability.ts`

**File header:** Availability Hooks PR7: Performance optimization - centralized stale times

**Exports:** `useAvailableVehicles`, `useVehicleAvailability`

**Query keys:**

- L17: `queryKey: ["available-vehicles", query],`
- L30: `queryKey: ["vehicle-availability", vehicleId, startAt, endAt],`

**Cache / fetch settings:**

- L19: `enabled: !!query,`
- L20: `staleTime: QUERY_STALE_TIMES.availability,`
- L35: `enabled: !!(vehicleId && startAt && endAt),`
- L36: `staleTime: QUERY_STALE_TIMES.availability,`

**Supabase statements:** none (pure computation or context hook)

**Consumed by:** `src/components/admin/VehicleAssignment.tsx`, `src/hooks/use-vehicle-assignment.ts`

### `src/hooks/use-available-drivers.ts`

**File header:** Fetch users with the 'driver' role for assignment

**Exports:** `useAvailableDrivers`

**Query keys:**

- L16: `queryKey: ["available-drivers"],`

**Cache / fetch settings:**

- L51: `staleTime: 30000, // 30 seconds - reference data tier`
- L52: `gcTime: 120000,   // Keep cached for 2 minutes`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
20: .from("user_roles")
21: .select("user_id")
22: .eq("role", "driver");
35: .from("profiles")
36: .select("id, full_name, email, phone")
37: .in("id", driverIds);
```

**Error handling:**

- L25: `console.error("Error fetching driver roles:", rolesError);`
- L40: `console.error("Error fetching driver profiles:", profilesError);`

**Consumed by:** `src/components/admin/BookingOpsDrawer.tsx`, `src/components/admin/ops/steps/StepDispatch.tsx`, `src/components/admin/ops/steps/StepPrep.tsx`, `src/components/delivery/AssignDriverDialog.tsx`, `src/pages/admin/BookingOps.tsx`

### `src/hooks/use-blocked-dates.ts`

**Exports:** `useBlockedDates`

**Query keys:**

- L23: `queryKey: ["blocked-dates", vehicleId, fromDate.toISOString(), toDate.toISOString()],`

**Cache / fetch settings:**

- L99: `enabled: !!vehicleId,`
- L100: `staleTime: 30000,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
31: .from("vehicles")
32: .select("cleaning_buffer_hours")
33: .eq("id", vehicleId)
40: .from("bookings")
41: .select("start_at, end_at, status")
42: .eq("vehicle_id", vehicleId)
43: .in("status", ["pending", "confirmed", "active"])
49: .from("reservation_holds")
50: .select("start_at, end_at, expires_at")
51: .eq("vehicle_id", vehicleId)
52: .eq("status", "active")
84: const blockedDates = Array.from(blockedDatesSet).map((d) => new Date(d));
```

**Return shape(s):** `{blockedRanges: [], blockedDates: [], isDateBlocked: () => false}`; `{blockedRanges, blockedDates, isDateBlocked}`

**Consumed by:** **NOT CONSUMED ANYWHERE — dead code**

### `src/hooks/use-booking-documents.ts`

**File header:** Additional documents attached to a booking (handover step "Additional Documents"). Files live in the private `booking-documents` bucket; metadata rows are written server-side by the `manage-booking-documents` edge function so attribution and audit logging stay correct.

**Exports:** `useBookingDocuments`, `useCustomerDocuments`, `useUploadBookingDocument`, `useDeleteBookingDocument`, `getBookingDocumentUrl`, `BOOKING_DOCUMENTS_BUCKET`, `MAX_DOCUMENT_BYTES`, `ACCEPTED_DOCUMENT_TYPES`

**Query keys:**

- L33: `queryKey: ["booking-documents", bookingId],`
- L54: `queryKey: ["customer-documents", customerUserId],`
- L126: `queryClient.invalidateQueries({ queryKey: ["booking-documents", vars.bookingId] });`
- L127: `queryClient.invalidateQueries({ queryKey: ["customer-documents"] });`
- L128: `queryClient.invalidateQueries({ queryKey: ["booking-activity", vars.bookingId] });`
- L129: `queryClient.invalidateQueries({ queryKey: ["audit-logs"] });`
- L150: `queryClient.invalidateQueries({ queryKey: ["booking-documents", vars.bookingId] });`
- L151: `queryClient.invalidateQueries({ queryKey: ["customer-documents"] });`
- L152: `queryClient.invalidateQueries({ queryKey: ["booking-activity", vars.bookingId] });`

**Cache / fetch settings:**

- L46: `enabled: !!bookingId,`
- L47: `staleTime: 15000,`
- L70: `enabled: !!customerUserId,`
- L71: `staleTime: 30000,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
37: .from("booking_documents")
38: .select("*")
39: .eq("booking_id", bookingId)
41: .order("created_at", { ascending: false })
42: .limit(200);
58: .from("booking_documents")
59: .select("*, bookings(booking_code)")
60: .eq("customer_user_id", customerUserId)
62: .order("created_at", { ascending: false })
63: .limit(200);
100: .from(BOOKING_DOCUMENTS_BUCKET)
104: const { data, error } = await supabase.functions.invoke("manage-booking-documents", {
119: await supabase.storage.from(BOOKING_DOCUMENTS_BUCKET).remove([path]);
140: const { data, error } = await supabase.functions.invoke("manage-booking-documents", {
161: .from(BOOKING_DOCUMENTS_BUCKET)
```

**Cache invalidation on success:**

- L126: `queryClient.invalidateQueries({ queryKey: ["booking-documents", vars.bookingId] });`
- L127: `queryClient.invalidateQueries({ queryKey: ["customer-documents"] });`
- L128: `queryClient.invalidateQueries({ queryKey: ["booking-activity", vars.bookingId] });`
- L129: `queryClient.invalidateQueries({ queryKey: ["audit-logs"] });`
- L150: `queryClient.invalidateQueries({ queryKey: ["booking-documents", vars.bookingId] });`
- L151: `queryClient.invalidateQueries({ queryKey: ["customer-documents"] });`
- L152: `queryClient.invalidateQueries({ queryKey: ["booking-activity", vars.bookingId] });`

**Error handling:**

- L43: `if (error) throw error;`
- L64: `if (error) throw error;`
- L131: `onError: (err: any) => toast.error(err.message || "Upload failed"),`
- L154: `onError: (err: any) => toast.error(err.message || "Failed to remove document"),`
- L163: `if (error) throw error;`

**Consumed by:** `src/components/admin/BookingDocumentsCard.tsx`, `src/components/admin/CustomerDocumentsSection.tsx`, `src/pages/admin/BookingOps.tsx`

### `src/hooks/use-booking-edit.ts`

**File header:** Hook for editing booking details (dates, time, location, duration) with automatic pricing recalculation via server-side edge function. All financial writes go through reprice-booking to comply with trg_block_sensitive_booking_updates.

**Exports:** `useLocations`, `previewBookingEdit`, `useEditBooking`

**Query keys:**

- L43: `queryKey: ["locations"],`
- L144: `queryClient.invalidateQueries({ queryKey: ["booking", result.bookingId] });`
- L145: `queryClient.invalidateQueries({ queryKey: ["bookings"] });`
- L146: `queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });`
- L147: `queryClient.invalidateQueries({ queryKey: ["booking-activity-timeline", result.bookingId] });`

**Cache / fetch settings:**

- L53: `staleTime: 300000, // 5 min`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
46: .from("locations")
47: .select("id, name, city, address")
48: .eq("is_active", true)
49: .order("name");
117: const { data, error } = await supabase.functions.invoke("reprice-booking", {
```

**Cache invalidation on success:**

- L144: `queryClient.invalidateQueries({ queryKey: ["booking", result.bookingId] });`
- L145: `queryClient.invalidateQueries({ queryKey: ["bookings"] });`
- L146: `queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });`
- L147: `queryClient.invalidateQueries({ queryKey: ["booking-activity-timeline", result.bookingId] });`

**Error handling:**

- L13: `import { extractEdgeFunctionError } from "@/lib/edge-function-error";`
- L50: `if (error) throw error;`
- L130: `const msg = await extractEdgeFunctionError(data, error);`
- L163: `onError: (err) => {`
- L164: `toast.error((err as Error).message || "Failed to edit booking");`

**Return shape(s):** `{originalDays: booking.total_days,
    newDays,
    originalTotal: booking.total_amount,
    newSubtotal: pricing.subtotal,
    newTaxAmount: pricing.taxAmount,
    newTotal: pricing.total,
    priceDi}`; `{bookingId,
        oldTotal: data.oldTotal,
        newTotal: data.total,
        priceDifference: timeOnly ? 0 : (data.total - data.oldTotal),
        locationChanged: !!locationId,
        timeOnly:}`

**Consumed by:** `src/components/admin/LocationDailyReport.tsx`, `src/components/admin/LocationScopeSwitcher.tsx`, `src/components/admin/VehicleEditDialog.tsx`, `src/components/admin/WalkInBookingDialog.tsx`, `src/components/admin/analytics/RevenueAnalyticsTab.tsx`, `src/components/admin/fleet/AllVehiclesTable.tsx`, `src/components/admin/fleet/ByVehicleTab.tsx`, `src/components/admin/fleet/CostTrackingTab.tsx`, `src/components/admin/fleet/FleetOverviewTab.tsx`, `src/components/admin/fleet/TemporaryVehiclesTable.tsx`, `src/components/admin/fleet/UtilizationTab.tsx`, `src/components/admin/fleet/VehicleUnitEditDialog.tsx`, `src/components/admin/fleet/VinFormDialog.tsx`, `src/components/admin/ops/RateLocationPanel.tsx`, `src/components/landing/GlassSearchBar.tsx`, `src/components/landing/LocationsSection.tsx`, `src/components/rental/BookingSummaryPanel.tsx`, `src/components/shared/LocationSelector.tsx`, `src/features/delivery/pages/WalkIn.tsx`, `src/hooks/use-locations.ts`, `src/pages/Locations.tsx`, `src/pages/NewCheckout.tsx`, `src/pages/admin/Bookings.tsx`, `src/pages/admin/Calendar.tsx`, `src/pages/admin/Damages.tsx`, `src/pages/admin/Handovers.tsx`, `src/pages/admin/Inventory.tsx`, `src/pages/admin/Pickups.tsx`, `src/pages/admin/Reports.tsx`, `src/pages/admin/Returns.tsx`

### `src/hooks/use-booking-modification.ts`

**File header:** Hook for modifying active/confirmed bookings — extend duration, update dates, and recalculate pricing automatically via server-side edge function.

**Exports:** `previewModification`, `useModifyBooking`

**Query keys:**

- L211: `queryClient.invalidateQueries({ queryKey: ["booking", result.bookingId] });`
- L212: `queryClient.invalidateQueries({ queryKey: ["bookings"] });`
- L213: `queryClient.invalidateQueries({ queryKey: ["booking-activity-timeline", result.bookingId] });`
- L214: `queryClient.invalidateQueries({ queryKey: ["rental-agreement", result.bookingId] });`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
181: const { data, error } = await supabase.functions.invoke("reprice-booking", {
```

**Cache invalidation on success:**

- L211: `queryClient.invalidateQueries({ queryKey: ["booking", result.bookingId] });`
- L212: `queryClient.invalidateQueries({ queryKey: ["bookings"] });`
- L213: `queryClient.invalidateQueries({ queryKey: ["booking-activity-timeline", result.bookingId] });`
- L214: `queryClient.invalidateQueries({ queryKey: ["rental-agreement", result.bookingId] });`

**Error handling:**

- L242: `onError: (err: Error) => {`
- L243: `toast.error(err.message || "Failed to modify booking. Please try again.");`

**Consumed by:** `src/components/admin/ops/BookingModificationPanel.tsx`

### `src/hooks/use-bookings.ts`

**File header:** Active rentals must not be derived from the capped general bookings list. Older rentals can remain active while newer bookings push them past that cap.

**Exports:** `useAdminBookings`, `useAdminActiveBookings`, `useAdminPickupBookings`, `useBookingById`, `useUpdateBookingStatus`

**Query keys:**

- L73: `queryKeyScope?: string;`
- L83: `queryKeyScope = "list",`
- L93: `queryKey: ["admin-bookings", queryKeyScope, filters, scopedLocationId ?? "all"],`
- L255: `queryKeyScope: "active",`
- L271: `queryKeyScope: "pickups",`
- L280: `queryKey: ["booking", id],`
- L423: `queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });`
- L424: `queryClient.invalidateQueries({ queryKey: ["booking"] });`
- L425: `queryClient.invalidateQueries({ queryKey: ["active-rental-detail"] });`
- L426: `queryClient.invalidateQueries({ queryKey: ["alerts"] });`
- L427: `queryClient.invalidateQueries({ queryKey: ["pending-alerts-count"] });`
- L428: `queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });`
- L429: `queryClient.invalidateQueries({ queryKey: ["ops-fleet-units"] });`
- L430: `queryClient.invalidateQueries({ queryKey: ["ops-pickups"] });`
- L431: `queryClient.invalidateQueries({ queryKey: ["ops-active-rentals"] });`
- L432: `queryClient.invalidateQueries({ queryKey: ["ops-returns"] });`

**Cache / fetch settings:**

- L94: `enabled: isReady && !isUnassignedManager,`
- L239: `staleTime: 30000,`
- L240: `refetchInterval: liveRefresh ? 60000 : false,`
- L241: `refetchOnWindowFocus: liveRefresh,`
- L382: `enabled: !!id,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
97: .from("bookings")
98: .select(`
102: .order("created_at", { ascending: false });
106: query = query.in("status", filters.statuses);
108: query = query.eq("status", filters.status);
124: query = query.eq("location_id", scopedLocationId);
128: query = query.eq("vehicle_id", filters.vehicleId);
132: query = query.or(`booking_code.ilike.%${filters.search}%`);
135: const { data: bookingsData, error } = await query.limit(limit);
145: .from("profiles")
146: .select("id, full_name, email, phone")
147: .in("id", userIds);
154: ? await supabase.from("payments").select("booking_id, status, payment_type").in("booking_id", bookingIds).in("status", ["completed", "captured", "authorized"])
170: ? await supabase.from("customers").select("id, full_name, email, phone").in("id", customerIds)
178: .from("vehicle_categories")
179: .select("id, name, description, image_url, daily_rate, seats, fuel_type, transmission")
180: .in("id", categoryIds)
285: .from("bookings")
286: .select(`
292: .eq("id", id)
301: .from("vehicle_categories")
302: .select("id, name, description, image_url, daily_rate, seats, fuel_type, transmission")
303: .eq("id", data.vehicle_id)
309: .from("profiles")
310: .select("id, full_name, email, phone, is_verified, driver_license_status, driver_license_expiry, driver_license_front_url, driver_license_back_url, driver_license_number")
311: .eq("id", data.user_id)
318: .from("customers")
319: .select("full_name, email, phone")
320: .eq("id", data.customer_id)
327: supabase.from("payments").select("*").eq("booking_id", id),
328: supabase.from("booking_add_ons").select("*, add_ons(name, description, daily_rate, one_time_fee)").eq("booking_id", id),
329: supabase.from("verification_requests").select("*").eq("booking_id", id),
330: supabase.from("inspection_metrics").select("*").eq("booking_id", id),
331: supabase.from("condition_photos").select("*").eq("booking_id", id),
332: supabase.from("audit_logs").select("*").eq("entity_type", "booking").eq("entity_id", id).order("created_at", { ascending: false }),
333: supabase.from("notification_logs").select("*").eq("booking_id", id).order("created_at", { ascending: false }),
334: supabase.from("booking_additional_drivers").select("*").eq("booking_id", id),
411: const { data, error } = await supabase.functions.invoke("update-booking-status", {
```

**Cache invalidation on success:**

- L423: `queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });`
- L424: `queryClient.invalidateQueries({ queryKey: ["booking"] });`
- L425: `queryClient.invalidateQueries({ queryKey: ["active-rental-detail"] });`
- L426: `queryClient.invalidateQueries({ queryKey: ["alerts"] });`
- L427: `queryClient.invalidateQueries({ queryKey: ["pending-alerts-count"] });`
- L428: `queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });`
- L429: `queryClient.invalidateQueries({ queryKey: ["ops-fleet-units"] });`
- L430: `queryClient.invalidateQueries({ queryKey: ["ops-pickups"] });`
- L431: `queryClient.invalidateQueries({ queryKey: ["ops-active-rentals"] });`
- L432: `queryClient.invalidateQueries({ queryKey: ["ops-returns"] });`

**Error handling:**

- L6: `import { extractEdgeFunctionError } from "@/lib/edge-function-error";`
- L138: `console.error("Error fetching bookings:", error);`
- L139: `throw error;`
- L295: `if (error) throw error;`
- L416: `const msg = await extractEdgeFunctionError(data, error);`
- L435: `onError: (error) => {`
- L436: `console.error("Failed to update booking:", error);`
- L437: `toast.error(error?.message || "Failed to update booking status");`

**Consumed by:** `src/components/admin/BookingOpsDrawer.tsx`, `src/components/admin/VehicleReadyGate.tsx`, `src/pages/admin/ActiveRentalDetail.tsx`, `src/pages/admin/BookingDetail.tsx`, `src/pages/admin/BookingOps.tsx`, `src/pages/admin/Bookings.tsx`, `src/pages/admin/Handovers.tsx`, `src/pages/admin/History.tsx`, `src/pages/admin/Overview.tsx`, `src/pages/admin/Pickups.tsx`, `src/pages/admin/ReturnOps.tsx`, `src/pages/booking/WalkaroundSign.tsx`, `src/pages/ops/OpsPickups.tsx`

### `src/hooks/use-browse-categories.ts`

**File header:** Browse Categories Hook Fetches categories with available vehicle counts for customer-facing pages PR7: Performance optimization - optimized stale time and query structure

**Exports:** `useBrowseCategories`

**Query keys:**

- L130: `queryKey: ["browse-categories", params?.locationId, params?.startAt?.toISOString(), params?.endAt?.toISOString()],`

**Cache / fetch settings:**

- L181: `staleTime: QUERY_STALE_TIMES.categories,`
- L182: `gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
134: .from("vehicle_categories")
135: .select("*")
136: .eq("is_active", true)
137: .order("name");
145: .from("vehicle_units")
146: .select(`
168: .from("bookings")
169: .select("assigned_unit_id")
171: .in("status", ["confirmed", "active"])
172: .or(`start_at.lte.${params.endAt.toISOString()},end_at.gte.${params.startAt.toISOString()}`);
```

**Consumed by:** `src/components/admin/WalkInBookingDialog.tsx`, `src/features/delivery/pages/WalkIn.tsx`, `src/hooks/use-vehicles.ts`, `src/lib/availability.ts`

### `src/hooks/use-calendar.ts`

**Exports:** `useCalendarData`

**Query keys:**

- L38: `queryKey: ["admin-calendar", weekOffset, locationId ?? "all"],`

**Cache / fetch settings:**

- L126: `staleTime: 30000,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
51: .from("vehicle_categories")
52: .select("id, name, image_url, daily_rate, seats, fuel_type, transmission")
53: .eq("is_active", true)
54: .order("name");
63: .from("bookings")
64: .select("id, booking_code, status, start_at, end_at, vehicle_id, user_id, customer_id")
67: .in("status", ["pending", "confirmed", "active", "completed"]);
68: if (locationId) bookingsQuery = bookingsQuery.eq("location_id", locationId);
79: ? await supabase.from("customers").select("id, full_name, email").in("id", customerIds)
86: ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
```

**Error handling:**

- L57: `console.error("Error fetching categories:", categoriesError);`
- L72: `console.error("Error fetching bookings:", bookingsError);`

**Return shape(s):** `{vehicles,
        bookings,
        weekStart,
        weekEnd,
        days,}`

**Consumed by:** `src/pages/admin/Calendar.tsx`

### `src/hooks/use-checkin.ts`

**File header:** Calculate timing status based on booking start time

**Exports:** `useCheckInRecord`, `useCreateOrUpdateCheckIn`, `useCompleteCheckIn`, `calculateTimingStatus`, `calculateAge`, `isLicenseExpired`, `isLicenseExpiredForRental`

**Query keys:**

- L48: `queryKey: ["checkin-record", bookingId],`
- L183: `queryClient.invalidateQueries({ queryKey: ["checkin-record", bookingId] });`
- L184: `queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });`
- L260: `queryClient.invalidateQueries({ queryKey: ["checkin-record", bookingId], refetchType: "active" });`
- L261: `queryClient.invalidateQueries({ queryKey: ["booking", bookingId], refetchType: "active" });`
- L262: `queryClient.invalidateQueries({ queryKey: ["admin-alerts"], refetchType: "active" });`

**Cache / fetch settings:**

- L85: `enabled: !!bookingId,`
- L86: `staleTime: 15000, // 15 seconds - operational data tier`
- L87: `gcTime: 60000,    // Keep cached for 1 minute`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
53: .from("checkin_records")
54: .select("*")
55: .eq("booking_id", bookingId)
149: .from("checkin_records")
150: .select("id")
151: .eq("booking_id", bookingId)
157: .from("checkin_records")
158: .update(dbData)
159: .eq("id", existing.id)
160: .select()
168: .from("checkin_records")
169: .insert(insertData as any)
170: .select()
219: .from("checkin_records")
220: .select("id")
221: .eq("booking_id", bookingId)
233: .from("checkin_records")
234: .update(updateData)
235: .eq("id", existing.id);
239: .from("checkin_records")
240: .insert([{ booking_id: bookingId, ...updateData }]);
252: supabase.functions.invoke("send-booking-notification", {
```

**Cache invalidation on success:**

- L183: `queryClient.invalidateQueries({ queryKey: ["checkin-record", bookingId] });`
- L184: `queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });`
- L260: `queryClient.invalidateQueries({ queryKey: ["checkin-record", bookingId], refetchType: "active" });`
- L261: `queryClient.invalidateQueries({ queryKey: ["booking", bookingId], refetchType: "active" });`
- L262: `queryClient.invalidateQueries({ queryKey: ["admin-alerts"], refetchType: "active" });`

**Error handling:**

- L58: `if (error) throw error;`
- L162: `if (error) throw error;`
- L172: `if (error) throw error;`
- L187: `onError: (error) => {`
- L188: `console.error("Check-in update failed:", error);`
- L189: `toast.error("Failed to update check-in");`
- L236: `if (error) throw error;`
- L241: `if (error) throw error;`
- L254: `}).catch(e => console.error("Failed to send check-in notification:", e));`
- L272: `onError: (error) => {`
- L273: `console.error("Check-in completion failed:", error);`
- L274: `toast.error("Failed to complete check-in");`

**Return shape(s):** `{status, blockedReason}`; `{status: "early", minutesDiff: Math.abs(diff)}`; `{status: "late", minutesDiff: diff}`; `{status: "on_time", minutesDiff: diff}`

**Consumed by:** `src/components/admin/BookingOpsDrawer.tsx`, `src/components/admin/CheckInSection.tsx`, `src/components/admin/ops/steps/StepCheckin.tsx`, `src/pages/admin/BookingOps.tsx`

### `src/hooks/use-claim-delivery.ts`

**Exports:** `useClaimDelivery`

**Query keys:**

- L20: `queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });`
- L21: `queryClient.invalidateQueries({ queryKey: ["delivery-detail"] });`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
10: const { data, error } = await supabase.functions.invoke("claim-delivery", {
```

**Cache invalidation on success:**

- L20: `queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });`
- L21: `queryClient.invalidateQueries({ queryKey: ["delivery-detail"] });`

**Error handling:**

- L14: `if (error) throw error;`
- L24: `onError: (error) => {`
- L25: `console.error("Failed to claim delivery:", error);`
- L26: `toast.error("Failed to claim delivery");`

**Consumed by:** **NOT CONSUMED ANYWHERE — dead code**

### `src/hooks/use-collected-revenue.ts`

**File header:** Shared Collected Revenue Hook Single source of truth for actual collected revenue. Only counts money from the payments table with status completed/captured.

**Exports:** `useCollectedRevenue`

**Query keys:**

- L27: `queryKey: ["collected-revenue", start, end, locationId ?? "all"],`

**Cache / fetch settings:**

- L83: `staleTime: 30_000,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
30: .from("payments")
31: .select("id, booking_id, amount, payment_type, payment_method, status, transaction_id, created_at")
40: .from("bookings")
41: .select("id")
42: .eq("location_id", locationId)
43: .in("id", bookingIds);
```

**Error handling:**

- L34: `if (error) throw error;`

**Return shape(s):** `{collected,
        pending,
        failed,
        completedCount,
        typeBreakdown: { rental, deposit, other}`; `{collected: data?.collected ?? 0,
    pending: data?.pending ?? 0,
    failed: data?.failed ?? 0,
    completedCount: data?.completedCount ?? 0,
    typeBreakdown: data?.typeBreakdown ?? { rental: 0, d}`

**Consumed by:** `src/components/admin/analytics/RevenueAnalyticsTab.tsx`, `src/pages/admin/Reports.tsx`

### `src/hooks/use-competitor-pricing.ts`

**File header:** Competitor Pricing Hook Manages competitor pricing data for internal reference

**Exports:** `useCompetitorPricing`, `useUpsertCompetitorPricing`, `useDeleteCompetitorPricing`

**Query keys:**

- L23: `queryKey: ["competitor-pricing", vehicleId],`
- L93: `queryClient.invalidateQueries({ queryKey: ["competitor-pricing"] });`
- L114: `queryClient.invalidateQueries({ queryKey: ["competitor-pricing"] });`

**Cache / fetch settings:**

- L49: `enabled: true,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
26: .from("competitor_pricing")
27: .select("*")
28: .order("competitor_name");
31: query = query.eq("vehicle_id", vehicleId);
81: .from("competitor_pricing")
82: .update(payload)
83: .eq("id", pricing.id);
87: .from("competitor_pricing")
88: .insert(payload);
108: .from("competitor_pricing")
109: .delete()
110: .eq("id", id);
```

**Cache invalidation on success:**

- L93: `queryClient.invalidateQueries({ queryKey: ["competitor-pricing"] });`
- L114: `queryClient.invalidateQueries({ queryKey: ["competitor-pricing"] });`

**Error handling:**

- L35: `if (error) throw error;`
- L84: `if (error) throw error;`
- L89: `if (error) throw error;`
- L94: `toast({ title: "Competitor pricing saved" });`
- L96: `onError: (error) => {`
- L97: `toast({ title: "Failed to save", description: error.message, variant: "destructive" });`
- L111: `if (error) throw error;`
- L115: `toast({ title: "Competitor pricing deleted" });`
- L117: `onError: (error) => {`
- L118: `toast({ title: "Failed to delete", description: error.message, variant: "destructive" });`

**Consumed by:** `src/components/admin/fleet/CompetitorPricingTab.tsx`

### `src/hooks/use-condition-photos.ts`

**Exports:** `useBookingConditionPhotos`, `useUploadConditionPhoto`, `useBatchUploadPhotos`, `getPhotoCompletionStatus`

**Query keys:**

- L51: `queryKey: ['condition-photos', bookingId],`
- L151: `queryClient.invalidateQueries({ queryKey: ['condition-photos'], refetchType: "active" });`
- L201: `queryClient.invalidateQueries({ queryKey: ['condition-photos'] });`

**Cache / fetch settings:**

- L69: `enabled: !!bookingId,`
- L70: `staleTime: 15000, // 15 seconds - operational data tier`
- L71: `gcTime: 60000,    // Keep cached for 1 minute`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
56: .from('condition_photos')
57: .select('*')
58: .eq('booking_id', bookingId)
59: .order('captured_at', { ascending: true });
102: .from('condition-photos')
112: .from('condition_photos')
113: .select('id')
114: .eq('booking_id', bookingId)
115: .eq('phase', phase)
116: .eq('photo_type', photoType)
122: .from('condition_photos')
123: .update({
128: .eq('id', existing.id);
134: .from('condition_photos')
135: .insert({
```

**Cache invalidation on success:**

- L151: `queryClient.invalidateQueries({ queryKey: ['condition-photos'], refetchType: "active" });`
- L201: `queryClient.invalidateQueries({ queryKey: ['condition-photos'] });`

**Error handling:**

- L61: `if (error) throw error;`
- L153: `onError: (error: Error) => {`
- L154: `toast({`
- L189: `toast({`
- L195: `toast({`

**Return shape(s):** `{pickup: [], return: []}`; `{pickup: photos.filter(p => p.phase === 'pickup'),
        return: photos.filter(p => p.phase === 'return'),}`; `{fileName, photoType}`; `{uploadMultiple: async (
      bookingId: string,
      phase: PhotoPhase,
      files: Array<{ photoType: PhotoType; file: File}`

**Consumed by:** `src/components/admin/BookingOpsDrawer.tsx`, `src/components/admin/PreInspectionPhotos.tsx`, `src/components/admin/WalkaroundInspection.tsx`, `src/components/admin/ops/steps/StepPhotos.tsx`, `src/components/admin/ops/steps/StepWalkaround.tsx`, `src/components/admin/return-ops/steps/StepReturnEvidence.tsx`, `src/components/booking/ConditionPhotosUpload.tsx`, `src/pages/admin/BookingDetail.tsx`, `src/pages/admin/BookingOps.tsx`, `src/pages/admin/ReturnOps.tsx`, `src/pages/booking/WalkaroundSign.tsx`

### `src/hooks/use-damages.ts`

**File header:** Recommended withholding amount based on damage severity

**Exports:** `useDamageReports`, `useDamageById`, `useUpdateDamage`, `useCreateDamage`

**Query keys:**

- L55: `queryKey: ["admin-damages", filters],`
- L145: `queryKey: ["admin-damage", id],`
- L226: `queryClient.invalidateQueries({ queryKey: ["admin-damages"] });`
- L227: `queryClient.invalidateQueries({ queryKey: ["admin-damage"] });`
- L397: `queryClient.invalidateQueries({ queryKey: ["admin-damages"] });`
- L398: `queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });`
- L399: `queryClient.invalidateQueries({ queryKey: ["deposit-ledger"] });`
- L400: `queryClient.invalidateQueries({ queryKey: ["booking"] });`

**Cache / fetch settings:**

- L139: `staleTime: 30000,`
- L173: `enabled: !!id,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
58: .from("damage_reports")
59: .select(`
64: .order("created_at", { ascending: false });
67: query = query.eq("severity", filters.severity);
71: query = query.eq("status", filters.status);
75: query = query.eq("vehicle_id", filters.vehicleId);
78: const { data, error } = await query.limit(100);
100: .from("profiles")
101: .select("id, full_name, email")
102: .in("id", reporterIds);
150: .from("damage_reports")
151: .select(`
156: .eq("id", id)
164: .from("condition_photos")
165: .select("*")
166: .eq("booking_id", data.booking_id);
209: .from("damage_reports")
210: .update(updateData)
211: .eq("id", damageId)
212: .select()
269: .from("bookings")
270: .select("booking_code, deposit_status, deposit_amount, status, return_state")
271: .eq("id", damageData.bookingId)
280: .from("vehicle_categories")
281: .select("name")
282: .eq("id", damageData.vehicleId)
289: .from("vehicles")
290: .select("make, model, year")
291: .eq("id", damageData.vehicleId)
302: .from("bookings")
303: .select("assigned_unit_id")
304: .eq("id", damageData.bookingId)
311: .from("damage_reports")
312: .insert([{
324: .select()
342: .from("bookings")
343: .update({
348: .eq("id", damageData.bookingId);
354: await supabase.from("deposit_ledger").insert({
366: await supabase.from("admin_alerts").insert([{
```

**Cache invalidation on success:**

- L226: `queryClient.invalidateQueries({ queryKey: ["admin-damages"] });`
- L227: `queryClient.invalidateQueries({ queryKey: ["admin-damage"] });`
- L397: `queryClient.invalidateQueries({ queryKey: ["admin-damages"] });`
- L398: `queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });`
- L399: `queryClient.invalidateQueries({ queryKey: ["deposit-ledger"] });`
- L400: `queryClient.invalidateQueries({ queryKey: ["booking"] });`

**Error handling:**

- L81: `console.error("Error fetching damage reports:", error);`
- L82: `throw error;`
- L159: `if (error) throw error;`
- L215: `if (error) throw error;`
- L230: `onError: (error) => {`
- L231: `console.error("Failed to update damage:", error);`
- L232: `toast.error("Failed to update damage report");`
- L327: `if (error) throw error;`
- L381: `}).catch(console.error);`
- L410: `onError: (error) => {`
- L411: `console.error("Failed to create damage:", error);`
- L412: `toast.error("Failed to create damage report");`

**Return shape(s):** `{...data,
        photos: photosData || [],}`; `{...data, 
        depositHeld: isInReturnFlow && hasDeposit,
        exceptionFlagged: isInReturnFlow,}`

**Consumed by:** `src/components/admin/DamageReportDialog.tsx`, `src/pages/admin/Damages.tsx`, `src/pages/admin/Incidents.tsx`

### `src/hooks/use-delivery-access.ts`

**File header:** Check if current user has driver access (driver, staff, or admin role)

**Exports:** `useIsDriverOrAbove`, `useIsDriverOnly`

**Query keys:**

- L12: `queryKey: ["user-is-driver", user?.id],`
- L41: `queryKey: ["user-is-driver-only", user?.id],`

**Cache / fetch settings:**

- L29: `enabled: !!user,`
- L30: `staleTime: 60000,`
- L63: `enabled: !!user,`
- L64: `staleTime: 60000,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
17: .from("user_roles")
18: .select("role")
19: .eq("user_id", user.id)
20: .in("role", ["super_admin", "manager", "admin", "staff", "driver"]);
46: .from("user_roles")
47: .select("role")
48: .eq("user_id", user.id);
```

**Error handling:**

- L23: `console.error("Error checking driver status:", error);`
- L51: `console.error("Error checking driver status:", error);`

**Consumed by:** `src/components/delivery/DeliveryProtectedRoute.tsx`

### `src/hooks/use-delivery-task.ts`

**File header:** Hook to manage delivery_tasks for "Bring Car to Me" flow. Tracks the full lifecycle: Intake → Payment → ReadyLine → Dispatch → Execution → Activation

**Exports:** `useDeliveryTask`, `useCreateDeliveryTask`, `useUpdateDeliveryTask`, `useCompleteDeliveryStage`, `useLockPricing`, `useOpsBackupActivation`

**Query keys:**

- L89: `queryKey: ["delivery-task", bookingId],`
- L142: `queryClient.invalidateQueries({ queryKey: ["delivery-task", bookingId] });`
- L208: `queryClient.invalidateQueries({ queryKey: ["delivery-task", task.bookingId] });`
- L209: `queryClient.invalidateQueries({ queryKey: ["booking-activity-timeline", task.bookingId] });`
- L314: `queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });`
- L386: `queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });`
- L387: `queryClient.invalidateQueries({ queryKey: ["delivery-task", bookingId] });`
- L388: `queryClient.invalidateQueries({ queryKey: ["booking-activity-timeline", bookingId] });`

**Cache / fetch settings:**

- L104: `enabled: !!bookingId,`
- L105: `staleTime: 10_000,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
93: .from("delivery_tasks")
94: .select("*")
95: .eq("booking_id", bookingId)
119: .from("delivery_tasks")
120: .upsert({
124: .select()
131: await supabase.from("audit_logs").insert({
170: .from("delivery_tasks")
171: .update(updates)
172: .eq("booking_id", bookingId)
173: .select()
179: .from("delivery_tasks")
180: .upsert({
185: .select()
196: await supabase.from("audit_logs").insert({
267: .from("bookings")
268: .select(`
273: .eq("id", bookingId)
292: .from("bookings")
293: .update({
298: .eq("id", bookingId);
303: await supabase.from("audit_logs").insert({
345: const { data: efResult, error: efError } = await supabase.functions.invoke(
361: .from("delivery_tasks")
362: .upsert({
372: await supabase.from("audit_logs").insert({
```

**Cache invalidation on success:**

- L142: `queryClient.invalidateQueries({ queryKey: ["delivery-task", bookingId] });`
- L208: `queryClient.invalidateQueries({ queryKey: ["delivery-task", task.bookingId] });`
- L209: `queryClient.invalidateQueries({ queryKey: ["booking-activity-timeline", task.bookingId] });`
- L314: `queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });`
- L386: `queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });`
- L387: `queryClient.invalidateQueries({ queryKey: ["delivery-task", bookingId] });`
- L388: `queryClient.invalidateQueries({ queryKey: ["booking-activity-timeline", bookingId] });`

**Error handling:**

- L99: `console.error("Error fetching delivery task:", error);`
- L127: `if (error) throw error;`
- L145: `onError: () => {`
- L146: `toast.error("Failed to create delivery task. Please try again.");`
- L191: `if (error) throw error;`
- L211: `onError: () => {`
- L212: `toast.error("Failed to update delivery task. Please try again.");`
- L300: `if (error) throw error;`
- L317: `onError: () => {`
- L318: `toast.error("Failed to lock pricing. Please try again.");`
- L391: `onError: () => {`
- L392: `toast.error("Activation failed. Please check all prerequisites and try again.");`

**Return shape(s):** `{completeStage, isPending: updateTask.isPending}`; `{success: true}`

**Consumed by:** `src/components/admin/ops/OpsStepContent.tsx`, `src/components/admin/ops/steps/OpsBackupActivation.tsx`, `src/components/admin/ops/steps/StepDispatch.tsx`, `src/components/admin/ops/steps/StepIntake.tsx`, `src/components/admin/ops/steps/StepReadyLine.tsx`

### `src/hooks/use-demand-forecasting.ts`

**File header:** Demand Forecasting Hook Rental frequency analysis by location, category, and time period

**Exports:** `useDemandForecasting`

**Query keys:**

- L40: `queryKey: ["demand-forecasting", months],`
- L56: `queryKey: ["demand-locations"],`
- L66: `queryKey: ["demand-categories"],`

**Cache / fetch settings:**

- L52: `staleTime: 300000,`
- L62: `staleTime: 600000,`
- L72: `staleTime: 600000,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
43: .from("bookings")
44: .select("id, start_at, end_at, total_days, daily_rate, total_amount, location_id, vehicle_id, status")
47: .in("status", ["confirmed", "active", "completed"]);
58: const { data, error } = await supabase.from("locations").select("id, name").eq("is_active", true);
68: const { data, error } = await supabase.from("vehicle_categories").select("id, name").eq("is_active", true);
```

**Error handling:**

- L49: `if (error) throw error;`
- L59: `if (error) throw error;`
- L69: `if (error) throw error;`

**Return shape(s):** `{locationId: loc.id,
        locationName: loc.name,
        totalBookings: locBookings.length,
        avgDailyRate: locBookings.length > 0
          ? locBookings.reduce((s, b) => s + b.daily_rate, 0}`; `{categoryId: cat.id,
        categoryName: cat.name,
        totalBookings: catBookings.length,
        avgDuration: catBookings.length > 0
          ? catBookings.reduce((s, b) => s + b.total_days, 0)}`; `{month: format(m, "MMM yy"),
        bookings: monthBookings.length,
        revenue: monthBookings.reduce((s, b) => s + b.total_amount, 0),}`; `{dayOfWeekHeatmap,
      monthlyHeatmap,
      locationDemand,
      categoryDemand,
      seasonalTrend,
      totalBookings: bookings.length,}`

**Consumed by:** `src/components/admin/DemandForecastingTab.tsx`

### `src/hooks/use-deposit-hold.ts`

**File header:** Deposit Hold Hooks (Simplified) Kept only useCloseAccount which is still used. All deposit hold lifecycle hooks removed.

**Exports:** `useCloseAccount`

**Query keys:**

- L42: `queryClient.invalidateQueries({ queryKey: ["booking", variables.bookingId] });`
- L43: `queryClient.invalidateQueries({ queryKey: ["final-invoice", variables.bookingId] });`
- L44: `queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
32: const { data, error } = await supabase.functions.invoke("close-account", {
```

**Cache invalidation on success:**

- L42: `queryClient.invalidateQueries({ queryKey: ["booking", variables.bookingId] });`
- L43: `queryClient.invalidateQueries({ queryKey: ["final-invoice", variables.bookingId] });`
- L44: `queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });`

**Error handling:**

- L48: `onError: (error: Error) => {`
- L49: `toast.error("Failed to close account: " + error.message);`

**Consumed by:** `src/components/admin/deposit/AccountCloseoutPanel.tsx`, `src/pages/admin/ReturnOps.tsx`

### `src/hooks/use-deposit-ledger.ts`

**Exports:** `useDepositLedger`, `useAddDepositLedgerEntry`

**Query keys:**

- L31: `queryKey: ['deposit-ledger', bookingId],`
- L150: `queryClient.invalidateQueries({ queryKey: ['deposit-ledger', variables.bookingId] });`
- L151: `queryClient.invalidateQueries({ queryKey: ['payment-deposit-status', variables.bookingId] });`

**Cache / fetch settings:**

- L113: `enabled: !!bookingId,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
37: .from('bookings')
38: .select('deposit_amount')
39: .eq('id', bookingId)
48: .from('deposit_ledger')
49: .select('*')
50: .eq('booking_id', bookingId)
51: .order('created_at', { ascending: true });
58: .from('profiles')
59: .select('id, full_name, email')
60: .in('id', creatorIds);
134: .from('deposit_ledger')
135: .insert({
143: .select()
```

**Cache invalidation on success:**

- L150: `queryClient.invalidateQueries({ queryKey: ['deposit-ledger', variables.bookingId] });`
- L151: `queryClient.invalidateQueries({ queryKey: ['payment-deposit-status', variables.bookingId] });`

**Error handling:**

- L146: `if (error) throw error;`
- L160: `onError: (error: Error) => {`
- L161: `toast.error('Failed to update deposit: ' + error.message);`

**Return shape(s):** `{status,
        required,
        held,
        released,
        deducted,
        remaining,
        entries: formattedEntries,}`

**Consumed by:** `src/components/admin/DepositLedgerPanel.tsx`

### `src/hooks/use-dispatch-readiness.ts`

**File header:** Dispatch Readiness Hook Provides dispatch readiness status for delivery bookings

**Exports:** `useDispatchReadiness`, `useBatchDispatchReadiness`

**Query keys:**

- L22: `queryKey: ["dispatch-readiness", bookingId],`
- L81: `queryKey: ["batch-dispatch-readiness", bookingIds],`

**Cache / fetch settings:**

- L71: `enabled: enabled && !!bookingId,`
- L72: `staleTime: 10000, // 10 seconds`
- L124: `enabled: bookingIds.length > 0,`
- L125: `staleTime: 10000,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
38: .from("bookings")
39: .select("id, deposit_status, assigned_unit_id, wl_transaction_id")
40: .eq("id", bookingId)
57: .from("condition_photos")
58: .select("id", { count: "exact", head: true })
59: .eq("booking_id", bookingId)
60: .eq("phase", "pickup");
89: .from("bookings")
90: .select("id, deposit_status, assigned_unit_id, wl_transaction_id")
91: .in("id", bookingIds);
95: .from("condition_photos")
96: .select("booking_id")
97: .in("booking_id", bookingIds)
98: .eq("phase", "pickup");
```

**Return shape(s):** `{isReady: false,
          requirements: {
            paymentHoldAuthorized: false,
            unitAssigned: false,
            prepPhotosComplete: false,}`; `{isReady: false,
          requirements: {
            paymentHoldAuthorized: false,
            unitAssigned: false,
            prepPhotosComplete: false,}`

**Consumed by:** **NOT CONSUMED ANYWHERE — dead code**

### `src/hooks/use-driver-fee-settings.ts`

**File header:** Hook to fetch additional driver and young driver fee settings from system_settings. These fees are admin-configurable and used across the customer booking funnel. Key priority: new spec keys → old keys → hardcoded defaults.

**Exports:** `useDriverFeeSettings`

**Query keys:**

- L29: `queryKey: ["driver-fee-settings"],`

**Cache / fetch settings:**

- L58: `staleTime: 30_000,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
32: .from("system_settings" as any)
33: .select("key, value")
34: .in("key", ALL_KEYS);
```

**Consumed by:** `src/components/admin/AddOnsPricingPanel.tsx`, `src/components/admin/ops/FinancialBreakdown.tsx`, `src/components/rental/AdditionalDriversCard.tsx`, `src/components/rental/BookingSummaryPanel.tsx`, `src/pages/AddOns.tsx`, `src/pages/NewCheckout.tsx`

### `src/hooks/use-duplicate-bookings.ts`

**File header:** Detects other bookings for the same customer + vehicle with overlapping dates that already have a completed Worldline rental authorization. Used by the Ops Payment screen to warn staff before they take a second card payment from a customer who has already paid on a parallel duplicate booking.

**Exports:** `useDuplicateBookings`

**Query keys:**

- L24: `queryKey: ["duplicate-bookings", bookingId],`

**Cache / fetch settings:**

- L25: `enabled: !!bookingId,`
- L26: `staleTime: 30_000,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
29: .from("bookings")
30: .select("user_id, vehicle_id, start_at, end_at")
31: .eq("id", bookingId!)
36: .from("bookings")
37: .select("id, booking_code, status, start_at, end_at, total_amount, wl_auth_status, created_at")
38: .eq("user_id", current.user_id)
39: .eq("vehicle_id", current.vehicle_id)
41: .in("status", ["draft", "pending", "confirmed", "active", "completed"])
44: .order("created_at", { ascending: false })
45: .limit(5);
```

**Consumed by:** `src/components/admin/ops/steps/StepPayment.tsx`

### `src/hooks/use-fleet-analytics-enhanced.ts`

**File header:** Enhanced Fleet Analytics Hook Adds fuel type, vendor, and lifecycle data for performance comparison

**Exports:** `useFleetAnalyticsEnhanced`

**Query keys:**

- L47: `queryKey: ["fleet-analytics-enhanced", filters],`

**Cache / fetch settings:**

- L140: `enabled: options?.enabled ?? true,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
50: .from("vehicle_units")
51: .select(`
64: .from("bookings")
65: .select("vehicle_id, assigned_unit_id, total_amount, total_days, status")
66: .in("status", REVENUE_STATUSES)
70: bookingsQuery = bookingsQuery.eq("location_id", filters.locationId);
82: .from("vehicle_expenses")
83: .select("vehicle_unit_id, amount");
```

**Consumed by:** `src/components/admin/fleet/PerformanceComparisonTab.tsx`

### `src/hooks/use-fleet-analytics.ts`

**File header:** Fleet Analytics Hook Provides utilization, cost, and profitability data for vehicle units (VINs) Tracks analytics per VIN using vehicle_units table only

**Exports:** `useFleetAnalytics`, `useFleetSummary`, `useVehiclePerformanceComparison`

**Query keys:**

- L57: `queryKey: ["fleet-analytics", filters],`
- L160: `queryKey: ["fleet-total-revenue", filters],`
- L185: `queryKey: ["fleet-active-booking-count", filters?.locationId ?? "all"],`

**Cache / fetch settings:**

- L147: `enabled: options?.enabled ?? true,`
- L181: `enabled: options?.enabled ?? true,`
- L201: `enabled: options?.enabled ?? true,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
60: .from("vehicle_units")
61: .select(`
74: .from("bookings")
75: .select("vehicle_id, assigned_unit_id, total_amount, total_days, status")
76: .in("status", REVENUE_STATUSES)
80: bookingsQuery = bookingsQuery.eq("location_id", filters.locationId);
92: .from("vehicle_expenses")
93: .select("vehicle_unit_id, amount");
163: .from("bookings")
164: .select("total_amount")
165: .in("status", REVENUE_STATUSES);
168: query = query.eq("location_id", filters.locationId);
188: .from("bookings")
189: .select("id", { count: "exact", head: true })
190: .eq("status", "active")
194: countQuery = countQuery.eq("location_id", filters.locationId);
```

**Error handling:**

- L178: `if (error) throw error;`
- L198: `if (error) throw error;`

**Return shape(s):** `{summary, isLoading}`; `{comparison}`

**Consumed by:** `src/components/admin/fleet/CostTrackingTab.tsx`, `src/components/admin/fleet/FleetOverviewTab.tsx`, `src/components/admin/fleet/UtilizationTab.tsx`

### `src/hooks/use-fleet-categories.ts`

**File header:** Fleet Categories Hook - NEW VIN Pool System Single source of truth for category + VIN management

**Exports:** `useFleetCategories`, `useAvailableCategories`, `useCategoryVins`, `useCreateFleetCategory`, `useUpdateFleetCategory`, `useDeleteFleetCategory`, `useAddVinToCategory`, `useUpdateVinStatus`, `useDeleteVin`, `useAssignVinToBooking`, `useReleaseVinFromBooking`

**Query keys:**

- L71: `queryKey: ["fleet-categories", locationId ?? "all"],`
- L148: `queryKey: ["available-categories", locationId, startIso, endIso],`
- L179: `queryKey: ["category-vins", categoryId, locationId ?? "all"],`
- L251: `queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });`
- L252: `queryClient.invalidateQueries({ queryKey: ["available-categories"] });`
- L278: `queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });`
- L279: `queryClient.invalidateQueries({ queryKey: ["available-categories"] });`
- L308: `queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });`
- L309: `queryClient.invalidateQueries({ queryKey: ["category-vins"] });`
- L383: `queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });`
- L384: `queryClient.invalidateQueries({ queryKey: ["category-vins"] });`
- L385: `queryClient.invalidateQueries({ queryKey: ["available-categories"] });`
- L408: `queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });`
- L409: `queryClient.invalidateQueries({ queryKey: ["category-vins"] });`
- L410: `queryClient.invalidateQueries({ queryKey: ["available-categories"] });`
- L462: `queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });`
- L463: `queryClient.invalidateQueries({ queryKey: ["category-vins"] });`
- L464: `queryClient.invalidateQueries({ queryKey: ["available-categories"] });`
- L498: `queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });`
- L499: `queryClient.invalidateQueries({ queryKey: ["category-vins"] });`
- L500: `queryClient.invalidateQueries({ queryKey: ["available-categories"] });`
- L501: `queryClient.invalidateQueries({ queryKey: ["booking"] });`
- L528: `queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });`
- L529: `queryClient.invalidateQueries({ queryKey: ["category-vins"] });`
- L530: `queryClient.invalidateQueries({ queryKey: ["available-categories"] });`
- L531: `queryClient.invalidateQueries({ queryKey: ["booking"] });`

**Cache / fetch settings:**

- L70: `enabled: options?.enabled ?? true,`
- L169: `enabled: !!locationId && !!startIso && !!endIso,`
- L170: `staleTime: 0,`
- L171: `gcTime: 30 * 1000,`
- L172: `refetchOnWindowFocus: true,`
- L222: `enabled: !!categoryId,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
74: .from("vehicle_categories")
75: .select("*")
76: .order("sort_order", { ascending: true })
77: .order("name");
83: .from("vehicle_units")
84: .select("id, category_id, status")
90: unitsQuery = unitsQuery.eq("location_id", locationId);
97: .from("bookings")
98: .select("assigned_unit_id")
99: .eq("status", "active")
152: const { data, error } = await supabase.rpc("get_category_availability", {
185: .from("vehicle_units")
186: .select(`
191: .eq("category_id", categoryId)
194: .order("status")
195: .order("vin");
198: unitsQuery = unitsQuery.eq("location_id", locationId);
233: .from("vehicle_categories")
234: .insert({
244: .select()
268: .from("vehicle_categories")
269: .update(updates)
270: .eq("id", id)
271: .select()
296: .from("vehicle_units")
297: .update({ category_id: null })
298: .eq("category_id", categoryId);
301: .from("vehicle_categories")
302: .delete()
303: .eq("id", categoryId);
326: .from("vehicle_units")
327: .select("id")
328: .eq("vin", input.vin.toUpperCase())
341: .from("vehicle_categories")
342: .select("name, daily_rate")
343: .eq("id", categoryId)
349: .from("vehicles")
350: .insert({
358: .select()
365: .from("vehicle_units")
366: .insert({
376: .select()
401: .from("vehicle_units")
402: .update({ status, notes: notes || null, updated_at: new Date().toISOString() })
403: .eq("id", id);
427: .from("bookings")
428: .select("booking_code, status")
429: .eq("assigned_unit_id", vinId)
430: .in("status", ["pending", "confirmed", "active"]);
440: const { error } = await supabase.from("vehicle_units").delete().eq("id", vinId);
447: .from("vehicle_units")
448: .update({
454: .eq("id", vinId);
488: .rpc("assign_vin_to_booking", {
520: .rpc("release_vin_from_booking", {
```

**Cache invalidation on success:**

- L251: `queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });`
- L252: `queryClient.invalidateQueries({ queryKey: ["available-categories"] });`
- L278: `queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });`
- L279: `queryClient.invalidateQueries({ queryKey: ["available-categories"] });`
- L308: `queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });`
- L309: `queryClient.invalidateQueries({ queryKey: ["category-vins"] });`
- L383: `queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });`
- L384: `queryClient.invalidateQueries({ queryKey: ["category-vins"] });`
- L385: `queryClient.invalidateQueries({ queryKey: ["available-categories"] });`
- L408: `queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });`
- L409: `queryClient.invalidateQueries({ queryKey: ["category-vins"] });`
- L410: `queryClient.invalidateQueries({ queryKey: ["available-categories"] });`
- L462: `queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });`
- L463: `queryClient.invalidateQueries({ queryKey: ["category-vins"] });`
- L464: `queryClient.invalidateQueries({ queryKey: ["available-categories"] });`
- L498: `queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });`
- L499: `queryClient.invalidateQueries({ queryKey: ["category-vins"] });`
- L500: `queryClient.invalidateQueries({ queryKey: ["available-categories"] });`
- L501: `queryClient.invalidateQueries({ queryKey: ["booking"] });`
- L528: `queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });`
- L529: `queryClient.invalidateQueries({ queryKey: ["category-vins"] });`
- L530: `queryClient.invalidateQueries({ queryKey: ["available-categories"] });`
- L531: `queryClient.invalidateQueries({ queryKey: ["booking"] });`

**Error handling:**

- L79: `if (error) throw error;`
- L160: `if (error) throw error;`
- L203: `if (error) throw error;`
- L247: `if (error) throw error;`
- L255: `onError: (error: Error) => {`
- L256: `toast.error("Failed to create category: " + error.message);`
- L274: `if (error) throw error;`
- L282: `onError: (error: Error) => {`
- L283: `toast.error("Failed to update category: " + error.message);`
- L305: `if (error) throw error;`
- L312: `onError: (error: Error) => {`
- L313: `toast.error("Failed to delete category: " + error.message);`
- L379: `if (error) throw error;`
- L388: `onError: (error: Error) => {`
- L389: `toast.error("Failed to add vehicle: " + error.message);`
- L405: `if (error) throw error;`
- L413: `onError: (error: Error) => {`
- L414: `toast.error("Failed to update status: " + error.message);`
- L459: `throw error;`
- L471: `onError: (error: Error) => {`

**Return shape(s):** `{archived: false}`; `{archived: true}`

**Consumed by:** `src/components/admin/analytics/RevenueAnalyticsTab.tsx`, `src/components/admin/fleet/AllVehiclesTable.tsx`, `src/components/admin/fleet/CategoryEditDialog.tsx`, `src/components/admin/fleet/CategoryFormDialog.tsx`, `src/components/admin/fleet/TemporaryVehiclesTable.tsx`, `src/components/admin/fleet/VehicleUnitEditDialog.tsx`, `src/components/admin/fleet/VinFormDialog.tsx`, `src/components/landing/FleetRow.tsx`, `src/hooks/use-vehicles.ts`, `src/pages/Abbotsford.tsx`, `src/pages/Search.tsx`, `src/pages/admin/CategoryDetail.tsx`, `src/pages/admin/FleetManagement.tsx`

### `src/hooks/use-fleet-cost-analysis.ts`

**File header:** Fleet Cost Analysis Hook Calculates net profit per VIN and category with complete metrics

**Exports:** `useFleetCostAnalysisByVehicle`, `useFleetCostAnalysisByCategory`, `useVehicleUnitCostTimeline`

**Query keys:**

- L77: `queryKey: ["fleet-cost-analysis", "by-vehicle", filters],`
- L263: `queryKey: ["fleet-cost-analysis", "by-category", filters, vehicleMetrics],`
- L316: `queryKey: ["vehicle-cost-timeline", vehicleUnitId],`

**Cache / fetch settings:**

- L251: `staleTime: 60000, // Cache for 1 minute`
- L252: `enabled: options?.enabled ?? true,`
- L310: `enabled: (options?.enabled ?? true) && !!vehicleMetrics,`
- L404: `enabled: !!vehicleUnitId,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
81: .from("vehicle_units")
82: .select(`
92: unitsQuery = unitsQuery.eq("category_id", filters.categoryId);
95: unitsQuery = unitsQuery.eq("status", filters.status);
111: .from("bookings")
112: .select("assigned_unit_id, vehicle_id, total_amount, subtotal, total_days, status, start_at, end_at")
113: .in("status", ["completed", "active"]);
116: bookingsQuery = bookingsQuery.eq("location_id", filters.locationId);
129: .from("damage_reports")
130: .select("vehicle_unit_id, estimated_cost");
136: .from("maintenance_logs")
137: .select("vehicle_unit_id, cost, service_date");
150: .from("vehicle_expenses")
151: .select("vehicle_unit_id, amount, expense_date");
267: .from("vehicle_categories")
268: .select("id, name, description")
269: .order("name");
323: .from("bookings")
324: .select("id, booking_code, total_amount, start_at, end_at, status")
325: .eq("assigned_unit_id", vehicleUnitId)
326: .order("start_at", { ascending: false }),
328: .from("damage_reports")
329: .select("id, description, estimated_cost, created_at, status")
330: .eq("vehicle_unit_id", vehicleUnitId)
331: .order("created_at", { ascending: false }),
333: .from("maintenance_logs")
334: .select("id, maintenance_type, description, cost, service_date")
335: .eq("vehicle_unit_id", vehicleUnitId)
336: .order("service_date", { ascending: false }),
338: .from("vehicle_expenses")
339: .select("id, expense_type, description, amount, expense_date")
340: .eq("vehicle_unit_id", vehicleUnitId)
341: .order("expense_date", { ascending: false }),
```

**Error handling:**

- L271: `if (error) throw error;`

**Consumed by:** `src/components/admin/fleet/ByCategoryTab.tsx`, `src/pages/admin/CategoryDetail.tsx`, `src/pages/admin/VehicleUnitDetail.tsx`

### `src/hooks/use-fleet-cost-enhanced.ts`

**File header:** Enhanced Fleet Cost Analysis Hook Adds fuel type, vendor info, and lifecycle data to vehicle metrics

**Exports:** `useFleetCostAnalysisEnhanced`

**Query keys:**

- L76: `queryKey: ["fleet-cost-analysis-enhanced", filters],`

**Cache / fetch settings:**

- L296: `staleTime: 60000,`
- L297: `enabled: options?.enabled ?? true,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
80: .from("vehicle_units")
81: .select(`
91: unitsQuery = unitsQuery.eq("category_id", filters.categoryId);
94: unitsQuery = unitsQuery.eq("status", filters.status);
107: .from("bookings")
108: .select("assigned_unit_id, vehicle_id, total_amount, subtotal, total_days, status, start_at, end_at")
109: .in("status", ["completed", "active"]);
112: bookingsQuery = bookingsQuery.eq("location_id", filters.locationId);
125: .from("damage_reports")
126: .select("vehicle_unit_id, estimated_cost");
130: .from("maintenance_logs")
131: .select("vehicle_unit_id, cost, service_date");
144: .from("vehicle_expenses")
145: .select("vehicle_unit_id, amount, expense_date");
```

**Consumed by:** `src/components/admin/fleet/ByVehicleTab.tsx`, `src/pages/admin/FleetCosts.tsx`

### `src/hooks/use-fuel-shortage.ts`

**File header:** Fuel Shortage Hook Calculates fuel shortage charge by comparing pickup and return fuel levels

**Exports:** `useFuelShortage`, `recordFuelShortageCharge`

**Query keys:**

- L22: `queryKey: ["fuel-shortage", bookingId],`

**Cache / fetch settings:**

- L87: `enabled: enabled && !!bookingId,`
- L88: `staleTime: 30000,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
28: .from("bookings")
29: .select("assigned_unit_id, vehicle_id")
30: .eq("id", bookingId)
38: .from("vehicle_units")
39: .select("tank_capacity_liters, category_id")
40: .eq("id", booking.assigned_unit_id)
47: .from("vehicle_categories")
48: .select("name")
49: .eq("id", unit.category_id)
66: .from("inspection_metrics")
67: .select("phase, fuel_level")
68: .eq("booking_id", bookingId)
69: .in("phase", ["pickup", "return"]);
101: await supabase.from("deposit_ledger").insert({
111: await supabase.from("audit_logs").insert({
```

**Return shape(s):** `{...shortage,
        tankCapacity,}`

**Consumed by:** **NOT CONSUMED ANYWHERE — dead code**

### `src/hooks/use-global-realtime.ts`

**File header:** Global Realtime Subscriptions A single Supabase channel that listens to ALL operationally-critical tables and invalidates the relevant React Query caches so every panel (Admin, Ops, Delivery, Support) refreshes automatically when data changes. Each shell component calls the hook once — the hook is idempotent per React component lifecycle (one channel per mount).

**Exports:** `useGlobalRealtime`

**Query keys:**

- L29: `keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));`

**Supabase statements:** none (pure computation or context hook)

**Cache invalidation on success:**

- L29: `keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));`

**Error handling:**

- L142: `const notify = t.is_urgent || t.priority === "high" ? toast.error : toast.info;`

**Consumed by:** `src/components/delivery/DeliveryShell.tsx`, `src/components/layout/AdminShell.tsx`, `src/components/layout/SupportShell.tsx`, `src/components/ops/OpsShell.tsx`

### `src/hooks/use-handovers.ts`

**Exports:** `useHandovers`

**Query keys:**

- L51: `queryKey: ["admin-handovers", dateFilter, locationId],`

**Cache / fetch settings:**

- L230: `staleTime: 30000,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
84: .from("bookings")
85: .select("*")
87: .in("status", ["pending", "confirmed"])
91: .order("start_at", { ascending: true });
94: query = query.eq("location_id", locationId);
113: .from("vehicle_categories")
114: .select("id, name, image_url")
115: .in("id", uniqueVehicleIds)
119: .from("locations")
120: .select("id, name, city, address")
121: .in("id", uniqueLocationIds)
145: .from("bookings")
146: .select("vehicle_id, end_at, status")
147: .in("vehicle_id", vehicleIds)
148: .in("status", ["active", "completed"])
```

**Error handling:**

- L100: `console.error("Error fetching handovers:", error);`
- L101: `throw error;`

**Consumed by:** `src/pages/admin/Handovers.tsx`, `src/pages/admin/Pickups.tsx`, `src/pages/ops/OpsPickups.tsx`

### `src/hooks/use-hold.ts`

**File header:** Creates a reservation hold for a vehicle

**Exports:** `useCreateHold`, `useHold`, `useExpireHold`

**Query keys:**

- L96: `queryClient.invalidateQueries({ queryKey: ["available-vehicles"] });`
- L97: `queryClient.invalidateQueries({ queryKey: ["vehicle-availability"] });`
- L123: `queryKey: ["hold", holdId],`
- L174: `queryClient.invalidateQueries({ queryKey: ["hold"] });`
- L175: `queryClient.invalidateQueries({ queryKey: ["available-vehicles"] });`

**Cache / fetch settings:**

- L150: `enabled: !!holdId,`
- L151: `refetchInterval: 5000, // Refresh every 5 seconds to keep timer accurate`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
42: .from("reservation_holds")
43: .select("id")
44: .eq("vehicle_id", vehicleId)
45: .eq("status", "active")
47: .or(
50: .limit(1);
58: .from("bookings")
59: .select("id")
60: .eq("vehicle_id", vehicleId)
61: .in("status", ["pending", "confirmed", "active"])
62: .or(
65: .limit(1);
76: .from("reservation_holds")
77: .insert({
85: .select()
128: .from("reservation_holds")
129: .select("*")
130: .eq("id", holdId)
164: .from("reservation_holds")
165: .update({ status: "expired" })
166: .eq("id", holdId);
```

**Cache invalidation on success:**

- L96: `queryClient.invalidateQueries({ queryKey: ["available-vehicles"] });`
- L97: `queryClient.invalidateQueries({ queryKey: ["vehicle-availability"] });`
- L174: `queryClient.invalidateQueries({ queryKey: ["hold"] });`
- L175: `queryClient.invalidateQueries({ queryKey: ["available-vehicles"] });`

**Error handling:**

- L89: `console.error("Error creating hold:", error);`
- L108: `onError: (error: Error) => {`
- L109: `toast({`
- L134: `console.error("Error fetching hold:", error);`
- L169: `console.error("Error expiring hold:", error);`
- L170: `throw error;`

**Return shape(s):** `{id: data.id,
        vehicleId: data.vehicle_id,
        userId: data.user_id,
        startAt: new Date(data.start_at),
        endAt: new Date(data.end_at),
        expiresAt: new Date(data.expires_}`

**Consumed by:** **NOT CONSUMED ANYWHERE — dead code**

### `src/hooks/use-incidents.ts`

**Exports:** `useIncidentCases`, `useIncidentById`, `useBookingIncidents`, `useCreateIncident`, `useUpdateIncident`, `useUploadIncidentPhoto`, `canTransitionTo`, `getNextStatuses`

**Query keys:**

- L104: `queryKey: ["incident-cases", filters],`
- L170: `queryKey: ["incident-case", incidentId],`
- L212: `queryKey: ["booking-incidents", bookingId],`
- L279: `queryClient.invalidateQueries({ queryKey: ["incident-cases"] });`
- L280: `queryClient.invalidateQueries({ queryKey: ["booking-incidents", data.booking_id] });`
- L281: `queryClient.invalidateQueries({ queryKey: ["support-tickets-v2"] });`
- L282: `queryClient.invalidateQueries({ queryKey: ["ticket-queue-counts-v2"] });`
- L325: `queryClient.invalidateQueries({ queryKey: ["incident-cases"] });`
- L326: `queryClient.invalidateQueries({ queryKey: ["incident-case", data.id] });`
- L327: `queryClient.invalidateQueries({ queryKey: ["booking-incidents", data.booking_id] });`
- L388: `queryClient.invalidateQueries({ queryKey: ["incident-case", data.incident_id] });`

**Cache / fetch settings:**

- L163: `enabled: options?.enabled ?? true,`
- L205: `enabled: !!incidentId,`
- L248: `enabled: !!bookingId,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
107: .from("incident_cases")
108: .select(`
112: .order("created_at", { ascending: false });
115: query = query.eq("severity", filters.severity);
118: query = query.eq("status", filters.status);
121: query = query.eq("assigned_staff_id", filters.assignedTo);
143: .from("vehicle_categories")
144: .select("id, name")
145: .in("id", vehicleIds)
175: .from("incident_cases")
176: .select(`
181: .eq("id", incidentId)
189: .from("vehicle_categories")
190: .select("id, name")
191: .eq("id", data.vehicle_id)
217: .from("incident_cases")
218: .select("*")
219: .eq("booking_id", bookingId)
220: .order("created_at", { ascending: false });
228: .from("vehicle_categories")
229: .select("id, name")
230: .in("id", vehicleIds)
266: .from("incident_cases")
267: .insert({
272: .select()
315: .from("incident_cases")
316: .update(finalUpdates)
317: .eq("id", id)
318: .select()
361: .from("condition-photos")
368: .from("condition-photos")
373: .from("incident_photos")
374: .insert({
381: .select()
```

**Cache invalidation on success:**

- L279: `queryClient.invalidateQueries({ queryKey: ["incident-cases"] });`
- L280: `queryClient.invalidateQueries({ queryKey: ["booking-incidents", data.booking_id] });`
- L281: `queryClient.invalidateQueries({ queryKey: ["support-tickets-v2"] });`
- L282: `queryClient.invalidateQueries({ queryKey: ["ticket-queue-counts-v2"] });`
- L325: `queryClient.invalidateQueries({ queryKey: ["incident-cases"] });`
- L326: `queryClient.invalidateQueries({ queryKey: ["incident-case", data.id] });`
- L327: `queryClient.invalidateQueries({ queryKey: ["booking-incidents", data.booking_id] });`
- L388: `queryClient.invalidateQueries({ queryKey: ["incident-case", data.incident_id] });`

**Error handling:**

- L125: `if (error) throw error;`
- L184: `if (error) throw error;`
- L222: `if (error) throw error;`
- L275: `if (error) throw error;`
- L285: `onError: (error) => {`
- L286: `console.error("Failed to create incident:", error);`
- L287: `toast.error("Failed to create incident case");`
- L321: `if (error) throw error;`
- L330: `onError: (error) => {`
- L331: `console.error("Failed to update incident:", error);`
- L332: `toast.error("Failed to update incident");`
- L384: `if (error) throw error;`
- L391: `onError: (error) => {`
- L392: `console.error("Failed to upload photo:", error);`
- L393: `toast.error("Failed to upload photo");`

**Return shape(s):** `{...incident,
          vehicles: category ? {
            id: category.id,
            make: "",
            model: category.name,
            year: new Date().getFullYear(),}`; `{...data,
        vehicles: categoryData ? {
          id: categoryData.id,
          make: "",
          model: categoryData.name,
          year: new Date().getFullYear(),}`; `{...incident,
          vehicles: category ? {
            id: category.id,
            make: "",
            model: category.name,
            year: new Date().getFullYear(),}`

**Consumed by:** `src/components/admin/CreateIncidentDialog.tsx`, `src/components/admin/IncidentDetailDialog.tsx`, `src/features/delivery/api/mutations.ts`, `src/features/delivery/constants/delivery-status.ts`, `src/hooks/use-return-state.ts`, `src/lib/return-steps.ts`, `src/pages/admin/ReturnOps.tsx`

### `src/hooks/use-intake-status.ts`

**File header:** Calculate intake checklist status for a booking

**Exports:** `useIntakeStatus`, `getIntakeAlerts`

**Supabase statements:** none (pure computation or context hook)

**Return shape(s):** `{items: [],
        isComplete: false,
        completedCount: 0,
        totalRequired: 0,
        missingRequired: [],}`; `{items,
      isComplete: missingRequired.length === 0,
      completedCount: completedRequired.length,
      totalRequired: requiredItems.length,
      missingRequired,}`

**Consumed by:** `src/components/admin/BookingOpsDrawer.tsx`

### `src/hooks/use-inventory.ts`

**Exports:** `useAdminVehicles`, `useAdminVehicle`, `useUpdateVehicle`, `useCreateVehicle`, `useDeleteVehicle`

**Query keys:**

- L37: `queryKey: ["admin-vehicles", filters],`
- L107: `queryKey: ["admin-vehicle", id],`
- L188: `queryClient.invalidateQueries({ queryKey: ["admin-vehicles"] });`
- L189: `queryClient.invalidateQueries({ queryKey: ["admin-vehicle"] });`
- L190: `queryClient.invalidateQueries({ queryKey: ["admin-calendar"] });`
- L252: `queryClient.invalidateQueries({ queryKey: ["admin-vehicles"] });`
- L253: `queryClient.invalidateQueries({ queryKey: ["admin-calendar"] });`
- L254: `queryClient.invalidateQueries({ queryKey: ["vehicles"] });`
- L335: `queryClient.invalidateQueries({ queryKey: ["admin-vehicles"] });`
- L336: `queryClient.invalidateQueries({ queryKey: ["admin-calendar"] });`
- L337: `queryClient.invalidateQueries({ queryKey: ["vehicles"] });`
- L338: `queryClient.invalidateQueries({ queryKey: ["featured-vehicles"] });`

**Cache / fetch settings:**

- L101: `staleTime: 30000,`
- L145: `enabled: !!id,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
40: .from("vehicles")
41: .select(`
45: .order("make", { ascending: true });
48: query = query.eq("location_id", filters.locationId);
52: query = query.eq("is_available", true);
54: query = query.eq("is_available", false);
58: query = query.eq("category", filters.category);
112: .from("vehicles")
113: .select(`
117: .eq("id", id)
126: .from("bookings")
127: .select("id, booking_code, status, start_at, end_at")
128: .eq("vehicle_id", id)
129: .order("created_at", { ascending: false })
130: .limit(10),
132: .from("damage_reports")
133: .select("id, description, severity, status, created_at")
134: .eq("vehicle_id", id)
135: .order("created_at", { ascending: false })
136: .limit(10),
175: .from("vehicles")
176: .update(updates)
177: .eq("id", vehicleId)
178: .select()
222: .from("vehicles")
223: .insert([{
238: .select()
273: .from("bookings")
274: .select("id")
275: .eq("vehicle_id", vehicleId);
281: await supabase.from("booking_add_ons").delete().in("booking_id", bookingIds);
282: await supabase.from("condition_photos").delete().in("booking_id", bookingIds);
283: await supabase.from("walkaround_inspections").delete().in("booking_id", bookingIds);
284: await supabase.from("rental_agreements").delete().in("booking_id", bookingIds);
285: await supabase.from("checkin_records").delete().in("booking_id", bookingIds);
286: await supabase.from("inspection_metrics").delete().in("booking_id", bookingIds);
287: await supabase.from("payments").delete().in("booking_id", bookingIds);
288: await supabase.from("verification_requests").delete().in("booking_id", bookingIds);
289: await supabase.from("booking_otps").delete().in("booking_id", bookingIds);
290: await supabase.from("notification_logs").delete().in("booking_id", bookingIds);
291: await supabase.from("admin_alerts").delete().in("booking_id", bookingIds);
295: .from("tickets")
296: .select("id")
297: .in("booking_id", bookingIds);
300: await supabase.from("ticket_messages").delete().in("ticket_id", tickets.map(t => t.id));
302: await supabase.from("tickets").delete().in("booking_id", bookingIds);
306: .from("receipts")
307: .select("id")
308: .in("booking_id", bookingIds);
311: await supabase.from("receipt_events").delete().in("receipt_id", receipts.map(r => r.id));
313: await supabase.from("receipts").delete().in("booking_id", bookingIds);
316: await supabase.from("bookings").delete().in("id", bookingIds);
320: await supabase.from("admin_alerts").delete().eq("vehicle_id", vehicleId);
321: await supabase.from("damage_reports").delete().eq("vehicle_id", vehicleId);
322: await supabase.from("audit_logs").delete().eq("entity_id", vehicleId).eq("entity_type", "vehicles");
326: .from("vehicles")
327: .delete()
328: .eq("id", vehicleId);
```

**Cache invalidation on success:**

- L188: `queryClient.invalidateQueries({ queryKey: ["admin-vehicles"] });`
- L189: `queryClient.invalidateQueries({ queryKey: ["admin-vehicle"] });`
- L190: `queryClient.invalidateQueries({ queryKey: ["admin-calendar"] });`
- L252: `queryClient.invalidateQueries({ queryKey: ["admin-vehicles"] });`
- L253: `queryClient.invalidateQueries({ queryKey: ["admin-calendar"] });`
- L254: `queryClient.invalidateQueries({ queryKey: ["vehicles"] });`
- L335: `queryClient.invalidateQueries({ queryKey: ["admin-vehicles"] });`
- L336: `queryClient.invalidateQueries({ queryKey: ["admin-calendar"] });`
- L337: `queryClient.invalidateQueries({ queryKey: ["vehicles"] });`
- L338: `queryClient.invalidateQueries({ queryKey: ["featured-vehicles"] });`

**Error handling:**

- L64: `console.error("Error fetching vehicles:", error);`
- L65: `throw error;`
- L120: `if (error) throw error;`
- L181: `if (error) throw error;`
- L193: `onError: (error) => {`
- L194: `console.error("Failed to update vehicle:", error);`
- L195: `toast.error("Failed to update vehicle");`
- L241: `if (error) throw error;`
- L257: `onError: (error) => {`
- L258: `console.error("Failed to create vehicle:", error);`
- L259: `toast.error("Failed to add vehicle");`
- L330: `if (error) throw error;`
- L341: `onError: (error) => {`
- L342: `console.error("Failed to delete vehicle:", error);`
- L343: `toast.error("Failed to delete vehicle");`

**Return shape(s):** `{...data,
        recentBookings: bookingsRes.data || [],
        damageHistory: damagesRes.data || [],}`; `{id: vehicleId}`

**Consumed by:** `src/pages/admin/Bookings.tsx`, `src/pages/admin/Inventory.tsx`, `src/pages/admin/Reports.tsx`

### `src/hooks/use-late-return.ts`

**File header:** Late Return Hook - Manages late return calculations and customer self-marking with GPS

**Exports:** `requestGeolocation`, `useCustomerMarkReturned`, `useOverrideLateFee`, `useCalculateLateFee`

**Query keys:**

- L96: `queryClient.invalidateQueries({ queryKey: ["my-bookings"] });`
- L97: `queryClient.invalidateQueries({ queryKey: ["booking", variables.bookingId] });`
- L131: `queryClient.invalidateQueries({ queryKey: ["booking", variables.bookingId] });`
- L132: `queryClient.invalidateQueries({ queryKey: ["active-rentals"] });`
- L133: `queryClient.invalidateQueries({ queryKey: ["returns"] });`
- L167: `queryClient.invalidateQueries({ queryKey: ["booking", variables.bookingId] });`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
81: .from("bookings")
82: .update(updateData)
83: .eq("id", bookingId)
84: .eq("status", "active"); // Only allow for active bookings
117: .from("bookings")
118: .update({
124: .eq("id", bookingId);
157: .from("bookings")
158: .update({
161: .eq("id", bookingId);
```

**Cache invalidation on success:**

- L96: `queryClient.invalidateQueries({ queryKey: ["my-bookings"] });`
- L97: `queryClient.invalidateQueries({ queryKey: ["booking", variables.bookingId] });`
- L131: `queryClient.invalidateQueries({ queryKey: ["booking", variables.bookingId] });`
- L132: `queryClient.invalidateQueries({ queryKey: ["active-rentals"] });`
- L133: `queryClient.invalidateQueries({ queryKey: ["returns"] });`
- L167: `queryClient.invalidateQueries({ queryKey: ["booking", variables.bookingId] });`

**Error handling:**

- L86: `if (error) throw error;`
- L99: `onError: (error: Error) => {`
- L100: `toast.error(error.message || "Failed to mark vehicle as returned");`
- L126: `if (error) throw error;`
- L135: `onError: (error: Error) => {`
- L136: `toast.error(error.message || "Failed to update late fee");`
- L163: `if (error) throw error;`

**Return shape(s):** `{markedAt: now, hasLocation: latitude != null}`; `{overrideAmount}`

**Consumed by:** `src/components/admin/return-ops/steps/StepReturnCloseout.tsx`, `src/pages/Dashboard.tsx`

### `src/hooks/use-license-upload.ts`

**File header:** Remove the licence photos the customer uploaded. Only allowed while the licence has not been approved by staff.

**Exports:** `useLicenseUpload`, `uploadLicenseOnSignup`

**Query keys:**

- L21: `queryKey: ["license-status", userId],`
- L108: `queryClient.refetchQueries({ queryKey: ["license-status", uid] }),`
- L109: `queryClient.refetchQueries({ queryKey: ["profile"] }),`
- L112: `queryClient.invalidateQueries({ queryKey: ["booking"] });`
- L179: `await queryClient.refetchQueries({ queryKey: ["license-status", uid] });`
- L180: `queryClient.invalidateQueries({ queryKey: ["profile"] });`

**Cache / fetch settings:**

- L41: `enabled: !!userId,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
26: .from("profiles")
27: .select("driver_license_front_url, driver_license_back_url, driver_license_status, driver_license_expiry, driver_license_uploaded_at")
28: .eq("id", userId)
62: .from("driver-licenses")
69: .from("driver-licenses")
84: .from("profiles")
85: .update(updateData)
86: .eq("id", uid);
92: .from("profiles")
93: .select("full_name")
94: .eq("id", uid)
131: .from("driver-licenses")
160: const { data: files } = await supabase.storage.from("driver-licenses").list(uid);
163: .from("driver-licenses")
168: .from("profiles")
169: .update({
175: .eq("id", uid);
220: .from("driver-licenses")
227: .from("driver-licenses")
234: .from("profiles")
235: .update({
240: .eq("id", userId);
```

**Cache invalidation on success:**

- L112: `queryClient.invalidateQueries({ queryKey: ["booking"] });`
- L180: `queryClient.invalidateQueries({ queryKey: ["profile"] });`

**Error handling:**

- L31: `if (error) throw error;`
- L51: `toast({ title: "Error", description: "User not authenticated", variant: "destructive" });`
- L102: `}).catch(console.error);`
- L104: `toast({ title: "Success", description: "Driver's license uploaded successfully" });`
- L116: `console.error("License upload error:", error);`
- L117: `toast({`
- L134: `if (error) throw error;`
- L150: `toast({`
- L181: `toast({ title: "Removed", description: "Your licence photos were deleted." });`
- L184: `console.error("License delete error:", error);`
- L185: `toast({`
- L246: `console.error("Signup license upload error:", error);`

**Return shape(s):** `{frontUrl: data?.driver_license_front_url ?? null,
        backUrl: data?.driver_license_back_url ?? null,
        status: data?.driver_license_status ?? null,
        expiry: data?.driver_license_expi}`; `{licenseStatus,
    isLoading,
    uploading,
    uploadLicense,
    deleteLicense,
    getSignedUrl,}`

**Consumed by:** `src/pages/Auth.tsx`, `src/pages/Dashboard.tsx`

### `src/hooks/use-locations.ts`

**Exports:** `useLocations`, `useLocation`

**Query keys:**

- L21: `queryKey: ["locations"],`
- L55: `queryKey: ["location", id],`

**Cache / fetch settings:**

- L49: `staleTime: 300000, // 5 minutes`
- L85: `enabled: !!id,`
- L86: `staleTime: 300000,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
24: .from("locations")
25: .select("*")
26: .eq("is_active", true)
27: .order("name");
60: .from("locations")
61: .select("*")
62: .eq("id", id)
```

**Error handling:**

- L30: `console.error("Error fetching locations:", error);`
- L66: `console.error("Error fetching location:", error);`

**Consumed by:** `src/components/admin/LocationDailyReport.tsx`, `src/components/admin/LocationScopeSwitcher.tsx`, `src/components/admin/VehicleEditDialog.tsx`, `src/components/admin/WalkInBookingDialog.tsx`, `src/components/admin/analytics/RevenueAnalyticsTab.tsx`, `src/components/admin/fleet/AllVehiclesTable.tsx`, `src/components/admin/fleet/ByVehicleTab.tsx`, `src/components/admin/fleet/CostTrackingTab.tsx`, `src/components/admin/fleet/FleetOverviewTab.tsx`, `src/components/admin/fleet/TemporaryVehiclesTable.tsx`, `src/components/admin/fleet/UtilizationTab.tsx`, `src/components/admin/fleet/VehicleUnitEditDialog.tsx`, `src/components/admin/fleet/VinFormDialog.tsx`, `src/components/admin/ops/RateLocationPanel.tsx`, `src/components/delivery/DeliveryShell.tsx`, `src/components/landing/GlassSearchBar.tsx`, `src/components/landing/LocationsSection.tsx`, `src/components/layout/AdminShell.tsx`, `src/components/layout/ScrollToTop.tsx`, `src/components/layout/SupportShell.tsx`, `src/components/layout/TopNav.tsx`, `src/components/ops/OpsShell.tsx`, `src/components/rental/BookingSummaryPanel.tsx`, `src/components/rental/RentalStepHeader.tsx`, `src/components/shared/BookingStepper.tsx`, `src/components/shared/LocationSelector.tsx`, `src/components/shared/PanelShell.tsx`, `src/features/delivery/pages/WalkIn.tsx`, `src/hooks/use-booking-edit.ts`, `src/hooks/use-panel-context.ts`, `src/hooks/use-require-auth.ts`, `src/pages/LocationDetail.tsx`, `src/pages/Locations.tsx`, `src/pages/NewCheckout.tsx`, `src/pages/NotFound.tsx`, `src/pages/admin/ActiveRentalDetail.tsx`, `src/pages/admin/BookingDetail.tsx`, `src/pages/admin/BookingOps.tsx`, `src/pages/admin/Bookings.tsx`, `src/pages/admin/Calendar.tsx`, `src/pages/admin/Damages.tsx`, `src/pages/admin/Handovers.tsx`, `src/pages/admin/Inventory.tsx`, `src/pages/admin/Pickups.tsx`, `src/pages/admin/Reports.tsx`, `src/pages/admin/ReturnOps.tsx`, `src/pages/admin/Returns.tsx`

### `src/hooks/use-maintenance-logs.ts`

**File header:** Maintenance Logs Hook CRUD operations for vehicle maintenance records

**Exports:** `useMaintenanceLogs`, `useMaintenanceLogsByUnit`, `useCreateMaintenanceLog`, `useUpdateMaintenanceLog`, `useDeleteMaintenanceLog`, `useMaintenanceTotalByUnit`

**Query keys:**

- L42: `queryKey: ["maintenance-logs", filters],`
- L78: `queryKey: ["maintenance-logs-unit", vehicleUnitId],`
- L128: `queryClient.invalidateQueries({ queryKey: ["maintenance-logs"] });`
- L129: `queryClient.invalidateQueries({ queryKey: ["maintenance-logs-unit", variables.vehicle_unit_id] });`
- L130: `queryClient.invalidateQueries({ queryKey: ["maintenance-total", variables.vehicle_unit_id] });`
- L131: `queryClient.invalidateQueries({ queryKey: ["vehicle-cost-timeline", variables.vehicle_unit_id] });`
- L132: `queryClient.invalidateQueries({ queryKey: ["fleet-analytics"] });`
- L133: `queryClient.invalidateQueries({ queryKey: ["fleet-cost-analysis"] });`
- L159: `queryClient.invalidateQueries({ queryKey: ["maintenance-logs"] });`
- L160: `queryClient.invalidateQueries({ queryKey: ["maintenance-logs-unit", data.vehicle_unit_id] });`
- L161: `queryClient.invalidateQueries({ queryKey: ["maintenance-total", data.vehicle_unit_id] });`
- L162: `queryClient.invalidateQueries({ queryKey: ["vehicle-cost-timeline", data.vehicle_unit_id] });`
- L163: `queryClient.invalidateQueries({ queryKey: ["fleet-analytics"] });`
- L164: `queryClient.invalidateQueries({ queryKey: ["fleet-cost-analysis"] });`
- L187: `queryClient.invalidateQueries({ queryKey: ["maintenance-logs"] });`
- L188: `queryClient.invalidateQueries({ queryKey: ["maintenance-logs-unit", data.vehicle_unit_id] });`
- L189: `queryClient.invalidateQueries({ queryKey: ["maintenance-total", data.vehicle_unit_id] });`
- L190: `queryClient.invalidateQueries({ queryKey: ["vehicle-cost-timeline", data.vehicle_unit_id] });`
- L191: `queryClient.invalidateQueries({ queryKey: ["fleet-analytics"] });`
- L192: `queryClient.invalidateQueries({ queryKey: ["fleet-cost-analysis"] });`
- L203: `queryKey: ["maintenance-total", vehicleUnitId],`

**Cache / fetch settings:**

- L91: `enabled: !!vehicleUnitId,`
- L215: `enabled: !!vehicleUnitId,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
45: .from("maintenance_logs")
46: .select(`
54: .order("service_date", { ascending: false });
57: query = query.eq("vehicle_unit_id", filters.vehicleUnitId);
66: query = query.eq("maintenance_type", filters.maintenanceType);
83: .from("maintenance_logs")
84: .select("*")
85: .eq("vehicle_unit_id", vehicleUnitId)
86: .order("service_date", { ascending: false });
116: .from("maintenance_logs")
117: .insert({
121: .select()
149: .from("maintenance_logs")
150: .update(updates)
151: .eq("id", id)
152: .select()
179: .from("maintenance_logs")
180: .delete()
181: .eq("id", params.id);
208: .from("maintenance_logs")
209: .select("cost")
210: .eq("vehicle_unit_id", vehicleUnitId);
```

**Cache invalidation on success:**

- L128: `queryClient.invalidateQueries({ queryKey: ["maintenance-logs"] });`
- L129: `queryClient.invalidateQueries({ queryKey: ["maintenance-logs-unit", variables.vehicle_unit_id] });`
- L130: `queryClient.invalidateQueries({ queryKey: ["maintenance-total", variables.vehicle_unit_id] });`
- L131: `queryClient.invalidateQueries({ queryKey: ["vehicle-cost-timeline", variables.vehicle_unit_id] });`
- L132: `queryClient.invalidateQueries({ queryKey: ["fleet-analytics"] });`
- L133: `queryClient.invalidateQueries({ queryKey: ["fleet-cost-analysis"] });`
- L159: `queryClient.invalidateQueries({ queryKey: ["maintenance-logs"] });`
- L160: `queryClient.invalidateQueries({ queryKey: ["maintenance-logs-unit", data.vehicle_unit_id] });`
- L161: `queryClient.invalidateQueries({ queryKey: ["maintenance-total", data.vehicle_unit_id] });`
- L162: `queryClient.invalidateQueries({ queryKey: ["vehicle-cost-timeline", data.vehicle_unit_id] });`
- L163: `queryClient.invalidateQueries({ queryKey: ["fleet-analytics"] });`
- L164: `queryClient.invalidateQueries({ queryKey: ["fleet-cost-analysis"] });`
- L187: `queryClient.invalidateQueries({ queryKey: ["maintenance-logs"] });`
- L188: `queryClient.invalidateQueries({ queryKey: ["maintenance-logs-unit", data.vehicle_unit_id] });`
- L189: `queryClient.invalidateQueries({ queryKey: ["maintenance-total", data.vehicle_unit_id] });`
- L190: `queryClient.invalidateQueries({ queryKey: ["vehicle-cost-timeline", data.vehicle_unit_id] });`
- L191: `queryClient.invalidateQueries({ queryKey: ["fleet-analytics"] });`
- L192: `queryClient.invalidateQueries({ queryKey: ["fleet-cost-analysis"] });`

**Error handling:**

- L70: `if (error) throw error;`
- L88: `if (error) throw error;`
- L124: `if (error) throw error;`
- L136: `onError: (error: Error) => {`
- L137: `toast.error("Failed to add maintenance log: " + error.message);`
- L155: `if (error) throw error;`
- L167: `onError: (error: Error) => {`
- L168: `toast.error("Failed to update maintenance log: " + error.message);`
- L183: `if (error) throw error;`
- L195: `onError: (error: Error) => {`
- L196: `toast.error("Failed to delete maintenance log: " + error.message);`
- L212: `if (error) throw error;`

**Consumed by:** `src/components/admin/fleet/MaintenanceLogDialog.tsx`, `src/pages/admin/VehicleUnitDetail.tsx`

### `src/hooks/use-manage-addons.ts`

**File header:** Add-Ons Management Hook Full CRUD operations for add-ons pricing in admin panel

**Exports:** `useManageAddOns`, `useUpdateAddOn`, `useCreateAddOn`, `useDeleteAddOn`

**Query keys:**

- L41: `queryKey: ["admin-add-ons"],`
- L86: `queryClient.invalidateQueries({ queryKey: ["admin-add-ons"] });`
- L87: `queryClient.invalidateQueries({ queryKey: ["add-ons"] });`
- L120: `queryClient.invalidateQueries({ queryKey: ["admin-add-ons"] });`
- L121: `queryClient.invalidateQueries({ queryKey: ["add-ons"] });`
- L146: `queryClient.invalidateQueries({ queryKey: ["admin-add-ons"] });`
- L147: `queryClient.invalidateQueries({ queryKey: ["add-ons"] });`

**Cache / fetch settings:**

- L60: `staleTime: 10000, // 10 seconds - allow quick updates`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
44: .from("add_ons")
45: .select("*")
46: .order("name");
75: .from("add_ons")
76: .update(updates)
77: .eq("id", id)
78: .select()
105: .from("add_ons")
106: .insert({
113: .select()
139: .from("add_ons")
140: .delete()
141: .eq("id", id);
```

**Cache invalidation on success:**

- L86: `queryClient.invalidateQueries({ queryKey: ["admin-add-ons"] });`
- L87: `queryClient.invalidateQueries({ queryKey: ["add-ons"] });`
- L120: `queryClient.invalidateQueries({ queryKey: ["admin-add-ons"] });`
- L121: `queryClient.invalidateQueries({ queryKey: ["add-ons"] });`
- L146: `queryClient.invalidateQueries({ queryKey: ["admin-add-ons"] });`
- L147: `queryClient.invalidateQueries({ queryKey: ["add-ons"] });`

**Error handling:**

- L48: `if (error) throw error;`
- L81: `if (error) throw error;`
- L90: `onError: (error: Error) => {`
- L91: `toast.error("Failed to update add-on: " + error.message);`
- L116: `if (error) throw error;`
- L124: `onError: (error: Error) => {`
- L125: `toast.error("Failed to create add-on: " + error.message);`
- L143: `if (error) throw error;`
- L150: `onError: (error: Error) => {`
- L151: `toast.error("Failed to delete add-on: " + error.message);`

**Consumed by:** `src/components/admin/AddOnsPricingPanel.tsx`

### `src/hooks/use-mapbox-token.ts`

**File header:** Hook to fetch Mapbox token from edge function

**Exports:** `useMapboxToken`

**Query keys:**

- L9: `queryKey: ["mapbox-token"],`

**Cache / fetch settings:**

- L20: `staleTime: 1000 * 60 * 60, // Cache for 1 hour`
- L21: `retry: 2,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
11: const { data, error } = await supabase.functions.invoke("get-mapbox-token");
```

**Error handling:**

- L14: `console.error("Failed to fetch Mapbox token:", error);`

**Consumed by:** `src/components/rental/DeliveryAddressAutocomplete.tsx`, `src/components/rental/DeliveryMap.tsx`, `src/components/shared/LocationsMap.tsx`

### `src/hooks/use-my-deliveries.ts`

**Exports:** `useMyDeliveries`, `useUpdateDeliveryStatus`, `useDeliveryById`

**Query keys:**

- L66: `queryKey: ["my-deliveries", user?.id, statusFilter, deliveryScope],`
- L302: `queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });`
- L316: `queryKey: ["delivery-detail", bookingId],`

**Cache / fetch settings:**

- L252: `enabled: !!user,`
- L253: `staleTime: 30000,`
- L372: `enabled: !!bookingId && !!user,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
72: .from("bookings")
73: .select(`
92: .in("status", ["pending", "confirmed", "active", "cancelled"])
94: .order("start_at", { ascending: true });
98: query = query.eq("assigned_driver_id", user.id);
115: .from("delivery_statuses")
116: .select("booking_id, status")
117: .in("booking_id", bookingIds)
118: .order("created_at", { ascending: false });
131: .from("profiles")
132: .select("id, full_name, email, phone")
133: .in("id", userIds);
140: .from("vehicle_categories")
141: .select("id, name, image_url")
142: .in("id", categoryIds);
154: .from("vehicle_units")
155: .select("id, vin, license_plate, color")
156: .in("id", unitIds);
169: .from("profiles")
170: .select("id, full_name")
171: .in("id", driverIds);
179: .from("locations")
180: .select("id, name, address, phone")
181: .in("id", locationIds);
281: .from("delivery_statuses")
282: .upsert({
295: .select()
321: .from("bookings")
322: .select(`
326: .eq("id", bookingId)
333: .from("profiles")
334: .select("full_name, email, phone")
335: .eq("id", booking.user_id)
340: .from("vehicle_categories")
341: .select("id, name, image_url")
342: .eq("id", booking.vehicle_id)
349: .from("vehicle_units")
350: .select("id, vin, license_plate, color")
351: .eq("id", booking.assigned_unit_id)
358: .from("delivery_statuses")
359: .select("*")
360: .eq("booking_id", bookingId)
361: .order("created_at", { ascending: false });
```

**Cache invalidation on success:**

- L302: `queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });`

**Error handling:**

- L106: `console.error("Error fetching deliveries:", error);`
- L107: `throw error;`
- L298: `if (error) throw error;`
- L305: `onError: (error) => {`
- L306: `console.error("Failed to update delivery status:", error);`
- L307: `toast.error("Failed to update status");`
- L329: `if (error) throw error;`

**Return shape(s):** `{...booking,
        customer: profile,
        category,
        assignedUnit,
        statusHistory: statusHistory || [],
        currentStatus: statusHistory?.[0]?.status || "assigned",}`

**Consumed by:** `src/components/delivery/DeliveryHandoverCapture.tsx`, `src/features/delivery/hooks/use-delivery-actions.ts`, `src/features/delivery/hooks/use-delivery-list.ts`

### `src/hooks/use-offers.ts`

**File header:** Points Offers Hooks Handles offers that can be unlocked with points

**Exports:** `useActiveOffers`, `useAdminOffers`, `useUserOfferRedemptions`, `canRedeemOffer`, `useCreateOffer`, `useUpdateOffer`, `useDeleteOffer`, `useRedeemOffer`

**Query keys:**

- L44: `queryKey: ["active-offers"],`
- L69: `queryKey: ["admin-offers"],`
- L89: `queryKey: ["offer-redemptions", user?.id],`
- L202: `queryClient.invalidateQueries({ queryKey: ["admin-offers"] });`
- L203: `queryClient.invalidateQueries({ queryKey: ["active-offers"] });`
- L248: `queryClient.invalidateQueries({ queryKey: ["admin-offers"] });`
- L249: `queryClient.invalidateQueries({ queryKey: ["active-offers"] });`
- L273: `queryClient.invalidateQueries({ queryKey: ["admin-offers"] });`
- L274: `queryClient.invalidateQueries({ queryKey: ["active-offers"] });`
- L346: `queryClient.invalidateQueries({ queryKey: ["membership-info"] });`
- L347: `queryClient.invalidateQueries({ queryKey: ["points-ledger"] });`
- L348: `queryClient.invalidateQueries({ queryKey: ["offer-redemptions"] });`
- L349: `queryClient.invalidateQueries({ queryKey: ["active-offers"] });`

**Cache / fetch settings:**

- L62: `staleTime: 60000,`
- L80: `staleTime: 30000,`
- L111: `enabled: !!user?.id,`
- L112: `staleTime: 30000,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
49: .from("points_offers")
50: .select("*")
51: .eq("is_active", true)
52: .or(`valid_from.is.null,valid_from.lte.${now}`)
53: .or(`valid_until.is.null,valid_until.gte.${now}`)
54: .order("points_required", { ascending: true });
72: .from("points_offers")
73: .select("*")
74: .order("created_at", { ascending: false });
94: .from("offer_redemptions")
95: .select("*")
96: .eq("user_id", user.id)
97: .order("redeemed_at", { ascending: false });
178: .from("points_offers")
179: .insert({
195: .select()
238: .from("points_offers")
239: .update(updateData)
240: .eq("id", id)
241: .select()
266: .from("points_offers")
267: .delete()
268: .eq("id", id);
303: .from("points_offers")
304: .select("points_required, current_uses")
305: .eq("id", offerId)
311: const { error: pointsError } = await supabase.rpc("update_points_balance", {
324: .from("offer_redemptions")
325: .insert({
332: .select()
339: .from("points_offers")
340: .update({ current_uses: (offer.current_uses || 0) + 1 })
341: .eq("id", offerId);
```

**Cache invalidation on success:**

- L202: `queryClient.invalidateQueries({ queryKey: ["admin-offers"] });`
- L203: `queryClient.invalidateQueries({ queryKey: ["active-offers"] });`
- L248: `queryClient.invalidateQueries({ queryKey: ["admin-offers"] });`
- L249: `queryClient.invalidateQueries({ queryKey: ["active-offers"] });`
- L273: `queryClient.invalidateQueries({ queryKey: ["admin-offers"] });`
- L274: `queryClient.invalidateQueries({ queryKey: ["active-offers"] });`
- L346: `queryClient.invalidateQueries({ queryKey: ["membership-info"] });`
- L347: `queryClient.invalidateQueries({ queryKey: ["points-ledger"] });`
- L348: `queryClient.invalidateQueries({ queryKey: ["offer-redemptions"] });`
- L349: `queryClient.invalidateQueries({ queryKey: ["active-offers"] });`

**Error handling:**

- L58: `if (error) throw error;`
- L76: `if (error) throw error;`
- L99: `if (error) throw error;`
- L198: `if (error) throw error;`
- L206: `onError: (error) => {`
- L207: `console.error("Failed to create offer:", error);`
- L208: `toast.error("Failed to create offer");`
- L244: `if (error) throw error;`
- L252: `onError: (error) => {`
- L253: `console.error("Failed to update offer:", error);`
- L254: `toast.error("Failed to update offer");`
- L270: `if (error) throw error;`
- L277: `onError: (error) => {`
- L278: `console.error("Failed to delete offer:", error);`
- L279: `toast.error("Failed to delete offer");`
- L323: `const { data: redemption, error: redemptionError } = await supabase`
- L335: `if (redemptionError) throw redemptionError;`
- L352: `onError: (error) => {`
- L353: `console.error("Failed to redeem offer:", error);`
- L354: `toast.error("Failed to redeem offer");`

**Return shape(s):** `{canRedeem: false, 
      reason: `Need ${offer.pointsRequired - userPointsBalance}`; `{canRedeem: false, reason: "Already redeemed maximum times"}`; `{canRedeem: false, reason: "Offer fully redeemed"}`; `{canRedeem: false, 
      reason: `Requires at least ${offer.minRentalDays}`

**Consumed by:** `src/pages/Dashboard.tsx`, `src/pages/admin/Offers.tsx`

### `src/hooks/use-ops-next-step.ts`

**Exports:** `useOpsNextStep`

**Supabase statements:** none (pure computation or context hook)

**Return shape(s):** `{step: null, isComplete: status === "active" || status === "completed"}`; `{step: {
          id: "confirm",
          title: "Confirm Booking",
          description: "Review booking details and confirm to proceed with preparation",
          action: "Confirm",
          var}`; `{step: {
            id: "vehicle",
            title: "Assign Vehicle",
            description: "Select and assign a vehicle to this booking",
            action: "Assign",
            variant: "warn}`; `{step: {
            id: "prep",
            title: "Complete Vehicle Prep",
            description: `Checklist: ${prepCount.done}`

**Consumed by:** `src/components/admin/BookingOpsDrawer.tsx`

### `src/hooks/use-panel-context.ts`

**File header:** Hook to determine current panel context and provide context-aware utilities

**Exports:** `usePanelContext`

**Supabase statements:** none (pure computation or context hook)

**Return shape(s):** `{context,
    isOps,
    isAdmin,
    getContextRoute,
    getBackRoute,}`

**Consumed by:** **NOT CONSUMED ANYWHERE — dead code**

### `src/hooks/use-payment-deposit.ts`

**File header:** Payment Deposit Status Hook Provides read-only payment status for a booking. Reads separate rental (wl_transaction_id) and deposit (wl_deposit_transaction_id) fields.

**Exports:** `usePaymentDepositStatus`

**Query keys:**

- L62: `queryKey: ['payment-deposit-status', bookingId],`

**Cache / fetch settings:**

- L193: `enabled: !!bookingId,`
- L194: `staleTime: 15000,`
- L195: `gcTime: 60000,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
67: .from('bookings')
68: .select('total_amount, deposit_amount, deposit_status, wl_transaction_id, wl_auth_status, wl_deposit_transaction_id, wl_deposit_auth_status, status, paid_offline, offline_payment_method, offline_payment_reference, offlin
69: .eq('id', bookingId)
75: .from('payments')
76: .select('*')
77: .eq('booking_id', bookingId)
78: .order('created_at', { ascending: true });
```

**Consumed by:** `src/components/admin/BookingOpsDrawer.tsx`, `src/components/admin/PaymentDepositPanel.tsx`, `src/components/admin/deposit/AccountCloseoutPanel.tsx`, `src/components/admin/ops/steps/StepPayment.tsx`, `src/components/admin/return-ops/steps/StepReturnDeposit.tsx`, `src/pages/admin/BookingOps.tsx`, `src/pages/admin/ReturnOps.tsx`

### `src/hooks/use-payments.ts`

**File header:** Payments Hook Internal hook for booking lookups by code. Payment recording is handled server-side by the Worldline (wl-pay / wl-webhook) flow.

**Exports:** `useBookingByCode`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
17: .from("bookings")
18: .select(`
26: .eq("booking_code", searchCode.toUpperCase())
```

**Error handling:**

- L29: `if (error) throw error;`

**Consumed by:** **NOT CONSUMED ANYWHERE — dead code**

### `src/hooks/use-pending-alerts-count.ts`

**File header:** Real-time count of pending alerts that actually need attention. Lifecycle notices (rental activated, booking completed, cancellations) are excluded, and the count is scoped to the acting user's branch: a manager only counts alerts for their own branch, a super admin counts the selected branch (or all branches when none is selected).

**Exports:** `usePendingAlertsCount`

**Query keys:**

- L21: `queryKey: ["pending-alerts-count", locationId, isSuperAdmin],`
- L66: `queryClient.invalidateQueries({ queryKey: ["pending-alerts-count"] });`
- L67: `queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });`

**Cache / fetch settings:**

- L22: `enabled: isReady && !isUnassignedManager,`
- L51: `staleTime: 10000,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
25: .from("admin_alerts")
26: .select("id, title, message, booking_id")
27: .eq("status", "pending")
28: .order("created_at", { ascending: false })
29: .limit(500);
43: .from("bookings")
44: .select("id")
45: .in("id", bookingIds)
46: .eq("location_id", locationId);
```

**Cache invalidation on success:**

- L66: `queryClient.invalidateQueries({ queryKey: ["pending-alerts-count"] });`
- L67: `queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });`

**Error handling:**

- L32: `console.error("Error fetching pending alerts count:", error);`

**Return shape(s):** `{count: query.data ?? 0,
    isLoading: query.isLoading,}`

**Consumed by:** **NOT CONSUMED ANYWHERE — dead code**

### `src/hooks/use-pending-ticket-notice.ts`

**File header:** Waiting support tickets, surfaced the moment a staff member opens a panel. - Counts tickets nobody has picked up yet (new / escalated), scoped to the acting user's branch through the same helper the support queue uses. - Raises a single floating notice per sign-in session (sessionStorage guard), so it does not repeat on every page change. - Read-only: it never writes, sends, or resends anything.

**Exports:** `usePendingTicketSummary`, `usePendingTicketNotice`

**Query keys:**

- L32: `queryKey: ["pending-ticket-summary", locationId ?? "all"],`

**Cache / fetch settings:**

- L33: `enabled: isReady && !isUnassignedManager,`
- L34: `staleTime: 20000,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
36: const { data, error } = await (supabase.from("support_tickets_v2") as any)
37: .select(
40: .in("status", WAITING_STATUSES as unknown as string[])
41: .order("created_at", { ascending: false })
42: .limit(200);
```

**Error handling:**

- L44: `if (error) throw error;`
- L82: `const notify = data.urgentCount > 0 ? toast.error : toast.info;`

**Return shape(s):** `{count: scoped.length,
        urgentCount: scoped.filter((t: any) => t.is_urgent).length,
        latest: scoped.slice(0, 3).map((t: any) => ({
          id: t.id,
          ticket_id: t.ticket_id,
  }`

**Consumed by:** `src/components/layout/AdminShell.tsx`, `src/components/ops/OpsShell.tsx`, `src/pages/admin/Alerts.tsx`

### `src/hooks/use-pickup-progress.ts`

**File header:** Batch progress lookup for a set of pickup bookings. Keyed on the sorted id list so it refetches when the pickup list changes.

**Exports:** `usePickupProgress`

**Query keys:**

- L12: `queryKey: ["pickup-progress", key],`

**Cache / fetch settings:**

- L14: `enabled: bookingIds.length > 0,`
- L15: `staleTime: 30000,`

**Supabase statements:** none (pure computation or context hook)

**Consumed by:** `src/pages/admin/Bookings.tsx`

### `src/hooks/use-points.ts`

**File header:** Points & Membership Hooks Handles points balance, ledger, settings, and transactions

**Exports:** `useMembershipInfo`, `parsePointsSettings`, `usePointsSettings`, `useUpdatePointsSettings`, `usePointsLedger`, `calculatePointsToEarn`, `calculatePointsDiscount`, `useAwardPoints`, `useRedeemPoints`, `useReversePoints`, `useAdjustPoints`

**Query keys:**

- L45: `queryKey: ["membership-info", user?.id],`
- L112: `queryKey: ["points-settings"],`
- L152: `queryClient.invalidateQueries({ queryKey: ["points-settings"] });`
- L168: `queryKey: ["points-ledger", targetUserId],`
- L315: `queryClient.invalidateQueries({ queryKey: ["membership-info"] });`
- L316: `queryClient.invalidateQueries({ queryKey: ["points-ledger"] });`
- L356: `queryClient.invalidateQueries({ queryKey: ["membership-info"] });`
- L357: `queryClient.invalidateQueries({ queryKey: ["points-ledger"] });`
- L423: `queryClient.invalidateQueries({ queryKey: ["membership-info"] });`
- L424: `queryClient.invalidateQueries({ queryKey: ["points-ledger"] });`
- L462: `queryClient.invalidateQueries({ queryKey: ["membership-info"] });`
- L463: `queryClient.invalidateQueries({ queryKey: ["points-ledger"] });`

**Cache / fetch settings:**

- L15: `expiration: { enabled: boolean; months: number };`
- L66: `enabled: !!user?.id,`
- L67: `staleTime: 30000,`
- L95: `expiration: { enabled: false, months: 12 },`
- L122: `staleTime: 60000,`
- L195: `enabled: !!targetUserId,`
- L196: `staleTime: 30000,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
50: .from("profiles")
51: .select("member_id, points_balance, membership_tier, membership_joined_at, membership_status")
52: .eq("id", user.id)
115: .from("points_settings")
116: .select("setting_key, setting_value");
140: .from("points_settings")
141: .update({
146: .eq("setting_key", dbKey);
173: .from("points_ledger")
174: .select("*")
175: .eq("user_id", targetUserId)
176: .order("created_at", { ascending: false })
177: .limit(100);
268: .from("points_settings")
269: .select("setting_key, setting_value");
279: .from("points_ledger")
280: .select("id")
281: .eq("booking_id", bookingId)
282: .eq("transaction_type", "earn")
299: const { data, error } = await supabase.rpc("update_points_balance", {
342: const { data, error } = await supabase.rpc("update_points_balance", {
382: .from("points_ledger")
383: .select("points")
384: .eq("booking_id", bookingId)
385: .eq("transaction_type", "earn")
395: .from("points_ledger")
396: .select("id")
397: .eq("booking_id", bookingId)
398: .eq("transaction_type", "reverse")
409: const { data, error } = await supabase.rpc("update_points_balance", {
449: const { data, error } = await supabase.rpc("update_points_balance", {
```

**Cache invalidation on success:**

- L152: `queryClient.invalidateQueries({ queryKey: ["points-settings"] });`
- L315: `queryClient.invalidateQueries({ queryKey: ["membership-info"] });`
- L316: `queryClient.invalidateQueries({ queryKey: ["points-ledger"] });`
- L356: `queryClient.invalidateQueries({ queryKey: ["membership-info"] });`
- L357: `queryClient.invalidateQueries({ queryKey: ["points-ledger"] });`
- L423: `queryClient.invalidateQueries({ queryKey: ["membership-info"] });`
- L424: `queryClient.invalidateQueries({ queryKey: ["points-ledger"] });`
- L462: `queryClient.invalidateQueries({ queryKey: ["membership-info"] });`
- L463: `queryClient.invalidateQueries({ queryKey: ["points-ledger"] });`

**Error handling:**

- L55: `if (error) throw error;`
- L118: `if (error) throw error;`
- L148: `if (error) throw error;`
- L155: `onError: (error) => {`
- L156: `console.error("Failed to update points settings:", error);`
- L157: `toast.error("Failed to update settings");`
- L179: `if (error) throw error;`
- L309: `if (error) throw error;`
- L319: `onError: (error) => {`
- L320: `console.error("Failed to award points:", error);`
- L351: `if (error) throw error;`
- L359: `onError: (error) => {`
- L360: `console.error("Failed to redeem points:", error);`
- L361: `toast.error("Failed to redeem points");`
- L417: `if (error) throw error;`
- L427: `onError: (error) => {`
- L428: `console.error("Failed to reverse points:", error);`
- L457: `if (error) throw error;`
- L466: `onError: (error) => {`
- L467: `console.error("Failed to adjust points:", error);`

**Return shape(s):** `{memberId: data.member_id,
        pointsBalance: data.points_balance || 0,
        tier: (data.membership_tier as MembershipInfo["tier"]) || "bronze",
        joinedAt: data.membership_joined_at,
    }`; `{discount: Math.round(discount * 100) / 100,
    actualPointsUsed,}`; `{pointsEarned: 0}`; `{pointsEarned: 0, alreadyAwarded: true}`

**Consumed by:** `src/components/admin/PointsSettingsPanel.tsx`, `src/components/checkout/PointsRedemption.tsx`, `src/domain/bookings/mutations.ts`, `src/pages/Dashboard.tsx`, `supabase/functions/update-booking-status/index.ts`

### `src/hooks/use-pre-activation-check.ts`

**File header:** use-pre-activation-check Fetches whether a booking has both a rental payment row AND a deposit hold before staff can activate the rental. Used to gate the activation button with a confirmation modal when either is missing.

**Exports:** `usePreActivationCheck`, `logActivationOverride`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
21: .from("bookings")
22: .select("wl_deposit_auth_status, deposit_status")
23: .eq("id", bookingId)
26: .from("payments")
27: .select("id")
28: .eq("booking_id", bookingId)
29: .eq("payment_type", "rental")
30: .limit(1),
32: .from("deposit_ledger")
33: .select("id")
34: .eq("booking_id", bookingId)
35: .eq("action", "hold")
36: .limit(1),
62: await supabase.from("audit_logs").insert({
```

**Return shape(s):** `{missingRental,
      missingDeposit,
      ok: !missingRental && !missingDeposit,}`

**Consumed by:** `src/features/delivery/pages/Detail.tsx`

### `src/hooks/use-protection-settings.ts`

**File header:** Hook to fetch and update protection package pricing from system_settings. All 3 groups are now admin-editable via system_settings. Falls back to hardcoded defaults if settings are not found.

**Exports:** `buildProtectionPackages`, `useProtectionPackages`, `getGroupSettingsFromRows`, `useUpdateProtectionSettings`

**Query keys:**

- L181: `queryKey: ["protection-settings"],`
- L239: `queryClient.invalidateQueries({ queryKey: ["protection-settings"] });`

**Cache / fetch settings:**

- L195: `staleTime: 30_000,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
184: .from("system_settings" as any)
185: .select("key, value")
186: .in("key", allKeys);
233: .from("system_settings" as any)
234: .upsert({ key, value: String(value) } as any, { onConflict: "key" });
```

**Cache invalidation on success:**

- L239: `queryClient.invalidateQueries({ queryKey: ["protection-settings"] });`

**Error handling:**

- L242: `onError: (error: Error) => {`
- L243: `toast.error("Failed to update: " + error.message);`

**Return shape(s):** `{packages,
    rates,
    settings: groupSettings,
    allRows: rows,
    isLoading: query.isLoading,
    group,}`

**Consumed by:** `src/components/admin/ProtectionPricingPanel.tsx`, `src/components/admin/ops/ProtectionChangePanel.tsx`, `src/components/shared/TotalBar.tsx`, `src/pages/AddOns.tsx`, `src/pages/NewCheckout.tsx`, `src/pages/Protection.tsx`

### `src/hooks/use-realtime-subscriptions.ts`

**File header:** Real-time subscriptions for active rentals and alerts Uses Supabase Realtime to receive instant updates

**Exports:** `useRealtimeBookings`, `useRealtimeAlerts`, `useRealtimeDamages`, `useRealtimeVerifications`, `useRealtimeDeliveryStatuses`, `useAdminRealtimeSubscriptions`, `useRealtimeDeliveries`, `useCustomerRealtimeSubscriptions`

**Query keys:**

- L29: `queryClient.invalidateQueries({ queryKey: ["active-rentals"] });`
- L30: `queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });`
- L31: `queryClient.invalidateQueries({ queryKey: ["bookings"] });`
- L37: `queryClient.invalidateQueries({ queryKey: ["booking-stats"] });`
- L70: `queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });`
- L71: `queryClient.invalidateQueries({ queryKey: ["pending-alerts-count"] });`
- L83: `queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });`
- L84: `queryClient.invalidateQueries({ queryKey: ["pending-alerts-count"] });`
- L96: `queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });`
- L97: `queryClient.invalidateQueries({ queryKey: ["pending-alerts-count"] });`
- L129: `queryClient.invalidateQueries({ queryKey: ["damage-reports"] });`
- L158: `queryClient.invalidateQueries({ queryKey: ["admin-verifications"] });`
- L159: `queryClient.invalidateQueries({ queryKey: ["admin-verifications-overview"] });`
- L194: `queryClient.invalidateQueries({ queryKey: ["booking"] });`
- L195: `queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });`
- L196: `queryClient.invalidateQueries({ queryKey: ["delivery-detail"] });`
- L197: `queryClient.invalidateQueries({ queryKey: ["active-rentals"] });`
- L202: `queryClient.invalidateQueries({ queryKey: ["booking", newRecord.booking_id] });`
- L250: `queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });`
- L251: `queryClient.invalidateQueries({ queryKey: ["delivery-detail"] });`
- L264: `queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });`
- L265: `queryClient.invalidateQueries({ queryKey: ["delivery-detail"] });`
- L304: `queryClient.invalidateQueries({ queryKey: ["my-bookings"] });`
- L305: `queryClient.invalidateQueries({ queryKey: ["booking"] });`
- L306: `queryClient.invalidateQueries({ queryKey: ["booking-pickup"] });`
- L319: `queryClient.invalidateQueries({ queryKey: ["rental-agreement"] });`
- L320: `queryClient.invalidateQueries({ queryKey: ["my-agreements"] });`
- L334: `queryClient.invalidateQueries({ queryKey: ["my-verifications"] });`
- L335: `queryClient.invalidateQueries({ queryKey: ["booking-verification"] });`

**Supabase statements:** none (pure computation or context hook)

**Cache invalidation on success:**

- L29: `queryClient.invalidateQueries({ queryKey: ["active-rentals"] });`
- L30: `queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });`
- L31: `queryClient.invalidateQueries({ queryKey: ["bookings"] });`
- L37: `queryClient.invalidateQueries({ queryKey: ["booking-stats"] });`
- L70: `queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });`
- L71: `queryClient.invalidateQueries({ queryKey: ["pending-alerts-count"] });`
- L83: `queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });`
- L84: `queryClient.invalidateQueries({ queryKey: ["pending-alerts-count"] });`
- L96: `queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });`
- L97: `queryClient.invalidateQueries({ queryKey: ["pending-alerts-count"] });`
- L129: `queryClient.invalidateQueries({ queryKey: ["damage-reports"] });`
- L158: `queryClient.invalidateQueries({ queryKey: ["admin-verifications"] });`
- L159: `queryClient.invalidateQueries({ queryKey: ["admin-verifications-overview"] });`
- L194: `queryClient.invalidateQueries({ queryKey: ["booking"] });`
- L195: `queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });`
- L196: `queryClient.invalidateQueries({ queryKey: ["delivery-detail"] });`
- L197: `queryClient.invalidateQueries({ queryKey: ["active-rentals"] });`
- L202: `queryClient.invalidateQueries({ queryKey: ["booking", newRecord.booking_id] });`
- L250: `queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });`
- L251: `queryClient.invalidateQueries({ queryKey: ["delivery-detail"] });`
- L264: `queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });`
- L265: `queryClient.invalidateQueries({ queryKey: ["delivery-detail"] });`
- L304: `queryClient.invalidateQueries({ queryKey: ["my-bookings"] });`
- L305: `queryClient.invalidateQueries({ queryKey: ["booking"] });`
- L306: `queryClient.invalidateQueries({ queryKey: ["booking-pickup"] });`
- L319: `queryClient.invalidateQueries({ queryKey: ["rental-agreement"] });`
- L320: `queryClient.invalidateQueries({ queryKey: ["my-agreements"] });`
- L334: `queryClient.invalidateQueries({ queryKey: ["my-verifications"] });`
- L335: `queryClient.invalidateQueries({ queryKey: ["booking-verification"] });`

**Consumed by:** `src/components/admin/RealtimeAlertsPanel.tsx`, `src/pages/BookingDetail.tsx`, `src/pages/Dashboard.tsx`, `src/pages/admin/ActiveRentals.tsx`, `src/pages/admin/BookingOps.tsx`, `src/pages/admin/Overview.tsx`

### `src/hooks/use-receipt-upload.ts`

**Exports:** `useReceiptUpload`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
44: .from("expense-receipts")
85: .from("expense-receipts")
110: .from("expense-receipts")
```

**Error handling:**

- L50: `if (error) throw error;`
- L59: `toast({`
- L70: `toast({`
- L88: `if (error) throw error;`
- L90: `toast({`
- L98: `toast({`
- L113: `if (error) throw error;`
- L116: `console.error("Failed to get signed URL:", error);`

**Return shape(s):** `{url: filePath,
        path: filePath,}`; `{uploadReceipt,
    deleteReceipt,
    getSignedUrl,
    isUploading,
    progress,}`

**Consumed by:** `src/components/admin/VehicleUnitDetail.tsx`

### `src/hooks/use-receipts.ts`

**Exports:** `useBookingsForReceipt`, `useCreateReceipt`, `useIssueReceipt`, `useBookingReceipts`

**Query keys:**

- L36: `queryKey: ["bookings-for-receipt", search],`
- L175: `queryClient.invalidateQueries({ queryKey: ["admin-receipts"] });`
- L176: `queryClient.invalidateQueries({ queryKey: ["bookings-for-receipt"] });`
- L220: `queryClient.invalidateQueries({ queryKey: ["admin-receipts"] });`
- L233: `queryKey: ["booking-receipts", bookingId],`

**Cache / fetch settings:**

- L122: `enabled: search.length >= 2,`
- L247: `enabled: !!bookingId,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
41: .from("bookings")
42: .select(`
55: .or(`booking_code.ilike.%${search}%`)
56: .limit(10);
65: .from("vehicle_categories")
66: .select("id, name")
67: .in("id", categoryIds)
74: .from("profiles")
75: .select("id, full_name, email")
76: .in("id", userIds);
82: .from("receipts")
83: .select("booking_id, id")
84: .in("booking_id", bookingIds);
89: .from("booking_add_ons")
90: .select("booking_id, price, add_on:add_ons(name)")
91: .in("booking_id", bookingIds);
148: .from("receipts")
149: .insert({
158: .select()
164: await supabase.from("receipt_events").insert({
196: .from("receipts")
197: .update({
201: .eq("id", receiptId)
202: .eq("status", "draft") // Only issue drafts
203: .select()
209: await supabase.from("receipt_events").insert({
238: .from("receipts")
239: .select("*")
240: .eq("booking_id", bookingId)
241: .eq("status", "issued")
242: .order("created_at", { ascending: false });
```

**Cache invalidation on success:**

- L175: `queryClient.invalidateQueries({ queryKey: ["admin-receipts"] });`
- L176: `queryClient.invalidateQueries({ queryKey: ["bookings-for-receipt"] });`
- L220: `queryClient.invalidateQueries({ queryKey: ["admin-receipts"] });`

**Error handling:**

- L59: `if (error) throw error;`
- L161: `if (error) throw error;`
- L179: `onError: (error: any) => {`
- L180: `console.error("Create receipt error:", error);`
- L181: `toast.error(error.message || "Failed to create receipt");`
- L206: `if (error) throw error;`
- L223: `onError: (error: any) => {`
- L224: `console.error("Issue receipt error:", error);`
- L225: `toast.error(error.message || "Failed to issue receipt");`
- L244: `if (error) throw error;`

**Consumed by:** `src/components/admin/BookingOpsDrawer.tsx`, `src/pages/BookingDetail.tsx`

### `src/hooks/use-rental-agreement.ts`

**Exports:** `useRentalAgreement`, `useGenerateAgreement`, `useSignAgreement`, `useConfirmAgreement`, `useVoidAgreement`, `useMarkSignedManually`

**Query keys:**

- L106: `queryKey: ["rental-agreement", bookingId],`
- L218: `queryKey: ["rental-agreement", bookingId],`
- L222: `queryKey: ["booking", bookingId],`
- L275: `queryClient.invalidateQueries({ queryKey: ["rental-agreement"] });`
- L276: `queryClient.invalidateQueries({ queryKey: ["booking"] });`
- L314: `queryClient.invalidateQueries({ queryKey: ["rental-agreement"] });`
- L315: `queryClient.invalidateQueries({ queryKey: ["booking"] });`
- L348: `queryClient.invalidateQueries({ queryKey: ["rental-agreement"] });`
- L394: `queryClient.invalidateQueries({ queryKey: ["rental-agreement"] });`
- L395: `queryClient.invalidateQueries({ queryKey: ["booking"] });`

**Cache / fetch settings:**

- L148: `enabled: !!bookingId,`
- L149: `staleTime: 15000,`
- L150: `gcTime: 60000,`
- L154: `// Generate agreement via edge function with retry logic`
- L199: `// Only retry on network/timeout errors`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
113: .from("rental_agreements")
114: .select("*")
115: .eq("booking_id", bookingId)
117: .order("created_at", { ascending: false })
118: .limit(1)
121: .from("inspection_metrics")
122: .select("odometer, fuel_level")
123: .eq("booking_id", bookingId)
124: .eq("phase", "pickup")
166: const { data, error } = await supabase.functions.invoke("generate-agreement", {
186: await supabase.functions.invoke("send-booking-notification", {
252: .from("rental_agreements")
253: .update({
259: .eq("id", agreementId);
266: await supabase.functions.invoke("send-booking-notification", {
295: .from("rental_agreements")
296: .update({
301: .eq("id", agreementId);
306: await supabase.from("audit_logs").insert({
333: .from("rental_agreements")
334: .update({ status: "voided" })
335: .eq("id", agreementId);
340: await supabase.from("audit_logs").insert({
369: .from("rental_agreements")
370: .update({
380: .eq("id", agreementId);
385: await supabase.from("audit_logs").insert({
```

**Cache invalidation on success:**

- L217: `queryClient.invalidateQueries({`
- L221: `queryClient.invalidateQueries({`
- L275: `queryClient.invalidateQueries({ queryKey: ["rental-agreement"] });`
- L276: `queryClient.invalidateQueries({ queryKey: ["booking"] });`
- L314: `queryClient.invalidateQueries({ queryKey: ["rental-agreement"] });`
- L315: `queryClient.invalidateQueries({ queryKey: ["booking"] });`
- L348: `queryClient.invalidateQueries({ queryKey: ["rental-agreement"] });`
- L394: `queryClient.invalidateQueries({ queryKey: ["rental-agreement"] });`
- L395: `queryClient.invalidateQueries({ queryKey: ["booking"] });`

**Error handling:**

- L179: `throw error;`
- L190: `console.error("Failed to send agreement notification:", e);`
- L231: `onError: (error: Error) => {`
- L232: `toast.error(`Failed to generate agreement: ${error.message}`);`
- L261: `if (error) throw error;`
- L270: `console.error("Failed to send signed notification:", e);`
- L279: `onError: (error: Error) => {`
- L280: `toast.error(`Failed to sign agreement: ${error.message}`);`
- L303: `if (error) throw error;`
- L318: `onError: (error: Error) => {`
- L319: `toast.error(`Failed to confirm agreement: ${error.message}`);`
- L337: `if (error) throw error;`
- L351: `onError: (error: Error) => {`
- L352: `toast.error(`Failed to void agreement: ${error.message}`);`
- L382: `if (error) throw error;`
- L398: `onError: (error: Error) => {`
- L399: `toast.error(`Failed to mark as signed: ${error.message}`);`

**Consumed by:** `src/components/admin/BookingOpsDrawer.tsx`, `src/components/admin/RentalAgreementPanel.tsx`, `src/components/admin/ops/steps/StepAgreement.tsx`, `src/components/booking/RentalAgreementSign.tsx`, `src/pages/BookingDetail.tsx`, `src/pages/admin/Agreements.tsx`, `src/pages/admin/BookingOps.tsx`, `src/pages/booking/BookingAgreement.tsx`, `src/pages/booking/BookingPickup.tsx`

### `src/hooks/use-require-auth.ts`

**File header:** Hook to require authentication for booking actions. Returns a function that checks auth and redirects if needed.

**Exports:** `useRequireAuth`

**Supabase statements:** none (pure computation or context hook)

**Error handling:**

- L22: `toast({`

**Return shape(s):** `{user, isLoading, requireAuth}`

**Consumed by:** **NOT CONSUMED ANYWHERE — dead code**

### `src/hooks/use-return-receipt.ts`

**File header:** Hook for generating return receipts after deposit processing PR7: Performance optimization - streamlined mutation handling

**Exports:** `useGenerateReturnReceipt`

**Query keys:**

- L46: `queryClient.invalidateQueries({ queryKey: ["admin-receipts"] });`
- L47: `queryClient.invalidateQueries({ queryKey: ["booking-receipts", variables.bookingId] });`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
31: const { data, error } = await supabase.functions.invoke("generate-return-receipt", {
```

**Cache invalidation on success:**

- L46: `queryClient.invalidateQueries({ queryKey: ["admin-receipts"] });`
- L47: `queryClient.invalidateQueries({ queryKey: ["booking-receipts", variables.bookingId] });`

**Error handling:**

- L36: `console.error("Generate receipt error:", error);`
- L56: `onError: (error: Error) => {`
- L57: `console.error("Receipt generation failed:", error);`
- L58: `toast.error("Failed to generate receipt: " + error.message);`

**Consumed by:** `src/components/admin/return-ops/steps/StepReturnDeposit.tsx`

### `src/hooks/use-return-state.ts`

**Exports:** `useReturnStateTransition`, `useCompleteReturnStep`, `useInitiateReturn`

**Query keys:**

- L110: `queryClient.invalidateQueries({ queryKey: ["booking", variables.bookingId] });`
- L111: `queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });`
- L112: `queryClient.invalidateQueries({ queryKey: ["active-rentals"] });`
- L113: `queryClient.invalidateQueries({ queryKey: ["returns"] });`
- L201: `queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
38: .from("bookings")
39: .select("return_state, status, actual_return_at")
40: .eq("id", bookingId)
101: .from("bookings")
102: .update(updateData)
103: .eq("id", bookingId);
165: .from("bookings")
166: .select("return_state, status")
167: .eq("id", bookingId)
186: .from("bookings")
187: .update({
191: .eq("id", bookingId);
```

**Cache invalidation on success:**

- L110: `queryClient.invalidateQueries({ queryKey: ["booking", variables.bookingId] });`
- L111: `queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });`
- L112: `queryClient.invalidateQueries({ queryKey: ["active-rentals"] });`
- L113: `queryClient.invalidateQueries({ queryKey: ["returns"] });`
- L201: `queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });`

**Error handling:**

- L105: `if (error) throw error;`
- L115: `onError: (error: Error) => {`
- L116: `toast.error(error.message || "Failed to update return state");`
- L193: `if (error) throw error;`
- L203: `onError: (error: Error) => {`
- L204: `toast.error(error.message || "Failed to initiate return");`

**Return shape(s):** `{newState: targetState}`; `{alreadyComplete: true, newState: currentState}`; `{alreadyComplete: false, newState: targetState}`; `{alreadyInitiated: true, currentState}`

**Consumed by:** `src/pages/admin/ReturnOps.tsx`

### `src/hooks/use-returns.ts`

**Exports:** `useReturns`

**Query keys:**

- L56: `queryKey: ["admin-returns", dateFilter, locationId],`

**Cache / fetch settings:**

- L196: `staleTime: 30000,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
82: .from("bookings")
83: .select(`
87: .eq("status", "active")
90: .order("end_at", { ascending: true });
93: query = query.eq("location_id", locationId);
109: .from("vehicle_categories")
110: .select("id, name, image_url")
111: .in("id", categoryIds)
119: ? await supabase.from("customers").select("id, full_name, email, phone").in("id", customerIds)
```

**Error handling:**

- L99: `console.error("Error fetching returns:", error);`
- L100: `throw error;`

**Consumed by:** `src/pages/admin/Returns.tsx`

### `src/hooks/use-revenue-analytics.ts`

**File header:** Revenue & Add-On Analytics Hook Fetches and calculates rental pricing and add-on metrics Includes booking-level extras (protection, upgrades, young driver fees)

**Exports:** `useRevenueAnalytics`, `exportToCSV`

**Query keys:**

- L100: `queryKey: [`
- L147: `queryKey: ["revenue-analytics-categories"],`
- L160: `queryKey: ["revenue-analytics-addons", filters.startDate.toISOString(), filters.endDate.toISOString()],`

**Cache / fetch settings:**

- L142: `staleTime: 60000,`
- L155: `staleTime: 300000,`
- L175: `staleTime: 60000,`
- L176: `enabled: !!bookingsQuery.data,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
112: .from("bookings")
113: .select("id, daily_rate, total_days, total_amount, booking_source, start_at, created_at, location_id, vehicle_id, pickup_address, status, wl_transaction_id, protection_plan, young_driver_fee, upgrade_daily_fee")
116: .in("status", ["confirmed", "active", "completed"]);
130: .from("payments")
131: .select("booking_id, amount")
132: .in("booking_id", chunk)
133: .in("status", ["completed", "captured"]);
150: .from("vehicle_categories")
151: .select("id, name");
163: .from("booking_add_ons")
164: .select(`
342: const addOnBreakdown: AddOnBreakdown[] = Array.from(addOnStats.entries()).map(([id, stats]) => ({
```

**Error handling:**

- L118: `if (error) throw error;`
- L152: `if (error) throw error;`
- L172: `if (error) throw error;`

**Return shape(s):** `{bookings, paidMap: new Map<string, number>()}`; `{bookings, paidMap}`; `{rentalMetrics: { averageRentalPrice: 0, totalBookings: 0, totalRentalBaseRevenue: 0, medianRentalPrice: 0, averageDays: 0}`; `{rentalMetrics: { averageRentalPrice, totalBookings: filteredBookings.length, totalRentalBaseRevenue, medianRentalPrice, averageDays}`

**Consumed by:** `src/components/admin/analytics/RevenueAnalyticsTab.tsx`, `src/pages/admin/Reports.tsx`

### `src/hooks/use-sidebar-counts.ts`

**File header:** Real-time sidebar notification counts for admin panel Provides unified counts for all sections requiring attention

**Exports:** `useSidebarCounts`

**Query keys:**

- L29: `queryKey: ["sidebar-counts"],`
- L136: `() => queryClient.invalidateQueries({ queryKey: ["sidebar-counts"] })`
- L142: `() => queryClient.invalidateQueries({ queryKey: ["sidebar-counts"] })`
- L148: `() => queryClient.invalidateQueries({ queryKey: ["sidebar-counts"] })`
- L154: `() => queryClient.invalidateQueries({ queryKey: ["sidebar-counts"] })`
- L159: `() => queryClient.invalidateQueries({ queryKey: ["sidebar-counts"] })`
- L165: `() => queryClient.invalidateQueries({ queryKey: ["sidebar-counts"] })`

**Cache / fetch settings:**

- L124: `staleTime: 15000, // 15 seconds - realtime handles updates`
- L125: `refetchInterval: 60000, // Fallback refetch every minute`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
50: .from("admin_alerts")
51: .select("id, title, message")
52: .eq("status", "pending")
53: .order("created_at", { ascending: false })
54: .limit(1000),
58: .from("bookings")
59: .select("*", { count: "exact", head: true })
60: .eq("status", "confirmed")
66: .from("bookings")
67: .select("*", { count: "exact", head: true })
68: .eq("status", "active")
73: .from("incident_cases")
74: .select("*", { count: "exact", head: true })
79: .from("support_tickets_v2")
80: .select("*", { count: "exact", head: true })
81: .in("status", ["new", "in_progress", "waiting_customer", "escalated"]),
85: .from("payments")
86: .select("*", { count: "exact", head: true })
87: .eq("status", "pending"),
91: .from("bookings")
92: .select("*", { count: "exact", head: true })
93: .eq("status", "active"),
97: .from("bookings")
98: .select("*", { count: "exact", head: true })
99: .eq("status", "active")
```

**Cache invalidation on success:**

- L136: `() => queryClient.invalidateQueries({ queryKey: ["sidebar-counts"] })`
- L142: `() => queryClient.invalidateQueries({ queryKey: ["sidebar-counts"] })`
- L148: `() => queryClient.invalidateQueries({ queryKey: ["sidebar-counts"] })`
- L154: `() => queryClient.invalidateQueries({ queryKey: ["sidebar-counts"] })`
- L159: `() => queryClient.invalidateQueries({ queryKey: ["sidebar-counts"] })`
- L165: `() => queryClient.invalidateQueries({ queryKey: ["sidebar-counts"] })`

**Return shape(s):** `{alerts,
        operations: pickups + overdueRentals,
        incidents,
        support: tickets,
        billing: pendingPayments,
        pickups,
        active: activeRentals,
        returns,}`; `{counts: query.data ?? {
      alerts: 0,
      operations: 0,
      incidents: 0,
      support: 0,
      billing: 0,
      pickups: 0,
      active: 0,
      returns: 0,}`

**Consumed by:** `src/components/layout/AdminShell.tsx`, `src/components/ops/OpsShell.tsx`

### `src/hooks/use-signature-capture.ts`

**File header:** Signature save hook for admin rental agreement signing

**Exports:** `useSaveSignature`, `useRecaptureSignature`

**Query keys:**

- L116: `queryClient.invalidateQueries({ queryKey: ["rental-agreement", variables.bookingId] });`
- L117: `queryClient.invalidateQueries({ queryKey: ["rental-agreement"] });`
- L118: `queryClient.invalidateQueries({ queryKey: ["booking"] });`
- L170: `queryClient.invalidateQueries({ queryKey: ["rental-agreement", variables.bookingId] });`
- L171: `queryClient.invalidateQueries({ queryKey: ["rental-agreement"] });`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
57: .from("signatures")
69: .from("signatures")
76: .from("rental_agreements")
77: .update({
92: .eq("id", agreementId);
99: await supabase.from("audit_logs").insert({
137: .from("rental_agreements")
138: .update({
153: .eq("id", agreementId);
158: await supabase.from("audit_logs").insert({
```

**Cache invalidation on success:**

- L116: `queryClient.invalidateQueries({ queryKey: ["rental-agreement", variables.bookingId] });`
- L117: `queryClient.invalidateQueries({ queryKey: ["rental-agreement"] });`
- L118: `queryClient.invalidateQueries({ queryKey: ["booking"] });`
- L170: `queryClient.invalidateQueries({ queryKey: ["rental-agreement", variables.bookingId] });`
- L171: `queryClient.invalidateQueries({ queryKey: ["rental-agreement"] });`

**Error handling:**

- L121: `onError: (error: Error) => {`
- L122: `toast.error(error.message);`
- L155: `if (error) throw error;`
- L174: `onError: (error: Error) => {`
- L175: `toast.error(`Failed to initiate recapture: ${error.message}`);`

**Return shape(s):** `{signatureUrl}`

**Consumed by:** `src/components/admin/RentalAgreementPanel.tsx`

### `src/hooks/use-signed-storage-url.ts`

**Exports:** `useSignedStorageUrl`

**Query keys:**

- L16: `queryKey: ["signed-storage-url", bucket, path, expiresIn],`

**Cache / fetch settings:**

- L27: `enabled: enabled && !!path,`
- L28: `staleTime: Math.min(expiresIn * 1000, 10 * 60 * 1000),`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
21: .from(bucket)
```

**Error handling:**

- L24: `if (error) throw error;`

**Consumed by:** `src/components/admin/BookingOpsDrawer.tsx`, `src/components/admin/ops/LicenseReviewCard.tsx`

### `src/hooks/use-staff-location.ts`

**File header:** Staff location scope Exactly two roles exist: `super_admin` (all branches, may switch) and `manager` (locked to one branch). This hook resolves the acting user's branch assignment from `staff_assignments`.

**Exports:** `useMyStaffAssignment`, `useStaffLocation`, `useEffectiveLocationId`

**Query keys:**

- L31: `queryKey: ["staff-assignment", user?.id],`

**Cache / fetch settings:**

- L55: `enabled: !!user,`
- L56: `staleTime: 5 * 60 * 1000,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
35: .from("staff_assignments")
36: .select("id, user_id, location_id, display_name, employee_code, is_active")
37: .eq("user_id", user.id)
```

**Error handling:**

- L41: `console.error("Error loading staff assignment:", error);`

**Return shape(s):** `{id: data.id,
        userId: data.user_id,
        locationId: data.location_id,
        displayName: data.display_name,
        employeeCode: data.employee_code,
        isActive: data.is_active,}`; `{isLoading: capsLoading || assignmentLoading,
    isSuperAdmin,
    assignedLocationId,
    isUnassignedManager:
      !capsLoading && !assignmentLoading && !isSuperAdmin && !assignedLocationId,
    ca}`; `{locationId: null, isReady: false, isUnassignedManager: false}`; `{locationId: assignedLocationId, isReady: true, isUnassignedManager}`

**Consumed by:** `src/components/admin/fleet/AllVehiclesTable.tsx`, `src/components/admin/fleet/ByCategoryTab.tsx`, `src/components/admin/fleet/ByVehicleTab.tsx`, `src/components/admin/fleet/CostTrackingTab.tsx`, `src/components/admin/fleet/FleetOverviewTab.tsx`, `src/components/admin/fleet/PerformanceComparisonTab.tsx`, `src/components/admin/fleet/TemporaryVehiclesTable.tsx`, `src/components/admin/fleet/UtilizationTab.tsx`, `src/components/ops/OpsLocationFilter.tsx`, `src/context/LocationScopeProvider.tsx`, `src/hooks/use-active-rentals.ts`, `src/hooks/use-alerts.ts`, `src/hooks/use-bookings.ts`, `src/hooks/use-pending-alerts-count.ts`, `src/hooks/use-pending-ticket-notice.ts`, `src/hooks/use-support-v2.ts`, `src/pages/admin/Agreements.tsx`, `src/pages/admin/Analytics.tsx`, `src/pages/admin/Bookings.tsx`, `src/pages/admin/Calendar.tsx`, `src/pages/admin/Damages.tsx`, `src/pages/admin/Finance.tsx`, `src/pages/admin/FleetCosts.tsx`, `src/pages/admin/FleetManagement.tsx`, `src/pages/admin/Incidents.tsx`, `src/pages/admin/Inventory.tsx`, `src/pages/admin/Reports.tsx`, `src/pages/admin/Staff.tsx`, `src/pages/ops/OpsActiveRentals.tsx`, `src/pages/ops/OpsFleet.tsx`

### `src/hooks/use-support-access.ts`

**File header:** Check if current user has support access (support, staff, or admin role)

**Exports:** `useIsSupportOrAdmin`, `useIsSupportOnly`

**Query keys:**

- L12: `queryKey: ["user-is-support", user?.id],`
- L41: `queryKey: ["user-is-support-only", user?.id],`

**Cache / fetch settings:**

- L29: `enabled: !!user,`
- L30: `staleTime: 60000,`
- L64: `enabled: !!user,`
- L65: `staleTime: 60000,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
17: .from("user_roles")
18: .select("role")
19: .eq("user_id", user.id)
20: .in("role", ["super_admin", "manager", "admin", "staff", "support"]);
46: .from("user_roles")
47: .select("role")
48: .eq("user_id", user.id);
```

**Error handling:**

- L23: `console.error("Error checking support status:", error);`
- L51: `console.error("Error checking support status:", error);`

**Consumed by:** `src/components/support/SupportProtectedRoute.tsx`

### `src/hooks/use-support-v2.ts`

**File header:** Branch filter for support tickets. Tickets carry no location column, so the branch is derived from the linked booking / incident / damage. Tickets with no resolvable branch stay visible to Super Admins and to the manager who created or owns them.

**Exports:** `useTicketQueueCounts`, `filterTicketsByBranch`, `useSupportTicketsV2`, `useSupportTicketById`, `useCreateTicketV2`, `useUpdateTicketV2`, `useSendMessageV2`, `useEscalateTicketV2`, `useCloseTicketV2`, `useSupportMacros`, `useSupportAnalytics`, `useCreateTicketFromIncident`, `useCustomerTicketsV2`, `useCustomerTicketByIdV2`, `useCreateCustomerTicketV2`, `useSendCustomerMessageV2`

**Query keys:**

- L105: `queryKey: ["ticket-queue-counts-v2", locationId ?? "all"],`
- L157: `queryKey: ["support-tickets-v2", filters, locationId ?? "all"],`
- L251: `queryKey: ["support-ticket-v2", ticketId],`
- L398: `queryClient.invalidateQueries({ queryKey: ["support-tickets-v2"] });`
- L399: `queryClient.invalidateQueries({ queryKey: ["ticket-queue-counts-v2"] });`
- L459: `queryClient.invalidateQueries({ queryKey: ["support-tickets-v2"] });`
- L460: `queryClient.invalidateQueries({ queryKey: ["support-ticket-v2", variables.id] });`
- L461: `queryClient.invalidateQueries({ queryKey: ["ticket-queue-counts-v2"] });`
- L586: `queryClient.invalidateQueries({ queryKey: ["support-tickets-v2"] });`
- L587: `queryClient.invalidateQueries({ queryKey: ["support-ticket-v2", variables.ticketId] });`
- L642: `queryClient.invalidateQueries({ queryKey: ["support-tickets-v2"] });`
- L643: `queryClient.invalidateQueries({ queryKey: ["support-ticket-v2", variables.ticketId] });`
- L644: `queryClient.invalidateQueries({ queryKey: ["ticket-queue-counts-v2"] });`
- L690: `queryClient.invalidateQueries({ queryKey: ["support-tickets-v2"] });`
- L691: `queryClient.invalidateQueries({ queryKey: ["support-ticket-v2", variables.ticketId] });`
- L692: `queryClient.invalidateQueries({ queryKey: ["ticket-queue-counts-v2"] });`
- L705: `queryKey: ["support-macros", category],`
- L734: `queryKey: ["support-analytics-v2", dateRange, locationId ?? "all"],`
- L889: `queryKey: ["customer-tickets-v2", user?.id],`
- L945: `queryKey: ["customer-ticket-v2", ticketId],`
- L1060: `queryClient.invalidateQueries({ queryKey: ["customer-tickets-v2"] });`
- L1061: `queryClient.invalidateQueries({ queryKey: ["support-tickets-v2"] });`
- L1062: `queryClient.invalidateQueries({ queryKey: ["ticket-queue-counts-v2"] });`
- L1125: `queryClient.invalidateQueries({ queryKey: ["customer-tickets-v2"] });`
- L1126: `queryClient.invalidateQueries({ queryKey: ["customer-ticket-v2", variables.ticketId] });`
- L1127: `queryClient.invalidateQueries({ queryKey: ["support-tickets-v2"] });`

**Cache / fetch settings:**

- L132: `enabled: isReady && !isUnassignedManager,`
- L133: `staleTime: 30000,`
- L243: `enabled: isReady && !isUnassignedManager,`
- L244: `staleTime: 30000,`
- L326: `enabled: !!ticketId,`
- L724: `staleTime: 60000,`
- L836: `enabled: isReady && !isUnassignedManager,`
- L837: `staleTime: 60000,`
- L936: `enabled: !!user,`
- L986: `enabled: !!ticketId && !!user,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
108: .from("support_tickets_v2") as any)
109: .select("id, status, is_urgent, booking_id, incident_id, damage_id, created_by, assigned_to");
160: .from("support_tickets_v2") as any)
161: .select(`*`)
162: .order("is_urgent", { ascending: false })
163: .order("created_at", { ascending: false });
166: query = query.eq("status", filters.status);
169: query = query.eq("category", filters.category);
172: query = query.eq("priority", filters.priority);
175: query = query.eq("is_urgent", true);
181: query = query.eq("assigned_to", filters.assignedTo);
185: query = query.or(`ticket_id.ilike.%${filters.search}%,subject.ilike.%${filters.search}%,guest_email.ilike.%${filters.search}%,guest_phone.ilike.%${filters.search}%`);
194: const { data: allTickets, error } = await query.limit(200);
206: ? supabase.from("profiles").select("id, full_name, email, phone").in("id", customerIds)
209: ? supabase.from("profiles").select("id, full_name, email").in("id", assigneeIds)
212: ? supabase.from("bookings").select("id, booking_code").in("id", bookingIds)
215: .from("ticket_messages_v2") as any)
216: .select("ticket_id, message, created_at, sender_type")
217: .in("ticket_id", (data || []).map((t: any) => t.id))
218: .order("created_at", { ascending: false }),
256: .from("support_tickets_v2") as any)
257: .select("*")
258: .eq("id", ticketId)
267: ? supabase.from("profiles").select("id, full_name, email, phone").eq("id", data.customer_id).maybeSingle()
270: ? supabase.from("profiles").select("id, full_name, email").eq("id", data.assigned_to).maybeSingle()
273: ? supabase.from("bookings").select("id, booking_code, start_at, end_at, status").eq("id", data.booking_id).maybeSingle()
276: ? (supabase.from("incident_cases") as any).select("id, incident_type, severity, status").eq("id", data.incident_id).maybeSingle()
279: ? supabase.from("damage_reports").select("id, severity, location_on_vehicle, description, photo_urls").eq("id", data.damage_id).maybeSingle()
282: .from("ticket_messages_v2") as any)
283: .select("*")
284: .eq("ticket_id", ticketId)
285: .order("created_at", { ascending: true }),
287: .from("ticket_audit_log") as any)
288: .select("*")
289: .eq("ticket_id", ticketId)
290: .order("created_at", { ascending: true }),
299: ? await supabase.from("profiles").select("id, full_name, email").in("id", allUserIds)
369: .from("support_tickets_v2") as any)
370: .insert(insertData)
371: .select()
378: await (supabase.from("ticket_messages_v2") as any).insert({
388: await (supabase.from("ticket_audit_log") as any).insert({
420: .from("support_tickets_v2") as any)
421: .select("*")
422: .eq("id", id)
426: .from("support_tickets_v2") as any)
427: .update({ ...updates, updated_at: new Date().toISOString() })
428: .eq("id", id)
429: .select()
447: await (supabase.from("ticket_audit_log") as any).insert({
494: .from("ticket_messages_v2") as any)
495: .select("id")
496: .eq("ticket_id", ticketId)
497: .eq("sender_type", "staff")
498: .eq("message_type", "customer_visible")
499: .limit(1);
505: .from("ticket_messages_v2") as any)
506: .insert({
514: .select()
521: .from("support_tickets_v2") as any)
522: .update({
526: .eq("id", ticketId)
527: .eq("status", "new");
530: await (supabase.from("ticket_audit_log") as any).insert({
542: .from("support_tickets_v2") as any)
543: .select("id, ticket_id, customer_id, guest_phone, guest_name, subject")
544: .eq("id", ticketId)
548: await supabase.functions.invoke("send-support-sms", {
570: .from("support_macros") as any)
571: .select("usage_count")
572: .eq("id", macroId)
577: .from("support_macros") as any)
578: .update({ usage_count: (macroData.usage_count || 0) + 1 })
579: .eq("id", macroId);
607: .from("support_tickets_v2") as any)
608: .update({
615: .eq("id", ticketId)
616: .select()
622: await supabase.from("admin_alerts").insert({
631: await (supabase.from("ticket_audit_log") as any).insert({
664: .from("support_tickets_v2") as any)
665: .update({
672: .eq("id", ticketId)
673: .select()
679: await (supabase.from("ticket_audit_log") as any).insert({
708: .from("support_macros") as any)
709: .select("*")
710: .eq("is_active", true)
711: .order("usage_count", { ascending: false });
714: query = query.eq("category", category);
736: let query = (supabase.from("support_tickets_v2") as any).select("*");
894: .from("support_tickets_v2") as any)
895: .select(`*`)
896: .eq("customer_id", user.id)
897: .order("updated_at", { ascending: false });
906: .from("ticket_messages_v2") as any)
907: .select("ticket_id, message, created_at, sender_type, message_type")
908: .in("ticket_id", ticketIds)
909: .eq("message_type", "customer_visible") // Only show customer-visible messages
910: .order("created_at", { ascending: false });
950: .from("support_tickets_v2") as any)
951: .select(`*`)
952: .eq("id", ticketId)
953: .eq("customer_id", user.id)
961: .from("ticket_messages_v2") as any)
962: .select("*")
963: .eq("ticket_id", ticketId)
964: .eq("message_type", "customer_visible")
965: .order("created_at", { ascending: true });
970: .from("profiles")
971: .select("id, full_name")
972: .in("id", senderIds.length > 0 ? senderIds : ['placeholder'] as string[]);
1011: .from("support_tickets_v2") as any)
1012: .insert({
1024: .select()
1030: await (supabase.from("ticket_messages_v2") as any).insert({
1039: await (supabase.from("ticket_audit_log") as any).insert({
1048: const { error: smsError } = await supabase.functions.invoke("notify-branch-sms", {
1089: .from("support_tickets_v2") as any)
1090: .select("id, customer_id, status")
1091: .eq("id", ticketId)
1092: .eq("customer_id", user.id)
1100: .from("ticket_messages_v2") as any)
1101: .insert({
1108: .select()
1115: .from("support_tickets_v2") as any)
1116: .update({
1120: .eq("id", ticketId);
```

**Cache invalidation on success:**

- L398: `queryClient.invalidateQueries({ queryKey: ["support-tickets-v2"] });`
- L399: `queryClient.invalidateQueries({ queryKey: ["ticket-queue-counts-v2"] });`
- L459: `queryClient.invalidateQueries({ queryKey: ["support-tickets-v2"] });`
- L460: `queryClient.invalidateQueries({ queryKey: ["support-ticket-v2", variables.id] });`
- L461: `queryClient.invalidateQueries({ queryKey: ["ticket-queue-counts-v2"] });`
- L586: `queryClient.invalidateQueries({ queryKey: ["support-tickets-v2"] });`
- L587: `queryClient.invalidateQueries({ queryKey: ["support-ticket-v2", variables.ticketId] });`
- L642: `queryClient.invalidateQueries({ queryKey: ["support-tickets-v2"] });`
- L643: `queryClient.invalidateQueries({ queryKey: ["support-ticket-v2", variables.ticketId] });`
- L644: `queryClient.invalidateQueries({ queryKey: ["ticket-queue-counts-v2"] });`
- L690: `queryClient.invalidateQueries({ queryKey: ["support-tickets-v2"] });`
- L691: `queryClient.invalidateQueries({ queryKey: ["support-ticket-v2", variables.ticketId] });`
- L692: `queryClient.invalidateQueries({ queryKey: ["ticket-queue-counts-v2"] });`
- L1060: `queryClient.invalidateQueries({ queryKey: ["customer-tickets-v2"] });`
- L1061: `queryClient.invalidateQueries({ queryKey: ["support-tickets-v2"] });`
- L1062: `queryClient.invalidateQueries({ queryKey: ["ticket-queue-counts-v2"] });`
- L1125: `queryClient.invalidateQueries({ queryKey: ["customer-tickets-v2"] });`
- L1126: `queryClient.invalidateQueries({ queryKey: ["customer-ticket-v2", variables.ticketId] });`
- L1127: `queryClient.invalidateQueries({ queryKey: ["support-tickets-v2"] });`

**Error handling:**

- L111: `if (error) throw error;`
- L195: `if (error) throw error;`
- L261: `if (error) throw error;`
- L374: `if (error) throw error;`
- L402: `onError: (error) => {`
- L403: `console.error("Failed to create ticket:", error);`
- L404: `toast.error("Failed to create ticket");`
- L432: `if (error) throw error;`
- L464: `onError: (error) => {`
- L465: `console.error("Failed to update ticket:", error);`
- L466: `toast.error("Failed to update ticket");`
- L517: `if (error) throw error;`
- L561: `console.error("Failed to send support SMS notification:", smsError);`
- L590: `onError: (error) => {`
- L591: `console.error("Failed to send message:", error);`
- L592: `toast.error("Failed to send message");`
- L619: `if (error) throw error;`
- L647: `onError: (error) => {`
- L648: `console.error("Failed to escalate ticket:", error);`
- L649: `toast.error("Failed to escalate ticket");`

**Return shape(s):** `{kpis: {
          totalTickets,
          openTickets,
          escalatedCount,
          urgentCount,
          avgFirstResponseMins,
          avgResolutionHours,}`

**Consumed by:** `src/components/layout/SupportShell.tsx`, `src/hooks/use-pending-ticket-notice.ts`, `src/pages/BookingDetail.tsx`, `src/pages/admin/SupportAnalytics.tsx`, `src/pages/admin/SupportV2.tsx`, `src/pages/support/SupportAnalytics.tsx`, `src/pages/support/SupportTickets.tsx`

### `src/hooks/use-ticket-attachments.ts`

**Exports:** `useUploadTicketAttachment`, `useDeleteTicketAttachment`

**Query keys:**

- L51: `queryClient.invalidateQueries({ queryKey: ["ticket-attachments"] });`
- L74: `queryClient.invalidateQueries({ queryKey: ["ticket-attachments"] });`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
24: .from("ticket-attachments")
31: .from("ticket-attachments")
36: .from("ticket_attachments")
37: .insert({
66: .from("ticket_attachments")
67: .delete()
68: .eq("id", attachmentId);
```

**Cache invalidation on success:**

- L51: `queryClient.invalidateQueries({ queryKey: ["ticket-attachments"] });`
- L74: `queryClient.invalidateQueries({ queryKey: ["ticket-attachments"] });`

**Error handling:**

- L54: `onError: (error: Error) => {`
- L55: `toast.error("Failed to upload: " + error.message);`
- L70: `if (error) throw error;`
- L77: `onError: (error: Error) => {`
- L78: `toast.error("Failed to delete: " + error.message);`

**Return shape(s):** `{success: true, fileUrl: urlData.publicUrl}`; `{success: true}`

**Consumed by:** `src/pages/admin/Tickets.tsx`

### `src/hooks/use-tickets.ts`

**Exports:** `useTickets`, `useTicketById`, `useUpdateTicketStatus`, `useSendTicketMessage`, `useCreateTicket`, `useCustomerTickets`, `useCustomerTicketById`

**Query keys:**

- L56: `queryKey: ["admin-tickets", filters],`
- L144: `queryKey: ["admin-ticket", id],`
- L229: `queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });`
- L230: `queryClient.invalidateQueries({ queryKey: ["admin-ticket"] });`
- L284: `queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });`
- L285: `queryClient.invalidateQueries({ queryKey: ["admin-ticket"] });`
- L286: `queryClient.invalidateQueries({ queryKey: ["customer-tickets"] });`
- L287: `queryClient.invalidateQueries({ queryKey: ["customer-tickets-v2"] });`
- L288: `queryClient.invalidateQueries({ queryKey: ["support-tickets-v2"] });`
- L289: `queryClient.invalidateQueries({ queryKey: ["customer-ticket"] });`
- L386: `queryClient.invalidateQueries({ queryKey: ["customer-tickets"] });`
- L387: `queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });`
- L400: `queryKey: ["customer-tickets"],`
- L452: `queryKey: ["customer-ticket", ticketId],`

**Cache / fetch settings:**

- L138: `staleTime: 30000,`
- L205: `enabled: !!id,`
- L496: `enabled: !!ticketId,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
59: .from("tickets")
60: .select(`
64: .order("updated_at", { ascending: false });
67: query = query.eq("status", filters.status);
80: const { data, error } = await query.limit(100);
90: .from("profiles")
91: .select("id, full_name, email")
92: .in("id", userIds);
99: .from("ticket_messages")
100: .select("ticket_id, message, created_at, is_staff")
101: .in("ticket_id", ticketIds)
102: .order("created_at", { ascending: false });
149: .from("tickets")
150: .select(`
154: .eq("id", id)
162: .from("profiles")
163: .select("id, full_name, email, phone")
164: .eq("id", data.user_id)
169: .from("ticket_messages")
170: .select("*")
171: .eq("ticket_id", id)
172: .order("created_at", { ascending: true });
177: .from("profiles")
178: .select("id, full_name, email")
179: .in("id", senderIds);
216: .from("tickets")
217: .update({ status, updated_at: new Date().toISOString() })
218: .eq("id", ticketId)
219: .select()
250: .from("ticket_messages")
251: .insert([{
257: .select()
265: .from("tickets")
266: .update({
270: .eq("id", ticketId)
271: .eq("status", "open");
274: .from("tickets")
275: .update({ updated_at: new Date().toISOString() })
276: .eq("id", ticketId);
321: .from("profiles")
322: .select("full_name")
323: .eq("id", user.id)
332: .from("bookings")
333: .select("booking_code")
334: .eq("id", bookingId)
344: .from("support_tickets_v2") as any)
345: .insert({
355: .select()
361: const { error: messageError } = await (supabase.from("ticket_messages_v2") as any).insert({
406: .from("tickets")
407: .select(`
411: .eq("user_id", user.id)
412: .order("updated_at", { ascending: false });
419: .from("ticket_messages")
420: .select("ticket_id, message, created_at, is_staff")
421: .in("ticket_id", ticketIds)
422: .order("created_at", { ascending: false });
460: .from("tickets")
461: .select(`*, bookings (booking_code)`)
462: .eq("id", ticketId)
463: .eq("user_id", user.id)
471: .from("ticket_messages")
472: .select("*")
473: .eq("ticket_id", ticketId)
474: .order("created_at", { ascending: true });
479: .from("profiles")
480: .select("id, full_name")
481: .in("id", senderIds);
```

**Cache invalidation on success:**

- L229: `queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });`
- L230: `queryClient.invalidateQueries({ queryKey: ["admin-ticket"] });`
- L284: `queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });`
- L285: `queryClient.invalidateQueries({ queryKey: ["admin-ticket"] });`
- L286: `queryClient.invalidateQueries({ queryKey: ["customer-tickets"] });`
- L287: `queryClient.invalidateQueries({ queryKey: ["customer-tickets-v2"] });`
- L288: `queryClient.invalidateQueries({ queryKey: ["support-tickets-v2"] });`
- L289: `queryClient.invalidateQueries({ queryKey: ["customer-ticket"] });`
- L386: `queryClient.invalidateQueries({ queryKey: ["customer-tickets"] });`
- L387: `queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });`

**Error handling:**

- L83: `console.error("Error fetching tickets:", error);`
- L84: `throw error;`
- L157: `if (error) throw error;`
- L222: `if (error) throw error;`
- L233: `onError: (error) => {`
- L234: `console.error("Failed to update ticket:", error);`
- L235: `toast.error("Failed to update ticket status");`
- L260: `if (error) throw error;`
- L292: `onError: (error) => {`
- L293: `console.error("Failed to send message:", error);`
- L294: `toast.error("Failed to send message");`
- L368: `if (messageError) console.error("Ticket message failed:", messageError);`
- L373: `.catch(console.error);`
- L381: `}).catch(console.error);`
- L390: `onError: (error) => {`
- L391: `console.error("Failed to create ticket:", error);`
- L392: `toast.error("Failed to create ticket");`
- L414: `if (error) throw error;`
- L466: `if (error) throw error;`

**Return shape(s):** `{...data,
        profile: profileData,
        messages,}`

**Consumed by:** `src/components/booking/ReportIssueDialog.tsx`, `src/pages/admin/Tickets.tsx`

### `src/hooks/use-toast.ts`

**Exports:** `reducer`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
61: toastTimeouts.delete(toastId);
```

**Error handling:**

- L137: `function toast({ ...props }: Toast) {`

**Return shape(s):** `{...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),}`; `{...state,
        toasts: state.toasts.map((t) => (t.id === action.toast.id ? { ...t, ...action.toast}`; `{...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,}`; `{...state,
          toasts: [],}`

**Consumed by:** **NOT CONSUMED ANYWHERE — dead code**

### `src/hooks/use-unit-assignment.ts`

**Exports:** `useAvailableUnits`, `useLowInventoryAlerts`, `useAutoAssignUnit`, `useAssignUnit`, `useUpdateUnitMileage`, `useBookingAssignedUnit`

**Query keys:**

- L33: `queryKey: ["available-units", vehicleId],`
- L91: `queryKey: ["low-inventory-alerts", threshold],`
- L206: `queryClient.invalidateQueries({ queryKey: ["booking"] });`
- L207: `queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });`
- L208: `queryClient.invalidateQueries({ queryKey: ["available-units"] });`
- L209: `queryClient.invalidateQueries({ queryKey: ["low-inventory-alerts"] });`
- L210: `queryClient.invalidateQueries({ queryKey: ["booking-assigned-unit"] });`
- L258: `queryClient.invalidateQueries({ queryKey: ["booking"] });`
- L259: `queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });`
- L260: `queryClient.invalidateQueries({ queryKey: ["available-units"] });`
- L261: `queryClient.invalidateQueries({ queryKey: ["low-inventory-alerts"] });`
- L262: `queryClient.invalidateQueries({ queryKey: ["booking-assigned-unit", variables.bookingId] });`
- L293: `queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });`
- L294: `queryClient.invalidateQueries({ queryKey: ["vehicle-unit"] });`
- L302: `queryKey: ["booking-assigned-unit", bookingId],`

**Cache / fetch settings:**

- L84: `enabled: !!vehicleId,`
- L146: `staleTime: 60000, // Cache for 1 minute`
- L348: `enabled: !!bookingId,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
39: .from("vehicle_units")
40: .select("id, vin, license_plate, color, current_mileage, vehicle_id, category_id")
41: .eq("category_id", vehicleId) // vehicleId is actually categoryId in the new model
42: .eq("status", "available");
48: .from("vehicle_categories")
49: .select("name")
50: .eq("id", vehicleId)
55: .from("bookings")
56: .select("assigned_unit_id")
57: .in("status", ["confirmed", "active"])
95: .from("vehicles")
96: .select("id, make, model, category")
97: .eq("is_available", true);
103: .from("vehicle_units")
104: .select("id, vehicle_id")
105: .eq("status", "active");
111: .from("bookings")
112: .select("assigned_unit_id")
113: .in("status", ["confirmed", "active"])
164: .from("vehicle_units")
165: .select("id, vin, license_plate, color, current_mileage")
166: .eq("category_id", vehicleId)
167: .eq("status", "available");
177: .from("bookings")
178: .select("assigned_unit_id")
179: .in("status", ["confirmed", "active"])
197: .from("bookings")
198: .update({ assigned_unit_id: availableUnit.id })
199: .eq("id", bookingId);
233: .from("bookings")
234: .select("id, booking_code")
235: .eq("assigned_unit_id", unitId)
236: .in("status", ["confirmed", "active"])
249: .from("bookings")
250: .update({ assigned_unit_id: unitId })
251: .eq("id", bookingId);
284: .from("vehicle_units")
285: .update({ current_mileage: newMileage })
286: .eq("id", unitId);
307: .from("bookings")
308: .select("assigned_unit_id")
309: .eq("id", bookingId)
317: .from("vehicle_units")
318: .select("id, vin, license_plate, color, current_mileage, vehicle_id, category_id")
319: .eq("id", booking.assigned_unit_id)
327: .from("vehicle_categories")
328: .select("name")
329: .eq("id", unit.category_id)
```

**Cache invalidation on success:**

- L206: `queryClient.invalidateQueries({ queryKey: ["booking"] });`
- L207: `queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });`
- L208: `queryClient.invalidateQueries({ queryKey: ["available-units"] });`
- L209: `queryClient.invalidateQueries({ queryKey: ["low-inventory-alerts"] });`
- L210: `queryClient.invalidateQueries({ queryKey: ["booking-assigned-unit"] });`
- L258: `queryClient.invalidateQueries({ queryKey: ["booking"] });`
- L259: `queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });`
- L260: `queryClient.invalidateQueries({ queryKey: ["available-units"] });`
- L261: `queryClient.invalidateQueries({ queryKey: ["low-inventory-alerts"] });`
- L262: `queryClient.invalidateQueries({ queryKey: ["booking-assigned-unit", variables.bookingId] });`
- L293: `queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });`
- L294: `queryClient.invalidateQueries({ queryKey: ["vehicle-unit"] });`

**Error handling:**

- L213: `onError: (error: Error) => {`
- L214: `toast.error(error.message);`
- L265: `onError: (error: Error) => {`
- L266: `toast.error(error.message);`
- L288: `if (error) throw error;`

**Return shape(s):** `{bookingId, unit: availableUnit}`; `{bookingId, unitId}`; `{unitId, newMileage}`

**Consumed by:** `src/components/admin/LowInventoryBanner.tsx`, `src/components/admin/UnitAssignmentCard.tsx`

### `src/hooks/use-unit-rental-history.ts`

**File header:** Unit Rental History Hook Fetches all bookings associated with a specific vehicle unit

**Exports:** `useUnitRentalHistory`

**Query keys:**

- L24: `queryKey: ["unit-rental-history", unitId],`

**Cache / fetch settings:**

- L68: `enabled: !!unitId,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
29: .from("bookings")
30: .select(`
34: .eq("assigned_unit_id", unitId)
35: .order("start_at", { ascending: false });
43: .from("profiles")
44: .select("id, full_name, email")
45: .in("id", userIds);
```

**Error handling:**

- L37: `if (error) throw error;`

**Consumed by:** `src/pages/admin/VehicleUnitDetail.tsx`

### `src/hooks/use-vehicle-assignment.ts`

**File header:** Unassign the current VIN unit from a booking and release it back to available. Used when staff want to change the vehicle before activation.

**Exports:** `useCheckVehicleAvailability`, `useAvailableVehicles`, `useAssignVehicle`, `useUnassignVehicle`

**Query keys:**

- L27: `queryKey: ['vehicle-availability', vehicleId, startAt, endAt, excludeBookingId],`
- L71: `queryKey: ['available-vehicles', locationId, startAt, endAt, excludeBookingId],`
- L193: `queryClient.invalidateQueries({ queryKey: ['booking', variables.bookingId] });`
- L194: `queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });`
- L195: `queryClient.invalidateQueries({ queryKey: ['bookings'] });`
- L196: `queryClient.invalidateQueries({ queryKey: ['vehicle-availability'] });`
- L197: `queryClient.invalidateQueries({ queryKey: ['available-vehicles'] });`
- L198: `queryClient.invalidateQueries({ queryKey: ['fleet-vehicles'] });`
- L199: `queryClient.invalidateQueries({ queryKey: ['vehicle-units'] });`
- L200: `queryClient.invalidateQueries({ queryKey: ['booking-activity-timeline', variables.bookingId] });`
- L247: `queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });`
- L248: `queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });`
- L249: `queryClient.invalidateQueries({ queryKey: ["bookings"] });`
- L250: `queryClient.invalidateQueries({ queryKey: ["vehicle-availability"] });`
- L251: `queryClient.invalidateQueries({ queryKey: ["available-vehicles"] });`
- L252: `queryClient.invalidateQueries({ queryKey: ["fleet-vehicles"] });`
- L253: `queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });`
- L254: `queryClient.invalidateQueries({ queryKey: ["booking-activity-timeline", bookingId] });`

**Cache / fetch settings:**

- L59: `enabled: !!vehicleId && !!startAt && !!endAt,`
- L128: `enabled: !!locationId && !!startAt && !!endAt,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
33: .from('bookings')
34: .select('id, booking_code, start_at, end_at, status')
35: .eq('vehicle_id', vehicleId)
36: .in('status', ['pending', 'confirmed', 'active'])
77: .from('vehicle_units')
78: .select('id, vin, license_plate, color, status, category_id, location_id, vehicle_categories(id, name, daily_rate, image_url)')
79: .eq('location_id', locationId)
80: .in('status', ['available', 'active']);
86: .from('bookings')
87: .select('assigned_unit_id')
88: .in('status', ['pending', 'confirmed', 'active'])
156: .from('bookings')
157: .select('id, booking_code')
158: .eq('assigned_unit_id', unitId)
160: .in('status', ['pending', 'confirmed', 'active'])
179: .from('bookings')
180: .update(updatePayload)
181: .eq('id', bookingId);
186: supabase.functions.invoke('send-booking-notification', {
228: await supabase.rpc("release_vin_from_booking", { p_booking_id: bookingId });
235: .from("bookings")
236: .update({
240: .eq("id", bookingId);
```

**Cache invalidation on success:**

- L193: `queryClient.invalidateQueries({ queryKey: ['booking', variables.bookingId] });`
- L194: `queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });`
- L195: `queryClient.invalidateQueries({ queryKey: ['bookings'] });`
- L196: `queryClient.invalidateQueries({ queryKey: ['vehicle-availability'] });`
- L197: `queryClient.invalidateQueries({ queryKey: ['available-vehicles'] });`
- L198: `queryClient.invalidateQueries({ queryKey: ['fleet-vehicles'] });`
- L199: `queryClient.invalidateQueries({ queryKey: ['vehicle-units'] });`
- L200: `queryClient.invalidateQueries({ queryKey: ['booking-activity-timeline', variables.bookingId] });`
- L247: `queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });`
- L248: `queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });`
- L249: `queryClient.invalidateQueries({ queryKey: ["bookings"] });`
- L250: `queryClient.invalidateQueries({ queryKey: ["vehicle-availability"] });`
- L251: `queryClient.invalidateQueries({ queryKey: ["available-vehicles"] });`
- L252: `queryClient.invalidateQueries({ queryKey: ["fleet-vehicles"] });`
- L253: `queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });`
- L254: `queryClient.invalidateQueries({ queryKey: ["booking-activity-timeline", bookingId] });`

**Error handling:**

- L40: `if (error) throw error;`
- L188: `}).catch(e => console.error('Failed to send vehicle assignment notification:', e));`
- L201: `toast({`
- L206: `onError: (error: Error) => {`
- L207: `toast({`
- L230: `console.error("Failed to release VIN:", e);`
- L242: `if (error) throw error;`
- L255: `toast({`
- L260: `onError: (error: Error) => {`
- L261: `toast({`

**Return shape(s):** `{vehicleId,
        isAvailable: filteredConflicts.length === 0,
        conflicts: filteredConflicts,}`; `{bookingId, vehicleId}`

**Consumed by:** `src/components/admin/VehicleAssignment.tsx`, `src/hooks/use-availability.ts`, `src/pages/admin/BookingOps.tsx`

### `src/hooks/use-vehicle-categories.ts`

**File header:** Vehicle Categories Hook CRUD operations for fleet categories with VIN assignment

**Exports:** `useVehicleCategories`, `useVehicleCategoryWithUnits`, `useCategoriesWithCounts`, `useCreateCategory`, `useUpdateCategory`, `useDeleteCategory`, `useAssignVehiclesToCategory`, `useUnassignVehiclesFromCategory`

**Query keys:**

- L31: `queryKey: ["vehicle-categories"],`
- L46: `queryKey: ["vehicle-category", categoryId],`
- L82: `queryKey: ["vehicle-categories-with-counts"],`
- L141: `queryClient.invalidateQueries({ queryKey: ["vehicle-categories"] });`
- L167: `queryClient.invalidateQueries({ queryKey: ["vehicle-categories"] });`
- L195: `queryClient.invalidateQueries({ queryKey: ["vehicle-categories"] });`
- L196: `queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });`
- L220: `queryClient.invalidateQueries({ queryKey: ["vehicle-categories"] });`
- L221: `queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });`
- L243: `queryClient.invalidateQueries({ queryKey: ["vehicle-categories"] });`
- L244: `queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });`

**Cache / fetch settings:**

- L76: `enabled: !!categoryId,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
34: .from("vehicle_categories")
35: .select("*")
36: .order("name");
51: .from("vehicle_categories")
52: .select("*")
53: .eq("id", categoryId)
61: .from("vehicle_units")
62: .select(`
68: .eq("category_id", categoryId);
86: .from("vehicle_categories")
87: .select("*")
88: .order("name");
94: .from("vehicle_units")
95: .select("category_id, id, vin, vehicle:vehicles(make, model, year)")
114: models: Array.from(countMap.get(cat.id)?.models || []),
128: .from("vehicle_categories")
129: .insert({
134: .select()
157: .from("vehicle_categories")
158: .update(updates)
159: .eq("id", id)
160: .select()
183: .from("vehicle_units")
184: .update({ category_id: null })
185: .eq("category_id", categoryId);
188: .from("vehicle_categories")
189: .delete()
190: .eq("id", categoryId);
213: .from("vehicle_units")
214: .update({ category_id: params.categoryId })
215: .in("id", params.unitIds);
236: .from("vehicle_units")
237: .update({ category_id: null })
238: .in("id", unitIds);
```

**Cache invalidation on success:**

- L141: `queryClient.invalidateQueries({ queryKey: ["vehicle-categories"] });`
- L167: `queryClient.invalidateQueries({ queryKey: ["vehicle-categories"] });`
- L195: `queryClient.invalidateQueries({ queryKey: ["vehicle-categories"] });`
- L196: `queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });`
- L220: `queryClient.invalidateQueries({ queryKey: ["vehicle-categories"] });`
- L221: `queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });`
- L243: `queryClient.invalidateQueries({ queryKey: ["vehicle-categories"] });`
- L244: `queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });`

**Error handling:**

- L38: `if (error) throw error;`
- L56: `if (error) throw error;`
- L90: `if (error) throw error;`
- L137: `if (error) throw error;`
- L144: `onError: (error: Error) => {`
- L145: `toast.error("Failed to create category: " + error.message);`
- L163: `if (error) throw error;`
- L170: `onError: (error: Error) => {`
- L171: `toast.error("Failed to update category: " + error.message);`
- L192: `if (error) throw error;`
- L199: `onError: (error: Error) => {`
- L200: `toast.error("Failed to delete category: " + error.message);`
- L217: `if (error) throw error;`
- L224: `onError: (error: Error) => {`
- L225: `toast.error("Failed to assign vehicles: " + error.message);`
- L240: `if (error) throw error;`
- L247: `onError: (error: Error) => {`
- L248: `toast.error("Failed to unassign vehicles: " + error.message);`

**Return shape(s):** `{...category,
        vehicles: units || [],
        vehicle_count: units?.length || 0,}`

**Consumed by:** `src/components/admin/fleet/ByVehicleTab.tsx`, `src/components/admin/fleet/CategoryDialog.tsx`, `src/components/admin/fleet/CategoryManagementTab.tsx`, `src/components/admin/fleet/VinAssignmentDialog.tsx`, `src/pages/admin/CategoryDetail.tsx`, `src/pages/admin/FleetCategories.tsx`

### `src/hooks/use-vehicle-expenses.ts`

**Exports:** `useVehicleExpenses`, `useExpenseSummary`, `useCreateVehicleExpense`, `useUpdateVehicleExpense`, `useDeleteVehicleExpense`, `EXPENSE_TYPES`

**Query keys:**

- L45: `queryKey: ["vehicle-expenses", filters],`
- L79: `queryKey: ["expense-summary", vehicleUnitId],`
- L125: `queryClient.invalidateQueries({ queryKey: ["vehicle-expenses"] });`
- L126: `queryClient.invalidateQueries({ queryKey: ["expense-summary", variables.vehicle_unit_id] });`
- L127: `queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });`
- L128: `queryClient.invalidateQueries({ queryKey: ["vehicle-unit"] });`
- L157: `queryClient.invalidateQueries({ queryKey: ["vehicle-expenses"] });`
- L158: `queryClient.invalidateQueries({ queryKey: ["expense-summary"] });`
- L159: `queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });`
- L160: `queryClient.invalidateQueries({ queryKey: ["vehicle-unit"] });`
- L186: `queryClient.invalidateQueries({ queryKey: ["vehicle-expenses"] });`
- L187: `queryClient.invalidateQueries({ queryKey: ["expense-summary"] });`
- L188: `queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });`
- L189: `queryClient.invalidateQueries({ queryKey: ["vehicle-unit"] });`

**Cache / fetch settings:**

- L73: `enabled: !!filters.vehicleUnitId,`
- L106: `enabled: !!vehicleUnitId,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
48: .from("vehicle_expenses")
49: .select("*")
50: .order("expense_date", { ascending: false });
53: query = query.eq("vehicle_unit_id", filters.vehicleUnitId);
57: query = query.eq("expense_type", filters.expenseType);
84: .from("vehicle_expenses")
85: .select("expense_type, amount")
86: .eq("vehicle_unit_id", vehicleUnitId);
116: .from("vehicle_expenses")
117: .insert(expense)
118: .select()
147: .from("vehicle_expenses")
148: .update(updates)
149: .eq("id", id)
150: .select()
179: .from("vehicle_expenses")
180: .delete()
181: .eq("id", id);
```

**Cache invalidation on success:**

- L125: `queryClient.invalidateQueries({ queryKey: ["vehicle-expenses"] });`
- L126: `queryClient.invalidateQueries({ queryKey: ["expense-summary", variables.vehicle_unit_id] });`
- L127: `queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });`
- L128: `queryClient.invalidateQueries({ queryKey: ["vehicle-unit"] });`
- L157: `queryClient.invalidateQueries({ queryKey: ["vehicle-expenses"] });`
- L158: `queryClient.invalidateQueries({ queryKey: ["expense-summary"] });`
- L159: `queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });`
- L160: `queryClient.invalidateQueries({ queryKey: ["vehicle-unit"] });`
- L186: `queryClient.invalidateQueries({ queryKey: ["vehicle-expenses"] });`
- L187: `queryClient.invalidateQueries({ queryKey: ["expense-summary"] });`
- L188: `queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });`
- L189: `queryClient.invalidateQueries({ queryKey: ["vehicle-unit"] });`

**Error handling:**

- L70: `if (error) throw error;`
- L88: `if (error) throw error;`
- L121: `if (error) throw error;`
- L129: `toast({ title: "Expense added successfully" });`
- L131: `onError: (error: Error) => {`
- L132: `toast({`
- L153: `if (error) throw error;`
- L161: `toast({ title: "Expense updated successfully" });`
- L163: `onError: (error: Error) => {`
- L164: `toast({`
- L183: `if (error) throw error;`
- L190: `toast({ title: "Expense deleted successfully" });`
- L192: `onError: (error: Error) => {`
- L193: `toast({`

**Return shape(s):** `{byType,
        total,
        count: data?.length || 0,}`

**Consumed by:** `src/components/admin/FleetReportsPanel.tsx`, `src/components/admin/VehicleUnitDetail.tsx`

### `src/hooks/use-vehicle-maintenance.ts`

**Exports:** `useSetVehicleMaintenance`, `useClearVehicleMaintenance`

**Query keys:**

- L30: `queryClient.invalidateQueries({ queryKey: ["admin-vehicles"] });`
- L31: `queryClient.invalidateQueries({ queryKey: ["admin-vehicle"] });`
- L32: `queryClient.invalidateQueries({ queryKey: ["vehicles"] });`
- L60: `queryClient.invalidateQueries({ queryKey: ["admin-vehicles"] });`
- L61: `queryClient.invalidateQueries({ queryKey: ["admin-vehicle"] });`
- L62: `queryClient.invalidateQueries({ queryKey: ["vehicles"] });`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
17: .from("vehicles")
18: .update({
24: .eq("id", vehicleId);
47: .from("vehicles")
48: .update({
54: .eq("id", vehicleId);
```

**Cache invalidation on success:**

- L30: `queryClient.invalidateQueries({ queryKey: ["admin-vehicles"] });`
- L31: `queryClient.invalidateQueries({ queryKey: ["admin-vehicle"] });`
- L32: `queryClient.invalidateQueries({ queryKey: ["vehicles"] });`
- L60: `queryClient.invalidateQueries({ queryKey: ["admin-vehicles"] });`
- L61: `queryClient.invalidateQueries({ queryKey: ["admin-vehicle"] });`
- L62: `queryClient.invalidateQueries({ queryKey: ["vehicles"] });`

**Error handling:**

- L26: `if (error) throw error;`
- L35: `onError: (error: Error) => {`
- L36: `toast.error("Failed to update vehicle: " + error.message);`
- L56: `if (error) throw error;`
- L65: `onError: (error: Error) => {`
- L66: `toast.error("Failed to update vehicle: " + error.message);`

**Return shape(s):** `{success: true}`; `{success: true}`

**Consumed by:** `src/components/admin/MaintenanceDialog.tsx`

### `src/hooks/use-vehicle-prep.ts`

**Exports:** `useVehiclePrepStatus`, `useUpdateVehiclePrep`, `useVehicleReadyStatus`, `PREP_CHECKLIST_ITEMS`

**Query keys:**

- L67: `queryKey: ['vehicle-prep', bookingId],`
- L150: `const queryKey = ['vehicle-prep', variables.bookingId];`
- L153: `await queryClient.cancelQueries({ queryKey });`
- L156: `const previous = queryClient.getQueryData<VehiclePrepStatus>(queryKey);`
- L167: `queryClient.setQueryData<VehiclePrepStatus>(queryKey, {`
- L190: `queryClient.invalidateQueries({ queryKey: ['vehicle-prep', variables.bookingId] });`
- L191: `queryClient.invalidateQueries({ queryKey: ['booking', variables.bookingId] });`
- L201: `queryKey: ['vehicle-ready', bookingId],`

**Cache / fetch settings:**

- L83: `enabled: !!bookingId,`
- L84: `staleTime: 30000, // 30 seconds — reduce refetches`
- L85: `gcTime: 120000,   // 2 minutes cache`
- L232: `enabled: !!bookingId && prepStatus !== undefined,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
72: .from('inspection_metrics')
73: .select('exterior_notes')
74: .eq('booking_id', bookingId)
75: .eq('phase', 'pickup')
107: .from('inspection_metrics')
108: .select('id, exterior_notes')
109: .eq('booking_id', bookingId)
110: .eq('phase', 'pickup')
125: .from('inspection_metrics')
126: .update({
130: .eq('id', existing.id);
135: .from('inspection_metrics')
136: .insert({
206: .from('condition_photos')
207: .select('photo_type')
208: .eq('booking_id', bookingId)
209: .eq('phase', 'pickup');
```

**Cache invalidation on success:**

- L167: `queryClient.setQueryData<VehiclePrepStatus>(queryKey, {`
- L180: `queryClient.setQueryData(['vehicle-prep', variables.bookingId], context.previous);`
- L190: `queryClient.invalidateQueries({ queryKey: ['vehicle-prep', variables.bookingId] });`
- L191: `queryClient.invalidateQueries({ queryKey: ['booking', variables.bookingId] });`

**Error handling:**

- L78: `if (error && error.code !== 'PGRST116') throw error;`
- L132: `if (error) throw error;`
- L143: `if (error) throw error;`
- L177: `onError: (error: Error, variables, context) => {`
- L182: `toast({`
- L211: `if (error) throw error;`

**Return shape(s):** `{}`; `{}`; `{bookingId,
    items,
    allComplete: completedCount === items.length,
    completedCount,
    totalCount: items.length,}`; `{bookingId, itemKey, checked, prepData}`

**Consumed by:** `src/components/admin/BookingOpsDrawer.tsx`, `src/components/admin/VehiclePrepChecklist.tsx`, `src/components/admin/VehicleReadyGate.tsx`, `src/pages/admin/BookingOps.tsx`

### `src/hooks/use-vehicle-swap-history.ts`

**Exports:** `useVehicleSwapHistory`

**Query keys:**

- L26: `queryKey: ["vehicle-swap-history", bookingId],`

**Cache / fetch settings:**

- L37: `enabled: !!bookingId,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
30: .from("vehicle_swap_history")
31: .select("*")
32: .eq("booking_id", bookingId)
33: .order("created_at", { ascending: false });
```

**Error handling:**

- L34: `if (error) throw error;`

**Consumed by:** `src/components/admin/VehicleHistoryList.tsx`

### `src/hooks/use-vehicle-units.ts`

**File header:** Returns active/upcoming bookings blocking a status change (retire / return).

**Exports:** `useVehicleUnits`, `useVehicleUnit`, `useCreateVehicleUnit`, `useUpdateVehicleUnit`, `useDeleteVehicleUnit`, `getBlockingBookings`, `useSetVehicleUnitStatus`, `normalizePlate`, `findPlateConflicts`, `useSetVehiclePlate`

**Query keys:**

- L50: `queryKey: ["vehicle-units", filters],`
- L139: `queryKey: ["vehicle-unit", id],`
- L189: `queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });`
- L226: `queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });`
- L227: `queryClient.invalidateQueries({ queryKey: ["vehicle-unit", data.id] });`
- L228: `queryClient.invalidateQueries({ queryKey: ["fleet-cost-analysis"] });`
- L229: `queryClient.invalidateQueries({ queryKey: ["vehicle-cost-timeline", data.id] });`
- L285: `queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });`
- L286: `queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });`
- L287: `queryClient.invalidateQueries({ queryKey: ["category-vins"] });`
- L365: `queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });`
- L366: `queryClient.invalidateQueries({ queryKey: ["vehicle-unit", data.id] });`
- L367: `queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });`
- L368: `queryClient.invalidateQueries({ queryKey: ["category-vins"] });`
- L457: `queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });`
- L458: `queryClient.invalidateQueries({ queryKey: ["vehicle-unit", data.id] });`
- L459: `queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });`
- L460: `queryClient.invalidateQueries({ queryKey: ["category-vins"] });`

**Cache / fetch settings:**

- L49: `enabled: options?.enabled ?? true,`
- L133: `staleTime: 30000,`
- L170: `enabled: !!id,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
53: .from("vehicle_units")
54: .select(`
59: .order("created_at", { ascending: false });
62: query = query.eq("vehicle_id", filters.vehicleId);
66: query = query.eq("status", filters.status);
70: query = query.eq("is_temporary", filters.isTemporary);
74: query = query.eq("location_id", filters.locationId);
78: query = query.eq("category_id", filters.categoryId);
92: .from("vehicle_expenses")
93: .select("vehicle_unit_id, amount")
94: .in("vehicle_unit_id", unitIds);
144: .from("vehicle_units")
145: .select(`
149: .eq("id", id)
156: .from("vehicle_expenses")
157: .select("amount")
158: .eq("vehicle_unit_id", id);
180: .from("vehicle_units")
181: .insert(unit)
182: .select()
208: .from("vehicle_units")
209: .update(updates)
210: .eq("id", id)
211: .select()
249: .from("bookings")
250: .select("booking_code, status")
251: .eq("assigned_unit_id", id)
252: .in("status", ["pending", "confirmed", "active"]);
265: .from("bookings")
266: .update({ assigned_unit_id: null })
267: .eq("assigned_unit_id", id);
272: .from("damage_reports")
273: .delete()
274: .eq("vehicle_unit_id", id);
279: const { error } = await supabase.from("vehicle_units").delete().eq("id", id);
312: .from("bookings")
313: .select("booking_code, status")
314: .eq("assigned_unit_id", unitId)
315: .in("status", ["pending", "confirmed", "active"]);
350: .from("vehicle_units")
351: .update(updates)
352: .eq("id", id)
353: .select()
394: .from("vehicle_units")
395: .select("id, vin, status, vehicles(make, model)")
396: .eq("license_plate", normalizePlate(plate))
398: .limit(10);
434: .from("vehicle_units")
435: .update({ license_plate: null })
436: .in("id", conflicts.map((c) => c.id));
442: .from("vehicle_units")
443: .update({ license_plate: next })
444: .eq("id", id)
445: .select()
```

**Cache invalidation on success:**

- L189: `queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });`
- L226: `queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });`
- L227: `queryClient.invalidateQueries({ queryKey: ["vehicle-unit", data.id] });`
- L228: `queryClient.invalidateQueries({ queryKey: ["fleet-cost-analysis"] });`
- L229: `queryClient.invalidateQueries({ queryKey: ["vehicle-cost-timeline", data.id] });`
- L285: `queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });`
- L286: `queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });`
- L287: `queryClient.invalidateQueries({ queryKey: ["category-vins"] });`
- L365: `queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });`
- L366: `queryClient.invalidateQueries({ queryKey: ["vehicle-unit", data.id] });`
- L367: `queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });`
- L368: `queryClient.invalidateQueries({ queryKey: ["category-vins"] });`
- L457: `queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });`
- L458: `queryClient.invalidateQueries({ queryKey: ["vehicle-unit", data.id] });`
- L459: `queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });`
- L460: `queryClient.invalidateQueries({ queryKey: ["category-vins"] });`

**Error handling:**

- L85: `if (error) throw error;`
- L152: `if (error) throw error;`
- L185: `if (error) throw error;`
- L190: `toast({ title: "Vehicle unit added successfully" });`
- L192: `onError: (error: Error) => {`
- L193: `toast({`
- L230: `toast({ title: "Vehicle unit updated successfully" });`
- L232: `onError: (error: Error) => {`
- L233: `toast({`
- L280: `if (error) throw error;`
- L288: `toast({`
- L297: `onError: (error: Error) => {`
- L298: `toast({`
- L369: `toast({ title: variables.successTitle ?? "Vehicle status updated" });`
- L371: `onError: (error: Error) => {`
- L372: `toast({ title: "Status change failed", description: error.message, variant: "destructive" });`
- L461: `toast({ title: variables.plate ? "Plate updated" : "Plate removed" });`
- L463: `onError: (error: Error) => {`
- L464: `toast({ title: "Plate update failed", description: error.message, variant: "destructive" });`

**Return shape(s):** `{...data,
        total_expenses: totalExpenses,}`; `{archived: false}`

**Consumed by:** `src/components/admin/DepreciationCalculator.tsx`, `src/components/admin/FleetReportsPanel.tsx`, `src/components/admin/fleet/AllVehiclesTable.tsx`, `src/components/admin/fleet/MaintenanceLogDialog.tsx`, `src/components/admin/fleet/PlateDialog.tsx`, `src/components/admin/fleet/TemporaryVehiclesTable.tsx`, `src/components/admin/fleet/VehicleUnitEditDialog.tsx`, `src/components/admin/fleet/VinAssignmentDialog.tsx`, `src/pages/admin/FleetCategories.tsx`, `src/pages/admin/FleetCosts.tsx`, `src/pages/admin/VehicleUnitDetail.tsx`

### `src/hooks/use-vehicles.ts`

**File header:** @deprecated This hook uses the legacy vehicles table. For new code, use: - useBrowseCategories() from '@/hooks/use-browse-categories' for customer-facing category browsing - useFleetCategories() from '@/hooks/use-fleet-categories' for admin fleet management - useCategory() from this file for fetching a single category (category-based booking flow) The vehicles table is being phased out in favor of

**Exports:** `useVehicles`, `useFeaturedVehicles`, `useVehicle`, `useCategory`

**Query keys:**

- L36: `queryKey: ["vehicles"],`
- L76: `queryKey: ["featured-vehicles", limit],`
- L116: `queryKey: ["vehicle", id],`
- L161: `queryKey: ["category", id],`

**Cache / fetch settings:**

- L70: `staleTime: 60000,`
- L110: `staleTime: 60000,`
- L151: `enabled: !!id,`
- L152: `staleTime: 60000,`
- L201: `enabled: !!id,`
- L202: `staleTime: 60000,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
39: .from("vehicles")
40: .select("*")
41: .eq("is_available", true)
42: .order("is_featured", { ascending: false })
43: .order("daily_rate", { ascending: true });
79: .from("vehicles")
80: .select("*")
81: .eq("is_available", true)
82: .eq("is_featured", true)
83: .limit(limit);
121: .from("vehicles")
122: .select("*")
123: .eq("id", id)
166: .from("vehicle_categories")
167: .select("*")
168: .eq("id", id)
```

**Error handling:**

- L46: `console.error("Error fetching vehicles:", error);`
- L86: `console.error("Error fetching featured vehicles:", error);`
- L127: `console.error("Error fetching vehicle:", error);`
- L172: `console.error("Error fetching category:", error);`

**Consumed by:** `src/components/admin/FleetReportsPanel.tsx`, `src/components/admin/fleet/CompetitorPricingTab.tsx`, `src/components/rental/BookingSummaryPanel.tsx`, `src/components/shared/TotalBar.tsx`, `src/pages/AddOns.tsx`, `src/pages/Compare.tsx`, `src/pages/NewCheckout.tsx`, `src/pages/Protection.tsx`, `src/pages/admin/FleetCosts.tsx`

### `src/hooks/use-vendors.ts`

**File header:** Vendor Directory Hook CRUD operations for the unified vendor directory

**Exports:** `useVendors`, `useVendorServiceHistory`, `useCreateVendor`, `useUpdateVendor`, `useDeleteVendor`, `VENDOR_TYPES`

**Query keys:**

- L46: `queryKey: ["vendors", filters],`
- L69: `queryKey: ["vendor-service-history", vendorName],`
- L148: `queryClient.invalidateQueries({ queryKey: ["vendors"] });`
- L166: `queryClient.invalidateQueries({ queryKey: ["vendors"] });`
- L181: `queryClient.invalidateQueries({ queryKey: ["vendors"] });`

**Cache / fetch settings:**

- L131: `enabled: !!vendorName,`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
49: .from("vendors")
50: .select("*")
51: .order("name");
54: query = query.eq("vendor_type", filters.type);
57: query = query.eq("is_active", filters.active);
77: .from("maintenance_logs")
78: .select("id, service_date, description, cost, maintenance_type, vehicle_unit_id")
80: .order("service_date", { ascending: false })
81: .limit(50);
95: .from("vehicle_expenses")
96: .select("id, expense_date, description, amount, expense_type")
98: .order("expense_date", { ascending: false })
99: .limit(50);
113: .from("incident_cases")
114: .select("id, incident_date, description, final_invoice_amount, incident_type")
116: .order("incident_date", { ascending: false })
117: .limit(50);
140: .from("vendors")
141: .insert(vendor as any)
142: .select()
160: .from("vendors")
161: .update(updates as any)
162: .eq("id", id);
177: const { error } = await supabase.from("vendors").delete().eq("id", id);
```

**Cache invalidation on success:**

- L148: `queryClient.invalidateQueries({ queryKey: ["vendors"] });`
- L166: `queryClient.invalidateQueries({ queryKey: ["vendors"] });`
- L181: `queryClient.invalidateQueries({ queryKey: ["vendors"] });`

**Error handling:**

- L61: `if (error) throw error;`
- L144: `if (error) throw error;`
- L151: `onError: (err: any) => toast.error(err.message),`
- L163: `if (error) throw error;`
- L169: `onError: (err: any) => toast.error(err.message),`
- L178: `if (error) throw error;`
- L184: `onError: (err: any) => toast.error(err.message),`

**Consumed by:** `src/pages/admin/Vendors.tsx`

### `src/hooks/use-verification.ts`

**Exports:** `useBookingVerification`, `useUserVerifications`, `useUploadVerificationDocument`, `useUpdateVerificationStatus`

**Query keys:**

- L27: `queryKey: ['verification', bookingId],`
- L48: `queryKey: ['user-verifications'],`
- L137: `queryClient.invalidateQueries({ queryKey: ['verification'] });`
- L138: `queryClient.invalidateQueries({ queryKey: ['user-verifications'] });`
- L200: `queryClient.invalidateQueries({ queryKey: ['verification'] });`
- L201: `queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });`

**Cache / fetch settings:**

- L40: `enabled: !!bookingId,`
- L41: `staleTime: 15000, // 15 seconds - operational data tier`
- L42: `gcTime: 60000,    // Keep cached for 1 minute`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
32: .from('verification_requests')
33: .select('*')
34: .eq('booking_id', bookingId)
35: .order('created_at', { ascending: false });
54: .from('verification_requests')
55: .select('*')
56: .eq('user_id', user.id)
57: .order('created_at', { ascending: false });
87: .from('verification-documents')
94: .from('verification-documents')
99: .from('verification_requests')
100: .select('id')
101: .eq('booking_id', bookingId)
102: .eq('document_type', docType)
108: .from('verification_requests')
109: .update({
116: .eq('id', existing.id);
122: .from('verification_requests')
123: .insert({
174: .from('verification_requests')
175: .update({
181: .eq('id', requestId);
188: await supabase.functions.invoke('send-booking-notification', {
```

**Cache invalidation on success:**

- L137: `queryClient.invalidateQueries({ queryKey: ['verification'] });`
- L138: `queryClient.invalidateQueries({ queryKey: ['user-verifications'] });`
- L200: `queryClient.invalidateQueries({ queryKey: ['verification'] });`
- L201: `queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });`

**Error handling:**

- L37: `if (error) throw error;`
- L59: `if (error) throw error;`
- L139: `toast({`
- L144: `onError: (error: Error) => {`
- L145: `toast({`
- L183: `if (error) throw error;`
- L195: `console.error('Failed to send verification notification:', e);`
- L202: `toast({`
- L207: `onError: (error: Error) => {`
- L208: `toast({`

**Return shape(s):** `{fileName, url: urlData.publicUrl}`

**Consumed by:** `src/components/admin/BookingOpsDrawer.tsx`, `src/components/admin/ops/LicenseReviewCard.tsx`, `src/components/booking/DriverLicenseUpload.tsx`, `src/components/booking/VerificationUpload.tsx`, `src/pages/BookingDetail.tsx`, `src/pages/admin/BookingOps.tsx`, `src/pages/booking/BookingAgreement.tsx`, `src/pages/booking/BookingLicense.tsx`, `src/pages/booking/BookingPickup.tsx`

### `src/hooks/use-walkaround.ts`

**Exports:** `useWalkaroundInspection`, `useStartWalkaround`, `useUpdateWalkaround`, `useCustomerAcknowledge`, `useCompleteWalkaround`, `useAdminCompleteWalkaround`, `useReopenWalkaround`

**Query keys:**

- L35: `queryKey: ["walkaround-inspection", bookingId],`
- L115: `queryClient.invalidateQueries({ queryKey: ["walkaround-inspection", variables.bookingId], refetchType: "active" });`
- L166: `queryClient.invalidateQueries({ queryKey: ["walkaround-inspection"], refetchType: "active" });`
- L198: `queryClient.invalidateQueries({ queryKey: ["walkaround-inspection"], refetchType: "active" });`
- L289: `queryClient.invalidateQueries({ queryKey: ["walkaround-inspection"], refetchType: "active" });`
- L290: `queryClient.invalidateQueries({ queryKey: ["booking"], refetchType: "active" });`
- L342: `queryClient.invalidateQueries({ queryKey: ["walkaround-inspection"], refetchType: "active" });`
- L343: `queryClient.invalidateQueries({ queryKey: ["booking"], refetchType: "active" });`
- L392: `queryClient.invalidateQueries({ queryKey: ["walkaround-inspection"], refetchType: "active" });`
- L393: `queryClient.invalidateQueries({ queryKey: ["booking"], refetchType: "active" });`

**Cache / fetch settings:**

- L58: `enabled: !!bookingId,`
- L59: `staleTime: 15000, // 15 seconds - operational data tier`
- L60: `gcTime: 60000,    // Keep cached for 1 minute`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
40: .from("walkaround_inspections")
41: .select("*")
42: .eq("booking_id", bookingId)
81: .from("walkaround_inspections")
82: .select("id")
83: .eq("booking_id", bookingId)
91: .from("walkaround_inspections")
92: .insert({
98: .select("id")
104: await supabase.from("audit_logs").insert({
159: .from("walkaround_inspections")
160: .update(updateData)
161: .eq("id", inspectionId);
187: .from("walkaround_inspections")
188: .update({
193: .eq("id", inspectionId);
217: .from("walkaround_inspections")
218: .select("booking_id, fuel_level, odometer_reading")
219: .eq("id", inspectionId)
226: .from("walkaround_inspections")
227: .update({
234: .eq("id", inspectionId);
242: .from("inspection_metrics")
243: .select("id")
244: .eq("booking_id", inspection.booking_id)
245: .eq("phase", "pickup")
250: .from("inspection_metrics")
251: .update({
256: .eq("id", existingMetric.id);
259: .from("inspection_metrics")
260: .insert({
271: await supabase.from("audit_logs").insert({
281: supabase.functions.invoke("send-booking-notification", {
309: .from("walkaround_inspections")
310: .select("booking_id")
311: .eq("id", inspectionId)
318: .from("walkaround_inspections")
319: .update({
326: .eq("id", inspectionId);
331: await supabase.from("audit_logs").insert({
362: .from("walkaround_inspections")
363: .select("booking_id")
364: .eq("id", inspectionId)
371: .from("walkaround_inspections")
372: .update({
376: .eq("id", inspectionId);
381: await supabase.from("audit_logs").insert({
```

**Cache invalidation on success:**

- L115: `queryClient.invalidateQueries({ queryKey: ["walkaround-inspection", variables.bookingId], refetchType: "active" });`
- L166: `queryClient.invalidateQueries({ queryKey: ["walkaround-inspection"], refetchType: "active" });`
- L198: `queryClient.invalidateQueries({ queryKey: ["walkaround-inspection"], refetchType: "active" });`
- L289: `queryClient.invalidateQueries({ queryKey: ["walkaround-inspection"], refetchType: "active" });`
- L290: `queryClient.invalidateQueries({ queryKey: ["booking"], refetchType: "active" });`
- L342: `queryClient.invalidateQueries({ queryKey: ["walkaround-inspection"], refetchType: "active" });`
- L343: `queryClient.invalidateQueries({ queryKey: ["booking"], refetchType: "active" });`
- L392: `queryClient.invalidateQueries({ queryKey: ["walkaround-inspection"], refetchType: "active" });`
- L393: `queryClient.invalidateQueries({ queryKey: ["booking"], refetchType: "active" });`

**Error handling:**

- L45: `if (error) throw error;`
- L101: `if (error) throw error;`
- L120: `onError: (error: Error) => {`
- L121: `toast.error(`Failed to start walkaround: ${error.message}`);`
- L163: `if (error) throw error;`
- L168: `onError: (error: Error) => {`
- L169: `toast.error(`Failed to update walkaround: ${error.message}`);`
- L195: `if (error) throw error;`
- L201: `onError: (error: Error) => {`
- L202: `toast.error(`Failed to record acknowledgement: ${error.message}`);`
- L236: `if (error) throw error;`
- L283: `}).catch(e => console.error("Failed to send walkaround notification:", e));`
- L293: `onError: (error: Error) => {`
- L294: `toast.error(error.message);`
- L328: `if (error) throw error;`
- L346: `onError: (error: Error) => {`
- L347: `toast.error(`Failed to complete walkaround: ${error.message}`);`
- L378: `if (error) throw error;`
- L396: `onError: (error: Error) => {`
- L397: `toast.error(`Failed to reopen walkaround: ${error.message}`);`

**Return shape(s):** `{...data,
          scratches_dents: scratches,}`; `{id: existing.id, alreadyExists: true}`; `{id: data.id, alreadyExists: false}`; `{bookingId: inspection.booking_id}`

**Consumed by:** `src/components/admin/BookingOpsDrawer.tsx`, `src/components/admin/WalkaroundInspection.tsx`, `src/components/admin/ops/steps/StepWalkaround.tsx`, `src/components/booking/CustomerWalkaroundAcknowledge.tsx`, `src/pages/admin/BookingOps.tsx`, `src/pages/booking/WalkaroundSign.tsx`

### `src/hooks/use-webhid-signature.ts`

**File header:** WebHID Signature Pad Hook Handles connection and input streaming from USB signature pads

**Exports:** `useWebHIDSignature`

**Supabase statements:** none (pure computation or context hook)

**Return shape(s):** `{...state,
    connect,
    disconnect,
    setInputCallback,
    setStrokeEndCallback,
    getStrokes,
    clearStrokes,
    checkSupport,}`

**Consumed by:** `src/components/admin/signature/SignatureCapturePanel.tsx`

### `src/hooks/use-mobile.tsx`

**Exports:** `useIsMobile`

**Supabase statements:** none (pure computation or context hook)

**Consumed by:** `src/components/ui/sidebar.tsx`

### `src/domain/bookings/mutations.ts`

**File header:** Booking Domain - Mutation Functions All mutations write to audit_logs with panel_source

**Exports:** `updateBookingStatus`, `voidBooking`, `assignVehicleToBooking`, `releaseVehicleFromBooking`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
25: await supabase.from("audit_logs").insert([{
43: .from("bookings")
44: .select("status, booking_code, user_id, vehicle_id, total_amount, tax_amount")
45: .eq("id", bookingId)
78: .from("bookings")
79: .update(updateData)
80: .eq("id", bookingId);
116: const { error } = await supabase.functions.invoke("void-booking", {
134: const { data, error } = await supabase.rpc("assign_vin_to_booking", {
164: .from("bookings")
165: .select("assigned_unit_id")
166: .eq("id", bookingId)
169: const { error } = await supabase.rpc("release_vin_from_booking", {
197: .from("booking_add_ons")
198: .select("price")
199: .eq("booking_id", bookingId);
205: .from("points_settings")
206: .select("setting_key, setting_value");
225: await supabase.rpc("update_points_balance", {
243: .from("points_ledger")
244: .select("points, user_id")
245: .eq("booking_id", bookingId)
246: .eq("transaction_type", "earn")
251: .from("points_ledger")
252: .select("id")
253: .eq("booking_id", bookingId)
254: .eq("transaction_type", "reverse")
258: await supabase.rpc("update_points_balance", {
288: await supabase.functions.invoke("send-booking-notification", {
294: supabase.from("vehicle_categories").select("name").eq("id", booking.vehicle_id).maybeSingle(),
295: supabase.from("profiles").select("full_name").eq("id", booking.user_id).maybeSingle(),
298: await supabase.functions.invoke("notify-admin", {
```

**Error handling:**

- L125: `if (error) throw error;`
- L140: `if (error) throw error;`
- L174: `if (error) throw error;`
- L236: `console.error("Failed to award points:", e);`
- L268: `console.error("Failed to reverse points:", e);`
- L308: `console.error("Failed to send status notification:", e);`

**Consumed by:** `src/components/admin/VoidBookingDialog.tsx`

### `src/domain/bookings/queries.ts`

**File header:** Booking Domain - Query Functions Pure data fetching, no React dependencies

**Exports:** `listBookings`, `getBookingById`, `getBookingByCode`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
20: .from("bookings")
21: .select(`
25: .order("created_at", { ascending: false });
29: query = query.eq("status", filters.status);
41: query = query.eq("location_id", filters.locationId);
45: query = query.eq("vehicle_id", filters.vehicleId);
57: .from("profiles")
58: .select("id")
59: .or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`),
61: .from("customers")
62: .select("id")
63: .or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`),
76: query = query.or(orClauses.join(","));
81: query = query.eq("status", "confirmed");
86: query = query.eq("status", "active");
88: query = query.eq("status", "active");
90: query = query.in("status", ["completed", "cancelled"]);
93: const { data: bookingsData, error } = await query.limit(500);
103: .from("profiles")
104: .select("id, full_name, email, phone")
105: .in("id", userIds);
114: .from("customers")
115: .select("id, full_name, email, phone")
116: .in("id", customerIds);
124: .from("vehicle_categories")
125: .select("id, name, description, image_url, daily_rate, seats, fuel_type, transmission")
126: .in("id", categoryIds)
205: .from("bookings")
206: .select(`
212: .eq("id", id)
221: .from("vehicle_categories")
222: .select("id, name, description, image_url, daily_rate, seats, fuel_type, transmission")
223: .eq("id", data.vehicle_id)
230: .from("profiles")
231: .select("id, full_name, email, phone, is_verified, driver_license_status")
232: .eq("id", data.user_id)
236: .from("customers")
237: .select("id, full_name, email, phone")
238: .eq("id", data.customer_id)
269: supabase.from("payments").select("*").eq("booking_id", id),
270: supabase.from("booking_add_ons").select("*, add_ons(name, description)").eq("booking_id", id),
271: supabase.from("audit_logs").select("*").eq("entity_type", "booking").eq("entity_id", id).order("created_at", { ascending: false }),
299: .from("locations")
300: .select("id, name, city, address, phone")
301: .eq("id", data.return_location_id)
403: .from("bookings")
404: .select(`
408: .eq("booking_code", code.toUpperCase())
417: .from("profiles")
418: .select("id, full_name, email, phone")
419: .eq("id", data.user_id)
423: .from("customers")
424: .select("id, full_name, email, phone")
425: .eq("id", data.customer_id)
452: .from("vehicle_categories")
453: .select("id, name, image_url")
454: .eq("id", data.vehicle_id)
```

**Error handling:**

- L96: `console.error("Error fetching bookings:", error);`
- L97: `throw error;`
- L215: `if (error) throw error;`
- L411: `if (error) throw error;`

**Consumed by:** `src/components/ops/OpsShell.tsx`, `src/pages/ops/OpsActiveRentals.tsx`, `src/pages/ops/OpsBookings.tsx`, `src/pages/ops/OpsReturns.tsx`

### `src/domain/fleet/mutations.ts`

**File header:** Fleet Domain - Mutation Functions

**Exports:** `createCategory`, `updateCategory`, `deleteCategory`, `createUnit`, `updateUnit`, `moveUnit`, `deleteUnit`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
28: await supabase.from("audit_logs").insert([{
43: .from("vehicle_categories")
44: .insert({
54: .select("id")
72: .from("vehicle_categories")
73: .select("*")
74: .eq("id", id)
89: .from("vehicle_categories")
90: .update(dbUpdates)
91: .eq("id", id);
111: .from("vehicle_units")
112: .update({ category_id: null })
113: .eq("category_id", categoryId);
116: .from("vehicle_categories")
117: .delete()
118: .eq("id", categoryId);
131: .from("vehicle_units")
132: .select("id")
133: .eq("vin", input.vin.toUpperCase())
142: .from("vehicle_categories")
143: .select("name, daily_rate")
144: .eq("id", input.categoryId)
149: .from("vehicles")
150: .insert({
158: .select("id")
165: .from("vehicle_units")
166: .insert({
176: .select("id")
194: .from("vehicle_units")
195: .select("*")
196: .eq("id", id)
206: .from("vehicle_units")
207: .update(dbUpdates)
208: .eq("id", id);
230: .from("vehicle_units")
231: .select("location_id")
232: .eq("id", unitId)
236: const { error } = await supabase.functions.invoke("move-vehicle-unit", {
248: .from("vehicle_units")
249: .update({
253: .eq("id", unitId);
274: .from("bookings")
275: .select("booking_code, status")
276: .eq("assigned_unit_id", unitId)
277: .in("status", ["pending", "confirmed", "active"]);
286: const { error } = await supabase.from("vehicle_units").delete().eq("id", unitId);
293: .from("vehicle_units")
294: .update({
300: .eq("id", unitId);
```

**Error handling:**

- L57: `if (error) throw error;`
- L93: `if (error) throw error;`
- L120: `if (error) throw error;`
- L179: `if (error) throw error;`
- L210: `if (error) throw error;`
- L305: `throw error;`

**Return shape(s):** `{archived: true}`; `{archived: false}`

**Consumed by:** **NOT CONSUMED ANYWHERE — dead code**

### `src/domain/fleet/queries.ts`

**File header:** Fleet Domain - Query Functions

**Exports:** `listCategories`, `listAvailableCategories`, `getCategoryById`, `listCategoryUnits`, `getUnitById`, `listAllUnits`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
13: .from("vehicle_categories")
14: .select("*")
15: .order("sort_order", { ascending: true })
16: .order("name");
22: .from("vehicle_units")
23: .select("id, category_id, status")
28: .from("bookings")
29: .select("assigned_unit_id")
30: .eq("status", "active")
75: const { data, error } = await supabase.rpc("get_available_categories", {
83: .from("vehicle_categories")
84: .select("*")
85: .eq("is_active", true)
86: .order("sort_order");
89: .from("vehicle_units")
90: .select("category_id")
91: .eq("location_id", locationId)
92: .eq("status", "available");
137: .from("vehicle_categories")
138: .select("*")
139: .eq("id", id)
147: .from("vehicle_units")
148: .select("id, status")
149: .eq("category_id", id);
155: .from("bookings")
156: .select("assigned_unit_id")
157: .eq("status", "active")
159: .in("assigned_unit_id", unitIds)
194: .from("vehicle_units")
195: .select(`
199: .eq("category_id", categoryId)
200: .order("status")
201: .order("vin");
231: .from("vehicle_units")
232: .select(`
237: .eq("id", id)
275: .from("vehicle_units")
276: .select(`
281: .order("created_at", { ascending: false });
284: query = query.eq("status", filters.status);
288: query = query.eq("location_id", filters.locationId);
292: query = query.eq("category_id", filters.categoryId);
296: query = query.or(
```

**Error handling:**

- L18: `if (error) throw error;`
- L80: `console.error("Error fetching available categories:", error);`
- L142: `if (error) throw error;`
- L203: `if (error) throw error;`
- L240: `if (error) throw error;`
- L303: `if (error) throw error;`

**Consumed by:** `src/pages/ops/OpsFleet.tsx`

### `src/domain/queryKeys.ts`

**File header:** Centralized Query Keys Registry Single source of truth for all TanStack Query cache keys

**Exports:** `queryKeys`

**Query keys:**

- L6: `export const queryKeys = {`
- L103: `export type QueryKeyType = typeof queryKeys;`

**Supabase statements:** none (pure computation or context hook)

**Consumed by:** **NOT CONSUMED ANYWHERE — dead code**

### `src/features/delivery/hooks/use-delivery-actions.ts`

**Exports:** `useUpdateDeliveryStatus`, `useClaimDeliveryMutation`, `useCaptureHandover`, `useRecordOdometer`, `useUploadHandoverPhoto`, `useDeliveryActions`, `useQuickStatusUpdate`

**Query keys:**

- L53: `queryClient.invalidateQueries({ queryKey: DELIVERY_QUERY_KEYS.all });`
- L79: `queryClient.invalidateQueries({ queryKey: DELIVERY_QUERY_KEYS.all });`
- L106: `queryKey: DELIVERY_QUERY_KEYS.detail(variables.bookingId)`
- L134: `queryKey: DELIVERY_QUERY_KEYS.detail(variables.bookingId)`

**Supabase statements:** none (pure computation or context hook)

**Cache invalidation on success:**

- L53: `queryClient.invalidateQueries({ queryKey: DELIVERY_QUERY_KEYS.all });`
- L79: `queryClient.invalidateQueries({ queryKey: DELIVERY_QUERY_KEYS.all });`
- L105: `queryClient.invalidateQueries({`
- L133: `queryClient.invalidateQueries({`

**Error handling:**

- L55: `toast.error(result.error || "Failed to update status");`
- L58: `onError: (error) => {`
- L59: `console.error("Status update error:", error);`
- L60: `toast.error("Failed to update status");`
- L81: `toast.error(result.error || "Failed to claim delivery");`
- L84: `onError: (error) => {`
- L85: `console.error("Claim error:", error);`
- L86: `toast.error("Failed to claim delivery");`
- L109: `toast.error(result.error || "Failed to save photos");`
- L112: `onError: (error) => {`
- L113: `console.error("Handover capture error:", error);`
- L114: `toast.error("Failed to save handover photos");`
- L137: `toast.error(result.error || "Failed to record odometer");`
- L140: `onError: (error) => {`
- L141: `console.error("Odometer record error:", error);`
- L142: `toast.error("Failed to record odometer");`
- L160: `onError: (error) => {`
- L161: `console.error("Upload error:", error);`
- L162: `toast.error("Failed to upload photo");`

**Return shape(s):** `{updateStatus,
    claim,
    captureHandover,
    recordOdometer: recordOdometerMutation,
    uploadPhoto,
    isLoading: 
      updateStatus.isPending || 
      claim.isPending || 
      captureHando}`

**Consumed by:** `src/components/delivery/DeliveryHandoverCapture.tsx`, `src/features/delivery/components/DeliveryActions.tsx`, `src/hooks/use-my-deliveries.ts`

### `src/features/delivery/hooks/use-delivery-detail.ts`

**Exports:** `useDeliveryDetail`, `useHandoverChecklist`

**Query keys:**

- L22: `queryKey: DELIVERY_QUERY_KEYS.detail(bookingId || ''),`

**Cache / fetch settings:**

- L27: `enabled: enabled && !!bookingId,`
- L28: `staleTime: 10_000, // 10 seconds for detail`

**Supabase statements:** none (pure computation or context hook)

**Return shape(s):** `{agreementSigned: !!detail?.agreementSignedAt,
    walkaroundComplete: !!detail?.walkaroundAcknowledgedAt,
    photosUploaded: false, // Would need separate photos query
    odometerRecorded: false, //}`

**Consumed by:** `src/features/delivery/pages/Detail.tsx`

### `src/features/delivery/hooks/use-delivery-list.ts`

**Exports:** `useDeliveryList`, `useDeliveryCounts`, `useMyDeliveries`, `useAvailableDeliveries`

**Query keys:**

- L24: `queryKey: DELIVERY_QUERY_KEYS.list(scope, statusFilter || undefined),`
- L49: `queryKey: [...DELIVERY_QUERY_KEYS.all, 'counts'],`

**Cache / fetch settings:**

- L35: `enabled: enabled && !!user?.id,`
- L36: `staleTime: 30_000, // 30 seconds`
- L37: `refetchInterval: 60_000, // Refetch every minute`
- L56: `enabled: !!user?.id,`
- L57: `staleTime: 30_000,`

**Supabase statements:** none (pure computation or context hook)

**Return shape(s):** `{my: 0, available: 0, pending: 0, enRoute: 0, completed: 0, issue: 0}`

**Consumed by:** `src/components/delivery/DeliveryShell.tsx`, `src/features/delivery/context/DeliveryContext.tsx`, `src/features/delivery/pages/Dashboard.tsx`, `src/hooks/use-my-deliveries.ts`

### `src/features/delivery/hooks/use-realtime-delivery.ts`

**Exports:** `useRealtimeDelivery`, `useRealtimeDeliveryDetail`

**Query keys:**

- L29: `queryClient.invalidateQueries({ queryKey: DELIVERY_QUERY_KEYS.all });`
- L98: `queryKey: DELIVERY_QUERY_KEYS.detail(bookingId)`
- L112: `queryKey: DELIVERY_QUERY_KEYS.detail(bookingId)`

**Supabase statements:** none (pure computation or context hook)

**Cache invalidation on success:**

- L24: `const invalidateQueries = () => {`
- L29: `queryClient.invalidateQueries({ queryKey: DELIVERY_QUERY_KEYS.all });`
- L44: `invalidateQueries();`
- L61: `invalidateQueries();`
- L97: `queryClient.invalidateQueries({`
- L111: `queryClient.invalidateQueries({`

**Consumed by:** `src/features/delivery/context/DeliveryContext.tsx`, `src/features/delivery/pages/Dashboard.tsx`, `src/features/delivery/pages/Detail.tsx`

### `src/auth/capabilities.ts`

**File header:** Capability-Based Authorization System Provides role + panel-aware permission checking. Actions are shown/hidden based on capabilities, not duplicate pages.

**Exports:** `resolveCapabilities`, `useCapabilities`, `useCanAccessOps`, `useCanAccessAdmin`, `useCapability`

**Query keys:**

- L11: `import { queryKeys } from "@/domain/queryKeys";`
- L230: `queryKey: queryKeys.auth.capabilities(user?.id || "", panel),`

**Cache / fetch settings:**

- L253: `enabled: !!user,`
- L254: `staleTime: 60000, // 1 minute`

**Supabase query/mutation statements (verbatim, in file order):**

```ts
236: .from("user_roles")
237: .select("role")
238: .eq("user_id", user.id);
```

**Error handling:**

- L241: `console.error("Error fetching user roles:", error);`

**Return shape(s):** `{canAccess: caps?.canAccessOpsPanel ?? false, isLoading}`; `{canAccess: caps?.canAccessAdminPanel ?? false, isLoading}`

**Consumed by:** `src/components/layout/AdminShell.tsx`, `src/components/ops/OpsProtectedRoute.tsx`, `src/hooks/use-staff-location.ts`

---

## 2. Mutations

| File:line | Mutation | Writes / invokes | Invalidates | Error handling |
| --- | --- | --- | --- | --- |
| `src/hooks/use-abandoned-carts.ts:1` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-abandoned-carts.ts:83` | `anonymous` | `abandoned_carts`.update, `abandoned_carts`.insert | none | none in this block |
| `src/hooks/use-abandoned-carts.ts:163` | `anonymous` | `abandoned_carts`.update, `abandoned_carts`.update, `abandoned_carts`.delete | `["abandoned-carts"]`, `["abandoned-carts"]`, `["abandoned-carts"]` | yes |
| `src/hooks/use-abandoned-carts.ts:188` | `anonymous` | `abandoned_carts`.update, `abandoned_carts`.delete | `["abandoned-carts"]`, `["abandoned-carts"]` | yes |
| `src/hooks/use-abandoned-carts.ts:219` | `anonymous` | `abandoned_carts`.delete | `["abandoned-carts"]` | yes |
| `src/hooks/use-alerts.ts:1` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | none in this block |
| `src/hooks/use-alerts.ts:198` | `anonymous` | `admin_alerts`.update, `admin_alerts`.update, `admin_alerts`.update | `["admin-alerts"]`, `["pending-alerts-count"]`, `["admin-alerts"]`, `["pending-alerts-count"]` | none in this block |
| `src/hooks/use-alerts.ts:229` | `anonymous` | `admin_alerts`.update, `admin_alerts`.update, `admin_alerts`.update | `["admin-alerts"]`, `["pending-alerts-count"]`, `["admin-alerts"]`, `["pending-alerts-count"]` | none in this block |
| `src/hooks/use-alerts.ts:260` | `anonymous` | `admin_alerts`.update, `admin_alerts`.update | `["admin-alerts"]`, `["pending-alerts-count"]` | none in this block |
| `src/hooks/use-alerts.ts:318` | `anonymous` | `admin_alerts`.insert | none | none in this block |
| `src/hooks/use-assign-driver.ts:1` | `anonymous` | `bookings`.update | none | yes |
| `src/hooks/use-assign-driver.ts:23` | `anonymous` | `bookings`.update, `audit_logs`.insert | `["my-deliveries"]`, `["unassigned-deliveries"]`, `["all-deliveries"]`, `["delivery-detail"]`, `["dispatch-readiness"]` | none in this block |
| `src/hooks/use-assign-driver.ts:113` | `anonymous` | `bookings`.update | `["my-deliveries"]`, `["unassigned-deliveries"]`, `["all-deliveries"]`, `["delivery-detail"]` | yes |
| `src/hooks/use-audit-logs.ts:5` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | none in this block |
| `src/hooks/use-audit-logs.ts:167` | `anonymous` | `audit_logs`.insert | `["audit-logs"]`, `["audit-stats"]` | none in this block |
| `src/hooks/use-booking-documents.ts:8` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-booking-documents.ts:82` | `anonymous` |  invoke `manage-booking-documents`, `manage-booking-documents` | `["booking-documents", vars.bookingId]`, `["customer-documents"]`, `["booking-activity", vars.bookingId]`, `["audit-logs"]`, `["booking-documents", vars.bookingId]`, `["customer-documents"]` | yes |
| `src/hooks/use-booking-documents.ts:138` | `anonymous` |  invoke `manage-booking-documents` | `["booking-documents", vars.bookingId]`, `["customer-documents"]`, `["booking-activity", vars.bookingId]` | yes |
| `src/hooks/use-booking-edit.ts:8` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-booking-edit.ts:107` | `anonymous` |  invoke `reprice-booking` | `["booking", result.bookingId]`, `["bookings"]`, `["admin-bookings"]`, `["booking-activity-timeline", result.bookingId]` | yes |
| `src/hooks/use-booking-modification.ts:5` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-booking-modification.ts:179` | `anonymous` |  invoke `reprice-booking` | `["booking", result.bookingId]`, `["bookings"]`, `["booking-activity-timeline", result.bookingId]`, `["rental-agreement", result.bookingId]` | yes |
| `src/hooks/use-bookings.ts:1` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-bookings.ts:389` | `anonymous` |  invoke `update-booking-status` | `["admin-bookings"]`, `["booking"]`, `["active-rental-detail"]`, `["alerts"]`, `["pending-alerts-count"]`, `["vehicle-units"]`, `["ops-fleet-units"]`, `["ops-pickups"]`, `["ops-active-rentals"]`, `["ops-returns"]` | yes |
| `src/hooks/use-checkin.ts:1` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-checkin.ts:95` | `queryClient` | `checkin_records`.update | none | none in this block |
| `src/hooks/use-checkin.ts:198` | `queryClient` | `checkin_records`.update, `checkin_records`.insert invoke `send-booking-notification` | `["checkin-record", bookingId]`, `["booking", bookingId]`, `["admin-alerts"]` | yes |
| `src/hooks/use-claim-delivery.ts:1` | `anonymous` |  invoke `claim-delivery` | `["my-deliveries"]`, `["delivery-detail"]` | yes |
| `src/hooks/use-claim-delivery.ts:8` | `anonymous` |  invoke `claim-delivery` | `["my-deliveries"]`, `["delivery-detail"]` | yes |
| `src/hooks/use-competitor-pricing.ts:5` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-competitor-pricing.ts:56` | `anonymous` | `competitor_pricing`.update, `competitor_pricing`.insert, `competitor_pricing`.delete | `["competitor-pricing"]`, `["competitor-pricing"]` | yes |
| `src/hooks/use-competitor-pricing.ts:105` | `anonymous` | `competitor_pricing`.delete | `["competitor-pricing"]` | yes |
| `src/hooks/use-condition-photos.ts:1` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-condition-photos.ts:80` | `anonymous` | `condition_photos`.update, `condition_photos`.insert | none | none in this block |
| `src/hooks/use-damages.ts:1` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-damages.ts:181` | `queryClient` | `damage_reports`.update | `["admin-damages"]`, `["admin-damage"]` | yes |
| `src/hooks/use-damages.ts:250` | `queryClient` | `damage_reports`.insert | none | none in this block |
| `src/hooks/use-delivery-task.ts:5` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-delivery-task.ts:113` | `anonymous` | `delivery_tasks`.upsert, `audit_logs`.insert, `delivery_tasks`.update, `delivery_tasks`.upsert | `["delivery-task", bookingId]` | yes |
| `src/hooks/use-delivery-task.ts:155` | `anonymous` | `delivery_tasks`.update, `delivery_tasks`.upsert, `audit_logs`.insert | `["delivery-task", task.bookingId]`, `["booking-activity-timeline", task.bookingId]` | yes |
| `src/hooks/use-delivery-task.ts:260` | `anonymous` | `bookings`.update, `audit_logs`.insert | `["booking", bookingId]` | yes |
| `src/hooks/use-delivery-task.ts:327` | `anonymous` | `delivery_tasks`.upsert, `audit_logs`.insert invoke `update-booking-status` | `["booking", bookingId]`, `["delivery-task", bookingId]`, `["booking-activity-timeline", bookingId]` | yes |
| `src/hooks/use-deposit-hold.ts:8` | `anonymous` |  invoke `close-account` | `["booking", variables.bookingId]`, `["final-invoice", variables.bookingId]`, `["admin-bookings"]` | yes |
| `src/hooks/use-deposit-hold.ts:18` | `anonymous` |  invoke `close-account` | `["booking", variables.bookingId]`, `["final-invoice", variables.bookingId]`, `["admin-bookings"]` | yes |
| `src/hooks/use-deposit-ledger.ts:1` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-deposit-ledger.ts:128` | `anonymous` | `deposit_ledger`.insert | `['deposit-ledger', variables.bookingId]`, `['payment-deposit-status', variables.bookingId]` | yes |
| `src/hooks/use-fleet-categories.ts:5` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-fleet-categories.ts:230` | `anonymous` | `vehicle_categories`.insert, `vehicle_categories`.update, `vehicle_units`.update | `["fleet-categories"]`, `["available-categories"]`, `["fleet-categories"]`, `["available-categories"]` | yes |
| `src/hooks/use-fleet-categories.ts:265` | `anonymous` | `vehicle_categories`.update, `vehicle_units`.update, `vehicle_categories`.delete | `["fleet-categories"]`, `["available-categories"]`, `["fleet-categories"]`, `["category-vins"]` | yes |
| `src/hooks/use-fleet-categories.ts:292` | `anonymous` | `vehicle_units`.update, `vehicle_categories`.delete, `vehicles`.insert | `["fleet-categories"]`, `["category-vins"]` | yes |
| `src/hooks/use-fleet-categories.ts:322` | `anonymous` | `vehicles`.insert, `vehicle_units`.insert | `["fleet-categories"]`, `["category-vins"]`, `["available-categories"]` | yes |
| `src/hooks/use-fleet-categories.ts:398` | `anonymous` | `vehicle_units`.update, `vehicle_units`.delete, `vehicle_units`.update | `["fleet-categories"]`, `["category-vins"]`, `["available-categories"]`, `["fleet-categories"]`, `["category-vins"]`, `["available-categories"]` | yes |
| `src/hooks/use-fleet-categories.ts:423` | `anonymous` | `vehicle_units`.delete, `vehicle_units`.update rpc `assign_vin_to_booking` | `["fleet-categories"]`, `["category-vins"]`, `["available-categories"]` | yes |
| `src/hooks/use-fleet-categories.ts:481` | `anonymous` |  rpc `assign_vin_to_booking`, `release_vin_from_booking` | `["fleet-categories"]`, `["category-vins"]`, `["available-categories"]`, `["booking"]`, `["fleet-categories"]`, `["category-vins"]`, `["available-categories"]`, `["booking"]` | yes |
| `src/hooks/use-fleet-categories.ts:514` | `anonymous` |  rpc `release_vin_from_booking` | `["fleet-categories"]`, `["category-vins"]`, `["available-categories"]`, `["booking"]` | yes |
| `src/hooks/use-hold.ts:1` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-hold.ts:31` | `navigate` | `reservation_holds`.insert | `["available-vehicles"]`, `["vehicle-availability"]` | none in this block |
| `src/hooks/use-hold.ts:161` | `anonymous` | `reservation_holds`.update | `["hold"]`, `["available-vehicles"]` | none in this block |
| `src/hooks/use-incidents.ts:1` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-incidents.ts:257` | `queryClient` | `incident_cases`.insert, `incident_cases`.update | `["incident-cases"]`, `["booking-incidents", data.booking_id]`, `["support-tickets-v2"]`, `["ticket-queue-counts-v2"]`, `["incident-cases"]`, `["incident-case", data.id]` | yes |
| `src/hooks/use-incidents.ts:297` | `queryClient` | `incident_cases`.update | `["incident-cases"]`, `["incident-case", data.id]`, `["booking-incidents", data.booking_id]` | yes |
| `src/hooks/use-incidents.ts:342` | `queryClient` | `incident_photos`.insert | `["incident-case", data.incident_id]` | yes |
| `src/hooks/use-inventory.ts:1` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-inventory.ts:152` | `anonymous` | `vehicles`.update | `["admin-vehicles"]`, `["admin-vehicle"]`, `["admin-calendar"]` | yes |
| `src/hooks/use-inventory.ts:219` | `anonymous` | `vehicles`.insert, `booking_add_ons`.delete, `condition_photos`.delete, `walkaround_inspections`.delete, `rental_agreements`.delete, `checkin_records`.delete, `inspection_metrics`.delete, `payments`.delete, `verification_requests`.delete | `["admin-vehicles"]`, `["admin-calendar"]`, `["vehicles"]` | yes |
| `src/hooks/use-inventory.ts:267` | `anonymous` | `booking_add_ons`.delete, `condition_photos`.delete, `walkaround_inspections`.delete, `rental_agreements`.delete, `checkin_records`.delete, `inspection_metrics`.delete, `payments`.delete, `verification_requests`.delete, `booking_otps`.delete, `notification_logs`.delete, `admin_alerts`.delete, `ticket_messages`.delete, `tickets`.delete, `receipt_events`.delete, `receipts`.delete, `bookings`.delete, `admin_alerts`.delete, `damage_reports`.delete, `audit_logs`.delete, `vehicles`.delete | `["admin-vehicles"]`, `["admin-calendar"]` | none in this block |
| `src/hooks/use-late-return.ts:4` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-late-return.ts:62` | `anonymous` | `bookings`.update, `bookings`.update | `["my-bookings"]`, `["booking", variables.bookingId]`, `["booking", variables.bookingId]` | yes |
| `src/hooks/use-late-return.ts:111` | `anonymous` | `bookings`.update, `bookings`.update | `["booking", variables.bookingId]`, `["active-rentals"]`, `["returns"]`, `["booking", variables.bookingId]` | yes |
| `src/hooks/use-late-return.ts:147` | `anonymous` | `bookings`.update | `["booking", variables.bookingId]` | none in this block |
| `src/hooks/use-maintenance-logs.ts:5` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-maintenance-logs.ts:111` | `anonymous` | `maintenance_logs`.insert, `maintenance_logs`.update, `maintenance_logs`.delete | `["maintenance-logs"]`, `["maintenance-logs-unit", variables.vehicle_unit_id]`, `["maintenance-total", variables.vehicle_unit_id]`, `["vehicle-cost-timeline", variables.vehicle_unit_id]`, `["fleet-analytics"]`, `["fleet-cost-analysis"]`, `["maintenance-logs"]`, `["maintenance-logs-unit", data.vehicle_unit_id]`, `["maintenance-total", data.vehicle_unit_id]`, `["vehicle-cost-timeline", data.vehicle_unit_id]`, `["fleet-analytics"]`, `["fleet-cost-analysis"]` | yes |
| `src/hooks/use-maintenance-logs.ts:145` | `anonymous` | `maintenance_logs`.update, `maintenance_logs`.delete | `["maintenance-logs"]`, `["maintenance-logs-unit", data.vehicle_unit_id]`, `["maintenance-total", data.vehicle_unit_id]`, `["vehicle-cost-timeline", data.vehicle_unit_id]`, `["fleet-analytics"]`, `["fleet-cost-analysis"]`, `["maintenance-logs"]`, `["maintenance-logs-unit", data.vehicle_unit_id]`, `["maintenance-total", data.vehicle_unit_id]`, `["vehicle-cost-timeline", data.vehicle_unit_id]`, `["fleet-analytics"]`, `["fleet-cost-analysis"]` | yes |
| `src/hooks/use-maintenance-logs.ts:176` | `anonymous` | `maintenance_logs`.delete | `["maintenance-logs"]`, `["maintenance-logs-unit", data.vehicle_unit_id]`, `["maintenance-total", data.vehicle_unit_id]`, `["vehicle-cost-timeline", data.vehicle_unit_id]`, `["fleet-analytics"]`, `["fleet-cost-analysis"]` | yes |
| `src/hooks/use-manage-addons.ts:5` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-manage-addons.ts:70` | `anonymous` | `add_ons`.update, `add_ons`.insert | `["admin-add-ons"]`, `["add-ons"]`, `["admin-add-ons"]`, `["add-ons"]` | yes |
| `src/hooks/use-manage-addons.ts:102` | `anonymous` | `add_ons`.insert, `add_ons`.delete | `["admin-add-ons"]`, `["add-ons"]`, `["admin-add-ons"]`, `["add-ons"]` | yes |
| `src/hooks/use-manage-addons.ts:136` | `anonymous` | `add_ons`.delete | `["admin-add-ons"]`, `["add-ons"]` | yes |
| `src/hooks/use-my-deliveries.ts:1` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-my-deliveries.ts:261` | `queryClient` | `delivery_statuses`.upsert | `["my-deliveries"]` | yes |
| `src/hooks/use-offers.ts:5` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-offers.ts:173` | `anonymous` | `points_offers`.insert, `points_offers`.update | `["admin-offers"]`, `["active-offers"]` | yes |
| `src/hooks/use-offers.ts:217` | `anonymous` | `points_offers`.update, `points_offers`.delete | `["admin-offers"]`, `["active-offers"]`, `["admin-offers"]`, `["active-offers"]` | yes |
| `src/hooks/use-offers.ts:263` | `anonymous` | `points_offers`.delete, `offer_redemptions`.insert rpc `update_points_balance` | `["admin-offers"]`, `["active-offers"]` | yes |
| `src/hooks/use-offers.ts:288` | `anonymous` | `offer_redemptions`.insert, `points_offers`.update rpc `update_points_balance` | `["membership-info"]`, `["points-ledger"]`, `["offer-redemptions"]`, `["active-offers"]` | yes |
| `src/hooks/use-payments.ts:7` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | none in this block |
| `src/hooks/use-payments.ts:14` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | none in this block |
| `src/hooks/use-points.ts:5` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-points.ts:130` | `anonymous` | `points_settings`.update | `["points-settings"]` | yes |
| `src/hooks/use-points.ts:252` | `anonymous` |  rpc `update_points_balance` | `["membership-info"]`, `["points-ledger"]` | yes |
| `src/hooks/use-points.ts:329` | `anonymous` |  rpc `update_points_balance` | `["membership-info"]`, `["points-ledger"]` | yes |
| `src/hooks/use-points.ts:370` | `anonymous` |  rpc `update_points_balance` | `["membership-info"]`, `["points-ledger"]` | yes |
| `src/hooks/use-points.ts:437` | `anonymous` |  rpc `update_points_balance` | `["membership-info"]`, `["points-ledger"]` | yes |
| `src/hooks/use-protection-settings.ts:6` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-protection-settings.ts:227` | `anonymous` | UNKNOWN: no write detected within 70 lines | `["protection-settings"]` | yes |
| `src/hooks/use-receipts.ts:1` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-receipts.ts:137` | `queryClient` | `receipts`.insert, `receipt_events`.insert, `receipts`.update | `["admin-receipts"]`, `["bookings-for-receipt"]` | yes |
| `src/hooks/use-receipts.ts:190` | `queryClient` | `receipts`.update, `receipt_events`.insert | `["admin-receipts"]` | yes |
| `src/hooks/use-rental-agreement.ts:1` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-rental-agreement.ts:158` | `anonymous` |  invoke `generate-agreement`, `send-booking-notification` | `["rental-agreement", bookingId]`, `["booking", bookingId]` | yes |
| `src/hooks/use-rental-agreement.ts:241` | `anonymous` | `rental_agreements`.update, `rental_agreements`.update, `audit_logs`.insert invoke `send-booking-notification` | `["rental-agreement"]`, `["booking"]` | yes |
| `src/hooks/use-rental-agreement.ts:289` | `anonymous` | `rental_agreements`.update, `audit_logs`.insert, `rental_agreements`.update, `audit_logs`.insert | `["rental-agreement"]`, `["booking"]`, `["rental-agreement"]` | yes |
| `src/hooks/use-rental-agreement.ts:328` | `anonymous` | `rental_agreements`.update, `audit_logs`.insert, `rental_agreements`.update, `audit_logs`.insert | `["rental-agreement"]`, `["rental-agreement"]`, `["booking"]` | yes |
| `src/hooks/use-rental-agreement.ts:361` | `anonymous` | `rental_agreements`.update, `audit_logs`.insert | `["rental-agreement"]`, `["booking"]` | yes |
| `src/hooks/use-return-receipt.ts:6` | `anonymous` |  invoke `generate-return-receipt` | `["admin-receipts"]`, `["booking-receipts", variables.bookingId]` | yes |
| `src/hooks/use-return-receipt.ts:29` | `anonymous` |  invoke `generate-return-receipt` | `["admin-receipts"]`, `["booking-receipts", variables.bookingId]` | yes |
| `src/hooks/use-return-state.ts:1` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-return-state.ts:32` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | none in this block |
| `src/hooks/use-return-state.ts:124` | `anonymous` | `bookings`.update | none | yes |
| `src/hooks/use-return-state.ts:159` | `anonymous` | `bookings`.update | `["booking", bookingId]` | yes |
| `src/hooks/use-signature-capture.ts:4` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-signature-capture.ts:45` | `anonymous` | `rental_agreements`.update, `audit_logs`.insert | none | none in this block |
| `src/hooks/use-signature-capture.ts:130` | `anonymous` | `rental_agreements`.update, `audit_logs`.insert | `["rental-agreement", variables.bookingId]`, `["rental-agreement"]` | yes |
| `src/hooks/use-support-v2.ts:1` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-support-v2.ts:335` | `queryClient` | UNKNOWN: no write detected within 70 lines | `["support-tickets-v2"]`, `["ticket-queue-counts-v2"]` | yes |
| `src/hooks/use-support-v2.ts:414` | `queryClient` | UNKNOWN: no write detected within 70 lines | `["support-tickets-v2"]`, `["support-ticket-v2", variables.id]`, `["ticket-queue-counts-v2"]` | yes |
| `src/hooks/use-support-v2.ts:476` | `queryClient` | UNKNOWN: no write detected within 70 lines | none | none in this block |
| `src/hooks/use-support-v2.ts:602` | `queryClient` | `admin_alerts`.insert | `["support-tickets-v2"]`, `["support-ticket-v2", variables.ticketId]`, `["ticket-queue-counts-v2"]` | yes |
| `src/hooks/use-support-v2.ts:659` | `queryClient` | UNKNOWN: no write detected within 70 lines | `["support-tickets-v2"]`, `["support-ticket-v2", variables.ticketId]`, `["ticket-queue-counts-v2"]` | yes |
| `src/hooks/use-support-v2.ts:845` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | none in this block |
| `src/hooks/use-support-v2.ts:995` | `queryClient` |  invoke `notify-branch-sms` | `["customer-tickets-v2"]`, `["support-tickets-v2"]`, `["ticket-queue-counts-v2"]` | yes |
| `src/hooks/use-support-v2.ts:1077` | `queryClient` | UNKNOWN: no write detected within 70 lines | `["customer-tickets-v2"]`, `["customer-ticket-v2", variables.ticketId]`, `["support-tickets-v2"]` | yes |
| `src/hooks/use-ticket-attachments.ts:1` | `anonymous` | `ticket_attachments`.insert, `ticket_attachments`.delete | `["ticket-attachments"]` | yes |
| `src/hooks/use-ticket-attachments.ts:14` | `anonymous` | `ticket_attachments`.insert, `ticket_attachments`.delete | `["ticket-attachments"]`, `["ticket-attachments"]` | yes |
| `src/hooks/use-ticket-attachments.ts:63` | `anonymous` | `ticket_attachments`.delete | `["ticket-attachments"]` | yes |
| `src/hooks/use-tickets.ts:1` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-tickets.ts:213` | `queryClient` | `tickets`.update, `ticket_messages`.insert, `tickets`.update, `tickets`.update | `["admin-tickets"]`, `["admin-ticket"]` | yes |
| `src/hooks/use-tickets.ts:244` | `queryClient` | `ticket_messages`.insert, `tickets`.update, `tickets`.update | `["admin-tickets"]`, `["admin-ticket"]`, `["customer-tickets"]`, `["customer-tickets-v2"]`, `["support-tickets-v2"]`, `["customer-ticket"]` | yes |
| `src/hooks/use-tickets.ts:303` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | none in this block |
| `src/hooks/use-unit-assignment.ts:1` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-unit-assignment.ts:154` | `anonymous` | `bookings`.update | `["booking"]`, `["admin-bookings"]`, `["available-units"]`, `["low-inventory-alerts"]`, `["booking-assigned-unit"]` | yes |
| `src/hooks/use-unit-assignment.ts:223` | `anonymous` | `bookings`.update, `vehicle_units`.update | `["booking"]`, `["admin-bookings"]`, `["available-units"]`, `["low-inventory-alerts"]`, `["booking-assigned-unit", variables.bookingId]` | yes |
| `src/hooks/use-unit-assignment.ts:275` | `anonymous` | `vehicle_units`.update | `["vehicle-units"]`, `["vehicle-unit"]` | none in this block |
| `src/hooks/use-vehicle-assignment.ts:1` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-vehicle-assignment.ts:137` | `anonymous` | `bookings`.update invoke `send-booking-notification` | `['booking', variables.bookingId]`, `['admin-bookings']`, `['bookings']`, `['vehicle-availability']`, `['available-vehicles']`, `['fleet-vehicles']`, `['vehicle-units']`, `['booking-activity-timeline', variables.bookingId]` | yes |
| `src/hooks/use-vehicle-assignment.ts:224` | `anonymous` | `bookings`.update rpc `release_vin_from_booking` | `["booking", bookingId]`, `["admin-bookings"]`, `["bookings"]`, `["vehicle-availability"]`, `["available-vehicles"]`, `["fleet-vehicles"]`, `["vehicle-units"]`, `["booking-activity-timeline", bookingId]` | yes |
| `src/hooks/use-vehicle-categories.ts:5` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-vehicle-categories.ts:123` | `anonymous` | `vehicle_categories`.insert, `vehicle_categories`.update, `vehicle_units`.update, `vehicle_categories`.delete | `["vehicle-categories"]`, `["vehicle-categories"]` | yes |
| `src/hooks/use-vehicle-categories.ts:153` | `anonymous` | `vehicle_categories`.update, `vehicle_units`.update, `vehicle_categories`.delete, `vehicle_units`.update | `["vehicle-categories"]`, `["vehicle-categories"]`, `["vehicle-units"]`, `["vehicle-categories"]`, `["vehicle-units"]` | yes |
| `src/hooks/use-vehicle-categories.ts:179` | `anonymous` | `vehicle_units`.update, `vehicle_categories`.delete, `vehicle_units`.update, `vehicle_units`.update | `["vehicle-categories"]`, `["vehicle-units"]`, `["vehicle-categories"]`, `["vehicle-units"]`, `["vehicle-categories"]`, `["vehicle-units"]` | yes |
| `src/hooks/use-vehicle-categories.ts:208` | `anonymous` | `vehicle_units`.update, `vehicle_units`.update | `["vehicle-categories"]`, `["vehicle-units"]`, `["vehicle-categories"]`, `["vehicle-units"]` | yes |
| `src/hooks/use-vehicle-categories.ts:233` | `anonymous` | `vehicle_units`.update | `["vehicle-categories"]`, `["vehicle-units"]` | yes |
| `src/hooks/use-vehicle-expenses.ts:1` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-vehicle-expenses.ts:113` | `anonymous` | `vehicle_expenses`.insert, `vehicle_expenses`.update, `vehicle_expenses`.delete | `["vehicle-expenses"]`, `["expense-summary", variables.vehicle_unit_id]`, `["vehicle-units"]`, `["vehicle-unit"]`, `["vehicle-expenses"]`, `["expense-summary"]`, `["vehicle-units"]`, `["vehicle-unit"]` | yes |
| `src/hooks/use-vehicle-expenses.ts:144` | `anonymous` | `vehicle_expenses`.update, `vehicle_expenses`.delete | `["vehicle-expenses"]`, `["expense-summary"]`, `["vehicle-units"]`, `["vehicle-unit"]`, `["vehicle-expenses"]`, `["expense-summary"]`, `["vehicle-units"]`, `["vehicle-unit"]` | yes |
| `src/hooks/use-vehicle-expenses.ts:176` | `anonymous` | `vehicle_expenses`.delete | `["vehicle-expenses"]`, `["expense-summary"]`, `["vehicle-units"]`, `["vehicle-unit"]` | yes |
| `src/hooks/use-vehicle-maintenance.ts:1` | `anonymous` | `vehicles`.update, `vehicles`.update | `["admin-vehicles"]`, `["admin-vehicle"]`, `["vehicles"]`, `["admin-vehicles"]`, `["admin-vehicle"]`, `["vehicles"]` | yes |
| `src/hooks/use-vehicle-maintenance.ts:14` | `anonymous` | `vehicles`.update, `vehicles`.update | `["admin-vehicles"]`, `["admin-vehicle"]`, `["vehicles"]`, `["admin-vehicles"]`, `["admin-vehicle"]`, `["vehicles"]` | yes |
| `src/hooks/use-vehicle-maintenance.ts:44` | `anonymous` | `vehicles`.update | `["admin-vehicles"]`, `["admin-vehicle"]`, `["vehicles"]` | yes |
| `src/hooks/use-vehicle-prep.ts:1` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-vehicle-prep.ts:93` | `anonymous` | `inspection_metrics`.update, `inspection_metrics`.insert | none | none in this block |
| `src/hooks/use-vehicle-units.ts:1` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-vehicle-units.ts:177` | `anonymous` | `vehicle_units`.insert, `vehicle_units`.update | `["vehicle-units"]`, `["vehicle-units"]`, `["vehicle-unit", data.id]`, `["fleet-cost-analysis"]`, `["vehicle-cost-timeline", data.id]` | yes |
| `src/hooks/use-vehicle-units.ts:205` | `anonymous` | `vehicle_units`.update, `bookings`.update, `damage_reports`.delete | `["vehicle-units"]`, `["vehicle-unit", data.id]`, `["fleet-cost-analysis"]`, `["vehicle-cost-timeline", data.id]` | yes |
| `src/hooks/use-vehicle-units.ts:245` | `anonymous` | `bookings`.update, `damage_reports`.delete, `vehicle_units`.delete | `["vehicle-units"]`, `["fleet-categories"]`, `["category-vins"]` | yes |
| `src/hooks/use-vehicle-units.ts:332` | `anonymous` | `vehicle_units`.update | `["vehicle-units"]`, `["vehicle-unit", data.id]`, `["fleet-categories"]`, `["category-vins"]` | yes |
| `src/hooks/use-vehicle-units.ts:420` | `anonymous` | `vehicle_units`.update, `vehicle_units`.update | `["vehicle-units"]`, `["vehicle-unit", data.id]`, `["fleet-categories"]`, `["category-vins"]` | yes |
| `src/hooks/use-vendors.ts:5` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-vendors.ts:137` | `anonymous` | `vendors`.insert, `vendors`.update, `vendors`.delete | `["vendors"]`, `["vendors"]`, `["vendors"]` | yes |
| `src/hooks/use-vendors.ts:157` | `anonymous` | `vendors`.update, `vendors`.delete | `["vendors"]`, `["vendors"]` | yes |
| `src/hooks/use-vendors.ts:175` | `anonymous` | `vendors`.delete | `["vendors"]` | yes |
| `src/hooks/use-verification.ts:1` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-verification.ts:69` | `anonymous` | `verification_requests`.update, `verification_requests`.insert | `['verification']`, `['user-verifications']` | none in this block |
| `src/hooks/use-verification.ts:158` | `anonymous` | `verification_requests`.update invoke `send-booking-notification` | `['verification']`, `['admin-bookings']` | yes |
| `src/hooks/use-walkaround.ts:1` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/hooks/use-walkaround.ts:74` | `anonymous` | `walkaround_inspections`.insert, `audit_logs`.insert | `["walkaround-inspection", variables.bookingId]` | yes |
| `src/hooks/use-walkaround.ts:140` | `anonymous` | `walkaround_inspections`.update, `walkaround_inspections`.update | `["walkaround-inspection"]`, `["walkaround-inspection"]` | yes |
| `src/hooks/use-walkaround.ts:178` | `anonymous` | `walkaround_inspections`.update, `walkaround_inspections`.update | `["walkaround-inspection"]` | yes |
| `src/hooks/use-walkaround.ts:211` | `anonymous` | `walkaround_inspections`.update, `inspection_metrics`.update, `inspection_metrics`.insert, `audit_logs`.insert | none | none in this block |
| `src/hooks/use-walkaround.ts:303` | `anonymous` | `walkaround_inspections`.update, `audit_logs`.insert, `walkaround_inspections`.update | `["walkaround-inspection"]`, `["booking"]` | yes |
| `src/hooks/use-walkaround.ts:356` | `anonymous` | `walkaround_inspections`.update, `audit_logs`.insert | `["walkaround-inspection"]`, `["booking"]` | yes |
| `src/features/delivery/hooks/use-delivery-actions.ts:1` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/features/delivery/hooks/use-delivery-actions.ts:27` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/features/delivery/hooks/use-delivery-actions.ts:72` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/features/delivery/hooks/use-delivery-actions.ts:98` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/features/delivery/hooks/use-delivery-actions.ts:126` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/features/delivery/hooks/use-delivery-actions.ts:152` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/components/admin/AddOnsPricingPanel.tsx:42` | `anonymous` | UNKNOWN: no write detected within 70 lines | `["fuel-pricing-settings"]` | yes |
| `src/components/admin/AddOnsPricingPanel.tsx:85` | `mutation` | UNKNOWN: no write detected within 70 lines | `["fuel-pricing-settings"]`, `["driver-fee-settings"]` | yes |
| `src/components/admin/AddOnsPricingPanel.tsx:137` | `updateDriverFees` | UNKNOWN: no write detected within 70 lines | `["driver-fee-settings"]` | yes |
| `src/components/admin/BookingCustomerCard.tsx:15` | `anonymous` |  invoke `update-booking-customer` | none | yes |
| `src/components/admin/BookingCustomerCard.tsx:73` | `saveMutation` |  invoke `update-booking-customer` | `["booking", bookingId]`, `["profile-license", userId]`, `["profile", userId]`, `["bookings"]`, `["admin-bookings"]` | yes |
| `src/components/admin/CancelBookingDialog.tsx:2` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/components/admin/CancelBookingDialog.tsx:61` | `cancelMutation` |  invoke `void-booking`, `notify-admin` | `["admin-bookings"]`, `["booking", bookingId]`, `["alerts"]`, `["pending-alerts-count"]` | yes |
| `src/components/admin/CardPasswordSettings.tsx:5` | `anonymous` | UNKNOWN: no write detected within 70 lines | `["card-view-password-setting"]` | yes |
| `src/components/admin/CardPasswordSettings.tsx:32` | `updatePassword` | UNKNOWN: no write detected within 70 lines | `["card-view-password-setting"]` | yes |
| `src/components/admin/CategoryUpgradeDialog.tsx:27` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/components/admin/CategoryUpgradeDialog.tsx:111` | `updateCategory` |  invoke `reprice-booking` | `["booking"]`, `["bookings"]`, `["admin-bookings"]` | yes |
| `src/components/admin/ChangeVehicleDialog.tsx:2` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/components/admin/ChangeVehicleDialog.tsx:154` | `canSubmit` |  invoke `change-booking-vehicle` | `["booking", bookingId]`, `["active-rental-detail", bookingId]`, `["rental-agreement", bookingId]`, `["vehicle-swap-history", bookingId]`, `["vehicle-units"]`, `["available-vehicles"]`, `["booking-activity-timeline", bookingId]` | yes |
| `src/components/admin/DeliveryDetailsCard.tsx:23` | `anonymous` | `bookings`.update | `["booking", bookingId]`, `["bookings"]` | yes |
| `src/components/admin/DeliveryDetailsCard.tsx:78` | `anonymous` | `bookings`.update | `["booking", bookingId]`, `["bookings"]` | yes |
| `src/components/admin/MembershipManagementPanel.tsx:5` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/components/admin/MembershipManagementPanel.tsx:94` | `updateTierMutation` | UNKNOWN: no write detected within 70 lines | `["membership-tiers"]` | yes |
| `src/components/admin/ProtectionPricingPanel.tsx:23` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | none in this block |
| `src/components/admin/UnifiedVehicleManager.tsx:8` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/components/admin/UnifiedVehicleManager.tsx:248` | `priceDiff` | `vehicle_units`.update, `bookings`.update invoke `reprice-booking` rpc `release_vin_from_booking`, `assign_vin_to_booking`, `release_vin_from_booking` | none | yes |
| `src/components/admin/UnifiedVehicleManager.tsx:355` | `removeMutation` |  rpc `release_vin_from_booking` | `[k]` | yes |
| `src/components/admin/VoidBookingDialog.tsx:8` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/components/admin/VoidBookingDialog.tsx:65` | `voidMutation` | UNKNOWN: no write detected within 70 lines | `["admin-bookings"]`, `["booking", bookingId]`, `["alerts"]` | yes |
| `src/components/admin/ops/ActiveRentalUnitAssignCard.tsx:2` | `anonymous` |  invoke `assign-unit-to-active-booking` | `["active-rental-detail", bookingId]`, `["booking", bookingId]` | yes |
| `src/components/admin/ops/ActiveRentalUnitAssignCard.tsx:51` | `assign` |  invoke `assign-unit-to-active-booking` | `["active-rental-detail", bookingId]`, `["booking", bookingId]`, `["rental-agreement", bookingId]`, `["vehicle-units"]`, `["available-vehicles"]`, `["fleet-vehicles"]`, `["assignable-units", categoryId, locationId]`, `["booking-activity-timeline", bookingId]` | yes |
| `src/components/admin/ops/CounterUpsellPanel.tsx:6` | `anonymous` | UNKNOWN: no write detected within 70 lines | `["booking-add-ons", bookingId]`, `["booking-additional-drivers", bookingId]`, `["booking", bookingId]`, `["payments", bookingId]` | yes |
| `src/components/admin/ops/CounterUpsellPanel.tsx:87` | `anonymous` |  invoke `persist-booking-extras`, `persist-booking-extras`, `persist-booking-extras`, `persist-booking-extras` | none | yes |
| `src/components/admin/ops/CounterUpsellPanel.tsx:107` | `anonymous` |  invoke `persist-booking-extras`, `persist-booking-extras`, `persist-booking-extras`, `generate-agreement` | none | yes |
| `src/components/admin/ops/CounterUpsellPanel.tsx:127` | `anonymous` |  invoke `persist-booking-extras`, `persist-booking-extras`, `generate-agreement` | `["rental-agreement", bookingId]` | yes |
| `src/components/admin/ops/CounterUpsellPanel.tsx:147` | `anonymous` |  invoke `persist-booking-extras`, `generate-agreement` | `["rental-agreement", bookingId]` | yes |
| `src/components/admin/ops/CounterUpsellPanel.tsx:168` | `anonymous` |  invoke `generate-agreement` | `["rental-agreement", bookingId]` | yes |
| `src/components/admin/ops/ProtectionChangePanel.tsx:8` | `anonymous` |  invoke `reprice-booking` | `["booking", result.bookingId]`, `["bookings"]`, `["admin-bookings"]`, `["booking-activity-timeline", result.bookingId]` | yes |
| `src/components/admin/ops/ProtectionChangePanel.tsx:42` | `anonymous` |  invoke `reprice-booking` | `["booking", result.bookingId]`, `["bookings"]`, `["admin-bookings"]`, `["booking-activity-timeline", result.bookingId]` | yes |
| `src/components/admin/ops/VehicleUpgradePanel.tsx:11` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/components/admin/ops/VehicleUpgradePanel.tsx:143` | `applyMutation` |  invoke `reprice-booking`, `reprice-booking` | `[k]`, `["booking"]`, `["bookings"]` | yes |
| `src/components/admin/ops/VehicleUpgradePanel.tsx:182` | `removeMutation` |  invoke `reprice-booking` | `["booking"]`, `["bookings"]` | yes |
| `src/components/admin/ops/steps/StepDispatch.tsx:29` | `anonymous` | `bookings`.update, `delivery_tasks`.upsert, `delivery_statuses`.upsert, `audit_logs`.insert | none | none in this block |
| `src/components/admin/ops/steps/StepDispatch.tsx:68` | `assignDriverMutation` | `bookings`.update, `delivery_tasks`.upsert, `delivery_statuses`.upsert, `audit_logs`.insert | `["booking", bookingId]`, `["delivery-task", bookingId]`, `["available-drivers"]` | yes |
| `src/components/admin/ops/steps/StepPrep.tsx:28` | `anonymous` | `bookings`.update | `["booking", bookingId]`, `["available-drivers"]` | yes |
| `src/components/admin/ops/steps/StepPrep.tsx:59` | `queryClient` | `bookings`.update | `["booking", bookingId]`, `["available-drivers"]` | yes |
| `src/components/admin/return-ops/steps/StepReturnIntake.tsx:11` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | none in this block |
| `src/components/admin/return-ops/steps/StepReturnIntake.tsx:203` | `fuelDifference` | `inspection_metrics`.update, `inspection_metrics`.insert, `bookings`.update, `vehicle_units`.update | `["return-inspection-metrics", bookingId]`, `["vehicle-units"]`, `["vehicle-unit"]` | none in this block |
| `src/pages/admin/Billing.tsx:3` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/pages/admin/Billing.tsx:443` | `issueReceiptMutation` | `receipts`.update | `["admin-receipts"]` | yes |
| `src/pages/admin/Finance.tsx:3` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | none in this block |
| `src/pages/admin/Finance.tsx:1402` | `issueReceiptMutation` | `receipts`.update | `["admin-receipts"]` | yes |
| `src/pages/admin/Pickups.tsx:3` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/pages/admin/Staff.tsx:10` | `anonymous` |  invoke `manage-staff` | none | yes |
| `src/pages/admin/Staff.tsx:174` | `createStaff` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/pages/admin/Staff.tsx:204` | `setLocation` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/pages/admin/Staff.tsx:215` | `setActive` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/pages/admin/Staff.tsx:226` | `setSmsAlerts` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/pages/admin/Staff.tsx:237` | `updateStaff` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/pages/admin/Staff.tsx:263` | `deleteStaff` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/pages/admin/Staff.tsx:279` | `sendSetupLink` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/pages/admin/Tickets.tsx:67` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/pages/admin/Tickets.tsx:137` | `anonymous` | `tickets`.update, `ticket_timeline`.insert | `["admin-tickets"]`, `["admin-ticket"]`, `["ticket-timeline"]` | yes |
| `src/pages/admin/Tickets.tsx:190` | `anonymous` | `ticket_timeline`.insert | `["ticket-timeline"]` | none in this block |
| `src/pages/admin/Verifications.tsx:2` | `anonymous` | UNKNOWN: no write detected within 70 lines | none | yes |
| `src/pages/admin/Verifications.tsx:107` | `updateMutation` | `verification_requests`.update | `["admin-verifications"]` | yes |

GAP: mutations that write with `.from(...).update(...)` on `bookings`
financial or `status` columns are blocked at the database by
`trg_block_sensitive_booking_updates` (see `docs/01-DATABASE.md` section 6),
so any such client mutation fails at runtime rather than at build time.

---

## 3. Duplicate logic

Method: every source line in `src/` and `supabase/functions/` containing an
arithmetic or aggregation expression is normalised (whitespace removed) and
grouped. Any normalised expression appearing in more than one file is listed
with all of its locations, so disagreements are visible.

Distinct expressions found in more than one file: **104**.

**Expression:** `total_amount: number;`

- `src/pages/BookingDetail.tsx:105`: `total_amount: number;`
- `src/pages/Dashboard.tsx:38`: `total_amount: number;`
- `src/hooks/use-unit-rental-history.ts:17`: `total_amount: number;`
- `src/lib/booking-helpers.ts:21`: `total_amount: number;`
- `src/pages/admin/Finance.tsx:133`: `total_amount: number;`
- `src/hooks/use-revenue-analytics.ts:70`: `total_amount: number;`
- `src/hooks/use-receipts.ts:15`: `total_amount: number;`
- `src/hooks/use-booking-modification.ts:84`: `total_amount: number;`
- `src/hooks/use-booking-edit.ts:66`: `total_amount: number;`
- `src/pages/admin/Billing.tsx:85`: `total_amount: number;`
- `src/components/admin/UnifiedVehicleManager.tsx:61`: `total_amount: number;`
- `src/components/admin/CategoryUpgradeDialog.tsx:42`: `total_amount: number;`
- `src/components/admin/LocationDailyReport.tsx:73`: `total_amount: number;`
- `src/components/admin/ops/BookingEditPanel.tsx:31`: `total_amount: number;`
- `src/components/admin/ops/ModifyRentalPanel.tsx:26`: `total_amount: number;`
- `src/components/admin/ops/ProtectionChangePanel.tsx:30`: `total_amount: number;`
- `src/components/admin/ops/BookingModificationPanel.tsx:43`: `total_amount: number;`
- `src/components/admin/ops/VehicleUpgradePanel.tsx:49`: `total_amount: number;`

**Expression:** `tax_amount: number | null;`

- `src/pages/BookingDetail.tsx:103`: `tax_amount: number | null;`
- `src/lib/booking-helpers.ts:19`: `tax_amount: number | null;`
- `src/hooks/use-receipts.ts:14`: `tax_amount: number | null;`
- `src/hooks/use-booking-modification.ts:86`: `tax_amount: number | null;`
- `src/hooks/use-booking-edit.ts:68`: `tax_amount: number | null;`
- `src/components/admin/UnifiedVehicleManager.tsx:60`: `tax_amount: number | null;`
- `src/components/admin/ops/BookingEditPanel.tsx:33`: `tax_amount: number | null;`
- `src/components/admin/ops/ModifyRentalPanel.tsx:28`: `tax_amount: number | null;`
- `src/components/admin/ops/ProtectionChangePanel.tsx:29`: `tax_amount: number | null;`
- `src/components/admin/ops/BookingModificationPanel.tsx:45`: `tax_amount: number | null;`

**Expression:** `return Math.round(Number(n || 0) * 100);`

- `supabase/functions/_shared/vehicle-adjustments.ts:25`: `return Math.round(Number(n || 0) * 100);`
- `supabase/functions/backfill-additional-drivers/index.ts:14`: `return Math.round(Number(n || 0) * 100);`
- `src/lib/vehicle-adjustments.ts:27`: `return Math.round(Number(n || 0) * 100);`
- `src/lib/agreement-adjustments.ts:38`: `return Math.round(Number(n || 0) * 100);`
- `src/lib/pdf/invoice-data-builder.ts:22`: `return Math.round(Number(n || 0) * 100);`
- `src/components/admin/ops/FinancialBreakdown.tsx:26`: `return Math.round(Number(n || 0) * 100);`

**Expression:** `.reduce((sum, p) => sum + p.amount, 0);`

- `src/lib/booking-helpers.ts:268`: `.reduce((sum, p) => sum + p.amount, 0);`
- `src/hooks/use-collected-revenue.ts:57`: `.reduce((sum, p) => sum + p.amount, 0);`
- `src/hooks/use-collected-revenue.ts:61`: `.reduce((sum, p) => sum + p.amount, 0);`
- `src/hooks/use-collected-revenue.ts:65`: `.reduce((sum, p) => sum + p.amount, 0);`
- `src/hooks/use-collected-revenue.ts:69`: `.reduce((sum, p) => sum + p.amount, 0);`
- `src/hooks/use-collected-revenue.ts:73`: `.reduce((sum, p) => sum + p.amount, 0);`

**Expression:** `total_amount: booking.total_amount,`

- `supabase/functions/reprice-booking/index.ts:404`: `total_amount: booking.total_amount,`
- `supabase/functions/reprice-booking/index.ts:465`: `total_amount: booking.total_amount,`
- `supabase/functions/_shared/booking-core.ts:318`: `total_amount: booking.total_amount,`
- `src/hooks/use-delivery-task.ts:283`: `total_amount: booking.total_amount,`
- `src/components/admin/ops/ModifyRentalPanel.tsx:132`: `total_amount: booking.total_amount,`

**Expression:** `.reduce((sum, p) => sum + Number(p.amount), 0);`

- `supabase/functions/send-payment-confirmation/index.ts:66`: `.reduce((sum, p) => sum + Number(p.amount), 0);`
- `supabase/functions/send-payment-confirmation/index.ts:70`: `.reduce((sum, p) => sum + Number(p.amount), 0);`
- `src/hooks/use-payment-deposit.ts:88`: `.reduce((sum, p) => sum + Number(p.amount), 0);`
- `src/hooks/use-payment-deposit.ts:99`: `.reduce((sum, p) => sum + Number(p.amount), 0);`
- `src/components/admin/deposit/AccountCloseoutPanel.tsx:181`: `.reduce((sum, p) => sum + Number(p.amount), 0);`

**Expression:** `totalAmount: Number(b.total_amount),`

- `src/domain/bookings/queries.ts:165`: `totalAmount: Number(b.total_amount),`
- `src/hooks/use-returns.ts:154`: `totalAmount: Number(b.total_amount),`
- `src/hooks/use-bookings.ts:203`: `totalAmount: Number(b.total_amount),`
- `src/hooks/use-handovers.ts:196`: `totalAmount: Number(b.total_amount),`

**Expression:** `subtotal: booking.subtotal,`

- `supabase/functions/reprice-booking/index.ts:405`: `subtotal: booking.subtotal,`
- `supabase/functions/reprice-booking/index.ts:464`: `subtotal: booking.subtotal,`
- `src/hooks/use-delivery-task.ts:281`: `subtotal: booking.subtotal,`
- `src/components/admin/ops/ModifyRentalPanel.tsx:131`: `subtotal: booking.subtotal,`

**Expression:** `const safe = Number.isFinite(subtotal) ? subtotal : 0;`

- `supabase/functions/_shared/processing-fee.ts:16`: `const safe = Number.isFinite(subtotal) ? subtotal : 0;`
- `supabase/functions/_shared/processing-fee.ts:23`: `const safe = Number.isFinite(subtotal) ? subtotal : 0;`
- `src/lib/processing-fee.ts:22`: `const safe = Number.isFinite(subtotal) ? subtotal : 0;`
- `src/lib/processing-fee.ts:33`: `const safe = Number.isFinite(subtotal) ? subtotal : 0;`

**Expression:** `<TableCell className="font-medium">${Number(payment.amount).toFixed(2)}</TableCell>`

- `src/pages/admin/Finance.tsx:2090`: `<TableCell className="font-medium">${Number(payment.amount).toFixed(2)}</TableCell>`
- `src/pages/admin/Finance.tsx:2146`: `<TableCell className="font-medium">${Number(payment.amount).toFixed(2)}</TableCell>`
- `src/pages/admin/Billing.tsx:912`: `<TableCell className="font-medium">${Number(payment.amount).toFixed(2)}</TableCell>`
- `src/pages/admin/Billing.tsx:978`: `<TableCell className="font-medium">${Number(payment.amount).toFixed(2)}</TableCell>`

**Expression:** `const totalRentalDays = unitBookings.reduce((sum, b) => sum + (b.total_days || 0), 0);`

- `src/hooks/use-fleet-cost-enhanced.ts:170`: `const totalRentalDays = unitBookings.reduce((sum, b) => sum + (b.total_days || 0), 0);`
- `src/hooks/use-fleet-cost-analysis.ts:174`: `const totalRentalDays = unitBookings.reduce((sum, b) => sum + (b.total_days || 0), 0);`
- `src/hooks/use-fleet-analytics.ts:106`: `const totalRentalDays = unitBookings.reduce((sum, b) => sum + (b.total_days || 0), 0);`
- `src/hooks/use-fleet-analytics-enhanced.ts:96`: `const totalRentalDays = unitBookings.reduce((sum, b) => sum + (b.total_days || 0), 0);`

**Expression:** `return Math.round(v * 100) / 100;`

- `supabase/functions/close-account/index.ts:27`: `return Math.round(v * 100) / 100;`
- `supabase/functions/persist-booking-extras/index.ts:652`: `return Math.round(v * 100) / 100;`
- `supabase/functions/reprice-booking/index.ts:31`: `return Math.round(v * 100) / 100;`

**Expression:** `const processingFeeRate = getProcessingFeeRate(subtotal);`

- `supabase/functions/reprice-booking/index.ts:42`: `const processingFeeRate = getProcessingFeeRate(subtotal);`
- `supabase/functions/_shared/booking-core.ts:774`: `const processingFeeRate = getProcessingFeeRate(subtotal);`
- `src/lib/pricing.ts:510`: `const processingFeeRate = getProcessingFeeRate(subtotal);`

**Expression:** `const processingFee = computeProcessingFee(subtotal);`

- `supabase/functions/reprice-booking/index.ts:43`: `const processingFee = computeProcessingFee(subtotal);`
- `supabase/functions/_shared/booking-core.ts:775`: `const processingFee = computeProcessingFee(subtotal);`
- `src/lib/pricing.ts:511`: `const processingFee = computeProcessingFee(subtotal);`

**Expression:** `total_amount: b.total_amount,`

- `src/hooks/use-unit-rental-history.ts:62`: `total_amount: b.total_amount,`
- `src/hooks/use-receipts.ts:111`: `total_amount: b.total_amount,`
- `src/pages/admin/Billing.tsx:310`: `total_amount: b.total_amount,`

**Expression:** `<span>${pricing.taxAmount.toFixed(2)} CAD</span>`

- `src/pages/NewCheckout.tsx:1345`: `<span>${pricing.taxAmount.toFixed(2)} CAD</span>`
- `src/components/rental/BookingSummaryPanel.tsx:476`: `<span>${pricing.taxAmount.toFixed(2)} CAD</span>`
- `src/components/rental/BookingSummaryPanel.tsx:481`: `<span>${pricing.taxAmount.toFixed(2)} CAD</span>`

**Expression:** `subtotalBeforeTax: number;`

- `src/lib/agreement-adjustments.ts:33`: `subtotalBeforeTax: number;`
- `src/lib/pdf/rental-agreement-pdf.ts:85`: `subtotalBeforeTax: number;`
- `src/hooks/use-rental-agreement.ts:58`: `subtotalBeforeTax: number;`

**Expression:** `rental_subtotal: number;`

- `src/pages/admin/Finance.tsx:171`: `rental_subtotal: number;`
- `src/pages/admin/Billing.tsx:126`: `rental_subtotal: number;`
- `src/lib/pdf/invoice-data-builder.ts:65`: `rental_subtotal: number;`

**Expression:** `amount: Number(b.total_amount),`

- `src/pages/admin/Finance.tsx:609`: `amount: Number(b.total_amount),`
- `src/pages/admin/Finance.tsx:1369`: `amount: Number(b.total_amount),`
- `src/pages/admin/Billing.tsx:404`: `amount: Number(b.total_amount),`

**Expression:** `const taxAmount = Number(booking.tax_amount) || 0;`

- `supabase/functions/close-account/index.ts:151`: `const taxAmount = Number(booking.tax_amount) || 0;`
- `src/components/admin/deposit/AccountCloseoutPanel.tsx:164`: `const taxAmount = Number(booking.tax_amount) || 0;`

**Expression:** `if (minutes < 1440) return `${Math.round(minutes / 60)}h`;`

- `src/pages/support/SupportAnalytics.tsx:174`: `if (minutes < 1440) return `${Math.round(minutes / 60)}h`;`
- `src/pages/admin/SupportAnalytics.tsx:118`: `if (minutes < 1440) return `${Math.round(minutes / 60)}h`;`

**Expression:** `return `${Math.round(minutes / 1440)}d`;`

- `src/pages/support/SupportAnalytics.tsx:175`: `return `${Math.round(minutes / 1440)}d`;`
- `src/pages/admin/SupportAnalytics.tsx:119`: `return `${Math.round(minutes / 1440)}d`;`

**Expression:** `return `${Math.round(hours / 24)}d`;`

- `src/pages/support/SupportAnalytics.tsx:180`: `return `${Math.round(hours / 24)}d`;`
- `src/pages/admin/SupportAnalytics.tsx:124`: `return `${Math.round(hours / 24)}d`;`

**Expression:** `label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}`

- `src/pages/support/SupportAnalytics.tsx:364`: `label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}`
- `src/pages/admin/SupportAnalytics.tsx:314`: `label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}`

**Expression:** `const baseCents = dailyRateCents * days;`

- `supabase/functions/_shared/vehicle-adjustments.ts:55`: `const baseCents = dailyRateCents * days;`
- `src/lib/pricing.ts:388`: `const baseCents = dailyRateCents * days;`

**Expression:** `? Math.round(dailyRateCents * weekendDays * WEEKEND_SURCHARGE_RATE)`

- `supabase/functions/_shared/vehicle-adjustments.ts:58`: `? Math.round(dailyRateCents * weekendDays * WEEKEND_SURCHARGE_RATE)`
- `src/lib/pricing.ts:392`: `? Math.round(dailyRateCents * weekendDays * WEEKEND_SURCHARGE_RATE)`

**Expression:** `? Math.round((baseCents + weekendSurchargeCents) * discountRate)`

- `supabase/functions/_shared/vehicle-adjustments.ts:62`: `? Math.round((baseCents + weekendSurchargeCents) * discountRate)`
- `src/lib/pricing.ts:397`: `? Math.round((baseCents + weekendSurchargeCents) * discountRate)`

**Expression:** `const pct = Math.round(WEEKEND_SURCHARGE_RATE * 100);`

- `supabase/functions/_shared/vehicle-adjustments.ts:95`: `const pct = Math.round(WEEKEND_SURCHARGE_RATE * 100);`
- `src/lib/vehicle-adjustments.ts:69`: `const pct = Math.round(WEEKEND_SURCHARGE_RATE * 100);`

**Expression:** `const pct = Math.round(derived.discountRate * 100);`

- `supabase/functions/_shared/vehicle-adjustments.ts:105`: `const pct = Math.round(derived.discountRate * 100);`
- `src/lib/vehicle-adjustments.ts:79`: `const pct = Math.round(derived.discountRate * 100);`

**Expression:** `const explained = lines.reduce((sum, l) => sum + l.cents, 0);`

- `supabase/functions/_shared/vehicle-adjustments.ts:114`: `const explained = lines.reduce((sum, l) => sum + l.cents, 0);`
- `src/lib/vehicle-adjustments.ts:93`: `const explained = lines.reduce((sum, l) => sum + l.cents, 0);`

**Expression:** `processing_fee, processing_fee_rate,`

- `supabase/functions/generate-return-receipt/index.ts:60`: `processing_fee, processing_fee_rate,`
- `src/lib/pdf/invoice-data-builder.ts:83`: `processing_fee, processing_fee_rate,`

**Expression:** `const processingFeeRate = Number(booking.processing_fee_rate) || 0;`

- `supabase/functions/generate-return-receipt/index.ts:262`: `const processingFeeRate = Number(booking.processing_fee_rate) || 0;`
- `supabase/functions/generate-agreement/index.ts:499`: `const processingFeeRate = Number(booking.processing_fee_rate) || 0;`

**Expression:** `return Math.round(n * 100) / 100;`

- `supabase/functions/generate-agreement/index.ts:51`: `return Math.round(n * 100) / 100;`
- `supabase/functions/_shared/booking-core.ts:517`: `return Math.round(n * 100) / 100;`

**Expression:** `.select("total_amount")`

- `supabase/functions/persist-booking-extras/index.ts:747`: `.select("total_amount")`
- `src/hooks/use-fleet-analytics.ts:164`: `.select("total_amount")`

**Expression:** `subtotal: serverTotals.subtotal,`

- `supabase/functions/create-booking/index.ts:353`: `subtotal: serverTotals.subtotal,`
- `supabase/functions/_shared/booking-core.ts:957`: `subtotal: serverTotals.subtotal,`

**Expression:** `tax_amount: serverTotals.taxAmount,`

- `supabase/functions/create-booking/index.ts:354`: `tax_amount: serverTotals.taxAmount,`
- `supabase/functions/_shared/booking-core.ts:958`: `tax_amount: serverTotals.taxAmount,`

**Expression:** `processing_fee: serverTotals.processingFee,`

- `supabase/functions/create-booking/index.ts:355`: `processing_fee: serverTotals.processingFee,`
- `supabase/functions/_shared/booking-core.ts:959`: `processing_fee: serverTotals.processingFee,`

**Expression:** `processing_fee_rate: serverTotals.processingFeeRate,`

- `supabase/functions/create-booking/index.ts:356`: `processing_fee_rate: serverTotals.processingFeeRate,`
- `supabase/functions/_shared/booking-core.ts:960`: `processing_fee_rate: serverTotals.processingFeeRate,`

**Expression:** `total_amount: serverTotals.total,`

- `supabase/functions/create-booking/index.ts:358`: `total_amount: serverTotals.total,`
- `supabase/functions/_shared/booking-core.ts:962`: `total_amount: serverTotals.total,`

**Expression:** `subtotal: Number(b.subtotal),`

- `src/domain/bookings/queries.ts:162`: `subtotal: Number(b.subtotal),`
- `src/hooks/use-bookings.ts:200`: `subtotal: Number(b.subtotal),`

**Expression:** `taxAmount: b.tax_amount ? Number(b.tax_amount) : null,`

- `src/domain/bookings/queries.ts:163`: `taxAmount: b.tax_amount ? Number(b.tax_amount) : null,`
- `src/hooks/use-bookings.ts:201`: `taxAmount: b.tax_amount ? Number(b.tax_amount) : null,`

**Expression:** `id, booking_code, start_at, end_at, status, total_amount, user_id,`

- `supabase/functions/send-agreement-notification/index.ts:91`: `id, booking_code, start_at, end_at, status, total_amount, user_id,`
- `supabase/functions/send-booking-email/index.ts:68`: `id, booking_code, start_at, end_at, status, total_amount, user_id,`

**Expression:** `*  - Pre-tax rental subtotal up to $450.00  -> 2.5%`

- `supabase/functions/_shared/processing-fee.ts:4`: `*  - Pre-tax rental subtotal up to $450.00  -> 2.5%`
- `src/lib/processing-fee.ts:5`: `*  - Pre-tax rental subtotal up to $450.00  -> 2.5%`

**Expression:** `*  - Pre-tax rental subtotal $450.01+       -> 1.5%`

- `supabase/functions/_shared/processing-fee.ts:5`: `*  - Pre-tax rental subtotal $450.01+       -> 1.5%`
- `src/lib/processing-fee.ts:6`: `*  - Pre-tax rental subtotal $450.01+       -> 1.5%`

**Expression:** `export function getProcessingFeeRate(subtotal: number): number {`

- `supabase/functions/_shared/processing-fee.ts:15`: `export function getProcessingFeeRate(subtotal: number): number {`
- `src/lib/processing-fee.ts:21`: `export function getProcessingFeeRate(subtotal: number): number {`

**Expression:** `export function computeProcessingFee(subtotal: number): number {`

- `supabase/functions/_shared/processing-fee.ts:22`: `export function computeProcessingFee(subtotal: number): number {`
- `src/lib/processing-fee.ts:32`: `export function computeProcessingFee(subtotal: number): number {`

**Expression:** `<span>${booking.total_amount.toFixed(2)} CAD</span>`

- `src/pages/booking/BookingConfirmed.tsx:196`: `<span>${booking.total_amount.toFixed(2)} CAD</span>`
- `src/components/admin/CategoryUpgradeDialog.tsx:208`: `<span>${booking.total_amount.toFixed(2)} CAD</span>`

**Expression:** `${(receipt.totals_json as any)?.total?.toFixed(2)}`

- `src/pages/BookingDetail.tsx:975`: `${(receipt.totals_json as any)?.total?.toFixed(2)}`
- `src/components/admin/BookingOpsDrawer.tsx:676`: `${(receipt.totals_json as any)?.total?.toFixed(2)}`

**Expression:** `${totalPrice.toFixed(2)} CAD`

- `src/pages/AddOns.tsx:261`: `${totalPrice.toFixed(2)} CAD`
- `src/pages/Protection.tsx:133`: `${totalPrice.toFixed(2)} CAD`

**Expression:** `{(LATE_RETURN_SURCHARGE_HOURLY_PCT * 100).toFixed(0)}% of daily rate/hr for {LATE_RETURN_SURCHARGE_MAX_HOURS} hrs after {LATE_RETURN_GRACE_PERIOD_MINUTES}-min grace, then full-day `

- `src/components/support/TicketBookingSummary.tsx:221`: `{(LATE_RETURN_SURCHARGE_HOURLY_PCT * 100).toFixed(0)}% of daily rate/hr for {LATE_RETURN_SURCHARGE_MAX_HOURS} hrs after {LATE_RETURN_GRACE_PERIOD_MINUTES}-min grace, then full-day `
- `src/components/admin/return-ops/steps/StepReturnIssues.tsx:287`: `{(LATE_RETURN_SURCHARGE_HOURLY_PCT * 100).toFixed(0)}% of daily rate/hr for {LATE_RETURN_SURCHARGE_MAX_HOURS} hrs after {LATE_RETURN_GRACE_PERIOD_MINUTES}-min grace, then full-day `

**Expression:** `${pricing.total.toFixed(2)} CAD`

- `src/pages/NewCheckout.tsx:1211`: `${pricing.total.toFixed(2)} CAD`
- `src/components/shared/TotalBar.tsx:82`: `${pricing.total.toFixed(2)} CAD`

**Expression:** `<span>+${pricing.weekendSurcharge.toFixed(2)} CAD</span>`

- `src/pages/NewCheckout.tsx:1237`: `<span>+${pricing.weekendSurcharge.toFixed(2)} CAD</span>`
- `src/components/rental/BookingSummaryPanel.tsx:337`: `<span>+${pricing.weekendSurcharge.toFixed(2)} CAD</span>`

**Expression:** `<span>-${pricing.durationDiscount.toFixed(2)} CAD</span>`

- `src/pages/NewCheckout.tsx:1246`: `<span>-${pricing.durationDiscount.toFixed(2)} CAD</span>`
- `src/components/rental/BookingSummaryPanel.tsx:347`: `<span>-${pricing.durationDiscount.toFixed(2)} CAD</span>`

**Expression:** `<span>${item.total.toFixed(2)} CAD</span>`

- `src/pages/NewCheckout.tsx:1271`: `<span>${item.total.toFixed(2)} CAD</span>`
- `src/components/rental/BookingSummaryPanel.tsx:382`: `<span>${item.total.toFixed(2)} CAD</span>`

**Expression:** `<span>${pricing.additionalDriversCost.total.toFixed(2)} CAD</span>`

- `src/pages/NewCheckout.tsx:1284`: `<span>${pricing.additionalDriversCost.total.toFixed(2)} CAD</span>`
- `src/components/rental/BookingSummaryPanel.tsx:397`: `<span>${pricing.additionalDriversCost.total.toFixed(2)} CAD</span>`

**Expression:** `<span>${pricing.deliveryFee.toFixed(2)} CAD</span>`

- `src/pages/NewCheckout.tsx:1295`: `<span>${pricing.deliveryFee.toFixed(2)} CAD</span>`
- `src/components/rental/BookingSummaryPanel.tsx:428`: `<span>${pricing.deliveryFee.toFixed(2)} CAD</span>`

**Expression:** `<span>${pricing.youngDriverFee.toFixed(2)} CAD</span>`

- `src/pages/NewCheckout.tsx:1304`: `<span>${pricing.youngDriverFee.toFixed(2)} CAD</span>`
- `src/components/rental/BookingSummaryPanel.tsx:438`: `<span>${pricing.youngDriverFee.toFixed(2)} CAD</span>`

**Expression:** `<span>${pricing.differentDropoffFee.toFixed(2)} CAD</span>`

- `src/pages/NewCheckout.tsx:1312`: `<span>${pricing.differentDropoffFee.toFixed(2)} CAD</span>`
- `src/components/rental/BookingSummaryPanel.tsx:418`: `<span>${pricing.differentDropoffFee.toFixed(2)} CAD</span>`

**Expression:** `<span>${pricing.processingFee.toFixed(2)} CAD</span>`

- `src/pages/NewCheckout.tsx:1367`: `<span>${pricing.processingFee.toFixed(2)} CAD</span>`
- `src/components/rental/BookingSummaryPanel.tsx:490`: `<span>${pricing.processingFee.toFixed(2)} CAD</span>`

**Expression:** `const failed = payments.filter((p) => p.status === "failed").reduce((s, p) => s + p.amount, 0);`

- `src/pages/admin/Finance.tsx:702`: `const failed = payments.filter((p) => p.status === "failed").reduce((s, p) => s + p.amount, 0);`
- `src/pages/admin/PaymentDashboard.tsx:147`: `const failed = payments.filter((p) => p.status === "failed").reduce((s, p) => s + p.amount, 0);`

**Expression:** `const successRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;`

- `src/pages/admin/Finance.tsx:704`: `const successRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;`
- `src/pages/admin/PaymentDashboard.tsx:150`: `const successRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;`

**Expression:** `const changePercent = prevCollected > 0 ? Math.round(((collected - prevCollected) / prevCollected) * 100) : 0;`

- `src/pages/admin/Finance.tsx:706`: `const changePercent = prevCollected > 0 ? Math.round(((collected - prevCollected) / prevCollected) * 100) : 0;`
- `src/pages/admin/PaymentDashboard.tsx:153`: `const changePercent = prevCollected > 0 ? Math.round(((collected - prevCollected) / prevCollected) * 100) : 0;`

**Expression:** `.map(([method, data]) => ({ method, ...data, percent: metrics.collected > 0 ? Math.round((data.total / metrics.collected) * 100) : 0 }))`

- `src/pages/admin/Finance.tsx:720`: `.map(([method, data]) => ({ method, ...data, percent: metrics.collected > 0 ? Math.round((data.total / metrics.collected) * 100) : 0 }))`
- `src/pages/admin/PaymentDashboard.tsx:169`: `.map(([method, data]) => ({ method, ...data, percent: metrics.collected > 0 ? Math.round((data.total / metrics.collected) * 100) : 0 }))`

**Expression:** `const collected = dayPayments.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0);`

- `src/pages/admin/Finance.tsx:778`: `const collected = dayPayments.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0);`
- `src/pages/admin/PaymentDashboard.tsx:192`: `const collected = dayPayments.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0);`

**Expression:** `const pending = dayPayments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);`

- `src/pages/admin/Finance.tsx:779`: `const pending = dayPayments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);`
- `src/pages/admin/PaymentDashboard.tsx:193`: `const pending = dayPayments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);`

**Expression:** `const failed = dayPayments.filter((p) => p.status === "failed").reduce((s, p) => s + p.amount, 0);`

- `src/pages/admin/Finance.tsx:780`: `const failed = dayPayments.filter((p) => p.status === "failed").reduce((s, p) => s + p.amount, 0);`
- `src/pages/admin/PaymentDashboard.tsx:194`: `const failed = dayPayments.filter((p) => p.status === "failed").reduce((s, p) => s + p.amount, 0);`

**Expression:** `const successRate = dayPayments.length > 0 ? Math.round((completedCount / dayPayments.length) * 100) : 0;`

- `src/pages/admin/Finance.tsx:782`: `const successRate = dayPayments.length > 0 ? Math.round((completedCount / dayPayments.length) * 100) : 0;`
- `src/pages/admin/PaymentDashboard.tsx:196`: `const successRate = dayPayments.length > 0 ? Math.round((completedCount / dayPayments.length) * 100) : 0;`

**Expression:** `<TableCell className="text-right text-sm font-medium">${day.collected.toFixed(2)}</TableCell>`

- `src/pages/admin/Finance.tsx:976`: `<TableCell className="text-right text-sm font-medium">${day.collected.toFixed(2)}</TableCell>`
- `src/pages/admin/PaymentDashboard.tsx:344`: `<TableCell className="text-right text-sm font-medium">${day.collected.toFixed(2)}</TableCell>`

**Expression:** `<TableCell className="text-right text-sm text-muted-foreground">${day.pending.toFixed(2)}</TableCell>`

- `src/pages/admin/Finance.tsx:977`: `<TableCell className="text-right text-sm text-muted-foreground">${day.pending.toFixed(2)}</TableCell>`
- `src/pages/admin/PaymentDashboard.tsx:345`: `<TableCell className="text-right text-sm text-muted-foreground">${day.pending.toFixed(2)}</TableCell>`

**Expression:** `{day.failed > 0 ? <span className="text-destructive">${day.failed.toFixed(2)}</span> : "—"}`

- `src/pages/admin/Finance.tsx:979`: `{day.failed > 0 ? <span className="text-destructive">${day.failed.toFixed(2)}</span> : "—"}`
- `src/pages/admin/PaymentDashboard.tsx:347`: `{day.failed > 0 ? <span className="text-destructive">${day.failed.toFixed(2)}</span> : "—"}`

**Expression:** `<TableCell className="text-sm font-medium">${p.amount.toFixed(2)}</TableCell>`

- `src/pages/admin/Finance.tsx:1038`: `<TableCell className="text-sm font-medium">${p.amount.toFixed(2)}</TableCell>`
- `src/pages/admin/PaymentDashboard.tsx:402`: `<TableCell className="text-sm font-medium">${p.amount.toFixed(2)}</TableCell>`

**Expression:** `const totalDeposits = depositPayments.reduce((sum, p) => sum + Number(p.amount), 0);`

- `src/pages/admin/Finance.tsx:1560`: `const totalDeposits = depositPayments.reduce((sum, p) => sum + Number(p.amount), 0);`
- `src/pages/admin/Billing.tsx:520`: `const totalDeposits = depositPayments.reduce((sum, p) => sum + Number(p.amount), 0);`

**Expression:** `<TableCell className="font-medium">${Number(inv.grand_total).toFixed(2)}</TableCell>`

- `src/pages/admin/Finance.tsx:1950`: `<TableCell className="font-medium">${Number(inv.grand_total).toFixed(2)}</TableCell>`
- `src/pages/admin/Billing.tsx:744`: `<TableCell className="font-medium">${Number(inv.grand_total).toFixed(2)}</TableCell>`

**Expression:** `<TableCell className="text-sm text-right">${item.unitPrice?.toFixed(2)}</TableCell>`

- `src/pages/admin/Finance.tsx:2309`: `<TableCell className="text-sm text-right">${item.unitPrice?.toFixed(2)}</TableCell>`
- `src/pages/admin/Billing.tsx:1202`: `<TableCell className="text-sm text-right">${item.unitPrice?.toFixed(2)}</TableCell>`

**Expression:** `<TableCell className="text-sm text-right font-medium">${item.total?.toFixed(2)}</TableCell>`

- `src/pages/admin/Finance.tsx:2310`: `<TableCell className="text-sm text-right font-medium">${item.total?.toFixed(2)}</TableCell>`
- `src/pages/admin/Billing.tsx:1203`: `<TableCell className="text-sm text-right font-medium">${item.total?.toFixed(2)}</TableCell>`

**Expression:** `subtotal: selectedReceipt.totals_json?.subtotal || 0,`

- `src/pages/admin/Finance.tsx:2354`: `subtotal: selectedReceipt.totals_json?.subtotal || 0,`
- `src/pages/admin/Billing.tsx:1281`: `subtotal: selectedReceipt.totals_json?.subtotal || 0,`

**Expression:** `const percent = total > 0 ? Math.round((amount / total) * 100) : 0;`

- `src/pages/admin/Finance.tsx:2401`: `const percent = total > 0 ? Math.round((amount / total) * 100) : 0;`
- `src/pages/admin/PaymentDashboard.tsx:467`: `const percent = total > 0 ? Math.round((amount / total) * 100) : 0;`

**Expression:** `return `$${n.toFixed(2)}`;`

- `src/lib/pdf/rental-agreement-pdf.ts:146`: `return `$${n.toFixed(2)}`;`
- `src/lib/pdf/invoice-pdf.ts:48`: `return `$${n.toFixed(2)}`;`

**Expression:** `const pct = `${(LATE_RETURN_SURCHARGE_HOURLY_PCT * 100).toFixed(0)}%`;`

- `src/lib/pdf/rental-agreement-pdf.test.ts:143`: `const pct = `${(LATE_RETURN_SURCHARGE_HOURLY_PCT * 100).toFixed(0)}%`;`
- `src/lib/pdf/rental-agreement-pdf.e2e.test.ts:98`: `const pct = `${(LATE_RETURN_SURCHARGE_HOURLY_PCT * 100).toFixed(0)}%`;`

**Expression:** `expect(pdfText).not.toContain(`$${EXCESS_KM_RATE.toFixed(2)}/km`);`

- `src/lib/pdf/rental-agreement-pdf.test.ts:184`: `expect(pdfText).not.toContain(`$${EXCESS_KM_RATE.toFixed(2)}/km`);`
- `src/lib/pdf/rental-agreement-pdf.e2e.test.ts:119`: `expect(pdfText).not.toContain(`$${EXCESS_KM_RATE.toFixed(2)}/km`);`

**Expression:** `const round2 = (n: number) => Math.round(n * 100) / 100;`

- `src/hooks/use-booking-modification.ts:64`: `const round2 = (n: number) => Math.round(n * 100) / 100;`
- `src/components/admin/ops/VehicleUpgradePanel.tsx:99`: `const round2 = (n: number) => Math.round(n * 100) / 100;`

**Expression:** `const storedSubtotal = round2(Number(booking.subtotal) || 0);`

- `src/hooks/use-booking-modification.ts:135`: `const storedSubtotal = round2(Number(booking.subtotal) || 0);`
- `src/components/admin/ops/VehicleUpgradePanel.tsx:105`: `const storedSubtotal = round2(Number(booking.subtotal) || 0);`

**Expression:** `originalTotal: booking.total_amount,`

- `src/hooks/use-booking-modification.ts:159`: `originalTotal: booking.total_amount,`
- `src/hooks/use-booking-edit.ts:91`: `originalTotal: booking.total_amount,`

**Expression:** `? `Additional charge: $${diff.toFixed(2)} CAD``

- `src/hooks/use-booking-modification.ts:227`: `? `Additional charge: $${diff.toFixed(2)} CAD``
- `src/hooks/use-booking-edit.ts:156`: `? `Additional charge: $${diff.toFixed(2)} CAD``

**Expression:** `? `Refund: $${Math.abs(diff).toFixed(2)} CAD``

- `src/hooks/use-booking-modification.ts:229`: `? `Refund: $${Math.abs(diff).toFixed(2)} CAD``
- `src/hooks/use-booking-edit.ts:158`: `? `Refund: $${Math.abs(diff).toFixed(2)} CAD``

**Expression:** `${Number(booking.deposit_amount).toFixed(2)}`

- `src/pages/admin/BookingDetail.tsx:978`: `${Number(booking.deposit_amount).toFixed(2)}`
- `src/components/admin/return-ops/ReturnBookingSummary.tsx:177`: `${Number(booking.deposit_amount).toFixed(2)}`

**Expression:** `const totalDamageCost = damages?.reduce((sum, d) => sum + (d.estimated_cost || 0), 0) || 0;`

- `src/components/admin/return-ops/steps/StepReturnIssues.tsx:141`: `const totalDamageCost = damages?.reduce((sum, d) => sum + (d.estimated_cost || 0), 0) || 0;`
- `src/components/admin/return-ops/steps/StepReturnFees.tsx:148`: `const totalDamageCost = damages?.reduce((sum, d) => sum + (d.estimated_cost || 0), 0) || 0;`

**Expression:** `const dbSubtotalCents = toCents(booking.subtotal);`

- `src/lib/pdf/invoice-data-builder.ts:153`: `const dbSubtotalCents = toCents(booking.subtotal);`
- `src/components/admin/ops/FinancialBreakdown.tsx:88`: `const dbSubtotalCents = toCents(booking.subtotal);`

**Expression:** `const dbTaxCents = toCents(booking.tax_amount);`

- `src/lib/pdf/invoice-data-builder.ts:257`: `const dbTaxCents = toCents(booking.tax_amount);`
- `src/components/admin/ops/FinancialBreakdown.tsx:169`: `const dbTaxCents = toCents(booking.tax_amount);`

**Expression:** `const dbTotalCents = toCents(booking.total_amount);`

- `src/lib/pdf/invoice-data-builder.ts:258`: `const dbTotalCents = toCents(booking.total_amount);`
- `src/components/admin/ops/FinancialBreakdown.tsx:170`: `const dbTotalCents = toCents(booking.total_amount);`

**Expression:** `.select("assigned_unit_id, vehicle_id, total_amount, subtotal, total_days, status, start_at, end_at")`

- `src/hooks/use-fleet-cost-enhanced.ts:108`: `.select("assigned_unit_id, vehicle_id, total_amount, subtotal, total_days, status, start_at, end_at")`
- `src/hooks/use-fleet-cost-analysis.ts:112`: `.select("assigned_unit_id, vehicle_id, total_amount, subtotal, total_days, status, start_at, end_at")`

**Expression:** `const totalRentalRevenue = unitBookings.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);`

- `src/hooks/use-fleet-cost-enhanced.ts:168`: `const totalRentalRevenue = unitBookings.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);`
- `src/hooks/use-fleet-cost-analysis.ts:172`: `const totalRentalRevenue = unitBookings.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);`

**Expression:** `const totalDamageCost = unitDamages.reduce((sum, d) => sum + Number(d.estimated_cost || 0), 0);`

- `src/hooks/use-fleet-cost-enhanced.ts:175`: `const totalDamageCost = unitDamages.reduce((sum, d) => sum + Number(d.estimated_cost || 0), 0);`
- `src/hooks/use-fleet-cost-analysis.ts:179`: `const totalDamageCost = unitDamages.reduce((sum, d) => sum + Number(d.estimated_cost || 0), 0);`

**Expression:** `const totalMaintenanceCost = unitMaintenance.reduce((sum, m) => sum + Number(m.cost || 0), 0);`

- `src/hooks/use-fleet-cost-enhanced.ts:179`: `const totalMaintenanceCost = unitMaintenance.reduce((sum, m) => sum + Number(m.cost || 0), 0);`
- `src/hooks/use-fleet-cost-analysis.ts:183`: `const totalMaintenanceCost = unitMaintenance.reduce((sum, m) => sum + Number(m.cost || 0), 0);`

**Expression:** `const otherExpenses = unitExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);`

- `src/hooks/use-fleet-cost-enhanced.ts:183`: `const otherExpenses = unitExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);`
- `src/hooks/use-fleet-cost-analysis.ts:187`: `const otherExpenses = unitExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);`

**Expression:** `daysUntilDisposal = differenceInDays(expectedDisposalDate, now);`

- `src/hooks/use-fleet-cost-enhanced.ts:207`: `daysUntilDisposal = differenceInDays(expectedDisposalDate, now);`
- `src/components/admin/fleet/LifecycleSummarySection.tsx:73`: `daysUntilDisposal = differenceInDays(expectedDisposalDate, now);`

**Expression:** `const totalDays = differenceInDays(expectedDisposalDate, acquisitionDate);`

- `src/hooks/use-fleet-cost-enhanced.ts:210`: `const totalDays = differenceInDays(expectedDisposalDate, acquisitionDate);`
- `src/components/admin/fleet/LifecycleSummarySection.tsx:76`: `const totalDays = differenceInDays(expectedDisposalDate, acquisitionDate);`

**Expression:** `const elapsedDays = differenceInDays(now, acquisitionDate);`

- `src/hooks/use-fleet-cost-enhanced.ts:211`: `const elapsedDays = differenceInDays(now, acquisitionDate);`
- `src/components/admin/fleet/LifecycleSummarySection.tsx:77`: `const elapsedDays = differenceInDays(now, acquisitionDate);`

**Expression:** `const yearsOwned = differenceInDays(now, acquisitionDate) / 365.25;`

- `src/hooks/use-fleet-cost-enhanced.ts:221`: `const yearsOwned = differenceInDays(now, acquisitionDate) / 365.25;`
- `src/components/admin/fleet/LifecycleSummarySection.tsx:88`: `const yearsOwned = differenceInDays(now, acquisitionDate) / 365.25;`

**Expression:** `.select("vehicle_id, assigned_unit_id, total_amount, total_days, status")`

- `src/hooks/use-fleet-analytics.ts:75`: `.select("vehicle_id, assigned_unit_id, total_amount, total_days, status")`
- `src/hooks/use-fleet-analytics-enhanced.ts:65`: `.select("vehicle_id, assigned_unit_id, total_amount, total_days, status")`

**Expression:** `const totalRevenue = unitBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);`

- `src/hooks/use-fleet-analytics.ts:107`: `const totalRevenue = unitBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);`
- `src/hooks/use-fleet-analytics-enhanced.ts:97`: `const totalRevenue = unitBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);`

**Expression:** `const totalExpenses = unitExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);`

- `src/hooks/use-fleet-analytics.ts:109`: `const totalExpenses = unitExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);`
- `src/hooks/use-fleet-analytics-enhanced.ts:99`: `const totalExpenses = unitExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);`

**Expression:** `tax_amount: number;`

- `src/components/admin/CategoryUpgradeDialog.tsx:41`: `tax_amount: number;`
- `src/components/admin/LocationDailyReport.tsx:72`: `tax_amount: number;`

**Expression:** `{vehicle.profitMargin.toFixed(1)}%`

- `src/components/admin/fleet/CostTrackingTab.tsx:133`: `{vehicle.profitMargin.toFixed(1)}%`
- `src/components/admin/fleet/VehicleHealthCard.tsx:284`: `{vehicle.profitMargin.toFixed(1)}%`

### 3.1 Concepts implemented in more than one place (by search)

| Concept | Implementations |
| --- | --- |
| Rental pricing | `supabase/functions/persist-booking-extras/index.ts`, `supabase/functions/reprice-booking/index.ts`, `supabase/functions/create-guest-booking/index.ts`, `supabase/functions/_shared/booking-core.ts` |
| Tax (PST/GST) | `supabase/functions/_shared/processing-fee.ts`, `supabase/functions/_shared/booking-core.ts`, `supabase/functions/generate-return-receipt/index.ts`, `supabase/functions/generate-agreement/index.ts`, `src/lib/processing-fee.ts`, `src/lib/pricing.ts`, `src/lib/pdf/rental-agreement-pdf.ts`, `src/pages/admin/BookingDetail.tsx`, `src/lib/pdf/receipt-pdf.ts`, `src/lib/pdf/invoice-pdf.ts`, `src/components/booking/AgreementStructuredView.tsx`, `src/components/admin/LocationDailyReport.tsx`, `src/components/rental/BookingSummaryPanel.tsx`, `src/components/shared/PriceTooltip.tsx`, `src/pages/NewCheckout.tsx`, `src/components/admin/CategoryUpgradeDialog.tsx`, `src/components/admin/ops/BookingModificationPanel.tsx`, `src/components/admin/ops/VehicleUpgradePanel.tsx`, `src/components/admin/WalkInBookingDialog.tsx` |
| Processing fee | `src/pages/BookingDetail.tsx`, `supabase/functions/generate-return-receipt/index.ts`, `supabase/functions/generate-agreement/index.ts`, `supabase/functions/create-walk-in-booking/index.ts`, `supabase/functions/create-booking/index.ts`, `src/lib/processing-fee.ts`, `src/lib/processing-fee.test.ts`, `supabase/functions/reprice-booking/index.ts`, `src/lib/pricing.ts`, `src/components/shared/TotalBar.tsx`, `src/lib/pdf/rental-agreement-pdf.ts`, `src/lib/pdf/invoice-pdf.ts`, `src/integrations/supabase/types.ts`, `src/pages/NewCheckout.tsx`, `src/lib/pdf/invoice-data-builder.ts`, `src/pages/admin/Billing.tsx`, `supabase/functions/_shared/booking-core.ts`, `src/components/rental/BookingSummaryPanel.tsx`, `src/components/booking/AgreementStructuredView.tsx`, `src/components/admin/WalkInBookingDialog.tsx`, `src/components/admin/ops/FinancialBreakdown.tsx` |
| Day count | `supabase/functions/generate-agreement/index.ts`, `src/components/shared/TotalBar.tsx`, `src/hooks/use-offers.ts`, `src/pages/Search.tsx`, `src/hooks/use-fleet-cost-enhanced.ts`, `src/hooks/use-add-ons.ts`, `src/pages/AddOns.tsx`, `src/features/delivery/pages/WalkIn.tsx`, `src/pages/NewCheckout.tsx`, `src/pages/Protection.tsx`, `src/hooks/use-booking-modification.ts`, `src/components/rental/BookingSummaryPanel.tsx`, `src/components/rental/AdditionalDriversCard.tsx`, `src/hooks/use-booking-edit.ts`, `src/contexts/RentalBookingContext.tsx`, `src/lib/analytics.ts`, `src/lib/km-allowance.ts`, `src/lib/pricing.ts`, `src/lib/processing-fee.test.ts`, `src/lib/pricing.test.ts`, `src/components/admin/CategoryUpgradeDialog.tsx`, `src/components/admin/UnifiedVehicleManager.tsx`, `src/components/admin/WalkInBookingDialog.tsx`, `src/components/admin/fleet/ByVehicleTab.tsx`, `src/components/admin/fleet/PerformanceComparisonTab.tsx` … +5 |
| Revenue aggregation | `supabase/functions/close-account/index.ts`, `supabase/functions/persist-booking-extras/index.ts`, `src/pages/booking/BookingPickup.tsx`, `supabase/functions/notify-branch-sms/index.ts`, `src/pages/NewCheckout.tsx`, `supabase/functions/calculate-fleet-costs/index.ts`, `src/pages/Langley.tsx`, `supabase/functions/manage-booking-documents/index.ts`, `src/hooks/use-revenue-analytics.ts`, `src/pages/admin/VehicleUnitDetail.tsx`, `src/hooks/use-demand-forecasting.ts`, `src/features/delivery/constants/delivery-status.ts`, `src/hooks/use-intake-status.ts`, `src/hooks/use-fleet-cost-enhanced.ts`, `src/pages/admin/Reports.tsx`, `src/hooks/use-fleet-cost-analysis.ts`, `src/hooks/use-collected-revenue.ts`, `src/hooks/use-fleet-analytics.ts`, `src/pages/admin/Pickups.tsx`, `src/pages/admin/PaymentDashboard.tsx`, `src/integrations/supabase/types.ts`, `src/pages/admin/BookingDetail.tsx`, `src/lib/ops-steps.ts`, `src/pages/admin/Billing.tsx`, `src/pages/admin/AbandonedCarts.tsx` … +17 |
| Fleet utilisation | `src/pages/admin/Reports.tsx`, `src/pages/admin/FleetCosts.tsx`, `src/pages/admin/FleetAnalytics.tsx`, `src/hooks/use-fleet-analytics.ts`, `src/components/admin/fleet/VehicleHealthCard.tsx`, `src/components/admin/QuarterlyReportGenerator.tsx` |
| Availability | `src/domain/fleet/queries.ts`, `src/integrations/supabase/types.ts`, `src/pages/admin/FleetManagement.tsx`, `src/pages/Search.tsx`, `src/hooks/use-fleet-categories.ts`, `src/lib/availability-check.ts`, `supabase/functions/_shared/availability.ts` |
| Deposit amount | `src/pages/booking/BookingReturn.tsx`, `src/pages/NewCheckout.tsx`, `src/pages/BookingDetail.tsx`, `src/pages/admin/Billing.tsx`, `src/pages/admin/ReturnOps.tsx`, `src/lib/deposit-automation.ts`, `src/lib/booking-helpers.ts`, `src/integrations/supabase/types.ts`, `src/lib/dispatch-readiness.ts`, `src/lib/pricing.ts`, `src/pages/admin/Finance.tsx`, `src/pages/admin/BookingDetail.tsx`, `src/lib/pdf/invoice-data-builder.ts`, `supabase/functions/send-payment-confirmation/index.ts`, `src/pages/admin/BookingDebug.tsx`, `supabase/functions/log-terminal-payment/index.ts`, `supabase/functions/create-walk-in-booking/index.ts`, `supabase/functions/generate-agreement/index.ts`, `src/hooks/use-returns.ts`, `supabase/functions/generate-return-receipt/index.ts`, `supabase/functions/create-booking/index.ts`, `supabase/functions/_shared/logger.ts`, `supabase/functions/_shared/booking-core.ts`, `src/domain/bookings/queries.ts`, `supabase/functions/wl-capture/index.ts` … +21 |

---

## 4. `src/lib` functions

### `src/lib/agreement-adjustments.ts`

**File header:** Resolves the explicit vehicle-line adjustments (weekend surcharge / duration discount) for a stored rental agreement's terms_json. New agreements persist `financial.adjustmentLines`. Historic agreements only stored a single netted `weekendSurcharge` (often 0 when a duration discount outweighed the surcharge), so the lines are recomputed from the rental facts and reconciled against the stored subto

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 41 | `resolveAgreementAdjustmentLines` | `(t: AgreementTermsLike): AgreementAdjustmentLine[]` | `src/components/booking/AgreementStructuredView.tsx`, `src/lib/pdf/rental-agreement-pdf.ts` |

### `src/lib/analytics.ts`

**File header:** Analytics utility for tracking events across the application Persists events to Supabase analytics_events table for centralized tracking.

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 42 | `trackEvent` | `(event: AnalyticsEvent, properties?: EventProperties): void` | `src/pages/Contact.tsx`, `src/pages/ForgotPassword.tsx`, `src/pages/ResetPassword.tsx`, `src/pages/Subscription.tsx` |
| 68 | `trackPageView` | `(pageName?: string): void` | `src/pages/AddOns.tsx`, `src/pages/Protection.tsx`, `src/pages/Search.tsx` |
| 77 | `trackError` | `(error: Error, context?: EventProperties): void` | `src/components/ErrorBoundary.tsx` |
| 87 | `funnelEvents` | `{` | **UNCALLED — dead code** |

### `src/lib/api-error.ts`

**File header:** Centralized API Error Handling Provides consistent error handling patterns across hooks and edge functions. PR3: Standardize Error Handling

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 11 | `API_ERROR_CODES` | `{` | **UNCALLED — dead code** |
| 58 | `parseApiError` | `(response: unknown): ApiError` | **UNCALLED — dead code** |
| 77 | `getErrorMessage` | `(error: unknown): string` | **UNCALLED — dead code** |
| 100 | `handleMutationError` | `(` | **UNCALLED — dead code** |
| 112 | `handleMutationSuccess` | `(message: string): void` | **UNCALLED — dead code** |
| 174 | `isRetryableError` | `(error: unknown): boolean` | **UNCALLED — dead code** |

### `src/lib/availability-check.ts`

**File header:** Availability — single source of truth. All availability answers come from the backend RPCs `get_category_availability` / `check_category_availability`. Never compute availability from client-side table reads: guests cannot read `vehicle_units` / `bookings` under RLS and would see everything as available.

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 22 | `AVAILABILITY_MESSAGES` | `{` | **UNCALLED — dead code** |
| 31 | `mapAvailabilityError` | `(code?: string \| null, fallback?: string)` | **UNCALLED — dead code** |
| 42 | `checkCategoryAvailability` | `(params:` | **UNCALLED — dead code** |

### `src/lib/availability.ts`

**File header:** @deprecated This module uses the legacy vehicles table for availability checks. For new code, use the category-based availability system: - useBrowseCategories() which calls get_available_categories() RPC - useCategoryAvailability() for checking specific category availability The vehicles-based availability is being phased out. See REFACTOR_PLAN.md PR2 for migration details.

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 54 | `getAvailableVehicles` | `(` | `src/hooks/use-availability.ts` |
| 191 | `isVehicleAvailable` | `(` | `src/hooks/use-availability.ts` |

### `src/lib/booking-helpers.ts`

**File header:** Shared booking data utilities to reduce code duplication and improve query efficiency across hooks

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 67 | `batchFetchProfiles` | `(userIds: string[]): Promise<Map<string, ProfileBaseData>>` | `src/hooks/use-handovers.ts`, `src/hooks/use-returns.ts` |
| 87 | `batchFetchPayments` | `(bookingIds: string[]): Promise<Map<string, Array<` | `src/hooks/use-handovers.ts` |
| 117 | `batchFetchVerifications` | `(bookingIds: string[]): Promise<Map<string, string>>` | `src/hooks/use-handovers.ts` |
| 136 | `batchFetchConditionPhotos` | `(bookingIds: string[]): Promise<Map<string,` | `src/hooks/use-returns.ts` |
| 174 | `batchFetchDamages` | `(bookingIds: string[]): Promise<Map<string, number>>` | `src/hooks/use-returns.ts` |
| 199 | `batchFetchInspections` | `(bookingIds: string[]): Promise<Map<string,` | `src/hooks/use-returns.ts` |
| 236 | `batchFetchVehicleExpenses` | `(unitIds: string[]): Promise<Map<string, number>>` | **UNCALLED — dead code** |
| 261 | `calculatePaymentStatus` | `(` | **UNCALLED — dead code** |
| 283 | `formatVehicleName` | `(vehicle: VehicleBaseData \| null): string` | **UNCALLED — dead code** |
| 291 | `formatCustomerName` | `(profile: ProfileBaseData \| null): string` | **UNCALLED — dead code** |

### `src/lib/booking-routes.ts`

**File header:** Booking Route Helper Routes bookings to the correct admin screen based on their status: - pending/confirmed → BookingOps (preparation/handover flow) - active → ActiveRentalDetail (monitoring + return initiation) - completed → Read-only detail view - cancelled → Read-only detail view

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 20 | `getBookingRoute` | `(bookingId: string, status: BookingStatus, options: RouteOptions =` | `src/components/support/TicketBookingSummary.tsx`, `src/pages/admin/Overview.tsx` |
| 47 | `getReturnRoute` | `(bookingId: string): string` | **UNCALLED — dead code** |
| 54 | `canInitiateReturn` | `(status: BookingStatus): boolean` | **UNCALLED — dead code** |
| 61 | `isPreRentalPhase` | `(status: BookingStatus): boolean` | **UNCALLED — dead code** |
| 68 | `getBookingActionLabel` | `(status: BookingStatus): string` | `src/pages/admin/Overview.tsx` |

### `src/lib/booking-stages.ts`

**File header:** Booking Operational Stages Defines the workflow backbone for rental operations

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 30 | `BOOKING_STAGES` | `[` | **UNCALLED — dead code** |
| 126 | `getCurrentStage` | `(` | **UNCALLED — dead code** |
| 161 | `getStageProgress` | `(currentStage: BookingStage): number` | `src/components/shared/StageProgress.tsx` |

### `src/lib/branch-resolution.ts`

**File header:** Branch resolution for tables that have no `location_id` of their own. Incidents and support tickets are attributed to a branch through: 1. the linked booking's `location_id`, else 2. the vehicle unit's branch (`vehicle_units.location_id`, falling back to `vehicles.location_id`). Tickets that resolve to no branch are "unassigned branch" and are only shown to Super Admins, or to the manager who crea

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 16 | `fetchUnitLocationMap` | `(): Promise<Map<string, string \| null>>` | `src/hooks/use-damages.ts`, `src/hooks/use-incidents.ts`, `src/pages/admin/Incidents.tsx` |
| 25 | `fetchBookingLocationMap` | `(` | `src/hooks/use-damages.ts`, `src/hooks/use-incidents.ts`, `src/pages/admin/Incidents.tsx` |
| 40 | `resolveIncidentBranch` | `(` | `src/hooks/use-damages.ts`, `src/hooks/use-incidents.ts`, `src/pages/admin/Incidents.tsx` |
| 55 | `resolveTicketBranches` | `(` | `src/hooks/use-support-v2.ts` |
| 121 | `isTicketVisibleForBranch` | `(` | `src/hooks/use-support-v2.ts` |

### `src/lib/card-validation.ts`

**File header:** Credit Card Validation & Type Detection Identifies card type and validates card numbers using Luhn algorithm

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 17 | `CARD_TYPES` | `{` | **UNCALLED — dead code** |
| 79 | `detectCardType` | `(cardNumber: string): CardType` | `src/components/checkout/CreditCardInput.tsx` |
| 105 | `luhnCheck` | `(cardNumber: string): boolean` | **UNCALLED — dead code** |
| 132 | `validateCardLength` | `(cardNumber: string): boolean` | **UNCALLED — dead code** |
| 143 | `formatCardNumber` | `(value: string, cardType: CardType): string` | `src/components/checkout/CreditCardInput.tsx` |
| 165 | `formatExpiryDate` | `(value: string): string` | `src/components/checkout/CreditCardInput.tsx` |
| 177 | `validateExpiryDate` | `(value: string):` | **UNCALLED — dead code** |
| 205 | `validateCVV` | `(cvv: string, cardType: CardType): boolean` | **UNCALLED — dead code** |
| 214 | `maskCardNumber` | `(cardNumber: string): string` | **UNCALLED — dead code** |
| 225 | `validateCard` | `(card:` | **UNCALLED — dead code** |
| 282 | `isCardTypeAllowed` | `(cardNumber: string):` | **UNCALLED — dead code** |
| 301 | `validateDriverCardholderMatch` | `(` | **UNCALLED — dead code** |

### `src/lib/checkout-policies.ts`

**File header:** Checkout and payment policies Legal text and requirements

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 6 | `CANCELLATION_POLICY` | `{` | **UNCALLED — dead code** |
| 13 | `PICKUP_REQUIREMENTS` | `{` | **UNCALLED — dead code** |
| 21 | `DAMAGE_LIABILITY_POLICY` | `{` | **UNCALLED — dead code** |

### `src/lib/compress-image.ts`

**File header:** Client-side image compression utility. Resizes images and converts to JPEG before uploading to storage.

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 5 | `compressImage` | `(` | **UNCALLED — dead code** |

### `src/lib/date-utils.ts`

**File header:** Date utilities for timezone-safe date handling. All UI state stores dates as "YYYY-MM-DD" strings (date-only, no timezone). Conversion to timestamps only happens at submit time using these helpers.

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 9 | `formatLocalDate` | `(date: Date): string` | `src/components/landing/VehicleCard.tsx`, `src/components/rental/RentalSearchCard.tsx`, `src/components/shared/BookingStepper.tsx`, `src/contexts/RentalBookingContext.tsx`, `src/lib/date-utils.test.ts`, `src/pages/AddOns.tsx`, `src/pages/NewCheckout.tsx`, `src/pages/Protection.tsx` |
| 17 | `parseLocalDate` | `(dateStr: string): Date` | `src/components/rental/RentalSearchCard.tsx`, `src/contexts/RentalBookingContext.tsx`, `src/lib/date-utils.test.ts` |
| 26 | `addLocalDays` | `(dateStr: string, days: number): string` | `src/components/landing/GlassSearchBar.tsx`, `src/components/rental/RentalSearchCard.tsx`, `src/lib/date-utils.test.ts` |
| 36 | `diffLocalDays` | `(startStr: string, endStr: string): number` | `src/components/rental/RentalSearchCard.tsx`, `src/lib/date-utils.test.ts` |
| 50 | `localDateTimeToISO` | `(dateStr: string, time: string): string` | `src/lib/date-utils.test.ts`, `src/pages/AddOns.tsx`, `src/pages/NewCheckout.tsx`, `src/pages/Protection.tsx` |
| 58 | `todayLocalISO` | `(): string` | `src/components/landing/GlassSearchBar.tsx`, `src/components/rental/RentalSearchCard.tsx` |
| 63 | `startOfLocalToday` | `(): Date` | `src/components/admin/WalkInBookingDialog.tsx`, `src/components/shared/TripContextBar.tsx`, `src/components/shared/TripContextPrompt.tsx`, `src/contexts/RentalBookingContext.tsx` |
| 69 | `isPastLocalDate` | `(value: string \| Date \| null \| undefined): boolean` | `src/components/landing/GlassSearchBar.tsx`, `src/components/rental/RentalSearchCard.tsx`, `src/contexts/RentalBookingContext.tsx` |
| 78 | `clampToTodayISO` | `(dateStr: string): string` | `src/components/landing/GlassSearchBar.tsx`, `src/components/rental/RentalSearchCard.tsx` |
| 84 | `clampDateToToday` | `(date: Date \| null): Date \| null` | **UNCALLED — dead code** |

### `src/lib/delivery-portal.ts`

**File header:** Normalize legacy query param values to the new Delivery Portal filters.

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 8 | `normalizeDeliveryPortalTab` | `(` | **UNCALLED — dead code** |
| 28 | `getDeliveryPortalStatus` | `(input:` | **UNCALLED — dead code** |
| 44 | `countByPortalStatus` | `(deliveries: DeliveryBooking[] \| undefined): Record<DeliveryPortalStatus, number>` | `src/features/delivery/utils/delivery-helpers.ts` |

### `src/lib/deposit-automation.ts`

**File header:** Handles deposit actions when booking status changes - Completed: Auto-release deposit if no damages - Cancelled: Create admin alert for manual review

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 12 | `handleDepositOnStatusChange` | `(` | `src/domain/bookings/mutations.ts` |

### `src/lib/deposit-state.ts`

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 25 | `getDepositLifecycleState` | `(` | `src/hooks/use-payment-deposit.ts`, `src/lib/deposit-automation.ts` |
| 41 | `isDepositActionComplete` | `(state: DepositLifecycleState): boolean` | `src/hooks/use-payment-deposit.ts` |
| 45 | `getDepositStatusLabel` | `(state: DepositLifecycleState): string` | `src/hooks/use-payment-deposit.ts` |

### `src/lib/dispatch-readiness.ts`

**File header:** Dispatch Readiness Validation Ensures delivery bookings cannot be dispatched without proper prerequisites: - Payment hold authorized - Vehicle unit (VIN) assigned - Vehicle prep completed (condition photos taken)

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 35 | `MINIMUM_PREP_PHOTOS` | `4;` | **UNCALLED — dead code** |
| 40 | `AUTHORIZED_DEPOSIT_STATUSES` | `[` | **UNCALLED — dead code** |
| 50 | `checkDispatchReadiness` | `(` | `src/components/admin/ops/steps/StepDispatch.tsx`, `src/hooks/use-assign-driver.ts`, `src/hooks/use-dispatch-readiness.ts` |
| 86 | `getDispatchBlockerMessage` | `(check: DispatchReadinessCheck): string` | `src/hooks/use-assign-driver.ts` |

### `src/lib/edge-function-error.ts`

**File header:** Extract error message from Supabase Edge Function invocation. When an edge function returns non-2xx, supabase.functions.invoke puts the response in `error.context` (a Response object) and sets `data` to null. This helper extracts the actual error message from the response body.

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 16 | `extractEdgeFunctionErrorDetails` | `(` | `src/components/admin/return-ops/steps/StepReturnDeposit.tsx` |
| 61 | `extractEdgeFunctionError` | `(` | `src/components/admin/UnifiedVehicleManager.tsx`, `src/components/admin/deposit/AccountCloseoutPanel.tsx`, `src/components/admin/ops/ProtectionChangePanel.tsx`, `src/components/admin/ops/steps/StepPayment.tsx`, `src/components/admin/return-ops/steps/StepReturnDeposit.tsx`, `src/hooks/use-booking-edit.ts`, `src/hooks/use-bookings.ts`, `src/pages/admin/BookingDetail.tsx` |

### `src/lib/format-customer.ts`

**File header:** Customer Display Utilities Sanitizes customer names (detects email-as-name) and formats phone numbers for consistent display across all panels.

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 12 | `displayName` | `(` | `src/components/admin/BookingCustomerCard.tsx`, `src/components/admin/BookingOpsDrawer.tsx`, `src/components/admin/ops/MobileBookingSummary.tsx`, `src/components/admin/ops/OpsStepContent.tsx`, `src/components/admin/ops/steps/StepEnRoute.tsx`, `src/components/admin/ops/steps/StepIntake.tsx`, `src/pages/admin/BookingOps.tsx` |
| 27 | `formatPhone` | `(phone: string \| null \| undefined): string \| null` | `src/components/admin/BookingCustomerCard.tsx`, `src/components/admin/ops/MobileBookingSummary.tsx`, `src/components/shared/PhoneInput.tsx` |

### `src/lib/fuel-pricing.ts`

**File header:** Fuel pricing constants and utilities Our fuel is offered at 5 cents below market rate

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 7 | `MARKET_FUEL_PRICE_PER_LITER` | `1.85; // CAD` | **UNCALLED — dead code** |
| 10 | `FUEL_DISCOUNT_CENTS` | `5; // cents` | **UNCALLED — dead code** |
| 13 | `OUR_FUEL_PRICE_PER_LITER` | `MARKET_FUEL_PRICE_PER_LITER - FUEL_DISCOUNT_CENTS / 100;` | **UNCALLED — dead code** |
| 16 | `TANK_SIZES` | `{` | **UNCALLED — dead code** |
| 34 | `calculateFuelCost` | `(tankLiters: number = TANK_SIZES.default):` | **UNCALLED — dead code** |
| 55 | `getTankSize` | `(category: string): number` | **UNCALLED — dead code** |
| 71 | `calculateFuelCostForUnit` | `(` | `src/hooks/use-add-ons.ts`, `src/pages/AddOns.tsx` |
| 86 | `FUEL_LEVELS` | `[` | **UNCALLED — dead code** |
| 101 | `getFuelLevelLabel` | `(percentage: number): string` | `src/components/admin/return-ops/steps/StepReturnFees.tsx` |
| 123 | `calculateFuelShortage` | `(` | `src/components/admin/return-ops/steps/StepReturnFees.tsx`, `src/hooks/use-fuel-shortage.ts` |

### `src/lib/km-allowance.ts`

**File header:** Kilometre Allowance — Single source of truth Rule: rentals of 1–7 days include UNLIMITED kilometres. From day 8 onward, an allowance of 160 km accrues for each day beyond the first 7 (e.g. a 10-day rental includes 3 × 160 = 480 km). Excess kilometres are charged at $0.25/km, computed at return from odometer readings.

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 12 | `FREE_KM_DAYS` | `7;` | **UNCALLED — dead code** |
| 13 | `WEEKLY_KM_ALLOWANCE` | `1400;` | **UNCALLED — dead code** |
| 14 | `MONTHLY_KM_ALLOWANCE` | `4800;` | **UNCALLED — dead code** |
| 15 | `EXCESS_KM_RATE` | `0.25; // CAD per km` | **UNCALLED — dead code** |
| 18 | `KM_PER_DAY` | `MONTHLY_KM_ALLOWANCE / 30; // 160 km/day` | **UNCALLED — dead code** |
| 34 | `isUnlimitedKm` | `(rentalDays: number \| null \| undefined): boolean` | `src/components/booking/AgreementStructuredView.tsx`, `src/lib/km-allowance.test.ts`, `src/lib/pdf/rental-agreement-pdf.ts` |
| 44 | `calculateKmAllowance` | `(rentalDays: number): number` | `src/components/booking/AgreementStructuredView.tsx`, `src/lib/km-allowance.test.ts`, `src/lib/pdf/rental-agreement-pdf.ts` |
| 55 | `calculateExcessKm` | `(` | `src/lib/km-allowance.test.ts` |
| 84 | `formatKmAllowanceSummary` | `(rentalDays?: number): string` | `src/lib/km-allowance.test.ts`, `src/lib/pricing.ts` |

### `src/lib/late-return.ts`

**File header:** Late Return Fee Calculation Handles grace period, fee calculation, and customer self-return marking

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 10 | `LATE_RETURN_GRACE_PERIOD_MINUTES` | `30; // 30 minutes grace period` | **UNCALLED — dead code** |
| 11 | `LATE_RETURN_FEE_PERCENTAGE` | `0.25; // 25% of daily rate per hour after grace period` | **UNCALLED — dead code** |
| 12 | `LATE_RETURN_SURCHARGE_HOURLY_PCT` | `LATE_RETURN_FEE_PERCENTAGE; // preferred alias` | **UNCALLED — dead code** |
| 13 | `LATE_RETURN_SURCHARGE_MAX_HOURS` | `2; // after this, switch to full daily rate` | **UNCALLED — dead code** |
| 30 | `calculateLateReturnFee` | `(` | `src/lib/late-return.test.ts` |
| 85 | `calculateLateReturnFeeWithRate` | `(` | `src/hooks/use-late-return.ts`, `src/lib/late-return.test.ts`, `src/lib/pdf/rental-agreement-pdf.test.ts` |
| 121 | `getLateReturnSummary` | `(dailyRate?: number): string` | **UNCALLED — dead code** |
| 133 | `canCustomerMarkReturned` | `(` | `src/pages/Dashboard.tsx` |

### `src/lib/location-scope-storage.ts`

**File header:** Persistence for the admin/ops branch scope. The selected branch has to survive navigating between tabs (Ops → Inventory → Payments → Reports), so we mirror the `?locationId=` URL param into localStorage and re-hydrate it when a page is opened without the param.

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 11 | `readStoredLocationScope` | `(): string \| null` | `src/context/LocationScopeProvider.tsx`, `src/hooks/use-staff-location.ts` |
| 21 | `writeStoredLocationScope` | `(locationId: string \| null): void` | `src/context/LocationScopeProvider.tsx` |

### `src/lib/location-scope.ts`

**File header:** Shared branch-scope helpers. Several operational tables (vehicle_units, maintenance_logs, vehicle_expenses, incident_cases, support_tickets_v2) carry no `location_id` of their own, so a row's branch is derived from its vehicle unit (`vehicle_units.location_id`, falling back to the category-level `vehicles.location_id`) or from the linked booking (`bookings.location_id`).

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 12 | `unitBranchId` | `(unit: any): string \| null` | `src/hooks/use-fleet-analytics-enhanced.ts`, `src/hooks/use-fleet-analytics.ts`, `src/lib/branch-resolution.ts` |

### `src/lib/ops-steps.ts`

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 36 | `OPS_STEPS` | `[` | **UNCALLED — dead code** |
| 91 | `OPS_STEPS_DELIVERY_PRE` | `[` | **UNCALLED — dead code** |
| 152 | `DELIVERY_PORTAL_STEPS` | `[` | **UNCALLED — dead code** |
| 198 | `getStepForDisplay` | `(step: OpsStep, isDelivery: boolean):` | `src/components/admin/ops/OpsStepContent.tsx`, `src/components/admin/ops/OpsStepSidebar.tsx` |
| 278 | `getOpsSteps` | `(isDelivery: boolean): OpsStep[]` | `src/components/admin/ops/OpsStepContent.tsx`, `src/pages/admin/BookingOps.tsx` |
| 283 | `getStepStatus` | `(` | `src/components/admin/ops/OpsStepContent.tsx`, `src/components/admin/ops/OpsStepSidebar.tsx` |
| 308 | `getBlockingIssues` | `(stepId: OpsStepId, completion: StepCompletion, isDelivery: boolean = false): BlockingIssue[]` | `src/components/admin/ops/OpsStepContent.tsx` |
| 348 | `checkStepComplete` | `(stepId: OpsStepId, completion: StepCompletion, isDelivery: boolean = false): boolean` | `src/components/admin/ops/OpsStepContent.tsx`, `src/components/admin/ops/OpsStepSidebar.tsx` |
| 394 | `getMissingItems` | `(stepId: OpsStepId, completion: StepCompletion, isDelivery: boolean = false): string[]` | `src/components/admin/ops/OpsStepContent.tsx` |
| 454 | `getCurrentStepIndex` | `(completion: StepCompletion, isDelivery: boolean = false): number` | `src/components/admin/ops/OpsStepContent.tsx`, `src/features/delivery/components/DeliverySteps.tsx`, `src/features/delivery/constants/delivery-status.ts`, `src/pages/admin/BookingOps.tsx` |
| 465 | `ACTION_LABELS` | `{` | **UNCALLED — dead code** |
| 480 | `STATUS_LABELS` | `{` | **UNCALLED — dead code** |
| 495 | `DELIVERY_STATUS_MAP` | `{` | **UNCALLED — dead code** |

### `src/lib/pickup-progress.ts`

**File header:** Pickup progress derivation A booking sitting in `pending` / `confirmed` says nothing about how far the pickup wizard actually got. Backdated bookings that were fully handed over, abandoned reservations, and half-finished handovers all look identical from `status` alone — which is why they all piled up under "needs processing". This module derives the real stage from the records the wizard writes: 

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 25 | `EMPTY_PROGRESS` | `{` | **UNCALLED — dead code** |
| 37 | `fetchPickupProgress` | `(` | `src/hooks/use-pickup-progress.ts` |
| 83 | `resolvePickupStage` | `(` | **UNCALLED — dead code** |
| 101 | `classifyPickupAttention` | `(args:` | `src/pages/admin/Bookings.tsx` |
| 127 | `ATTENTION_LABELS` | `{` | **UNCALLED — dead code** |
| 133 | `ATTENTION_DESCRIPTIONS` | `{` | **UNCALLED — dead code** |

### `src/lib/pricing.ts`

**File header:** Central pricing utility - Single source of truth for all booking price calculations All fee logic should be defined here to ensure consistency across the app

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 18 | `YOUNG_DRIVER_FEE` | `15; // Daily fee for drivers aged 21-24 (CAD/day)` | **UNCALLED — dead code** |
| 19 | `DEFAULT_DEPOSIT_AMOUNT` | `350; // Standard security deposit` | **UNCALLED — dead code** |
| 20 | `MINIMUM_DEPOSIT_AMOUNT` | `350; // BUSINESS RULE: Deposit is ALWAYS required, never zero` | **UNCALLED — dead code** |
| 23 | `PST_RATE` | `0.07; // 7% Provincial Sales Tax` | **UNCALLED — dead code** |
| 24 | `GST_RATE` | `0.05; // 5% Goods and Services Tax` | **UNCALLED — dead code** |
| 25 | `TOTAL_TAX_RATE` | `PST_RATE + GST_RATE; // 12% combined` | **UNCALLED — dead code** |
| 28 | `PVRT_DAILY_FEE` | `1.50; // Passenger Vehicle Rental Tax` | **UNCALLED — dead code** |
| 29 | `ACSRCH_DAILY_FEE` | `1.00; // Airport Concession/Surcharge` | **UNCALLED — dead code** |
| 32 | `WEEKEND_SURCHARGE_RATE` | `0.15; // 15% weekend surcharge per weekend day (Fri/Sat/Sun)` | **UNCALLED — dead code** |
| 37 | `WEEKLY_DISCOUNT_THRESHOLD` | `7; // Days for weekly discount (retired)` | **UNCALLED — dead code** |
| 38 | `WEEKLY_DISCOUNT_RATE` | `0; // Retired — no weekly discount` | **UNCALLED — dead code** |
| 39 | `MONTHLY_DISCOUNT_THRESHOLD` | `21; // Days for monthly discount (retired)` | **UNCALLED — dead code** |
| 40 | `MONTHLY_DISCOUNT_RATE` | `0; // Retired — no monthly discount` | **UNCALLED — dead code** |
| 58 | `MIN_DRIVER_AGE` | `21;` | **UNCALLED — dead code** |
| 59 | `YOUNG_DRIVER_MAX_AGE` | `24;` | **UNCALLED — dead code** |
| 60 | `MAX_DRIVER_AGE` | `70;` | **UNCALLED — dead code** |
| 65 | `CANCELLATION_FEE_DAYS` | `1; // Days of daily rate charged as penalty` | **UNCALLED — dead code** |
| 75 | `computeDropoffFeeFromGroups` | `(` | `src/components/rental/BookingSummaryPanel.tsx`, `src/components/rental/RentalSearchCard.tsx`, `src/pages/NewCheckout.tsx` |
| 91 | `MYSTERY_CAR_FEE` | `30; // CAD base price for Mystery Car category` | **UNCALLED — dead code** |
| 94 | `BAGGAGE_CAPACITY` | `{` | **UNCALLED — dead code** |
| 106 | `getBaggageCapacity` | `(category: string): number` | `src/components/landing/VehicleCard.tsx` |
| 172 | `PROTECTION_PACKAGES` | `[` | **UNCALLED — dead code** |
| 225 | `PROTECTION_RATES` | `Object.fromEntries(` | **UNCALLED — dead code** |
| 231 | `BOOKING_STATUS_STYLES` | `{` | **UNCALLED — dead code** |
| 240 | `DAMAGE_STATUS_STYLES` | `{` | **UNCALLED — dead code** |
| 249 | `DAMAGE_SEVERITY_STYLES` | `{` | **UNCALLED — dead code** |
| 256 | `TICKET_STATUS_STYLES` | `{` | **UNCALLED — dead code** |
| 266 | `VERIFICATION_STATUS_STYLES` | `{` | **UNCALLED — dead code** |
| 277 | `BOOKING_INCLUDED_FEATURES` | `[` | **UNCALLED — dead code** |
| 290 | `formatCAD` | `(amount: number, decimals: number = 2): string` | **UNCALLED — dead code** |
| 297 | `formatCADCompact` | `(amount: number): string` | **UNCALLED — dead code** |
| 308 | `BUSINESS_TIME_ZONE` | `"America/Vancouver";` | **UNCALLED — dead code** |
| 311 | `toBusinessDateString` | `(ts: string \| number \| Date): string` | `supabase/functions/_shared/booking-core.ts` |
| 324 | `isWeekendDay` | `(date: Date): boolean` | `supabase/functions/_shared/booking-core.ts` |
| 330 | `isWeekendPickup` | `(date: Date \| null \| undefined): boolean` | **UNCALLED — dead code** |
| 344 | `countWeekendDays` | `(` | `src/lib/pricing.test.ts`, `supabase/functions/generate-agreement/index.ts` |
| 374 | `deriveVehicleAdjustments` | `(input:` | `src/lib/pricing.test.ts`, `src/lib/vehicle-adjustments.ts`, `supabase/functions/_shared/vehicle-adjustments.ts` |
| 414 | `getDurationDiscount` | `(_rentalDays: number):` | `supabase/functions/_shared/booking-core.ts`, `supabase/functions/_shared/vehicle-adjustments.ts` |
| 429 | `calculateLateFee` | `(minutesLate: number, dailyRate?: number): number` | `src/components/admin/return-ops/steps/StepReturnCloseout.tsx`, `src/components/admin/return-ops/steps/StepReturnIssues.tsx`, `src/components/support/TicketBookingSummary.tsx`, `src/lib/late-return.test.ts` |
| 453 | `calculateBookingPricing` | `(input: PricingInput): PricingBreakdown` | `src/components/admin/CategoryUpgradeDialog.tsx`, `src/components/admin/UnifiedVehicleManager.tsx`, `src/components/admin/WalkInBookingDialog.tsx`, `src/components/admin/ops/ProtectionChangePanel.tsx`, `src/components/rental/BookingSummaryPanel.tsx`, `src/components/shared/TotalBar.tsx`, `src/features/delivery/pages/WalkIn.tsx`, `src/hooks/use-booking-edit.ts`, `src/hooks/use-booking-modification.ts`, `src/lib/pricing.test.ts` … +4 |
| 545 | `ageRangeToAgeBand` | `(ageRange: "20-24" \| "25-70" \| null): DriverAgeBand \| null` | `src/components/rental/BookingSummaryPanel.tsx`, `src/components/shared/TotalBar.tsx`, `src/pages/AddOns.tsx`, `src/pages/NewCheckout.tsx`, `src/pages/Protection.tsx` |
| 553 | `ageBandToAgeRange` | `(ageBand: DriverAgeBand \| null): "20-24" \| "25-70" \| null` | **UNCALLED — dead code** |
| 561 | `validateDriverAge` | `(age: number):` | **UNCALLED — dead code** |
| 576 | `getProtectionPackage` | `(id: string): ProtectionPackage \| undefined` | **UNCALLED — dead code** |

### `src/lib/processing-fee.ts`

**File header:** CARD PROCESSING FEE — SINGLE SOURCE OF TRUTH (client) Mandatory card processing fee applied to every rental transaction. - Pre-tax rental subtotal up to $450.00  -> 2.5% - Pre-tax rental subtotal $450.01+       -> 1.5% The fee is a pass-through: it is added AFTER PST/GST and is not itself taxed. It is never waivable at the counter. Keep in sync with supabase/functions/_shared/processing-fee.ts

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 14 | `PROCESSING_FEE_THRESHOLD` | `450; // CAD, pre-tax subtotal` | **UNCALLED — dead code** |
| 15 | `PROCESSING_FEE_RATE_LOW_TIER` | `0.025; // <= $450` | **UNCALLED — dead code** |
| 16 | `PROCESSING_FEE_RATE_HIGH_TIER` | `0.015; // > $450` | **UNCALLED — dead code** |
| 18 | `PROCESSING_FEE_LABEL` | `"Credit card processing fee";` | **UNCALLED — dead code** |
| 21 | `getProcessingFeeRate` | `(subtotal: number): number` | `src/components/admin/ops/FinancialBreakdown.tsx`, `src/lib/pricing.ts`, `src/lib/processing-fee.test.ts`, `supabase/functions/_shared/booking-core.ts`, `supabase/functions/_shared/processing-fee.ts`, `supabase/functions/create-walk-in-booking/index.ts`, `supabase/functions/reprice-booking/index.ts` |
| 32 | `computeProcessingFee` | `(subtotal: number): number` | `src/components/admin/ops/VehicleUpgradePanel.tsx`, `src/lib/pricing.ts`, `src/lib/processing-fee.test.ts`, `supabase/functions/_shared/booking-core.ts`, `supabase/functions/_shared/processing-fee.ts`, `supabase/functions/create-walk-in-booking/index.ts`, `supabase/functions/reprice-booking/index.ts` |
| 41 | `formatProcessingFeeRate` | `(rate: number): string` | `src/components/shared/TotalBar.tsx` |
| 47 | `processingFeeLabel` | `(rateOrSubtotal: number, isRate = true): string` | `src/components/admin/WalkInBookingDialog.tsx`, `src/components/admin/ops/FinancialBreakdown.tsx`, `src/components/booking/AgreementStructuredView.tsx`, `src/components/rental/BookingSummaryPanel.tsx`, `src/lib/processing-fee.test.ts`, `src/pages/BookingDetail.tsx`, `src/pages/NewCheckout.tsx`, `src/pages/admin/Billing.tsx` |
| 52 | `PROCESSING_FEE_EXPLAINER` | `` | **UNCALLED — dead code** |

### `src/lib/protection-groups.ts`

**File header:** Protection Groups - Vehicle category to protection pricing group mapping Group 1: Mystery Car, Compact, Mid-Size Sedan, Full-Size Sedan, Mid-Size SUV Group 2: Minivan, Standard SUV Group 3: Large SUV

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 19 | `GROUP_RATES` | `{` | **UNCALLED — dead code** |
| 25 | `GROUP_LABELS` | `{` | **UNCALLED — dead code** |
| 44 | `getProtectionGroup` | `(categoryName: string \| null \| undefined): ProtectionGroup` | `src/hooks/use-protection-settings.ts`, `supabase/functions/backfill-additional-drivers/index.ts`, `supabase/functions/generate-agreement/index.ts` |
| 63 | `getGroupProtectionPackages` | `(group: ProtectionGroup): ProtectionPackage[]` | **UNCALLED — dead code** |
| 123 | `getProtectionRateForCategory` | `(` | `src/components/admin/LocationDailyReport.tsx`, `src/components/admin/ops/BookingModificationPanel.tsx`, `src/components/admin/ops/FinancialBreakdown.tsx`, `src/hooks/use-revenue-analytics.ts`, `src/lib/pdf/invoice-data-builder.ts` |

### `src/lib/query-client.ts`

**File header:** Optimized QueryClient configuration for better performance PR7: Performance optimization - enhanced caching and deduplication

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 11 | `QUERY_STALE_TIMES` | `{` | **UNCALLED — dead code** |
| 28 | `queryClient` | `new QueryClient({` | **UNCALLED — dead code** |
| 60 | `prefetchBookingData` | `(client: QueryClient, bookingId: string)` | **UNCALLED — dead code** |
| 70 | `prefetchCategoryData` | `(client: QueryClient)` | **UNCALLED — dead code** |
| 80 | `invalidateBookingQueries` | `(client: QueryClient, bookingId?: string)` | **UNCALLED — dead code** |
| 97 | `invalidateFleetQueries` | `(client: QueryClient)` | **UNCALLED — dead code** |

### `src/lib/rental-rules.ts`

**File header:** Rental Rules & Business Logic - Central configuration for rental policies Single source of truth for all business rules

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 7 | `MIN_RENTAL_DAYS` | `1;` | **UNCALLED — dead code** |
| 8 | `MAX_RENTAL_DAYS` | `30; // Maximum rental duration` | **UNCALLED — dead code** |
| 11 | `FREE_CANCELLATION_HOURS` | `48; // Hours before pickup for free cancellation (kept for reference)` | **UNCALLED — dead code** |
| 12 | `CANCELLATION_PENALTY_DAYS` | `1; // Days of rental charged as penalty after pickup time` | **UNCALLED — dead code** |
| 18 | `calculateCancellationFee` | `(` | `src/components/booking/CancelBookingDialog.tsx` |
| 48 | `DELIVERY_FEE` | `50;` | **UNCALLED — dead code** |
| 50 | `DELIVERY_TIERS` | `[` | **UNCALLED — dead code** |
| 54 | `MAX_DELIVERY_DISTANCE_KM` | `50;` | **UNCALLED — dead code** |
| 59 | `calculateDeliveryFee` | `(distanceKm: number):` | `src/components/rental/RentalSearchCard.tsx`, `src/constants/rentalLocations.ts` |
| 82 | `getDeliveryPricingSummary` | `(): string` | `src/components/rental/DeliveryPricingDisplay.tsx` |
| 99 | `generateTimeSlots` | `(` | **UNCALLED — dead code** |
| 124 | `BUSINESS_HOURS_START` | `9;` | **UNCALLED — dead code** |
| 125 | `BUSINESS_HOURS_END` | `20;` | **UNCALLED — dead code** |
| 128 | `PICKUP_TIME_SLOTS` | `generateTimeSlots(BUSINESS_HOURS_START, BUSINESS_HOURS_END, 30);` | **UNCALLED — dead code** |
| 130 | `DEFAULT_PICKUP_TIME` | `"10:00";` | **UNCALLED — dead code** |
| 135 | `isWithinBusinessHours` | `(d: Date): boolean` | `src/components/admin/ops/BookingModificationPanel.tsx` |
| 146 | `computeBillableDays` | `(startAt: Date \| string, endAt: Date \| string): number` | **UNCALLED — dead code** |
| 160 | `formatTimeDisplay` | `(time24: string): string` | `src/components/rental/BookingSummaryPanel.tsx`, `src/pages/NewCheckout.tsx` |
| 171 | `PICKUP_TIME_WINDOWS` | `PICKUP_TIME_SLOTS.map(slot => ({` | **UNCALLED — dead code** |
| 178 | `FUEL_TYPES` | `["Gas", "Diesel", "Electric", "Hybrid"] as const;` | **UNCALLED — dead code** |
| 182 | `VEHICLE_STATUSES` | `{` | **UNCALLED — dead code** |
| 194 | `canDeleteVehicle` | `(status: VehicleStatus \| string \| null): boolean` | **UNCALLED — dead code** |
| 203 | `getVehicleStatusInfo` | `(status: string \| null)` | **UNCALLED — dead code** |
| 212 | `validateRentalDuration` | `(days: number):` | **UNCALLED — dead code** |

### `src/lib/return-steps.ts`

**File header:** Validates whether a booking status transition can bypass the return workflow. Only blocks active → completed if return workflow is incomplete.

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 35 | `RETURN_STEPS` | `[` | **UNCALLED — dead code** |
| 84 | `VALID_STATE_TRANSITIONS` | `{` | **UNCALLED — dead code** |
| 105 | `getStateIndex` | `(state: ReturnState): number` | **UNCALLED — dead code** |
| 109 | `isStateAtLeast` | `(currentState: ReturnState, requiredState: ReturnState): boolean` | `src/components/admin/return-ops/steps/StepReturnCloseout.tsx`, `src/hooks/use-return-state.ts`, `src/pages/admin/ReturnOps.tsx`, `supabase/functions/update-booking-status/index.ts` |
| 113 | `canTransitionTo` | `(currentState: ReturnState, targetState: ReturnState): boolean` | `src/features/delivery/api/mutations.ts`, `src/features/delivery/constants/delivery-status.ts`, `src/hooks/use-incidents.ts`, `src/hooks/use-return-state.ts` |
| 118 | `canAccessStep` | `(stepId: ReturnStepId, currentState: ReturnState): boolean` | `src/components/admin/return-ops/ReturnStepSidebar.tsx`, `src/pages/admin/ReturnOps.tsx` |
| 127 | `isStepComplete` | `(stepId: ReturnStepId, currentState: ReturnState): boolean` | `src/components/admin/return-ops/ReturnStepSidebar.tsx`, `src/pages/admin/ReturnOps.tsx` |
| 135 | `getCurrentStepFromState` | `(returnState: ReturnState): ReturnStepId` | `src/pages/admin/ReturnOps.tsx` |
| 146 | `getNextState` | `(stepId: ReturnStepId): ReturnState \| null` | `src/hooks/use-return-state.ts` |
| 174 | `checkReturnStepComplete` | `(stepId: ReturnStepId, completion: ReturnCompletion, returnState?: ReturnState): boolean` | **UNCALLED — dead code** |
| 197 | `getReturnMissingItems` | `(stepId: ReturnStepId, completion: ReturnCompletion): string[]` | `src/components/admin/return-ops/ReturnStepSidebar.tsx` |
| 223 | `getCurrentReturnStepIndex` | `(completion: ReturnCompletion): number` | **UNCALLED — dead code** |
| 238 | `validateReturnWorkflow` | `(` | **UNCALLED — dead code** |
| 263 | `isValidBypassReason` | `(reason: string \| undefined): boolean` | **UNCALLED — dead code** |

### `src/lib/seed-categories.ts`

**File header:** Fleet Category Seed Data Contains category definitions and sample VIN/vehicle data

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 35 | `FLEET_CATEGORIES` | `[` | **UNCALLED — dead code** |
| 228 | `CATEGORY_NAMES` | `FLEET_CATEGORIES.map((c) => c.name);` | **UNCALLED — dead code** |
| 231 | `TOTAL_FLEET_SIZE` | `FLEET_CATEGORIES.reduce(` | **UNCALLED — dead code** |

### `src/lib/utils.ts`

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 4 | `cn` | `(...inputs: ClassValue[])` | `src/components/NavLink.tsx`, `src/components/admin/ActiveRentalsMonitor.tsx`, `src/components/admin/ConversionFunnel.tsx`, `src/components/admin/CreateIncidentDialog.tsx`, `src/components/admin/IncidentDetailDialog.tsx`, `src/components/admin/IntakeChecklist.tsx`, `src/components/admin/OperationsFilters.tsx`, `src/components/admin/PreInspectionPhotos.tsx`, `src/components/admin/UnifiedVehicleManager.tsx`, `src/components/admin/VehiclePrepChecklist.tsx` … +148 |
| 9 | `displayFuelType` | `(fuel: string \| null \| undefined): string => {` | `src/components/landing/VehicleCard.tsx`, `src/components/landing/VehicleDetailsModal.tsx`, `src/pages/Compare.tsx` |
| 14 | `displayTransmission` | `(_trans: string \| null \| undefined): string => "Automatic";` | `src/components/landing/VehicleCard.tsx`, `src/components/landing/VehicleDetailsModal.tsx`, `src/pages/Compare.tsx` |

### `src/lib/vehicle-adjustments.ts`

**File header:** Vehicle-line adjustment itemization. The vehicle portion of a booking subtotal is base rate × days, plus a weekend surcharge, minus a duration (weekly/monthly) discount. Historically these two adjustments were never stored, so display surfaces derived a single net remainder — which silently hid the weekend surcharge whenever a duration discount was larger (e.g. booking W9JD9JDV: +$53.99 surcharge 

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 30 | `buildVehicleAdjustmentLines` | `(input:` | `src/components/admin/ops/FinancialBreakdown.tsx`, `src/lib/agreement-adjustments.ts`, `src/lib/pdf/invoice-data-builder.ts`, `src/lib/pricing.test.ts`, `supabase/functions/_shared/vehicle-adjustments.ts`, `supabase/functions/generate-agreement/index.ts` |

### `src/lib/agreement-adjustments.ts`

**File header:** Resolves the explicit vehicle-line adjustments (weekend surcharge / duration discount) for a stored rental agreement's terms_json. New agreements persist `financial.adjustmentLines`. Historic agreements only stored a single netted `weekendSurcharge` (often 0 when a duration discount outweighed the surcharge), so the lines are recomputed from the rental facts and reconciled against the stored subto

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 41 | `resolveAgreementAdjustmentLines` | `(t: AgreementTermsLike): AgreementAdjustmentLine[]` | `src/components/booking/AgreementStructuredView.tsx`, `src/lib/pdf/rental-agreement-pdf.ts` |

### `src/lib/analytics.ts`

**File header:** Analytics utility for tracking events across the application Persists events to Supabase analytics_events table for centralized tracking.

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 42 | `trackEvent` | `(event: AnalyticsEvent, properties?: EventProperties): void` | `src/pages/Contact.tsx`, `src/pages/ForgotPassword.tsx`, `src/pages/ResetPassword.tsx`, `src/pages/Subscription.tsx` |
| 68 | `trackPageView` | `(pageName?: string): void` | `src/pages/AddOns.tsx`, `src/pages/Protection.tsx`, `src/pages/Search.tsx` |
| 77 | `trackError` | `(error: Error, context?: EventProperties): void` | `src/components/ErrorBoundary.tsx` |
| 87 | `funnelEvents` | `{` | **UNCALLED — dead code** |

### `src/lib/api-error.ts`

**File header:** Centralized API Error Handling Provides consistent error handling patterns across hooks and edge functions. PR3: Standardize Error Handling

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 11 | `API_ERROR_CODES` | `{` | **UNCALLED — dead code** |
| 58 | `parseApiError` | `(response: unknown): ApiError` | **UNCALLED — dead code** |
| 77 | `getErrorMessage` | `(error: unknown): string` | **UNCALLED — dead code** |
| 100 | `handleMutationError` | `(` | **UNCALLED — dead code** |
| 112 | `handleMutationSuccess` | `(message: string): void` | **UNCALLED — dead code** |
| 174 | `isRetryableError` | `(error: unknown): boolean` | **UNCALLED — dead code** |

### `src/lib/availability-check.ts`

**File header:** Availability — single source of truth. All availability answers come from the backend RPCs `get_category_availability` / `check_category_availability`. Never compute availability from client-side table reads: guests cannot read `vehicle_units` / `bookings` under RLS and would see everything as available.

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 22 | `AVAILABILITY_MESSAGES` | `{` | **UNCALLED — dead code** |
| 31 | `mapAvailabilityError` | `(code?: string \| null, fallback?: string)` | **UNCALLED — dead code** |
| 42 | `checkCategoryAvailability` | `(params:` | **UNCALLED — dead code** |

### `src/lib/availability.ts`

**File header:** @deprecated This module uses the legacy vehicles table for availability checks. For new code, use the category-based availability system: - useBrowseCategories() which calls get_available_categories() RPC - useCategoryAvailability() for checking specific category availability The vehicles-based availability is being phased out. See REFACTOR_PLAN.md PR2 for migration details.

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 54 | `getAvailableVehicles` | `(` | `src/hooks/use-availability.ts` |
| 191 | `isVehicleAvailable` | `(` | `src/hooks/use-availability.ts` |

### `src/lib/booking-helpers.ts`

**File header:** Shared booking data utilities to reduce code duplication and improve query efficiency across hooks

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 67 | `batchFetchProfiles` | `(userIds: string[]): Promise<Map<string, ProfileBaseData>>` | `src/hooks/use-handovers.ts`, `src/hooks/use-returns.ts` |
| 87 | `batchFetchPayments` | `(bookingIds: string[]): Promise<Map<string, Array<` | `src/hooks/use-handovers.ts` |
| 117 | `batchFetchVerifications` | `(bookingIds: string[]): Promise<Map<string, string>>` | `src/hooks/use-handovers.ts` |
| 136 | `batchFetchConditionPhotos` | `(bookingIds: string[]): Promise<Map<string,` | `src/hooks/use-returns.ts` |
| 174 | `batchFetchDamages` | `(bookingIds: string[]): Promise<Map<string, number>>` | `src/hooks/use-returns.ts` |
| 199 | `batchFetchInspections` | `(bookingIds: string[]): Promise<Map<string,` | `src/hooks/use-returns.ts` |
| 236 | `batchFetchVehicleExpenses` | `(unitIds: string[]): Promise<Map<string, number>>` | **UNCALLED — dead code** |
| 261 | `calculatePaymentStatus` | `(` | **UNCALLED — dead code** |
| 283 | `formatVehicleName` | `(vehicle: VehicleBaseData \| null): string` | **UNCALLED — dead code** |
| 291 | `formatCustomerName` | `(profile: ProfileBaseData \| null): string` | **UNCALLED — dead code** |

### `src/lib/booking-routes.ts`

**File header:** Booking Route Helper Routes bookings to the correct admin screen based on their status: - pending/confirmed → BookingOps (preparation/handover flow) - active → ActiveRentalDetail (monitoring + return initiation) - completed → Read-only detail view - cancelled → Read-only detail view

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 20 | `getBookingRoute` | `(bookingId: string, status: BookingStatus, options: RouteOptions =` | `src/components/support/TicketBookingSummary.tsx`, `src/pages/admin/Overview.tsx` |
| 47 | `getReturnRoute` | `(bookingId: string): string` | **UNCALLED — dead code** |
| 54 | `canInitiateReturn` | `(status: BookingStatus): boolean` | **UNCALLED — dead code** |
| 61 | `isPreRentalPhase` | `(status: BookingStatus): boolean` | **UNCALLED — dead code** |
| 68 | `getBookingActionLabel` | `(status: BookingStatus): string` | `src/pages/admin/Overview.tsx` |

### `src/lib/booking-stages.ts`

**File header:** Booking Operational Stages Defines the workflow backbone for rental operations

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 30 | `BOOKING_STAGES` | `[` | **UNCALLED — dead code** |
| 126 | `getCurrentStage` | `(` | **UNCALLED — dead code** |
| 161 | `getStageProgress` | `(currentStage: BookingStage): number` | `src/components/shared/StageProgress.tsx` |

### `src/lib/branch-resolution.ts`

**File header:** Branch resolution for tables that have no `location_id` of their own. Incidents and support tickets are attributed to a branch through: 1. the linked booking's `location_id`, else 2. the vehicle unit's branch (`vehicle_units.location_id`, falling back to `vehicles.location_id`). Tickets that resolve to no branch are "unassigned branch" and are only shown to Super Admins, or to the manager who crea

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 16 | `fetchUnitLocationMap` | `(): Promise<Map<string, string \| null>>` | `src/hooks/use-damages.ts`, `src/hooks/use-incidents.ts`, `src/pages/admin/Incidents.tsx` |
| 25 | `fetchBookingLocationMap` | `(` | `src/hooks/use-damages.ts`, `src/hooks/use-incidents.ts`, `src/pages/admin/Incidents.tsx` |
| 40 | `resolveIncidentBranch` | `(` | `src/hooks/use-damages.ts`, `src/hooks/use-incidents.ts`, `src/pages/admin/Incidents.tsx` |
| 55 | `resolveTicketBranches` | `(` | `src/hooks/use-support-v2.ts` |
| 121 | `isTicketVisibleForBranch` | `(` | `src/hooks/use-support-v2.ts` |

### `src/lib/card-validation.ts`

**File header:** Credit Card Validation & Type Detection Identifies card type and validates card numbers using Luhn algorithm

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 17 | `CARD_TYPES` | `{` | **UNCALLED — dead code** |
| 79 | `detectCardType` | `(cardNumber: string): CardType` | `src/components/checkout/CreditCardInput.tsx` |
| 105 | `luhnCheck` | `(cardNumber: string): boolean` | **UNCALLED — dead code** |
| 132 | `validateCardLength` | `(cardNumber: string): boolean` | **UNCALLED — dead code** |
| 143 | `formatCardNumber` | `(value: string, cardType: CardType): string` | `src/components/checkout/CreditCardInput.tsx` |
| 165 | `formatExpiryDate` | `(value: string): string` | `src/components/checkout/CreditCardInput.tsx` |
| 177 | `validateExpiryDate` | `(value: string):` | **UNCALLED — dead code** |
| 205 | `validateCVV` | `(cvv: string, cardType: CardType): boolean` | **UNCALLED — dead code** |
| 214 | `maskCardNumber` | `(cardNumber: string): string` | **UNCALLED — dead code** |
| 225 | `validateCard` | `(card:` | **UNCALLED — dead code** |
| 282 | `isCardTypeAllowed` | `(cardNumber: string):` | **UNCALLED — dead code** |
| 301 | `validateDriverCardholderMatch` | `(` | **UNCALLED — dead code** |

### `src/lib/checkout-policies.ts`

**File header:** Checkout and payment policies Legal text and requirements

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 6 | `CANCELLATION_POLICY` | `{` | **UNCALLED — dead code** |
| 13 | `PICKUP_REQUIREMENTS` | `{` | **UNCALLED — dead code** |
| 21 | `DAMAGE_LIABILITY_POLICY` | `{` | **UNCALLED — dead code** |

### `src/lib/compress-image.ts`

**File header:** Client-side image compression utility. Resizes images and converts to JPEG before uploading to storage.

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 5 | `compressImage` | `(` | **UNCALLED — dead code** |

### `src/lib/date-utils.ts`

**File header:** Date utilities for timezone-safe date handling. All UI state stores dates as "YYYY-MM-DD" strings (date-only, no timezone). Conversion to timestamps only happens at submit time using these helpers.

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 9 | `formatLocalDate` | `(date: Date): string` | `src/components/landing/VehicleCard.tsx`, `src/components/rental/RentalSearchCard.tsx`, `src/components/shared/BookingStepper.tsx`, `src/contexts/RentalBookingContext.tsx`, `src/lib/date-utils.test.ts`, `src/pages/AddOns.tsx`, `src/pages/NewCheckout.tsx`, `src/pages/Protection.tsx` |
| 17 | `parseLocalDate` | `(dateStr: string): Date` | `src/components/rental/RentalSearchCard.tsx`, `src/contexts/RentalBookingContext.tsx`, `src/lib/date-utils.test.ts` |
| 26 | `addLocalDays` | `(dateStr: string, days: number): string` | `src/components/landing/GlassSearchBar.tsx`, `src/components/rental/RentalSearchCard.tsx`, `src/lib/date-utils.test.ts` |
| 36 | `diffLocalDays` | `(startStr: string, endStr: string): number` | `src/components/rental/RentalSearchCard.tsx`, `src/lib/date-utils.test.ts` |
| 50 | `localDateTimeToISO` | `(dateStr: string, time: string): string` | `src/lib/date-utils.test.ts`, `src/pages/AddOns.tsx`, `src/pages/NewCheckout.tsx`, `src/pages/Protection.tsx` |
| 58 | `todayLocalISO` | `(): string` | `src/components/landing/GlassSearchBar.tsx`, `src/components/rental/RentalSearchCard.tsx` |
| 63 | `startOfLocalToday` | `(): Date` | `src/components/admin/WalkInBookingDialog.tsx`, `src/components/shared/TripContextBar.tsx`, `src/components/shared/TripContextPrompt.tsx`, `src/contexts/RentalBookingContext.tsx` |
| 69 | `isPastLocalDate` | `(value: string \| Date \| null \| undefined): boolean` | `src/components/landing/GlassSearchBar.tsx`, `src/components/rental/RentalSearchCard.tsx`, `src/contexts/RentalBookingContext.tsx` |
| 78 | `clampToTodayISO` | `(dateStr: string): string` | `src/components/landing/GlassSearchBar.tsx`, `src/components/rental/RentalSearchCard.tsx` |
| 84 | `clampDateToToday` | `(date: Date \| null): Date \| null` | **UNCALLED — dead code** |

### `src/lib/delivery-portal.ts`

**File header:** Normalize legacy query param values to the new Delivery Portal filters.

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 8 | `normalizeDeliveryPortalTab` | `(` | **UNCALLED — dead code** |
| 28 | `getDeliveryPortalStatus` | `(input:` | **UNCALLED — dead code** |
| 44 | `countByPortalStatus` | `(deliveries: DeliveryBooking[] \| undefined): Record<DeliveryPortalStatus, number>` | `src/features/delivery/utils/delivery-helpers.ts` |

### `src/lib/deposit-automation.ts`

**File header:** Handles deposit actions when booking status changes - Completed: Auto-release deposit if no damages - Cancelled: Create admin alert for manual review

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 12 | `handleDepositOnStatusChange` | `(` | `src/domain/bookings/mutations.ts` |

### `src/lib/deposit-state.ts`

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 25 | `getDepositLifecycleState` | `(` | `src/hooks/use-payment-deposit.ts`, `src/lib/deposit-automation.ts` |
| 41 | `isDepositActionComplete` | `(state: DepositLifecycleState): boolean` | `src/hooks/use-payment-deposit.ts` |
| 45 | `getDepositStatusLabel` | `(state: DepositLifecycleState): string` | `src/hooks/use-payment-deposit.ts` |

### `src/lib/dispatch-readiness.ts`

**File header:** Dispatch Readiness Validation Ensures delivery bookings cannot be dispatched without proper prerequisites: - Payment hold authorized - Vehicle unit (VIN) assigned - Vehicle prep completed (condition photos taken)

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 35 | `MINIMUM_PREP_PHOTOS` | `4;` | **UNCALLED — dead code** |
| 40 | `AUTHORIZED_DEPOSIT_STATUSES` | `[` | **UNCALLED — dead code** |
| 50 | `checkDispatchReadiness` | `(` | `src/components/admin/ops/steps/StepDispatch.tsx`, `src/hooks/use-assign-driver.ts`, `src/hooks/use-dispatch-readiness.ts` |
| 86 | `getDispatchBlockerMessage` | `(check: DispatchReadinessCheck): string` | `src/hooks/use-assign-driver.ts` |

### `src/lib/edge-function-error.ts`

**File header:** Extract error message from Supabase Edge Function invocation. When an edge function returns non-2xx, supabase.functions.invoke puts the response in `error.context` (a Response object) and sets `data` to null. This helper extracts the actual error message from the response body.

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 16 | `extractEdgeFunctionErrorDetails` | `(` | `src/components/admin/return-ops/steps/StepReturnDeposit.tsx` |
| 61 | `extractEdgeFunctionError` | `(` | `src/components/admin/UnifiedVehicleManager.tsx`, `src/components/admin/deposit/AccountCloseoutPanel.tsx`, `src/components/admin/ops/ProtectionChangePanel.tsx`, `src/components/admin/ops/steps/StepPayment.tsx`, `src/components/admin/return-ops/steps/StepReturnDeposit.tsx`, `src/hooks/use-booking-edit.ts`, `src/hooks/use-bookings.ts`, `src/pages/admin/BookingDetail.tsx` |

### `src/lib/format-customer.ts`

**File header:** Customer Display Utilities Sanitizes customer names (detects email-as-name) and formats phone numbers for consistent display across all panels.

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 12 | `displayName` | `(` | `src/components/admin/BookingCustomerCard.tsx`, `src/components/admin/BookingOpsDrawer.tsx`, `src/components/admin/ops/MobileBookingSummary.tsx`, `src/components/admin/ops/OpsStepContent.tsx`, `src/components/admin/ops/steps/StepEnRoute.tsx`, `src/components/admin/ops/steps/StepIntake.tsx`, `src/pages/admin/BookingOps.tsx` |
| 27 | `formatPhone` | `(phone: string \| null \| undefined): string \| null` | `src/components/admin/BookingCustomerCard.tsx`, `src/components/admin/ops/MobileBookingSummary.tsx`, `src/components/shared/PhoneInput.tsx` |

### `src/lib/fuel-pricing.ts`

**File header:** Fuel pricing constants and utilities Our fuel is offered at 5 cents below market rate

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 7 | `MARKET_FUEL_PRICE_PER_LITER` | `1.85; // CAD` | **UNCALLED — dead code** |
| 10 | `FUEL_DISCOUNT_CENTS` | `5; // cents` | **UNCALLED — dead code** |
| 13 | `OUR_FUEL_PRICE_PER_LITER` | `MARKET_FUEL_PRICE_PER_LITER - FUEL_DISCOUNT_CENTS / 100;` | **UNCALLED — dead code** |
| 16 | `TANK_SIZES` | `{` | **UNCALLED — dead code** |
| 34 | `calculateFuelCost` | `(tankLiters: number = TANK_SIZES.default):` | **UNCALLED — dead code** |
| 55 | `getTankSize` | `(category: string): number` | **UNCALLED — dead code** |
| 71 | `calculateFuelCostForUnit` | `(` | `src/hooks/use-add-ons.ts`, `src/pages/AddOns.tsx` |
| 86 | `FUEL_LEVELS` | `[` | **UNCALLED — dead code** |
| 101 | `getFuelLevelLabel` | `(percentage: number): string` | `src/components/admin/return-ops/steps/StepReturnFees.tsx` |
| 123 | `calculateFuelShortage` | `(` | `src/components/admin/return-ops/steps/StepReturnFees.tsx`, `src/hooks/use-fuel-shortage.ts` |

### `src/lib/km-allowance.ts`

**File header:** Kilometre Allowance — Single source of truth Rule: rentals of 1–7 days include UNLIMITED kilometres. From day 8 onward, an allowance of 160 km accrues for each day beyond the first 7 (e.g. a 10-day rental includes 3 × 160 = 480 km). Excess kilometres are charged at $0.25/km, computed at return from odometer readings.

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 12 | `FREE_KM_DAYS` | `7;` | **UNCALLED — dead code** |
| 13 | `WEEKLY_KM_ALLOWANCE` | `1400;` | **UNCALLED — dead code** |
| 14 | `MONTHLY_KM_ALLOWANCE` | `4800;` | **UNCALLED — dead code** |
| 15 | `EXCESS_KM_RATE` | `0.25; // CAD per km` | **UNCALLED — dead code** |
| 18 | `KM_PER_DAY` | `MONTHLY_KM_ALLOWANCE / 30; // 160 km/day` | **UNCALLED — dead code** |
| 34 | `isUnlimitedKm` | `(rentalDays: number \| null \| undefined): boolean` | `src/components/booking/AgreementStructuredView.tsx`, `src/lib/km-allowance.test.ts`, `src/lib/pdf/rental-agreement-pdf.ts` |
| 44 | `calculateKmAllowance` | `(rentalDays: number): number` | `src/components/booking/AgreementStructuredView.tsx`, `src/lib/km-allowance.test.ts`, `src/lib/pdf/rental-agreement-pdf.ts` |
| 55 | `calculateExcessKm` | `(` | `src/lib/km-allowance.test.ts` |
| 84 | `formatKmAllowanceSummary` | `(rentalDays?: number): string` | `src/lib/km-allowance.test.ts`, `src/lib/pricing.ts` |

### `src/lib/late-return.ts`

**File header:** Late Return Fee Calculation Handles grace period, fee calculation, and customer self-return marking

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 10 | `LATE_RETURN_GRACE_PERIOD_MINUTES` | `30; // 30 minutes grace period` | **UNCALLED — dead code** |
| 11 | `LATE_RETURN_FEE_PERCENTAGE` | `0.25; // 25% of daily rate per hour after grace period` | **UNCALLED — dead code** |
| 12 | `LATE_RETURN_SURCHARGE_HOURLY_PCT` | `LATE_RETURN_FEE_PERCENTAGE; // preferred alias` | **UNCALLED — dead code** |
| 13 | `LATE_RETURN_SURCHARGE_MAX_HOURS` | `2; // after this, switch to full daily rate` | **UNCALLED — dead code** |
| 30 | `calculateLateReturnFee` | `(` | `src/lib/late-return.test.ts` |
| 85 | `calculateLateReturnFeeWithRate` | `(` | `src/hooks/use-late-return.ts`, `src/lib/late-return.test.ts`, `src/lib/pdf/rental-agreement-pdf.test.ts` |
| 121 | `getLateReturnSummary` | `(dailyRate?: number): string` | **UNCALLED — dead code** |
| 133 | `canCustomerMarkReturned` | `(` | `src/pages/Dashboard.tsx` |

### `src/lib/location-scope-storage.ts`

**File header:** Persistence for the admin/ops branch scope. The selected branch has to survive navigating between tabs (Ops → Inventory → Payments → Reports), so we mirror the `?locationId=` URL param into localStorage and re-hydrate it when a page is opened without the param.

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 11 | `readStoredLocationScope` | `(): string \| null` | `src/context/LocationScopeProvider.tsx`, `src/hooks/use-staff-location.ts` |
| 21 | `writeStoredLocationScope` | `(locationId: string \| null): void` | `src/context/LocationScopeProvider.tsx` |

### `src/lib/location-scope.ts`

**File header:** Shared branch-scope helpers. Several operational tables (vehicle_units, maintenance_logs, vehicle_expenses, incident_cases, support_tickets_v2) carry no `location_id` of their own, so a row's branch is derived from its vehicle unit (`vehicle_units.location_id`, falling back to the category-level `vehicles.location_id`) or from the linked booking (`bookings.location_id`).

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 12 | `unitBranchId` | `(unit: any): string \| null` | `src/hooks/use-fleet-analytics-enhanced.ts`, `src/hooks/use-fleet-analytics.ts`, `src/lib/branch-resolution.ts` |

### `src/lib/ops-steps.ts`

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 36 | `OPS_STEPS` | `[` | **UNCALLED — dead code** |
| 91 | `OPS_STEPS_DELIVERY_PRE` | `[` | **UNCALLED — dead code** |
| 152 | `DELIVERY_PORTAL_STEPS` | `[` | **UNCALLED — dead code** |
| 198 | `getStepForDisplay` | `(step: OpsStep, isDelivery: boolean):` | `src/components/admin/ops/OpsStepContent.tsx`, `src/components/admin/ops/OpsStepSidebar.tsx` |
| 278 | `getOpsSteps` | `(isDelivery: boolean): OpsStep[]` | `src/components/admin/ops/OpsStepContent.tsx`, `src/pages/admin/BookingOps.tsx` |
| 283 | `getStepStatus` | `(` | `src/components/admin/ops/OpsStepContent.tsx`, `src/components/admin/ops/OpsStepSidebar.tsx` |
| 308 | `getBlockingIssues` | `(stepId: OpsStepId, completion: StepCompletion, isDelivery: boolean = false): BlockingIssue[]` | `src/components/admin/ops/OpsStepContent.tsx` |
| 348 | `checkStepComplete` | `(stepId: OpsStepId, completion: StepCompletion, isDelivery: boolean = false): boolean` | `src/components/admin/ops/OpsStepContent.tsx`, `src/components/admin/ops/OpsStepSidebar.tsx` |
| 394 | `getMissingItems` | `(stepId: OpsStepId, completion: StepCompletion, isDelivery: boolean = false): string[]` | `src/components/admin/ops/OpsStepContent.tsx` |
| 454 | `getCurrentStepIndex` | `(completion: StepCompletion, isDelivery: boolean = false): number` | `src/components/admin/ops/OpsStepContent.tsx`, `src/features/delivery/components/DeliverySteps.tsx`, `src/features/delivery/constants/delivery-status.ts`, `src/pages/admin/BookingOps.tsx` |
| 465 | `ACTION_LABELS` | `{` | **UNCALLED — dead code** |
| 480 | `STATUS_LABELS` | `{` | **UNCALLED — dead code** |
| 495 | `DELIVERY_STATUS_MAP` | `{` | **UNCALLED — dead code** |

### `src/lib/pdf/invoice-data-builder.ts`

**File header:** Invoice Data Builder Fetches booking + join tables and builds InvoicePdfData using the same deterministic breakdown logic as the shared FinancialBreakdown component. This ensures the invoice PDF matches Ops Summary and customer views exactly.

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 58 | `buildInvoicePdfData` | `(` | `src/pages/admin/Billing.tsx`, `src/pages/admin/BookingDetail.tsx`, `src/pages/admin/Finance.tsx` |

### `src/lib/pdf/invoice-pdf.ts`

**File header:** Card processing fee (pass-through, not taxed)

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 188 | `generateInvoicePdf` | `(data: InvoicePdfData)` | `src/pages/admin/Billing.tsx`, `src/pages/admin/BookingDetail.tsx`, `src/pages/admin/Finance.tsx` |

### `src/lib/pdf/receipt-pdf.ts`

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 26 | `generateReceiptPdf` | `(data: ReceiptPdfData)` | `src/pages/BookingDetail.tsx`, `src/pages/admin/Billing.tsx`, `src/pages/admin/Finance.tsx` |

### `src/lib/pdf/rental-agreement-pdf.ts`

**File header:** Build the rental agreement PDF in-memory (no download). Exposed for tests and any caller that needs the raw jsPDF instance (e.g. to inspect output, upload to storage, etc).

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 190 | `buildRentalAgreementPdf` | `(` | `src/lib/pdf/rental-agreement-pdf.e2e.test.ts`, `src/lib/pdf/rental-agreement-pdf.test.ts` |
| 213 | `generateRentalAgreementPdf` | `(` | `src/components/admin/RentalAgreementPanel.tsx`, `src/components/booking/RentalAgreementSign.tsx`, `src/pages/admin/BookingDetail.tsx` |

### `src/lib/pickup-progress.ts`

**File header:** Pickup progress derivation A booking sitting in `pending` / `confirmed` says nothing about how far the pickup wizard actually got. Backdated bookings that were fully handed over, abandoned reservations, and half-finished handovers all look identical from `status` alone — which is why they all piled up under "needs processing". This module derives the real stage from the records the wizard writes: 

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 25 | `EMPTY_PROGRESS` | `{` | **UNCALLED — dead code** |
| 37 | `fetchPickupProgress` | `(` | `src/hooks/use-pickup-progress.ts` |
| 83 | `resolvePickupStage` | `(` | **UNCALLED — dead code** |
| 101 | `classifyPickupAttention` | `(args:` | `src/pages/admin/Bookings.tsx` |
| 127 | `ATTENTION_LABELS` | `{` | **UNCALLED — dead code** |
| 133 | `ATTENTION_DESCRIPTIONS` | `{` | **UNCALLED — dead code** |

### `src/lib/pricing.ts`

**File header:** Central pricing utility - Single source of truth for all booking price calculations All fee logic should be defined here to ensure consistency across the app

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 18 | `YOUNG_DRIVER_FEE` | `15; // Daily fee for drivers aged 21-24 (CAD/day)` | **UNCALLED — dead code** |
| 19 | `DEFAULT_DEPOSIT_AMOUNT` | `350; // Standard security deposit` | **UNCALLED — dead code** |
| 20 | `MINIMUM_DEPOSIT_AMOUNT` | `350; // BUSINESS RULE: Deposit is ALWAYS required, never zero` | **UNCALLED — dead code** |
| 23 | `PST_RATE` | `0.07; // 7% Provincial Sales Tax` | **UNCALLED — dead code** |
| 24 | `GST_RATE` | `0.05; // 5% Goods and Services Tax` | **UNCALLED — dead code** |
| 25 | `TOTAL_TAX_RATE` | `PST_RATE + GST_RATE; // 12% combined` | **UNCALLED — dead code** |
| 28 | `PVRT_DAILY_FEE` | `1.50; // Passenger Vehicle Rental Tax` | **UNCALLED — dead code** |
| 29 | `ACSRCH_DAILY_FEE` | `1.00; // Airport Concession/Surcharge` | **UNCALLED — dead code** |
| 32 | `WEEKEND_SURCHARGE_RATE` | `0.15; // 15% weekend surcharge per weekend day (Fri/Sat/Sun)` | **UNCALLED — dead code** |
| 37 | `WEEKLY_DISCOUNT_THRESHOLD` | `7; // Days for weekly discount (retired)` | **UNCALLED — dead code** |
| 38 | `WEEKLY_DISCOUNT_RATE` | `0; // Retired — no weekly discount` | **UNCALLED — dead code** |
| 39 | `MONTHLY_DISCOUNT_THRESHOLD` | `21; // Days for monthly discount (retired)` | **UNCALLED — dead code** |
| 40 | `MONTHLY_DISCOUNT_RATE` | `0; // Retired — no monthly discount` | **UNCALLED — dead code** |
| 58 | `MIN_DRIVER_AGE` | `21;` | **UNCALLED — dead code** |
| 59 | `YOUNG_DRIVER_MAX_AGE` | `24;` | **UNCALLED — dead code** |
| 60 | `MAX_DRIVER_AGE` | `70;` | **UNCALLED — dead code** |
| 65 | `CANCELLATION_FEE_DAYS` | `1; // Days of daily rate charged as penalty` | **UNCALLED — dead code** |
| 75 | `computeDropoffFeeFromGroups` | `(` | `src/components/rental/BookingSummaryPanel.tsx`, `src/components/rental/RentalSearchCard.tsx`, `src/pages/NewCheckout.tsx` |
| 91 | `MYSTERY_CAR_FEE` | `30; // CAD base price for Mystery Car category` | **UNCALLED — dead code** |
| 94 | `BAGGAGE_CAPACITY` | `{` | **UNCALLED — dead code** |
| 106 | `getBaggageCapacity` | `(category: string): number` | `src/components/landing/VehicleCard.tsx` |
| 172 | `PROTECTION_PACKAGES` | `[` | **UNCALLED — dead code** |
| 225 | `PROTECTION_RATES` | `Object.fromEntries(` | **UNCALLED — dead code** |
| 231 | `BOOKING_STATUS_STYLES` | `{` | **UNCALLED — dead code** |
| 240 | `DAMAGE_STATUS_STYLES` | `{` | **UNCALLED — dead code** |
| 249 | `DAMAGE_SEVERITY_STYLES` | `{` | **UNCALLED — dead code** |
| 256 | `TICKET_STATUS_STYLES` | `{` | **UNCALLED — dead code** |
| 266 | `VERIFICATION_STATUS_STYLES` | `{` | **UNCALLED — dead code** |
| 277 | `BOOKING_INCLUDED_FEATURES` | `[` | **UNCALLED — dead code** |
| 290 | `formatCAD` | `(amount: number, decimals: number = 2): string` | **UNCALLED — dead code** |
| 297 | `formatCADCompact` | `(amount: number): string` | **UNCALLED — dead code** |
| 308 | `BUSINESS_TIME_ZONE` | `"America/Vancouver";` | **UNCALLED — dead code** |
| 311 | `toBusinessDateString` | `(ts: string \| number \| Date): string` | `supabase/functions/_shared/booking-core.ts` |
| 324 | `isWeekendDay` | `(date: Date): boolean` | `supabase/functions/_shared/booking-core.ts` |
| 330 | `isWeekendPickup` | `(date: Date \| null \| undefined): boolean` | **UNCALLED — dead code** |
| 344 | `countWeekendDays` | `(` | `src/lib/pricing.test.ts`, `supabase/functions/generate-agreement/index.ts` |
| 374 | `deriveVehicleAdjustments` | `(input:` | `src/lib/pricing.test.ts`, `src/lib/vehicle-adjustments.ts`, `supabase/functions/_shared/vehicle-adjustments.ts` |
| 414 | `getDurationDiscount` | `(_rentalDays: number):` | `supabase/functions/_shared/booking-core.ts`, `supabase/functions/_shared/vehicle-adjustments.ts` |
| 429 | `calculateLateFee` | `(minutesLate: number, dailyRate?: number): number` | `src/components/admin/return-ops/steps/StepReturnCloseout.tsx`, `src/components/admin/return-ops/steps/StepReturnIssues.tsx`, `src/components/support/TicketBookingSummary.tsx`, `src/lib/late-return.test.ts` |
| 453 | `calculateBookingPricing` | `(input: PricingInput): PricingBreakdown` | `src/components/admin/CategoryUpgradeDialog.tsx`, `src/components/admin/UnifiedVehicleManager.tsx`, `src/components/admin/WalkInBookingDialog.tsx`, `src/components/admin/ops/ProtectionChangePanel.tsx`, `src/components/rental/BookingSummaryPanel.tsx`, `src/components/shared/TotalBar.tsx`, `src/features/delivery/pages/WalkIn.tsx`, `src/hooks/use-booking-edit.ts`, `src/hooks/use-booking-modification.ts`, `src/lib/pricing.test.ts` … +4 |
| 545 | `ageRangeToAgeBand` | `(ageRange: "20-24" \| "25-70" \| null): DriverAgeBand \| null` | `src/components/rental/BookingSummaryPanel.tsx`, `src/components/shared/TotalBar.tsx`, `src/pages/AddOns.tsx`, `src/pages/NewCheckout.tsx`, `src/pages/Protection.tsx` |
| 553 | `ageBandToAgeRange` | `(ageBand: DriverAgeBand \| null): "20-24" \| "25-70" \| null` | **UNCALLED — dead code** |
| 561 | `validateDriverAge` | `(age: number):` | **UNCALLED — dead code** |
| 576 | `getProtectionPackage` | `(id: string): ProtectionPackage \| undefined` | **UNCALLED — dead code** |

### `src/lib/processing-fee.ts`

**File header:** CARD PROCESSING FEE — SINGLE SOURCE OF TRUTH (client) Mandatory card processing fee applied to every rental transaction. - Pre-tax rental subtotal up to $450.00  -> 2.5% - Pre-tax rental subtotal $450.01+       -> 1.5% The fee is a pass-through: it is added AFTER PST/GST and is not itself taxed. It is never waivable at the counter. Keep in sync with supabase/functions/_shared/processing-fee.ts

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 14 | `PROCESSING_FEE_THRESHOLD` | `450; // CAD, pre-tax subtotal` | **UNCALLED — dead code** |
| 15 | `PROCESSING_FEE_RATE_LOW_TIER` | `0.025; // <= $450` | **UNCALLED — dead code** |
| 16 | `PROCESSING_FEE_RATE_HIGH_TIER` | `0.015; // > $450` | **UNCALLED — dead code** |
| 18 | `PROCESSING_FEE_LABEL` | `"Credit card processing fee";` | **UNCALLED — dead code** |
| 21 | `getProcessingFeeRate` | `(subtotal: number): number` | `src/components/admin/ops/FinancialBreakdown.tsx`, `src/lib/pricing.ts`, `src/lib/processing-fee.test.ts`, `supabase/functions/_shared/booking-core.ts`, `supabase/functions/_shared/processing-fee.ts`, `supabase/functions/create-walk-in-booking/index.ts`, `supabase/functions/reprice-booking/index.ts` |
| 32 | `computeProcessingFee` | `(subtotal: number): number` | `src/components/admin/ops/VehicleUpgradePanel.tsx`, `src/lib/pricing.ts`, `src/lib/processing-fee.test.ts`, `supabase/functions/_shared/booking-core.ts`, `supabase/functions/_shared/processing-fee.ts`, `supabase/functions/create-walk-in-booking/index.ts`, `supabase/functions/reprice-booking/index.ts` |
| 41 | `formatProcessingFeeRate` | `(rate: number): string` | `src/components/shared/TotalBar.tsx` |
| 47 | `processingFeeLabel` | `(rateOrSubtotal: number, isRate = true): string` | `src/components/admin/WalkInBookingDialog.tsx`, `src/components/admin/ops/FinancialBreakdown.tsx`, `src/components/booking/AgreementStructuredView.tsx`, `src/components/rental/BookingSummaryPanel.tsx`, `src/lib/processing-fee.test.ts`, `src/pages/BookingDetail.tsx`, `src/pages/NewCheckout.tsx`, `src/pages/admin/Billing.tsx` |
| 52 | `PROCESSING_FEE_EXPLAINER` | `` | **UNCALLED — dead code** |

### `src/lib/protection-groups.ts`

**File header:** Protection Groups - Vehicle category to protection pricing group mapping Group 1: Mystery Car, Compact, Mid-Size Sedan, Full-Size Sedan, Mid-Size SUV Group 2: Minivan, Standard SUV Group 3: Large SUV

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 19 | `GROUP_RATES` | `{` | **UNCALLED — dead code** |
| 25 | `GROUP_LABELS` | `{` | **UNCALLED — dead code** |
| 44 | `getProtectionGroup` | `(categoryName: string \| null \| undefined): ProtectionGroup` | `src/hooks/use-protection-settings.ts`, `supabase/functions/backfill-additional-drivers/index.ts`, `supabase/functions/generate-agreement/index.ts` |
| 63 | `getGroupProtectionPackages` | `(group: ProtectionGroup): ProtectionPackage[]` | **UNCALLED — dead code** |
| 123 | `getProtectionRateForCategory` | `(` | `src/components/admin/LocationDailyReport.tsx`, `src/components/admin/ops/BookingModificationPanel.tsx`, `src/components/admin/ops/FinancialBreakdown.tsx`, `src/hooks/use-revenue-analytics.ts`, `src/lib/pdf/invoice-data-builder.ts` |

### `src/lib/query-client.ts`

**File header:** Optimized QueryClient configuration for better performance PR7: Performance optimization - enhanced caching and deduplication

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 11 | `QUERY_STALE_TIMES` | `{` | **UNCALLED — dead code** |
| 28 | `queryClient` | `new QueryClient({` | **UNCALLED — dead code** |
| 60 | `prefetchBookingData` | `(client: QueryClient, bookingId: string)` | **UNCALLED — dead code** |
| 70 | `prefetchCategoryData` | `(client: QueryClient)` | **UNCALLED — dead code** |
| 80 | `invalidateBookingQueries` | `(client: QueryClient, bookingId?: string)` | **UNCALLED — dead code** |
| 97 | `invalidateFleetQueries` | `(client: QueryClient)` | **UNCALLED — dead code** |

### `src/lib/rental-rules.ts`

**File header:** Rental Rules & Business Logic - Central configuration for rental policies Single source of truth for all business rules

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 7 | `MIN_RENTAL_DAYS` | `1;` | **UNCALLED — dead code** |
| 8 | `MAX_RENTAL_DAYS` | `30; // Maximum rental duration` | **UNCALLED — dead code** |
| 11 | `FREE_CANCELLATION_HOURS` | `48; // Hours before pickup for free cancellation (kept for reference)` | **UNCALLED — dead code** |
| 12 | `CANCELLATION_PENALTY_DAYS` | `1; // Days of rental charged as penalty after pickup time` | **UNCALLED — dead code** |
| 18 | `calculateCancellationFee` | `(` | `src/components/booking/CancelBookingDialog.tsx` |
| 48 | `DELIVERY_FEE` | `50;` | **UNCALLED — dead code** |
| 50 | `DELIVERY_TIERS` | `[` | **UNCALLED — dead code** |
| 54 | `MAX_DELIVERY_DISTANCE_KM` | `50;` | **UNCALLED — dead code** |
| 59 | `calculateDeliveryFee` | `(distanceKm: number):` | `src/components/rental/RentalSearchCard.tsx`, `src/constants/rentalLocations.ts` |
| 82 | `getDeliveryPricingSummary` | `(): string` | `src/components/rental/DeliveryPricingDisplay.tsx` |
| 99 | `generateTimeSlots` | `(` | **UNCALLED — dead code** |
| 124 | `BUSINESS_HOURS_START` | `9;` | **UNCALLED — dead code** |
| 125 | `BUSINESS_HOURS_END` | `20;` | **UNCALLED — dead code** |
| 128 | `PICKUP_TIME_SLOTS` | `generateTimeSlots(BUSINESS_HOURS_START, BUSINESS_HOURS_END, 30);` | **UNCALLED — dead code** |
| 130 | `DEFAULT_PICKUP_TIME` | `"10:00";` | **UNCALLED — dead code** |
| 135 | `isWithinBusinessHours` | `(d: Date): boolean` | `src/components/admin/ops/BookingModificationPanel.tsx` |
| 146 | `computeBillableDays` | `(startAt: Date \| string, endAt: Date \| string): number` | **UNCALLED — dead code** |
| 160 | `formatTimeDisplay` | `(time24: string): string` | `src/components/rental/BookingSummaryPanel.tsx`, `src/pages/NewCheckout.tsx` |
| 171 | `PICKUP_TIME_WINDOWS` | `PICKUP_TIME_SLOTS.map(slot => ({` | **UNCALLED — dead code** |
| 178 | `FUEL_TYPES` | `["Gas", "Diesel", "Electric", "Hybrid"] as const;` | **UNCALLED — dead code** |
| 182 | `VEHICLE_STATUSES` | `{` | **UNCALLED — dead code** |
| 194 | `canDeleteVehicle` | `(status: VehicleStatus \| string \| null): boolean` | **UNCALLED — dead code** |
| 203 | `getVehicleStatusInfo` | `(status: string \| null)` | **UNCALLED — dead code** |
| 212 | `validateRentalDuration` | `(days: number):` | **UNCALLED — dead code** |

### `src/lib/return-steps.ts`

**File header:** Validates whether a booking status transition can bypass the return workflow. Only blocks active → completed if return workflow is incomplete.

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 35 | `RETURN_STEPS` | `[` | **UNCALLED — dead code** |
| 84 | `VALID_STATE_TRANSITIONS` | `{` | **UNCALLED — dead code** |
| 105 | `getStateIndex` | `(state: ReturnState): number` | **UNCALLED — dead code** |
| 109 | `isStateAtLeast` | `(currentState: ReturnState, requiredState: ReturnState): boolean` | `src/components/admin/return-ops/steps/StepReturnCloseout.tsx`, `src/hooks/use-return-state.ts`, `src/pages/admin/ReturnOps.tsx`, `supabase/functions/update-booking-status/index.ts` |
| 113 | `canTransitionTo` | `(currentState: ReturnState, targetState: ReturnState): boolean` | `src/features/delivery/api/mutations.ts`, `src/features/delivery/constants/delivery-status.ts`, `src/hooks/use-incidents.ts`, `src/hooks/use-return-state.ts` |
| 118 | `canAccessStep` | `(stepId: ReturnStepId, currentState: ReturnState): boolean` | `src/components/admin/return-ops/ReturnStepSidebar.tsx`, `src/pages/admin/ReturnOps.tsx` |
| 127 | `isStepComplete` | `(stepId: ReturnStepId, currentState: ReturnState): boolean` | `src/components/admin/return-ops/ReturnStepSidebar.tsx`, `src/pages/admin/ReturnOps.tsx` |
| 135 | `getCurrentStepFromState` | `(returnState: ReturnState): ReturnStepId` | `src/pages/admin/ReturnOps.tsx` |
| 146 | `getNextState` | `(stepId: ReturnStepId): ReturnState \| null` | `src/hooks/use-return-state.ts` |
| 174 | `checkReturnStepComplete` | `(stepId: ReturnStepId, completion: ReturnCompletion, returnState?: ReturnState): boolean` | **UNCALLED — dead code** |
| 197 | `getReturnMissingItems` | `(stepId: ReturnStepId, completion: ReturnCompletion): string[]` | `src/components/admin/return-ops/ReturnStepSidebar.tsx` |
| 223 | `getCurrentReturnStepIndex` | `(completion: ReturnCompletion): number` | **UNCALLED — dead code** |
| 238 | `validateReturnWorkflow` | `(` | **UNCALLED — dead code** |
| 263 | `isValidBypassReason` | `(reason: string \| undefined): boolean` | **UNCALLED — dead code** |

### `src/lib/schemas/booking.ts`

**File header:** Booking Validation Schemas Central validation for booking creation, updates, and related operations.

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 9 | `driverAgeBandSchema` | `z.enum(["20_24", "25_70"]);` | **UNCALLED — dead code** |
| 13 | `ageRangeSchema` | `z.enum(["20-24", "25-70"]);` | **UNCALLED — dead code** |
| 17 | `bookingStatusSchema` | `z.enum([` | **UNCALLED — dead code** |
| 28 | `addOnInputSchema` | `z.object({` | **UNCALLED — dead code** |
| 36 | `additionalDriverInputSchema` | `z.object({` | **UNCALLED — dead code** |
| 78 | `baseBookingInputSchema` | `z.object(baseBookingFields).refine(` | **UNCALLED — dead code** |
| 86 | `guestBookingInputSchema` | `z.object({` | **UNCALLED — dead code** |
| 100 | `authenticatedBookingInputSchema` | `z.object({` | **UNCALLED — dead code** |
| 112 | `bookingUpdateSchema` | `z.object({` | **UNCALLED — dead code** |
| 122 | `bookingSearchParamsSchema` | `z.object({` | **UNCALLED — dead code** |
| 137 | `validateBookingDates` | `(startAt: string, endAt: string):` | **UNCALLED — dead code** |
| 165 | `isValidAgeBand` | `(ageBand: unknown): ageBand is DriverAgeBandSchema` | `supabase/functions/_shared/booking-core.ts`, `supabase/functions/create-guest-booking/index.ts` |

### `src/lib/schemas/customer.ts`

**File header:** Customer Validation Schemas Validation for customer/profile data.

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 12 | `emailSchema` | `z` | **UNCALLED — dead code** |
| 19 | `phoneSchema` | `z` | **UNCALLED — dead code** |
| 27 | `nameSchema` | `z` | **UNCALLED — dead code** |
| 34 | `customerProfileSchema` | `z.object({` | **UNCALLED — dead code** |
| 44 | `guestContactSchema` | `z.object({` | **UNCALLED — dead code** |
| 55 | `driverLicenseSchema` | `z.object({` | **UNCALLED — dead code** |
| 67 | `sanitizeEmail` | `(email: string): string` | `supabase/functions/_shared/cors.ts`, `supabase/functions/create-guest-booking/index.ts`, `supabase/functions/create-walk-in-booking/index.ts`, `supabase/functions/send-contact-email/index.ts` |
| 74 | `sanitizePhone` | `(phone: string): string` | `supabase/functions/_shared/booking-core.ts`, `supabase/functions/_shared/cors.ts`, `supabase/functions/create-booking/index.ts`, `supabase/functions/create-guest-booking/index.ts`, `supabase/functions/create-walk-in-booking/index.ts` |
| 81 | `isValidEmail` | `(email: string): boolean` | `supabase/functions/_shared/cors.ts`, `supabase/functions/create-guest-booking/index.ts`, `supabase/functions/create-walk-in-booking/index.ts`, `supabase/functions/send-contact-email/index.ts` |
| 88 | `isValidPhone` | `(phone: string): boolean` | `supabase/functions/_shared/cors.ts`, `supabase/functions/create-booking/index.ts`, `supabase/functions/create-guest-booking/index.ts`, `supabase/functions/create-walk-in-booking/index.ts`, `supabase/functions/send-contact-email/index.ts` |

### `src/lib/schemas/payment.ts`

**File header:** Payment Validation Schemas

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 7 | `paymentTypeSchema` | `z.enum([` | **UNCALLED — dead code** |
| 18 | `paymentStatusSchema` | `z.enum([` | **UNCALLED — dead code** |
| 28 | `paymentMethodSchema` | `z.enum([` | **UNCALLED — dead code** |
| 36 | `depositActionSchema` | `z.enum([` | **UNCALLED — dead code** |
| 46 | `createPaymentInputSchema` | `z.object({` | **UNCALLED — dead code** |
| 58 | `depositLedgerEntrySchema` | `z.object({` | **UNCALLED — dead code** |
| 70 | `depositReleaseRequestSchema` | `z.object({` | **UNCALLED — dead code** |
| 83 | `refundRequestSchema` | `z.object({` | **UNCALLED — dead code** |
| 95 | `isValidCurrency` | `(currency: string): boolean` | **UNCALLED — dead code** |
| 103 | `formatCurrency` | `(amount: number, currency = "CAD"): string` | `src/components/admin/analytics/RevenueAnalyticsTab.tsx`, `src/components/admin/fleet/ByCategoryTab.tsx`, `src/components/admin/fleet/ByVehicleTab.tsx`, `src/components/admin/fleet/CompetitorPricingTab.tsx`, `src/components/admin/fleet/CostTrackingTab.tsx`, `src/components/admin/fleet/FleetCharts.tsx`, `src/components/admin/fleet/FleetOverviewTab.tsx`, `src/components/admin/fleet/LifecycleSummarySection.tsx`, `src/components/admin/fleet/PerformanceComparisonTab.tsx`, `src/components/admin/fleet/UtilizationTab.tsx` … +4 |

### `src/lib/schemas/vehicle.ts`

**File header:** Vehicle & Category Validation Schemas

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 7 | `vehicleUnitStatusSchema` | `z.enum([` | **UNCALLED — dead code** |
| 16 | `fuelTypeSchema` | `z.enum([` | **UNCALLED — dead code** |
| 26 | `transmissionSchema` | `z.enum(["Automatic", "Manual"]);` | **UNCALLED — dead code** |
| 30 | `vehicleCategorySchema` | `z.object({` | **UNCALLED — dead code** |
| 40 | `createCategoryInputSchema` | `vehicleCategorySchema.omit({ id: true });` | **UNCALLED — dead code** |
| 44 | `vehicleUnitSchema` | `z.object({` | **UNCALLED — dead code** |
| 59 | `addVinInputSchema` | `z.object({` | **UNCALLED — dead code** |
| 73 | `vehicleSearchParamsSchema` | `z.object({` | **UNCALLED — dead code** |
| 88 | `isValidVin` | `(vin: string): boolean` | `src/components/admin/ChangeVehicleDialog.tsx` |
| 98 | `normalizeVin` | `(vin: string): string` | **UNCALLED — dead code** |

### `src/lib/seed-categories.ts`

**File header:** Fleet Category Seed Data Contains category definitions and sample VIN/vehicle data

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 35 | `FLEET_CATEGORIES` | `[` | **UNCALLED — dead code** |
| 228 | `CATEGORY_NAMES` | `FLEET_CATEGORIES.map((c) => c.name);` | **UNCALLED — dead code** |
| 231 | `TOTAL_FLEET_SIZE` | `FLEET_CATEGORIES.reduce(` | **UNCALLED — dead code** |

### `src/lib/utils.ts`

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 4 | `cn` | `(...inputs: ClassValue[])` | `src/components/NavLink.tsx`, `src/components/admin/ActiveRentalsMonitor.tsx`, `src/components/admin/ConversionFunnel.tsx`, `src/components/admin/CreateIncidentDialog.tsx`, `src/components/admin/IncidentDetailDialog.tsx`, `src/components/admin/IntakeChecklist.tsx`, `src/components/admin/OperationsFilters.tsx`, `src/components/admin/PreInspectionPhotos.tsx`, `src/components/admin/UnifiedVehicleManager.tsx`, `src/components/admin/VehiclePrepChecklist.tsx` … +148 |
| 9 | `displayFuelType` | `(fuel: string \| null \| undefined): string => {` | `src/components/landing/VehicleCard.tsx`, `src/components/landing/VehicleDetailsModal.tsx`, `src/pages/Compare.tsx` |
| 14 | `displayTransmission` | `(_trans: string \| null \| undefined): string => "Automatic";` | `src/components/landing/VehicleCard.tsx`, `src/components/landing/VehicleDetailsModal.tsx`, `src/pages/Compare.tsx` |

### `src/lib/vehicle-adjustments.ts`

**File header:** Vehicle-line adjustment itemization. The vehicle portion of a booking subtotal is base rate × days, plus a weekend surcharge, minus a duration (weekly/monthly) discount. Historically these two adjustments were never stored, so display surfaces derived a single net remainder — which silently hid the weekend surcharge whenever a duration discount was larger (e.g. booking W9JD9JDV: +$53.99 surcharge 

| Line | Export | Signature / value | Callers |
| --- | --- | --- | --- |
| 30 | `buildVehicleAdjustmentLines` | `(input:` | `src/components/admin/ops/FinancialBreakdown.tsx`, `src/lib/agreement-adjustments.ts`, `src/lib/pdf/invoice-data-builder.ts`, `src/lib/pricing.test.ts`, `supabase/functions/_shared/vehicle-adjustments.ts`, `supabase/functions/generate-agreement/index.ts` |

---

## 5. Type definitions and drift

`src/integrations/supabase/types.ts` is the generated schema type file and is
the reference. Hand-written interfaces below are compared field-by-field
against the set of real column names in the `public` schema; a field name
that exists in no table is flagged as possible drift (it may legitimately be
a computed/derived field, which is noted).

- `src/domain/bookings/types.ts` → `interface BookingLocation` — 5 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/domain/bookings/types.ts` → `interface BookingVehicle` — 7 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/domain/bookings/types.ts` → `interface BookingProfile` — 6 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/domain/bookings/types.ts` → `interface BookingUnit` — 4 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/domain/bookings/types.ts` → `interface BookingDeliveryStatus` — 6 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/domain/bookings/types.ts` → `interface BookingSummary` — 29 fields. fields with no matching column: `vehicle`, `returnLocation`, `profile` — either derived values or drift.
- `src/domain/bookings/types.ts` → `interface BookingPayment` — 7 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/domain/bookings/types.ts` → `interface BookingAddOn` — 7 fields. fields with no matching column: `addOn` — either derived values or drift.
- `src/domain/bookings/types.ts` → `interface AuditLogEntry` — 8 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/domain/bookings/types.ts` → `interface BookingFilters` — 6 fields. fields with no matching column: `dateRange`, `search`, `tab` — either derived values or drift.
- `src/domain/bookings/types.ts` → `interface UpdateBookingStatusInput` — 7 fields. fields with no matching column: `panelSource`, `incompleteAtActivation` — either derived values or drift.
- `src/domain/bookings/types.ts` → `interface VoidBookingInput` — 4 fields. fields with no matching column: `refundAmount`, `panelSource` — either derived values or drift.
- `src/domain/bookings/types.ts` → `interface AssignVehicleInput` — 3 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/domain/fleet/types.ts` → `interface FleetCategory` — 14 fields. fields with no matching column: `availableCount`, `totalCount` — either derived values or drift.
- `src/domain/fleet/types.ts` → `interface VehicleUnit` — 18 fields. fields with no matching column: `locationName`, `categoryName` — either derived values or drift.
- `src/domain/fleet/types.ts` → `interface CreateCategoryInput` — 7 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/domain/fleet/types.ts` → `interface CreateUnitInput` — 10 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/domain/fleet/types.ts` → `interface UpdateUnitInput` — 5 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/domain/fleet/types.ts` → `interface MoveUnitInput` — 4 fields. fields with no matching column: `unitId`, `targetLocationId`, `panelSource` — either derived values or drift.
- `src/hooks/use-abandoned-carts.ts` → `interface AbandonedCart` — 32 fields. fields with no matching column: `vehicle` — either derived values or drift.
- `src/hooks/use-active-rental-detail.ts` → `interface ActiveRentalDetail` — 75 fields. fields with no matching column: `isOverdue`, `overdueHours`, `vehicle`, `returnLocation`, `customer`, `hasPaymentCompleted`, `hasDepositHeld`, `hasVerificationApproved`, `hasAgreementSigned`, `hasWalkaroundComplete`, `openAlertsCount`, `openTicketsCount`, `recentAlerts`, `recentTickets` — either derived values or drift.
- `src/hooks/use-active-rentals.ts` → `interface ActiveRental` — 31 fields. fields with no matching column: `durationHours`, `remainingHours`, `remainingMinutes`, `isOverdue`, `overdueHours`, `isApproachingReturn`, `isWarningZone`, `needsActivation`, `vehicle`, `customer` — either derived values or drift.
- `src/hooks/use-add-ons.ts` → `interface AddOn` — 6 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-add-ons.ts` → `interface FuelPricingInfo` — 4 fields. fields with no matching column: `ourPrice`, `marketPrice`, `savings`, `tankLiters` — either derived values or drift.
- `src/hooks/use-alerts.ts` → `interface AdminAlert` — 16 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-analytics-events.ts` → `interface AnalyticsEventRow` — 7 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-audit-logs.ts` → `interface AuditLog` — 11 fields. fields with no matching column: `userName`, `userEmail` — either derived values or drift.
- `src/hooks/use-auth.ts` → `interface AuthState` — 3 fields. fields with no matching column: `user`, `session`, `isLoading` — either derived values or drift.
- `src/hooks/use-available-drivers.ts` → `interface AvailableDriver` — 4 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-booking-documents.ts` → `interface BookingDocument` — 12 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-booking-edit.ts` → `interface BookingEditPayload` — 8 fields. fields with no matching column: `currentDailyRate`, `timeOnly` — either derived values or drift.
- `src/hooks/use-booking-edit.ts` → `interface BookingEditPreview` — 8 fields. fields with no matching column: `originalDays`, `newDays`, `originalTotal`, `newSubtotal`, `newTaxAmount`, `newTotal` — either derived values or drift.
- `src/hooks/use-booking-modification.ts` → `interface BookingModification` — 5 fields. fields with no matching column: `newStartAt`, `timeOnly` — either derived values or drift.
- `src/hooks/use-booking-modification.ts` → `interface ModificationLineBreakdown` — 9 fields. fields with no matching column: `vehicle`, `addOns`, `additionalDrivers`, `regulatoryFees`, `youngRenterFee`, `tax`, `total` — either derived values or drift.
- `src/hooks/use-booking-modification.ts` → `interface ModificationPreview` — 12 fields. fields with no matching column: `originalDays`, `newDays`, `addedDays`, `originalTotal`, `newTotal`, `newSubtotal`, `newTaxAmount`, `pricingDrift`, `before`, `after` — either derived values or drift.
- `src/hooks/use-booking-modification.ts` → `interface ModificationExtras` — 6 fields. fields with no matching column: `protectionDailyRate`, `addOnsPerDay`, `addOnsOneTime`, `additionalDriversPerDay` — either derived values or drift.
- `src/hooks/use-bookings.ts` → `interface BookingWithDetails` — 43 fields. fields with no matching column: `hasPaidPayment`, `hasAuthorizedRental`, `vehicle`, `profile` — either derived values or drift.
- `src/hooks/use-bookings.ts` → `interface BookingFilters` — 6 fields. fields with no matching column: `statuses`, `dateRange`, `search` — either derived values or drift.
- `src/hooks/use-browse-categories.ts` → `interface BrowseCategory` — 10 fields. fields with no matching column: `availableCount`, `totalCount` — either derived values or drift.
- `src/hooks/use-calendar.ts` → `interface CalendarVehicle` — 9 fields. fields with no matching column: `locationName` — either derived values or drift.
- `src/hooks/use-calendar.ts` → `interface CalendarBooking` — 8 fields. fields with no matching column: `customerName`, `customerEmail` — either derived values or drift.
- `src/hooks/use-calendar.ts` → `interface CalendarData` — 5 fields. fields with no matching column: `vehicles`, `bookings`, `weekStart`, `weekEnd`, `days` — either derived values or drift.
- `src/hooks/use-checkin.ts` → `interface CheckInRecord` — 21 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-checkin.ts` → `interface CheckInValidation` — 5 fields. fields with no matching column: `field`, `passed`, `required` — either derived values or drift.
- `src/hooks/use-collected-revenue.ts` → `interface CollectedRevenueResult` — 6 fields. fields with no matching column: `collected`, `pending`, `failed`, `completedCount`, `typeBreakdown`, `isLoading` — either derived values or drift.
- `src/hooks/use-competitor-pricing.ts` → `interface CompetitorPricing` — 9 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-condition-photos.ts` → `interface ConditionPhoto` — 8 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-damages.ts` → `interface DamageReport` — 24 fields. fields with no matching column: `booking`, `vehicle`, `reporter` — either derived values or drift.
- `src/hooks/use-damages.ts` → `interface DamageFilters` — 4 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-delivery-task.ts` → `interface DeliveryTask` — 30 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-demand-forecasting.ts` → `interface DemandHeatmapCell` — 2 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-demand-forecasting.ts` → `interface LocationDemand` — 4 fields. fields with no matching column: `locationName`, `totalBookings`, `avgDailyRate` — either derived values or drift.
- `src/hooks/use-demand-forecasting.ts` → `interface CategoryDemand` — 4 fields. fields with no matching column: `categoryName`, `totalBookings`, `avgDuration` — either derived values or drift.
- `src/hooks/use-demand-forecasting.ts` → `interface SeasonalTrend` — 3 fields. fields with no matching column: `month`, `bookings`, `revenue` — either derived values or drift.
- `src/hooks/use-deposit-ledger.ts` → `interface DepositLedgerEntry` — 9 fields. fields with no matching column: `creatorName` — either derived values or drift.
- `src/hooks/use-deposit-ledger.ts` → `interface DepositSummary` — 7 fields. fields with no matching column: `required`, `held`, `released`, `deducted`, `remaining`, `entries` — either derived values or drift.
- `src/hooks/use-driver-fee-settings.ts` → `interface DriverFeeSettings` — 2 fields. fields with no matching column: `additionalDriverDailyRate`, `youngAdditionalDriverDailyRate` — either derived values or drift.
- `src/hooks/use-duplicate-bookings.ts` → `interface DuplicateBookingSuspect` — 8 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-fleet-analytics-enhanced.ts` → `interface EnhancedVehicleAnalytics` — 26 fields. fields with no matching column: `locationName`, `totalExpenses`, `totalRevenue`, `profit`, `profitMargin`, `annualDepreciation`, `currentValue` — either derived values or drift.
- `src/hooks/use-fleet-analytics.ts` → `interface VehicleAnalytics` — 23 fields. fields with no matching column: `locationName`, `totalExpenses`, `totalRevenue`, `profit`, `profitMargin`, `annualDepreciation`, `currentValue`, `downtimeDays` — either derived values or drift.
- `src/hooks/use-fleet-analytics.ts` → `interface FleetSummary` — 9 fields. fields with no matching column: `totalVehicles`, `totalUnits`, `activeRentals`, `totalRevenue`, `totalCosts`, `totalProfit`, `avgUtilization`, `topPerformers`, `underperformers` — either derived values or drift.
- `src/hooks/use-fleet-categories.ts` → `interface FleetCategory` — 14 fields. fields with no matching column: `available_count`, `total_count` — either derived values or drift.
- `src/hooks/use-fleet-categories.ts` → `interface VinUnit` — 14 fields. fields with no matching column: `location_name` — either derived values or drift.
- `src/hooks/use-fleet-categories.ts` → `interface CreateCategoryInput` — 7 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-fleet-categories.ts` → `interface CreateVinInput` — 10 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-fleet-cost-analysis.ts` → `interface VehicleUnitMetrics` — 27 fields. fields with no matching column: `categoryName`, `vehicleMake`, `vehicleModel`, `vehicleYear`, `locationName`, `totalExpenses`, `avgRentalDuration`, `profitMargin`, `costPerMile`, `revenuePerMile`, `isUnderperforming`, `recommendation` — either derived values or drift.
- `src/hooks/use-fleet-cost-analysis.ts` → `interface CategoryMetrics` — 14 fields. fields with no matching column: `categoryName`, `vehicleCount`, `totalAcquisitionCost`, `totalExpenses`, `totalRentalCount`, `totalNetProfit`, `avgProfitPerVehicle`, `avgMargin` — either derived values or drift.
- `src/hooks/use-fleet-cost-analysis.ts` → `interface FleetCostFilters` — 5 fields. fields with no matching column: `dateFrom`, `dateTo` — either derived values or drift.
- `src/hooks/use-fleet-cost-enhanced.ts` → `interface EnhancedVehicleUnitMetrics` — 42 fields. fields with no matching column: `categoryName`, `vehicleMake`, `vehicleModel`, `vehicleYear`, `locationName`, `annualDepreciation`, `currentValue`, `daysUntilDisposal`, `lifecycleProgress`, `totalExpenses`, `avgRentalDuration`, `profitMargin`, `costPerMile`, `revenuePerMile`, `isUnderperforming`, `recommendation` — either derived values or drift.
- `src/hooks/use-fleet-cost-enhanced.ts` → `interface FleetCostFilters` — 5 fields. fields with no matching column: `dateFrom`, `dateTo` — either derived values or drift.
- `src/hooks/use-handovers.ts` → `interface HandoverBooking` — 33 fields. fields with no matching column: `vehicle`, `profile`, `paymentStatus`, `verificationStatus`, `vehicleReady`, `bufferCleared` — either derived values or drift.
- `src/hooks/use-hold.ts` → `interface CreateHoldParams` — 3 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-hold.ts` → `interface Hold` — 7 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-incidents.ts` → `interface IncidentCase` — 38 fields. fields with no matching column: `vehicles`, `bookings`, `profiles` — either derived values or drift.
- `src/hooks/use-incidents.ts` → `interface CreateIncidentParams` — 16 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-incidents.ts` → `interface UpdateIncidentParams` — 14 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-intake-status.ts` → `interface IntakeItem` — 5 fields. fields with no matching column: `required` — either derived values or drift.
- `src/hooks/use-intake-status.ts` → `interface IntakeStatus` — 5 fields. fields with no matching column: `items`, `isComplete`, `completedCount`, `totalRequired`, `missingRequired` — either derived values or drift.
- `src/hooks/use-inventory.ts` → `interface AdminVehicle` — 18 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-inventory.ts` → `interface CreateVehicleData` — 13 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-locations.ts` → `interface Location` — 12 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-maintenance-logs.ts` → `interface MaintenanceLog` — 21 fields. fields with no matching column: `vehicle_unit`, `vehicle` — either derived values or drift.
- `src/hooks/use-maintenance-logs.ts` → `interface CreateMaintenanceParams` — 10 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-manage-addons.ts` → `interface AddOnRecord` — 7 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-manage-addons.ts` → `interface UpdateAddOnInput` — 6 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-manage-addons.ts` → `interface CreateAddOnInput` — 5 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-my-deliveries.ts` → `interface DeliveryBooking` — 33 fields. fields with no matching column: `deliveryStatus`, `assignedDriverName`, `customer`, `assignedUnit`, `dispatchLocation` — either derived values or drift.
- `src/hooks/use-offers.ts` → `interface PointsOffer` — 16 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-offers.ts` → `interface OfferRedemption` — 7 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-payment-deposit.ts` → `interface PaymentRecord` — 8 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-payment-deposit.ts` → `interface PaymentSummary` — 28 fields. fields with no matching column: `totalDue`, `totalPaid`, `totalAuthorized`, `rentalAuthorized`, `depositRequired`, `balance`, `paymentStatus`, `depositLifecycleState`, `depositStatusLabel`, `hasAnyDeposit`, `hasActiveHold`, `canCaptureDeposit`, `canReleaseDeposit`, `depositActionComplete`, `allComplete`, `payments`, `depositDbStatus`, `bookingStatus` — either derived values or drift.
- `src/hooks/use-pending-ticket-notice.ts` → `interface PendingTicketSummary` — 3 fields. fields with no matching column: `count`, `urgentCount`, `latest` — either derived values or drift.
- `src/hooks/use-points.ts` → `interface PointsSettings` — 5 fields. fields with no matching column: `earnRate`, `earnBase`, `redeemRate`, `redeemRules`, `expiration` — either derived values or drift.
- `src/hooks/use-points.ts` → `interface PointsLedgerEntry` — 11 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-points.ts` → `interface MembershipInfo` — 5 fields. fields with no matching column: `tier`, `joinedAt` — either derived values or drift.
- `src/hooks/use-pre-activation-check.ts` → `interface PreActivationStatus` — 3 fields. fields with no matching column: `missingRental`, `missingDeposit`, `ok` — either derived values or drift.
- `src/hooks/use-protection-settings.ts` → `interface GroupSettings` — 10 fields. fields with no matching column: `basic_rate`, `basic_deductible`, `smart_rate`, `smart_original_rate`, `smart_discount`, `smart_deductible`, `premium_rate`, `premium_original_rate`, `premium_discount`, `premium_deductible` — either derived values or drift.
- `src/hooks/use-rental-agreement.ts` → `interface AgreementTermsJson` — 68 fields. fields with no matching column: `vehicle`, `condition`, `odometerOut`, `fuelLevelOut`, `rental`, `weekendDays`, `locations`, `pickup`, `dropoff`, `customer`, `planId`, `planName`, `total`, `deductible`, `financial`, `vehicleSubtotal`, `adjustmentLines`, `weekendDays`, `protectionTotal`, `addOnsTotal`, `pvrtTotal`, `acsrchTotal`, `subtotalBeforeTax`, `pstAmount`, `gstAmount`, `totalTax`, `addOns`, `policies`, `minAge`, `lateFeePercentOfDaily`, `gracePeriodMinutes`, `thirdPartyLiabilityIncluded`, `optionalCoverageAvailable`, `fuelReturnPolicy`, `smokingAllowed`, `petsAllowed`, `internationalTravel`, `taxes`, `pstRate`, `gstRate`, `pvrtDailyFee`, `acsrchDailyFee` — either derived values or drift.
- `src/hooks/use-rental-agreement.ts` → `interface RentalAgreement` — 15 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-returns.ts` → `interface ReturnBooking` — 37 fields. fields with no matching column: `vehicle`, `profile`, `hasReturnPhotos`, `hasFuelOdometerPhotos`, `hasDamageReport`, `damageCount`, `canSettle` — either derived values or drift.
- `src/hooks/use-revenue-analytics.ts` → `interface RevenueFilters` — 7 fields. fields with no matching column: `startDate`, `endDate`, `bookingType` — either derived values or drift.
- `src/hooks/use-revenue-analytics.ts` → `interface RentalPriceMetrics` — 5 fields. fields with no matching column: `averageRentalPrice`, `totalBookings`, `totalRentalBaseRevenue`, `medianRentalPrice`, `averageDays` — either derived values or drift.
- `src/hooks/use-revenue-analytics.ts` → `interface AddOnMetrics` — 4 fields. fields with no matching column: `averageAddOnSpend`, `attachRate`, `bookingsWithAddOns`, `totalAddOnRevenue` — either derived values or drift.
- `src/hooks/use-revenue-analytics.ts` → `interface AddOnBreakdown` — 7 fields. fields with no matching column: `bookingsAdded`, `attachRate`, `totalRevenue`, `avgPrice`, `last30DaysTrend` — either derived values or drift.
- `src/hooks/use-revenue-analytics.ts` → `interface ChannelComparison` — 6 fields. fields with no matching column: `avgRentalPrice`, `avgAddOnSpend`, `attachRate`, `totalRevenue`, `bookingCount` — either derived values or drift.
- `src/hooks/use-revenue-analytics.ts` → `interface TrendDataPoint` — 3 fields. fields with no matching column: `date`, `revenue`, `bookings` — either derived values or drift.
- `src/hooks/use-sidebar-counts.ts` → `interface SidebarCounts` — 8 fields. fields with no matching column: `alerts`, `operations`, `incidents`, `support`, `billing`, `pickups`, `active`, `returns` — either derived values or drift.
- `src/hooks/use-staff-location.ts` → `interface StaffAssignment` — 6 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-staff-location.ts` → `interface StaffLocationScope` — 5 fields. fields with no matching column: `isLoading`, `isSuperAdmin`, `assignedLocationId`, `isUnassignedManager`, `canSwitchLocation` — either derived values or drift.
- `src/hooks/use-support-v2.ts` → `interface SupportTicketV2` — 34 fields. fields with no matching column: `customer`, `booking`, `assignee`, `incident`, `damage`, `last_message`, `message_count` — either derived values or drift.
- `src/hooks/use-support-v2.ts` → `interface TicketMessageV2` — 9 fields. fields with no matching column: `sender` — either derived values or drift.
- `src/hooks/use-support-v2.ts` → `interface TicketAuditLog` — 9 fields. fields with no matching column: `performer` — either derived values or drift.
- `src/hooks/use-support-v2.ts` → `interface SupportMacro` — 8 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-support-v2.ts` → `interface TicketFiltersV2` — 8 fields. fields with no matching column: `urgent`, `search`, `dateFrom`, `dateTo` — either derived values or drift.
- `src/hooks/use-tickets.ts` → `interface Ticket` — 18 fields. fields with no matching column: `user`, `booking`, `lastMessage` — either derived values or drift.
- `src/hooks/use-tickets.ts` → `interface TicketMessage` — 9 fields. fields with no matching column: `sender` — either derived values or drift.
- `src/hooks/use-tickets.ts` → `interface TicketFilters` — 3 fields. fields with no matching column: `hasBooking`, `search` — either derived values or drift.
- `src/hooks/use-unit-assignment.ts` → `interface AvailableUnit` — 11 fields. fields with no matching column: `vehicle` — either derived values or drift.
- `src/hooks/use-unit-assignment.ts` → `interface LowInventoryAlert` — 7 fields. fields with no matching column: `totalUnits`, `availableUnits`, `bookedUnits` — either derived values or drift.
- `src/hooks/use-unit-rental-history.ts` → `interface UnitBookingRecord` — 11 fields. fields with no matching column: `customer_name`, `customer_email` — either derived values or drift.
- `src/hooks/use-vehicle-assignment.ts` → `interface VehicleConflict` — 5 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-vehicle-assignment.ts` → `interface VehicleAssignmentCheck` — 3 fields. fields with no matching column: `conflicts` — either derived values or drift.
- `src/hooks/use-vehicle-categories.ts` → `interface VehicleCategory` — 15 fields. fields with no matching column: `vehicle_count`, `vehicles`, `vehicle` — either derived values or drift.
- `src/hooks/use-vehicle-expenses.ts` → `interface VehicleExpense` — 12 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-vehicle-expenses.ts` → `interface ExpenseFilters` — 4 fields. fields with no matching column: `startDate`, `endDate` — either derived values or drift.
- `src/hooks/use-vehicle-prep.ts` → `interface VehiclePrepItem` — 6 fields. fields with no matching column: `checked`, `checkedAt`, `checkedBy` — either derived values or drift.
- `src/hooks/use-vehicle-prep.ts` → `interface VehiclePrepStatus` — 5 fields. fields with no matching column: `items`, `allComplete`, `completedCount`, `totalCount` — either derived values or drift.
- `src/hooks/use-vehicle-swap-history.ts` → `interface VehicleSwapHistoryRow` — 17 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-vehicle-units.ts` → `interface VehicleUnit` — 29 fields. fields with no matching column: `location_name`, `vehicle`, `total_expenses` — either derived values or drift.
- `src/hooks/use-vehicle-units.ts` → `interface VehicleUnitFilters` — 6 fields. fields with no matching column: `search` — either derived values or drift.
- `src/hooks/use-vehicle-units.ts` → `interface PlateConflict` — 5 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-vehicles.ts` → `interface Vehicle` — 17 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-vendors.ts` → `interface Vendor` — 14 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-vendors.ts` → `interface VendorServiceHistory` — 6 fields. fields with no matching column: `source`, `date`, `vehicle_info` — either derived values or drift.
- `src/hooks/use-verification.ts` → `interface VerificationDocument` — 4 fields. fields with no matching column: `doc_type`, `file_path`, `uploaded_at` — either derived values or drift.
- `src/hooks/use-verification.ts` → `interface VerificationRequest` — 10 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-walkaround.ts` → `interface ScratchDent` — 4 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-walkaround.ts` → `interface WalkaroundInspection` — 17 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-walkaround.ts` → `interface StartWalkaroundParams` — 3 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/hooks/use-walkaround.ts` → `interface UpdateWalkaroundParams` — 7 fields. fields with no matching column: `inspectionId` — either derived values or drift.
- `src/hooks/use-webhid-signature.ts` → `interface SignaturePoint` — 5 fields. fields with no matching column: `x`, `y`, `t`, `pressure`, `pointerType` — either derived values or drift.
- `src/hooks/use-webhid-signature.ts` → `interface SignatureStroke` — 1 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/features/delivery/api/types.ts` → `interface DeliveryStatusRow` — 10 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/features/delivery/api/types.ts` → `interface DeliveryStatusLogRow` — 10 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/features/delivery/api/types.ts` → `interface VehicleUnitRow` — 8 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/features/delivery/api/types.ts` → `interface VehicleCategoryRow` — 5 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/features/delivery/api/types.ts` → `interface LocationRow` — 6 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/features/delivery/api/types.ts` → `interface ProfileRow` — 4 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/features/delivery/api/types.ts` → `interface DeliveryBooking` — 36 fields. fields with no matching column: `deliveryStatus`, `assignedDriverName`, `assignedUnit`, `customer`, `dispatchLocation`, `portalStatus` — either derived values or drift.
- `src/features/delivery/api/types.ts` → `interface StatusHistoryEntry` — 8 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/features/delivery/api/types.ts` → `interface UpdateStatusInput` — 7 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/features/delivery/api/types.ts` → `interface ClaimDeliveryInput` — 1 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/features/delivery/api/types.ts` → `interface CaptureHandoverInput` — 4 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/features/delivery/api/types.ts` → `interface RecordOdometerInput` — 3 fields. fields with no matching column: `reading` — either derived values or drift.
- `src/features/delivery/api/types.ts` → `interface DeliveryListOptions` — 4 fields. fields with no matching column: `scope`, `statusFilter`, `searchQuery`, `limit` — either derived values or drift.
- `src/features/delivery/api/types.ts` → `interface HandoverChecklistState` — 4 fields. fields with no matching column: `agreementSigned`, `walkaroundComplete`, `photosUploaded` — either derived values or drift.
- `src/lib/agreement-adjustments.ts` → `interface AgreementAdjustmentLine` — 2 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/lib/api-error.ts` → `interface ApiError` — 4 fields. fields with no matching column: `error`, `details`, `retryable` — either derived values or drift.
- `src/lib/availability-check.ts` → `interface CategoryAvailability` — 3 fields. fields with no matching column: `available`, `availableCount`, `totalCount` — either derived values or drift.
- `src/lib/availability.ts` → `interface AvailabilityFilters` — 7 fields. fields with no matching column: `minPrice`, `maxPrice`, `isAwd` — either derived values or drift.
- `src/lib/availability.ts` → `interface AvailabilityQuery` — 4 fields. fields with no matching column: `filters` — either derived values or drift.
- `src/lib/availability.ts` → `interface AvailableVehicle` — 14 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/lib/booking-helpers.ts` → `interface BookingBaseData` — 22 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/lib/booking-helpers.ts` → `interface VehicleBaseData` — 11 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/lib/booking-helpers.ts` → `interface LocationBaseData` — 5 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/lib/booking-helpers.ts` → `interface ProfileBaseData` — 5 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/lib/booking-stages.ts` → `interface StageInfo` — 4 fields. fields with no matching column: `requiredFor` — either derived values or drift.
- `src/lib/card-validation.ts` → `interface CardInfo` — 6 fields. fields with no matching column: `type`, `lengths`, `cvvLength` — either derived values or drift.
- `src/lib/dispatch-readiness.ts` → `interface DispatchReadinessCheck` — 6 fields. fields with no matching column: `isReady`, `requirements`, `paymentHoldAuthorized`, `unitAssigned`, `prepPhotosComplete`, `missingRequirements` — either derived values or drift.
- `src/lib/dispatch-readiness.ts` → `interface BookingForDispatchCheck` — 4 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/lib/dispatch-readiness.ts` → `interface PrepPhotoCount` — 2 fields. fields with no matching column: `count` — either derived values or drift.
- `src/lib/edge-function-error.ts` → `interface EdgeFunctionErrorDetails` — 5 fields. fields with no matching column: `gatewayStatus`, `gatewayCode`, `retryable`, `requiresManualResolution` — either derived values or drift.
- `src/lib/fuel-pricing.ts` → `interface FuelShortageResult` — 7 fields. fields with no matching column: `hasShortage`, `shortagePercent`, `shortageLiters`, `chargeAmount`, `pickupLabel`, `returnLabel` — either derived values or drift.
- `src/lib/km-allowance.ts` → `interface ExcessKmBreakdown` — 6 fields. fields with no matching column: `kmDriven`, `allowance`, `excessKm`, `excessFee`, `excessFeeCents`, `unlimited` — either derived values or drift.
- `src/lib/late-return.ts` → `interface LateReturnInfo` — 6 fields. fields with no matching column: `isLate`, `inGracePeriod`, `minutesLate`, `hoursLate`, `fee` — either derived values or drift.
- `src/lib/ops-steps.ts` → `interface OpsStep` — 7 fields. fields with no matching column: `number`, `deliveryTitle`, `deliveryDescription` — either derived values or drift.
- `src/lib/ops-steps.ts` → `interface StepCompletion` — 42 fields. fields with no matching column: `checkin`, `govIdVerified`, `licenseOnFile`, `nameMatches`, `licenseNotExpired`, `driverEnRoute`, `driverArrived`, `payment`, `paymentComplete`, `depositCollected`, `documents`, `documentsUploaded`, `prep`, `unitAssigned`, `vehiclePrepared`, `agreement`, `agreementSigned`, `walkaround`, `fuelRecorded`, `photos`, `photosComplete`, `dispatch`, `driverAssigned`, `dispatched`, `handover`, `activated`, `smsSent`, `unitAssigned`, `intake`, `reviewed`, `readyLine`, `unitAssigned`, `checklistComplete`, `photosComplete`, `fuelRecorded`, `pricingLocked`, `opsActivate`, `activated` — either derived values or drift.
- `src/lib/ops-steps.ts` → `interface BlockingIssue` — 4 fields. fields with no matching column: `type`, `stepId`, `canOverride` — either derived values or drift.
- `src/lib/pickup-progress.ts` → `interface PickupProgress` — 5 fields. fields with no matching column: `stage`, `hasAgreement`, `hasCheckin`, `hasWalkaround`, `hasPayment` — either derived values or drift.
- `src/lib/pricing.ts` → `interface PricingInput` — 10 fields. fields with no matching column: `vehicleDailyRate`, `rentalDays`, `protectionDailyRate`, `addOnsTotal`, `lateFeeAmount` — either derived values or drift.
- `src/lib/pricing.ts` → `interface PricingBreakdown` — 21 fields. fields with no matching column: `vehicleTotal`, `vehicleBaseTotal`, `discountType`, `protectionTotal`, `addOnsTotal`, `dailyFeesTotal`, `pvrtTotal`, `acsrchTotal`, `lateFee`, `pstAmount`, `gstAmount`, `total` — either derived values or drift.
- `src/lib/pricing.ts` → `interface ProtectionPackage` — 12 fields. fields with no matching column: `originalRate`, `deductible`, `discount`, `features`, `included`, `tooltip`, `isRecommended` — either derived values or drift.
- `src/lib/protection-groups.ts` → `interface GroupRates` — 3 fields. fields with no matching column: `basic`, `smart`, `premium` — either derived values or drift.
- `src/lib/rental-rules.ts` → `interface DeliveryTier` — 3 fields. fields with no matching column: `maxKm`, `fee` — either derived values or drift.
- `src/lib/rental-rules.ts` → `interface TimeSlot` — 2 fields. all field names map to real columns (allowing camelCase↔snake_case).
- `src/lib/return-steps.ts` → `interface ReturnStep` — 7 fields. fields with no matching column: `number`, `requiredState`, `prerequisiteState` — either derived values or drift.
- `src/lib/return-steps.ts` → `interface ReturnCompletion` — 13 fields. fields with no matching column: `intake`, `timeRecorded`, `fuelRecorded`, `evidence`, `photosComplete`, `issues`, `reviewed`, `damagesRecorded`, `closeout`, `completed`, `deposit`, `processed` — either derived values or drift.
- `src/lib/seed-categories.ts` → `interface CategorySeedData` — 11 fields. fields with no matching column: `image`, `vehicles` — either derived values or drift.
- `src/lib/vehicle-adjustments.ts` → `interface AdjustmentLine` — 2 fields. fields with no matching column: `cents` — either derived values or drift.
- `src/auth/capabilities.ts` → `interface Capabilities` — 41 fields. fields with no matching column: `canViewBookings`, `canCreateBooking`, `canModifyBooking`, `canVoidBooking`, `canCancelBooking`, `canAssignVehicle`, `canProcessHandover`, `canProcessReturn`, `canViewFleet`, `canEditFleet`, `canMoveVehicleUnits`, `canUpdateVehicleStatus`, `canManageCategories`, `canViewPricing`, `canEditRates`, `canEditFuelPrice`, `canEditAddOnPricing`, `canApplyDiscounts`, `canViewPayments`, `canRecordPayment`, `canProcessRefund`, `canTakeDepositAction`, `canOverrideFees`, `canViewIncidents`, `canCreateIncident`, `canManageIncident`, `canViewTickets`, `canManageTickets`, `canAccessSettings`, `canManageUsers`, `canViewAuditLogs`, `canViewAnalytics`, `canExportData`, `isSuperAdmin`, `canSwitchLocation`, `canManageStaff`, `canViewAllLocations`, `canAccessAdminPanel`, `canAccessOpsPanel`, `canAccessSupportPanel`, `canAccessDeliveryPanel` — either derived values or drift.

GAP: the codebase mixes camelCase hand-written shapes (for example
`src/domain/bookings/types.ts`) with the snake_case generated row types, and
several hooks return raw rows typed as `any`/inferred, so a compile-time
guarantee that hand-written types match the database does not exist.

