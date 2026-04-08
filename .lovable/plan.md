

## Fix License Photos Not Displaying on Booking Detail Page

### Problem
The booking detail page shows the license status badge but never renders the actual license images. The profile query fetches `driver_license_front_url` and `driver_license_back_url`, but no image elements exist in the UI. Additionally, the stored URLs are pre-signed URLs that expire, so fresh signed URLs must be generated from the storage path.

### Approach
The stored URLs contain the full signed URL (e.g., `https://.../storage/v1/object/sign/driver-licenses/{userId}/front.jpg?token=...`). We need to extract the storage path from these URLs and use `SignedStorageImage` (already imported) to render them with fresh signed URLs.

### Changes in `src/pages/admin/BookingDetail.tsx`

After the license status badge section (around line 563), add a license photo preview section:

1. Extract the storage path from `driver_license_front_url` and `driver_license_back_url` by parsing out the path after `driver-licenses/` and before `?token=`
2. Render two `SignedStorageImage` components (front and back) in a 2-column grid with click-to-enlarge dialog
3. Show "No license photos uploaded" if both URLs are null
4. Add a Dialog for full-size license preview on click (reuse the pattern from condition photos)

### Technical Details

- Helper function to extract path: parse the URL to get the segment between `/driver-licenses/` and `?token=`
- Use the existing `SignedStorageImage` component with `bucket="driver-licenses"`
- Wrap each image in a clickable container that opens a full-size dialog

### Files
| File | Change |
|------|--------|
| `src/pages/admin/BookingDetail.tsx` | Add license image rendering after license status badge, with path extraction and SignedStorageImage |

