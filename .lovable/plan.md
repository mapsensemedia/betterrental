## Plan

Fix the mobile unscrollable admin tables by addressing the overflow chain, not just individual table tags.

1. **Repair the admin page overflow container**
   - Update the admin shell main content so mobile pages can contain horizontally scrollable children instead of clipping them.
   - Keep the page itself from causing unwanted full-page sideways scrolling, but allow table wrappers to scroll internally.

2. **Make reusable tabs scroll correctly on mobile**
   - Update the underline tab list used by Payments/Finance so its tabs can scroll horizontally when they exceed screen width.
   - Apply the same mobile-safe tab wrapper pattern to Finance sub-tabs, Agreements tabs, and Fleet tabs.

3. **Fix Finance filters and transaction tables**
   - Make the search/filter row mobile-first: full-width controls where needed, wrapping without pushing content off-screen.
   - Ensure invoices, receipts, payments, and deposits tables have a real horizontal scroll container with a stable table width, so the right-side view/download/actions columns are reachable.

4. **Fix Agreements and Inventory tables**
   - Ensure Agreements and All Vehicles table containers use `overflow-x-auto` without being clipped by parent wrappers.
   - Add the same treatment to Fleet category VIN tables and temporary/all vehicle tabs where needed.

5. **Validate on mobile viewport**
   - Use a 390px-wide browser check on `/admin/finance?tab=transactions`, `/admin/agreements`, and `/admin/fleet`.
   - Confirm filters wrap/scroll cleanly and the table can scroll to the right-side eye/download/action controls.