# Clickable photo viewer on the booking details page

Right now the Photos tab on a booking shows pickup and return photos as a plain grid — clicking a thumbnail does nothing. The project already has a full-screen photo viewer component used elsewhere; it just isn't wired into this page.

## What you'll get

- Click any photo in the Photos tab to open it full screen in a dark overlay.
- Arrows (and left/right keyboard keys) move to the next/previous photo across the whole set for that booking.
- Zoom in/out buttons, mouse-wheel / trackpad pinch zoom, drag to pan when zoomed, rotate, and Escape to close.
- Photo label (e.g. "Odometer & Fuel"), pickup/return phase, capture time and notes shown at the bottom, plus a thumbnail strip to jump between photos.
- Photos open in one continuous list: pickup photos first, then return photos, so you can page through everything without closing the viewer.

## Technical notes

- Reuse `src/components/shared/PhotoLightbox.tsx` (already handles navigation, keyboard, zoom, rotate, thumbnails, signed storage URLs).
- In `src/pages/admin/BookingDetail.tsx` Photos tab (~lines 986-1045): build one combined array `[...pickupPhotos, ...returnPhotos]` with `photo_url` normalized the same way the current thumbnails do (`replace("condition-photos/", "")`), add local state for `lightboxIndex`, make each grid tile a keyboard-accessible button that sets the index, and render `<PhotoLightbox photos={allPhotos} initialIndex={...} isOpen={...} onClose={...} />` once at the end of the tab.
- Enhance `PhotoLightbox` zoom to be smoother and mouse-anchored:
  - Non-passive native `wheel` listener on the image container with `preventDefault()` (React's `onWheel` is passive), scaling by delta magnitude (`z * Math.exp(-dy * 0.0015)`) with `deltaMode` normalization, clamped 1–5. This also handles trackpad pinch (`ctrlKey`).
  - Keep the cursor point anchored by updating a pan offset alongside zoom; `transform-origin: 0 0` on the transformed element.
  - Pointer drag to pan while zoomed > 1; reset zoom/pan on photo change and on close (existing behavior).
- No changes to data fetching, pricing, or any business logic — presentation only.
