# Keep the booking in view when visiting a location page

## What happens today

On the booking confirmation page, "View Location Details" opens the branch page. That page's back link always says "Back to Locations" and always goes to the full list of all C2C locations, so the booking you came from disappears.

## What will change

1. When you open a location page from a booking, the link carries the booking you came from.
2. The back link on the location page then reads "Back to booking" and returns you to that exact booking confirmation page.
3. When you reach a location page any other way (menu, home page, locations list), the back link keeps its current behaviour: "Back to Locations".
4. Same treatment for the "Get Directions"/map area — no change needed there; only the back link changes.

Result: from the booking page you can check the branch details and come straight back to your booking, and the browser's own back button also lands there.

## Technical notes

- `src/pages/BookingDetail.tsx`: the "View Location Details" link becomes `/location/{id}?from=/booking/{bookingId}` (encoded), so the origin survives a refresh or a shared link.
- `src/pages/LocationDetail.tsx`: read `from` via `useSearchParams`; if it is a safe internal path (starts with `/`, no `//` or protocol), render the back link to that path with the label "Back to booking"; otherwise fall back to `/locations` with the existing label. Apply the same fallback link on the "Location Not Found" state.
- No routing, data, booking, or pricing logic changes; no other pages touched.
