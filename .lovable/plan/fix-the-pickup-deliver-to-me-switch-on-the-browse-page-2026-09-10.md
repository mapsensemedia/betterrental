# Fix the pickup / "Deliver to me" switch on the browse page

## What happens today (reproduced in the live preview)

1. On the car browsing page, clicking **Deliver to me** in the top bar only opens the search panel — it does not actually select delivery, so the panel still shows **Pick up at location** highlighted.
2. Clicking **Bring car to me** inside the panel switches to delivery, which clears the delivery address (none has been entered yet). The whole top bar is only shown when the search is "complete", and a delivery search without an address counts as incomplete — so the bar and the panel both vanish and the customer is dumped back on the car list.
3. Because the bar is gone, there is no way to switch back to pick-up, and the earlier pick-up details look lost.

## What it will do after the fix

- Clicking **Deliver to me** in the top bar opens the panel with **Bring car to me** already selected and the address field ready.
- Selecting delivery never makes the top bar disappear; the panel stays open until the customer either enters an address and searches, or closes it.
- The pick-up / delivery switch is always visible at the top, so the customer can go straight back to **Pick-up** at any time, keeping their dates and times.
- If a customer switches to delivery and closes the panel without entering an address, the page falls back to pick-up rather than showing an empty state.

## Technical changes

**`src/components/search/SearchModifyBar.tsx`**
- "Deliver to me" button: call `setDeliveryMode("delivery")` and open the panel in the same handler.
- On close, if mode is `delivery` and there is no `deliveryAddress`/`deliveryLat`, revert to `setDeliveryMode("pickup")` so the page never lands in an incomplete delivery state.

**`src/pages/Search.tsx`**
- Render `SearchModifyBar` whenever there is a location or a date window instead of gating it on `isSearchValid`, so an in-progress delivery selection cannot unmount the bar (and the panel inside it). Car results keep their existing `hasWindow` gating — no change to availability, pricing or listing logic.

**`src/components/rental/RentalSearchCard.tsx`**
- The `[searchData]` sync effect currently re-derives the local mode on every context change; keep it aligned with the context mode so the in-panel toggle reflects the switch immediately and does not snap back.

Untouched: pricing, availability queries, dates/times handling, delivery fee and distance logic, booking creation, notifications.
