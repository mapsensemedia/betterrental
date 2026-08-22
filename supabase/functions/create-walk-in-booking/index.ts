/**
 * create-walk-in-booking — Staff-only walk-in booking creation
 *
 * SECURITY:
 * - Requires valid JWT (authenticated user)
 * - Requires admin/staff role (403 if not)
 * - Inserts via service_role client (bypasses RLS + INSERT seatbelt trigger)
 * - Staff can set arbitrary pricing (daily rate, totals)
 * - Creates/finds a customers record for the real-world customer
 * - Creates guest auth user if needed (for backward compat with payment pipelines)
 *
 * CUSTOMER IDENTITY:
 * - Matches existing customer by email AND full_name (case-insensitive)
 * - If email matches but name differs: returns customer_match_conflict for staff to decide
 * - Never updates/overwrites existing customer records
 * - Accepts forceNewCustomer=true to skip matching and always create new record
 * - Accepts useCustomerId to link to a staff-confirmed existing customer
 */
import {
  getCorsHeaders,
  handleCorsPreflightRequest,
  sanitizeEmail,
  sanitizePhone,
  isValidEmail,
  isValidPhone,
} from "../_shared/cors.ts";
import {
  validateAuth,
  getAdminClient,
  isAdminOrStaff,
} from "../_shared/auth.ts";
import {
  countWeekendDaysVancouver,
  WEEKEND_SURCHARGE_RATE,
} from "../_shared/vehicle-adjustments.ts";

const PVRT_DAILY_FEE = 1.50;
const ACSRCH_DAILY_FEE = 1.00;


Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    // 1. Auth check
    const auth = await validateAuth(req);
    if (!auth.authenticated || !auth.userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Hard guard: created_by must always be traceable
    if (!auth.userId) {
      return new Response(
        JSON.stringify({ error: "Cannot create walk-in booking without staff user ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Role check — staff only
    const staffCheck = await isAdminOrStaff(auth.userId);
    if (!staffCheck) {
      return new Response(
        JSON.stringify({ error: "Forbidden: staff role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();

    // 3. Validate required fields
    const {
      locationId,
      categoryId,
      startAt,
      endAt,
      customerName,
      customerPhone,
      customerEmail,
      notes,
      dailyRate,
      driverAgeBand,
      totalDays,
      subtotal,
      taxAmount,
      totalAmount,
      depositAmount,
      // New identity params
      forceNewCustomer,
      useCustomerId,
      // Optional add-ons array: [{ addOnId, quantity }]
      addOns,
      // Optional delivery address (delivery walk-ins)
      pickupAddress,
    } = body;

    if (!locationId || !categoryId || !startAt || !endAt || !customerName || !customerPhone || !customerEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: locationId, categoryId, startAt, endAt, customerName, customerPhone, customerEmail. Walk-in bookings require customer email." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!dailyRate || dailyRate <= 0 || !totalAmount || totalAmount <= 0) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid pricing fields: dailyRate, totalAmount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("[walkin] role mode", { hasServiceKey: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") });
    const supabaseAdmin = getAdminClient();

    // 4. Validate & sanitize customer input
    const sanitizedName = customerName.trim();
    const sanitizedPhoneVal = sanitizePhone(customerPhone);
    const email = customerEmail ? sanitizeEmail(customerEmail) : null;

    if (!sanitizedName) {
      return new Response(
        JSON.stringify({ error: "Customer name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!isValidPhone(sanitizedPhoneVal)) {
      return new Response(
        JSON.stringify({ error: "Invalid customer phone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!email || !isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: "Walk-in bookings require a valid customer email so the booking can be linked to a real customer account." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 5. Find or create a customers record (auth-independent identity)
    let customerId: string | null = null;

    if (useCustomerId) {
      // Staff explicitly confirmed to use an existing customer
      const { data: confirmedCustomer } = await supabaseAdmin
        .from("customers")
        .select("id")
        .eq("id", useCustomerId)
        .maybeSingle();

      if (!confirmedCustomer) {
        return new Response(
          JSON.stringify({ error: "Specified customer record not found" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      customerId = confirmedCustomer.id;
      console.log(`[walkin] Staff confirmed existing customer ${customerId}`);
    } else if (forceNewCustomer) {
      // Staff explicitly chose to create a new customer (even if email matches)
      const { data: newCustomer, error: custErr } = await supabaseAdmin
        .from("customers")
        .insert({
          full_name: sanitizedName,
          email,
          phone: sanitizedPhoneVal,
        })
        .select("id")
        .single();

      if (custErr || !newCustomer) {
        console.error("[walkin] Failed to create customer record:", custErr);
        return new Response(
          JSON.stringify({ error: "Failed to create customer record", details: custErr?.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      customerId = newCustomer.id;
      console.log(`[walkin] Force-created new customer ${customerId} for ${sanitizedName} (${email})`);
    } else {
      // Default: match by email AND full_name (case-insensitive)
      const { data: exactMatch } = await supabaseAdmin
        .from("customers")
        .select("id, full_name, email, phone")
        .eq("email", email)
        .limit(10);

      const nameMatch = exactMatch?.find(
        (c) => c.full_name?.toLowerCase().trim() === sanitizedName.toLowerCase(),
      );

      if (nameMatch) {
        // Email + name match — same person, reuse
        customerId = nameMatch.id;
        console.log(`[walkin] Reusing customer ${customerId} (${nameMatch.full_name}) — email+name match`);
      } else if (exactMatch && exactMatch.length > 0) {
        // Email matches but name differs — ask staff to decide
        const existing = exactMatch[0];
        console.log(`[walkin] Email match but name mismatch: existing="${existing.full_name}" vs new="${sanitizedName}"`);
        return new Response(
          JSON.stringify({
            customer_match_conflict: true,
            existingCustomer: {
              id: existing.id,
              fullName: existing.full_name,
              email: existing.email,
              phone: existing.phone,
            },
            newName: sanitizedName,
            message: `An existing customer "${existing.full_name}" uses email ${email}. Is this the same person?`,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } else {
        // No match at all — create new customer
        const { data: newCustomer, error: custErr } = await supabaseAdmin
          .from("customers")
          .insert({
            full_name: sanitizedName,
            email,
            phone: sanitizedPhoneVal,
          })
          .select("id")
          .single();

        if (custErr || !newCustomer) {
          console.error("[walkin] Failed to create customer record:", custErr);
          return new Response(
            JSON.stringify({ error: "Failed to create customer record", details: custErr?.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        customerId = newCustomer.id;
        console.log(`[walkin] Created new customer ${customerId} for ${sanitizedName} (${email})`);
      }
    }

    // Hard guard: every walk-in booking MUST have a customer_id
    if (!customerId) {
      console.error("[walkin] CRITICAL: No customer_id resolved — aborting booking creation");
      return new Response(
        JSON.stringify({ error: "Cannot create walk-in booking without a valid customer_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 6. Resolve or create auth user (backward compat for payment/notification pipelines)
    let userId: string | null = null;

    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (existingProfile) {
      // Only reuse profile if the name actually matches (same person)
      const profileName = existingProfile.full_name?.toLowerCase().trim();
      const walkinName = sanitizedName.toLowerCase().trim();
      if (profileName === walkinName) {
        userId = existingProfile.id;
        console.log(`[walkin] Reusing existing profile ${userId} (${existingProfile.full_name}) for email ${email}`);
      } else {
        console.log(`[walkin] Profile name mismatch: profile="${existingProfile.full_name}" vs walk-in="${sanitizedName}" — creating new auth user`);
      }
    }

    if (!userId) {
      const randomPassword = crypto.randomUUID() + crypto.randomUUID().slice(0, 8) + "Aa1!";
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: false,
        user_metadata: {
          full_name: sanitizedName,
          phone: sanitizedPhoneVal,
          is_guest: true,
          created_via: "walk_in",
        },
      });

      if (createError || !newUser?.user) {
        console.error("[create-walk-in-booking] Failed to create walk-in customer:", createError);
        return new Response(
          JSON.stringify({ error: "Walk-in bookings require a valid customer email. We couldn't create or link a customer account for this email." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      userId = newUser.user.id;

      const { error: profileUpsertError } = await supabaseAdmin.from("profiles").upsert({
        id: userId,
        email,
        full_name: sanitizedName,
        phone: sanitizedPhoneVal,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

      if (profileUpsertError) {
        console.error("[create-walk-in-booking] Failed to create customer profile:", profileUpsertError);
        return new Response(
          JSON.stringify({ error: "Walk-in bookings require a valid customer email. We couldn't save the customer profile for this email." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // 7. Compute pricing SERVER-SIDE — the staff daily rate is honoured, but the
    // day count and every derived line are recomputed here. Client-supplied
    // subtotal/tax/total are only used for a drift log: a wrong client quote
    // (e.g. calendar-date day counting) must never become the charged price.
    const resolvedAgeBand = driverAgeBand || "25_70";
    const computedDays = Math.max(1, Math.ceil(
      (new Date(endAt).getTime() - new Date(startAt).getTime()) / (1000 * 60 * 60 * 24),
    ));
    const youngDriverFee = resolvedAgeBand === "20_24" ? 15 * computedDays : 0;

    const weekendDays = countWeekendDaysVancouver(new Date(startAt).toISOString(), computedDays);
    const weekendSurcharge = weekendDays > 0
      ? Math.round(Number(dailyRate) * weekendDays * WEEKEND_SURCHARGE_RATE * 100) / 100
      : 0;
    const pvrtTotal = Math.round(PVRT_DAILY_FEE * computedDays * 100) / 100;
    const acsrchTotal = Math.round(ACSRCH_DAILY_FEE * computedDays * 100) / 100;

    // 7a. Price add-ons FIRST so they are billed, not just recorded.
    const addOnRowsToInsert: { add_on_id: string; quantity: number; price: number }[] = [];
    if (Array.isArray(addOns) && addOns.length > 0) {
      const addOnIds = addOns.map((a: { addOnId: string }) => a.addOnId).filter(Boolean);
      if (addOnIds.length > 0) {
        const { data: addOnRecords } = await supabaseAdmin
          .from("add_ons")
          .select("id, daily_rate, one_time_fee, name")
          .in("id", addOnIds)
          .eq("is_active", true);

        for (const ao of addOnRecords || []) {
          const input = addOns.find((a: { addOnId: string; quantity?: number }) => a.addOnId === ao.id);
          const qty = Math.min(Math.max(Number(input?.quantity) || 1, 1), 10);
          const price = Math.round(
            ((Number(ao.daily_rate) || 0) * computedDays + (Number(ao.one_time_fee) || 0)) * qty * 100,
          ) / 100;
          addOnRowsToInsert.push({ add_on_id: ao.id, quantity: qty, price });
        }
      }
    }
    const addOnsTotal = Math.round(
      addOnRowsToInsert.reduce((s, r) => s + r.price, 0) * 100,
    ) / 100;

    const computedSubtotal = Math.round((
      Number(dailyRate) * computedDays
      + weekendSurcharge
      + youngDriverFee
      + pvrtTotal
      + acsrchTotal
      + addOnsTotal
    ) * 100) / 100;
    const computedTax = Math.round(computedSubtotal * 0.12 * 100) / 100;
    const computedTotal = Math.round((computedSubtotal + computedTax) * 100) / 100;

    if (subtotal != null && Math.abs(Number(subtotal) - computedSubtotal) > 0.5) {
      console.warn("[walkin] client quote drift", {
        clientSubtotal: Number(subtotal),
        serverSubtotal: computedSubtotal,
        clientDays: totalDays ?? null,
        serverDays: computedDays,
      });
    }


    // 7b. Duplicate detection — check for recent walk-in with same user/category/dates
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: existingBooking } = await supabaseAdmin
      .from("bookings")
      .select("id, booking_code, status")
      .eq("user_id", userId)
      .eq("vehicle_id", categoryId)
      .eq("booking_source", "walk_in")
      .in("status", ["confirmed", "pending"])
      .gte("created_at", twoHoursAgo)
      .limit(1)
      .maybeSingle();

    if (existingBooking) {
      console.log(`[walkin] Found existing walk-in booking ${existingBooking.id} for user ${userId}, returning instead of creating duplicate`);
      return new Response(
        JSON.stringify({
          success: true,
          existing: true,
          booking: {
            id: existingBooking.id,
            bookingCode: existingBooking.booking_code,
            status: existingBooking.status,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 8. Insert booking via service_role (bypasses RLS + INSERT seatbelt)
    const { data: booking, error: insertError } = await supabaseAdmin
      .from("bookings")
      .insert({
        user_id: userId,
        customer_id: customerId,
        created_by: auth.userId,
        vehicle_id: categoryId,
        location_id: locationId,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
        status: "confirmed",
        daily_rate: dailyRate,
        total_days: computedDays,
        subtotal: computedSubtotal,
        tax_amount: computedTax,
        total_amount: computedTotal,
        driver_age_band: resolvedAgeBand,
        young_driver_fee: youngDriverFee,
        booking_source: "walk_in",
        deposit_amount: depositAmount ?? 350,
        pickup_contact_name: customerName.trim(),
        pickup_contact_phone: sanitizedPhoneVal,
        pickup_address: typeof pickupAddress === "string" && pickupAddress.trim() ? pickupAddress.trim() : null,
        notes: notes || null,
        assigned_driver_id: auth.userId,
      })
      .select("id, booking_code, status")
      .single();

    if (insertError) {
      console.error("[create-walk-in-booking] Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create booking", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 9. Persist add-ons using the SAME prices already billed in the subtotal
    if (addOnRowsToInsert.length > 0) {
      const { error: addOnInsertError } = await supabaseAdmin
        .from("booking_add_ons")
        .insert(addOnRowsToInsert.map((r) => ({ ...r, booking_id: booking.id })));

      if (addOnInsertError) {
        console.error("[walkin] Failed to insert add-ons:", addOnInsertError);
        // Charges were included in the subtotal — flag loudly so ops can reconcile.
        await supabaseAdmin.from("audit_logs").insert({
          action: "walkin_addons_persist_failed",
          entity_type: "booking",
          entity_id: booking.id,
          user_id: auth.userId,
          new_data: { addOnsTotal, rows: addOnRowsToInsert, error: addOnInsertError.message },
        });
      } else {
        console.log(
          `[walkin] Billed and inserted ${addOnRowsToInsert.length} add-on(s) ($${addOnsTotal.toFixed(2)}) for booking ${booking.id}`,
        );
      }
    }

    // 10. Create initial delivery status
    await supabaseAdmin.from("delivery_statuses").insert({
      booking_id: booking.id,
      status: "assigned",
      notes: "Walk-in booking created by staff",
      updated_by: auth.userId,
    });

    // 11. Audit log — use customer name from customers record for accuracy
    await supabaseAdmin.from("audit_logs").insert({
      action: "walk_in_booking_created",
      entity_type: "booking",
      entity_id: booking.id,
      user_id: auth.userId,
      new_data: {
        customer_name: sanitizedName,
        customer_id: customerId,
        created_by: auth.userId,
        daily_rate: dailyRate,
        total_amount: computedTotal,
        booking_source: "walk_in",
        add_ons_count: Array.isArray(addOns) ? addOns.length : 0,
      },
    });

    // 12. Send the same customer confirmation SMS/email as online bookings (non-fatal)
    try {
      await supabaseAdmin.functions.invoke("send-booking-sms", {
        body: { bookingId: booking.id, templateType: "confirmation" },
      });
    } catch (notifyErr) {
      console.error("[create-walk-in-booking] Confirmation SMS failed (non-fatal):", notifyErr);
    }

    console.log(`[create-walk-in-booking] Created booking ${booking.id} (customer_id=${customerId}) by staff ${auth.userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        booking: {
          id: booking.id,
          bookingCode: booking.booking_code,
          status: booking.status,
          customerId,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unexpected error";
    console.error("[create-walk-in-booking] Error:", msg, error);
    return new Response(
      JSON.stringify({ error: "server_error", message: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
