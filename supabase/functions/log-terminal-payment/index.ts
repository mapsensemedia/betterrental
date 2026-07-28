import {
  getUserOrThrow,
  requireRoleOrThrow,
  getAdminClient,
  authErrorResponse,
} from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_DEPOSIT_AMOUNT = 350;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await getUserOrThrow(req, corsHeaders);
    await requireRoleOrThrow(userId, ["admin", "staff"], corsHeaders);

    const body = await req.json();
    const {
      bookingId,
      cardLastFour,
      authCode,
      includeDeposit,
      depositReceiptNumber,
      // Deposit-only mode: record a terminal deposit hold with no rental payment
      depositOnly,
      // New multi-transaction field
      transactions: txnArray,
      // Legacy single-entry fields
      receiptNumber: legacyReceipt,
    } = body;

    if (!bookingId || typeof bookingId !== "string") {
      return jsonResponse({ error: "bookingId is required" }, 400);
    }
    if (!cardLastFour || !/^\d{4}$/.test(cardLastFour)) {
      return jsonResponse({ error: "cardLastFour must be exactly 4 digits" }, 400);
    }

    const isDepositOnly = depositOnly === true;


    // Normalize into transactions array (backward compat)
    interface Txn { receiptNumber: string; amount: number }
    let transactions: Txn[];

    if (isDepositOnly) {
      // No rental transactions in deposit-only mode
      const depReceipt = typeof depositReceiptNumber === "string" ? depositReceiptNumber.trim() : "";
      if (!/^[A-Za-z0-9\-_]{3,50}$/.test(depReceipt)) {
        return jsonResponse({ error: "A valid deposit receipt / auth number is required" }, 400);
      }
      transactions = [];
    } else if (Array.isArray(txnArray) && txnArray.length > 0) {
      transactions = txnArray;
    } else if (legacyReceipt) {
      // Legacy single-entry: amount will be set to remaining balance below
      transactions = [{ receiptNumber: legacyReceipt, amount: 0 }];
    } else {
      return jsonResponse({ error: "transactions array or receiptNumber is required" }, 400);
    }


    // Validate each receipt format
    for (const txn of transactions) {
      const trimmed = typeof txn.receiptNumber === "string" ? txn.receiptNumber.trim() : "";
      if (!/^[A-Za-z0-9\-_]{3,50}$/.test(trimmed)) {
        return jsonResponse({ error: `Invalid receipt number: "${trimmed}"` }, 400);
      }
      txn.receiptNumber = trimmed;
    }

    const supabase = getAdminClient();

    // Fetch booking
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, total_amount, status, user_id, location_id, deposit_amount")
      .eq("id", bookingId)
      .single();

    if (bookingErr || !booking) {
      return jsonResponse({ error: "Booking not found" }, 404);
    }

    // Calculate remaining balance
    const { data: existingPayments } = await supabase
      .from("payments")
      .select("amount")
      .eq("booking_id", bookingId)
      .eq("status", "completed")
      .eq("payment_type", "rental");

    const existingTotal = (existingPayments || []).reduce(
      (sum: number, p: { amount: number }) => sum + Number(p.amount), 0
    );
    const remainingBalance = Number(booking.total_amount) - existingTotal;

    // For legacy single-entry with no explicit amount, use full remaining balance
    if (!Array.isArray(txnArray) && transactions.length === 1 && transactions[0].amount === 0) {
      transactions[0].amount = remainingBalance;
    }

    // Validate amounts
    const requestTotal = transactions.reduce((s, t) => s + Number(t.amount), 0);
    for (const txn of transactions) {
      if (typeof txn.amount !== "number" || txn.amount <= 0) {
        return jsonResponse({ error: `Amount must be positive for receipt ${txn.receiptNumber}` }, 400);
      }
    }
    if (requestTotal > remainingBalance + 0.01) {
      return jsonResponse({
        error: `Total $${requestTotal.toFixed(2)} exceeds remaining balance $${remainingBalance.toFixed(2)}`,
      }, 400);
    }

    // Check for duplicate receipts
    const txnIds = transactions.map(t => `TERM-${t.receiptNumber}`);
    if (txnIds.length > 0) {
      const { data: dupes } = await supabase
        .from("payments")
        .select("transaction_id")
        .in("transaction_id", txnIds);

      if (dupes && dupes.length > 0) {
        const dupeIds = dupes.map((d: { transaction_id: string }) => d.transaction_id);
        return jsonResponse({
          error: `Duplicate receipt(s): ${dupeIds.join(", ")}`,
        }, 409);
      }
    }

    // Insert payment records
    if (transactions.length > 0) {
      const paymentRows = transactions.map(txn => ({
        booking_id: bookingId,
        amount: txn.amount,
        payment_type: "rental",
        payment_method: "terminal",
        status: "completed",
        transaction_id: `TERM-${txn.receiptNumber}`,
        user_id: booking.user_id,
        location_id: booking.location_id,
      }));

      const { error: payErr } = await supabase.from("payments").insert(paymentRows);
      if (payErr) {
        console.error("Payment insert error:", payErr);
        return jsonResponse({ error: "Failed to record payment(s)" }, 500);
      }
    }

    // Determine if fully paid now
    const newTotal = existingTotal + requestTotal;
    const fullyPaid = !isDepositOnly && newTotal >= Number(booking.total_amount) - 0.01;

    // Build booking update
    const bookingUpdate: Record<string, unknown> = { card_last_four: cardLastFour };
    if (!isDepositOnly) {
      bookingUpdate.wl_transaction_id = txnIds[0];
      bookingUpdate.wl_auth_status = "completed";
      if (fullyPaid) {
        bookingUpdate.status = "confirmed";
      }
    }

    // Deposit hold
    let depositTxnId: string | null = null;
    const depositAmount = Number(booking.deposit_amount) || DEFAULT_DEPOSIT_AMOUNT;
    const recordDeposit = isDepositOnly || !!includeDeposit;

    if (recordDeposit) {
      const depReceipt =
        depositReceiptNumber?.trim() ||
        (transactions[0] ? `${transactions[0].receiptNumber}-DEP` : "");
      if (!depReceipt) {
        return jsonResponse({ error: "A deposit receipt / auth number is required" }, 400);
      }
      depositTxnId = `TERM-DEP-${depReceipt}`;
      bookingUpdate.wl_deposit_transaction_id = depositTxnId;
      bookingUpdate.wl_deposit_auth_status = "authorized";

      bookingUpdate.deposit_status = "authorized";
      bookingUpdate.deposit_authorized_at = new Date().toISOString();

      const { error: ledgerErr } = await supabase.from("deposit_ledger").insert({
        booking_id: bookingId,
        action: "hold",
        amount: depositAmount,
        reason: `Terminal deposit hold (receipt: ${depReceipt})`,
        created_by: userId,
      });
      if (ledgerErr) console.error("Deposit ledger insert error:", ledgerErr);
    }

    // Update booking
    const { error: bookingUpdateErr } = await supabase
      .from("bookings")
      .update(bookingUpdate)
      .eq("id", bookingId);

    if (bookingUpdateErr) {
      console.error("Booking update error:", bookingUpdateErr);
      return jsonResponse({ error: "Payment(s) recorded but booking update failed" }, 500);
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      action: isDepositOnly ? "terminal_deposit_logged" : "terminal_payment_logged",
      entity_type: "booking",
      entity_id: bookingId,
      user_id: userId,
      new_data: {
        transactions: transactions.map(t => ({
          receipt_number: t.receiptNumber,
          amount: t.amount,
          transaction_id: `TERM-${t.receiptNumber}`,
        })),
        card_last_four: cardLastFour,
        auth_code: authCode || null,
        total_amount: requestTotal,
        fully_paid: fullyPaid,
        deposit_only: isDepositOnly,
        ...(recordDeposit ? { deposit_hold: true, deposit_amount: depositAmount, deposit_transaction_id: depositTxnId } : {}),
      },
    });

    return jsonResponse({
      success: true,
      depositOnly: isDepositOnly,
      transactions: txnIds,
      totalRecorded: requestTotal,
      fullyPaid,
      bookingStatus: fullyPaid ? "confirmed" : booking.status,
      depositHold: recordDeposit ? { transactionId: depositTxnId, amount: depositAmount } : null,
    });

  } catch (err) {
    try {
      return authErrorResponse(err, corsHeaders);
    } catch {
      console.error("Unhandled error:", err);
      return jsonResponse({ error: "Internal server error" }, 500);
    }
  }
});
