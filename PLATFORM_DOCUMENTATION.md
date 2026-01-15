# C2C Rental Platform - Comprehensive Technical Documentation

> **Version**: 1.0  
> **Last Updated**: January 2026  
> **Platform URL**: https://betterrental.lovable.app

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Technology Stack](#3-technology-stack)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [Database Schema](#6-database-schema)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Component Architecture](#8-component-architecture)
9. [State Management](#9-state-management)
10. [Edge Functions](#10-edge-functions)
11. [Real-time Features](#11-real-time-features)
12. [Notification System](#12-notification-system)
13. [Payment Processing](#13-payment-processing)
14. [File Storage](#14-file-storage)
15. [Security Implementation](#15-security-implementation)
16. [Booking Workflow](#16-booking-workflow)
17. [Admin Operations](#17-admin-operations)
18. [Scalability Considerations](#18-scalability-considerations)
19. [Performance Optimizations](#19-performance-optimizations)
20. [Deployment & DevOps](#20-deployment--devops)
21. [Environment Variables](#21-environment-variables)
22. [API Reference](#22-api-reference)
23. [Testing Strategy](#23-testing-strategy)
24. [Known Limitations](#24-known-limitations)
25. [Future Roadmap](#25-future-roadmap)

---

## 1. Executive Summary

C2C Rental is a full-featured car rental management platform enabling customers to browse, book, and manage vehicle rentals, while providing operators with comprehensive admin tools for fleet management, booking operations, damage tracking, and financial reporting.

### Key Capabilities

| Customer Features | Admin Features |
|------------------|----------------|
| Vehicle browsing & search | Booking lifecycle management |
| Date/location selection | Multi-step pickup/return workflows |
| Guest checkout (no account required) | Real-time dashboard & alerts |
| Driver license upload | Fleet inventory management |
| Digital agreement signing | Damage reporting & tracking |
| Delivery/pickup options | Financial billing & deposits |
| Booking management portal | Audit logs & history |
| OTP verification | Staff role management |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React SPA)                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐   │
│  │  Customer  │  │   Admin    │  │  Booking   │  │     Shared          │   │
│  │   Pages    │  │   Pages    │  │   Flow     │  │   Components        │   │
│  └────────────┘  └────────────┘  └────────────┘  └─────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────┴────────────────────────────────────┐  │
│  │                         HOOKS & CONTEXT                               │  │
│  │  useAuth, useBookings, useVehicles, RentalBookingContext, etc.       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SUPABASE (Lovable Cloud)                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐   │
│  │  PostgreSQL │  │   Auth     │  │  Storage   │  │   Edge Functions   │   │
│  │  Database   │  │            │  │  Buckets   │  │   (21 functions)   │   │
│  └────────────┘  └────────────┘  └────────────┘  └─────────────────────┘   │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                        REALTIME SUBSCRIPTIONS                          │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL SERVICES                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐   │
│  │   Stripe   │  │   Twilio   │  │   Resend   │  │      Mapbox         │   │
│  │  Payments  │  │    SMS     │  │   Email    │  │   Geocoding/Maps    │   │
│  └────────────┘  └────────────┘  └────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tooling |
| TailwindCSS | 3.x | Styling |
| shadcn/ui | Latest | Component library |
| React Router | 6.30.1 | Client-side routing |
| TanStack Query | 5.83.0 | Server state management |
| Framer Motion | 12.23.26 | Animations |
| Recharts | 2.15.4 | Data visualization |
| React Hook Form | 7.61.1 | Form handling |
| Zod | 3.25.76 | Schema validation |
| date-fns | 3.6.0 | Date utilities |

### Backend (Lovable Cloud / Supabase)
| Component | Purpose |
|-----------|---------|
| PostgreSQL 15 | Primary database |
| Supabase Auth | User authentication |
| Supabase Storage | File storage |
| Edge Functions (Deno) | Serverless backend logic |
| Realtime | WebSocket subscriptions |
| Row Level Security | Data access control |

### External Integrations
| Service | Purpose | Secret Key |
|---------|---------|------------|
| Stripe | Payment processing | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Twilio | SMS notifications | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` |
| Resend | Email notifications | `RESEND_API_KEY` |
| Mapbox | Maps & geocoding | `MAPBOX_PUBLIC_TOKEN` |

---

## 4. Frontend Architecture

### Directory Structure

```
src/
├── App.tsx                 # Root component with routing
├── main.tsx                # Application entry point
├── index.css               # Global styles & design tokens
│
├── assets/                 # Static images
│   ├── c2c-logo.png
│   ├── cars/               # Vehicle images
│   ├── categories/         # Category images
│   └── hero-*.jpg          # Hero images
│
├── components/
│   ├── ui/                 # shadcn/ui primitives (40+ components)
│   ├── shared/             # Reusable business components
│   ├── layout/             # Layout components (TopNav, Footer, AdminShell)
│   ├── landing/            # Homepage components
│   ├── booking/            # Customer booking flow components
│   ├── checkout/           # Checkout-specific components
│   ├── rental/             # Rental search/selection components
│   └── admin/              # Admin-specific components
│       ├── ops/            # Booking operations workflow
│       └── return-ops/     # Return operations workflow
│
├── contexts/
│   └── RentalBookingContext.tsx  # Global booking state
│
├── hooks/                  # 50+ custom hooks
│   ├── use-auth.ts         # Authentication state
│   ├── use-bookings.ts     # Booking CRUD operations
│   ├── use-vehicles.ts     # Vehicle data fetching
│   └── ...
│
├── lib/                    # Utility libraries
│   ├── utils.ts            # General utilities (cn, etc.)
│   ├── pricing.ts          # Pricing calculations
│   ├── availability.ts     # Vehicle availability logic
│   ├── booking-helpers.ts  # Booking utilities
│   ├── booking-stages.ts   # Booking stage definitions
│   ├── ops-steps.ts        # Operations workflow steps
│   ├── return-steps.ts     # Return workflow steps
│   └── query-client.ts     # TanStack Query configuration
│
├── constants/
│   └── rentalLocations.ts  # Static location data
│
├── pages/
│   ├── Index.tsx           # Homepage
│   ├── Search.tsx          # Vehicle search
│   ├── Auth.tsx            # Login/signup
│   ├── NewCheckout.tsx     # Checkout page
│   ├── booking/            # Post-booking customer pages
│   └── admin/              # Admin pages (15+ pages)
│
└── integrations/
    └── supabase/
        ├── client.ts       # Supabase client instance
        └── types.ts        # Auto-generated database types
```

### Routing Strategy

The application uses React Router v6 with lazy loading for optimal performance:

```typescript
// Critical paths - Eager loaded
import Index from "./pages/Index";
import Search from "./pages/Search";
import Auth from "./pages/Auth";

// Non-critical paths - Lazy loaded
const Compare = lazy(() => import("./pages/Compare"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
// ... 30+ more lazy-loaded pages
```

**Route Categories:**
1. **Customer Routes** (`/`, `/search`, `/checkout`, `/booking/*`)
2. **Admin Routes** (`/admin/*`) - Protected by `AdminProtectedRoute`
3. **Redirect Routes** - Legacy URL compatibility

### Design System

The design system is built on CSS custom properties with Tailwind CSS integration:

```css
/* index.css - Core Design Tokens */
:root {
  --background: 0 0% 98%;
  --foreground: 0 0% 9%;
  --primary: 0 0% 9%;
  --secondary: 0 0% 96%;
  --muted: 0 0% 94%;
  --accent: 220 100% 50%;
  --destructive: 0 84% 60%;
  --success: 142 71% 45%;
  --warning: 38 92% 50%;
  --radius: 0.75rem;
}

.dark {
  /* Dark mode overrides */
}
```

**Typography System:**
- `.heading-1` through `.heading-4`
- `.body-large`, `.body-small`
- `.label`

**Component Utilities:**
- `.glass` - Frosted glass effect
- `.hero-gradient` - Hero overlay
- `.card-hover` - Card hover animation
- `.focus-ring` - Consistent focus states

---

## 5. Backend Architecture

### Supabase Project Configuration

**Project ID**: `bsvsveoaihtbsteqikvp`

```toml
# supabase/config.toml
project_id = "bsvsveoaihtbsteqikvp"

[functions.create-booking]
verify_jwt = false

[functions.create-guest-booking]
verify_jwt = false

# ... 21 total edge functions
```

### Edge Functions (21 Total)

| Function | Purpose | Auth Required |
|----------|---------|---------------|
| `create-booking` | Create authenticated booking | No (validated internally) |
| `create-guest-booking` | Guest checkout flow | No |
| `create-checkout-session` | Stripe checkout | No |
| `create-payment-intent` | Stripe payment intent | No |
| `stripe-webhook` | Handle Stripe webhooks | No |
| `send-booking-email` | Email notifications | No |
| `send-booking-sms` | SMS notifications | No |
| `send-booking-otp` | OTP generation | No |
| `verify-booking-otp` | OTP verification | No |
| `send-booking-notification` | Multi-channel notification | No |
| `send-agreement-notification` | Agreement email | No |
| `send-payment-confirmation` | Payment confirmation | No |
| `send-payment-request` | Payment request | No |
| `send-contact-email` | Contact form | No |
| `send-deposit-notification` | Deposit updates | No |
| `generate-agreement` | PDF agreement generation | No |
| `generate-return-receipt` | Return receipt PDF | No |
| `get-mapbox-token` | Secure Mapbox token | No |
| `notify-admin` | Admin notifications | No |
| `confirm-admin-email` | Admin email confirmation | Yes |
| `check-rental-alerts` | Scheduled alert checks | No |

---

## 6. Database Schema

### Core Tables

```sql
-- 22 Tables Total

-- CORE ENTITIES
bookings              -- Central booking records
vehicles              -- Vehicle catalog
vehicle_units         -- Individual vehicle instances (VIN-level)
locations             -- Pickup/return locations
profiles              -- User profile data

-- BOOKING LIFECYCLE
checkin_records       -- Check-in verification data
walkaround_inspections-- Pre/post inspection data
condition_photos      -- Vehicle condition photos
inspection_metrics    -- Odometer, fuel readings
rental_agreements     -- Digital agreement storage

-- PAYMENTS & BILLING
payments              -- Payment transactions
deposit_ledger        -- Deposit tracking
receipts              -- Generated receipts
receipt_events        -- Receipt audit trail

-- SUPPORT & ALERTS
admin_alerts          -- System alerts
tickets               -- Customer support tickets
ticket_messages       -- Ticket conversation
ticket_timeline       -- Ticket status history
ticket_attachments    -- Ticket files

-- VERIFICATION
verification_requests -- Document verification
booking_otps          -- OTP tokens
notification_logs     -- Notification audit

-- FLEET MANAGEMENT
damage_reports        -- Damage tracking
vehicle_expenses      -- Maintenance costs
reservation_holds     -- Temporary vehicle holds
abandoned_carts       -- Cart recovery data

-- ACCESS CONTROL
user_roles            -- Role assignments
add_ons               -- Available add-on products
booking_add_ons       -- Booking <-> add-on junction

-- SYSTEM
audit_logs            -- All system changes
```

### Key Relationships

```
bookings
├── vehicles (vehicle_id) ───────────────► Vehicle catalog
├── vehicle_units (assigned_unit_id) ────► Physical vehicle
├── locations (location_id) ─────────────► Pickup location
├── profiles (user_id) ──────────────────► Customer data
├── checkin_records (1:1) ───────────────► Check-in status
├── walkaround_inspections (1:N) ────────► Inspections
├── condition_photos (1:N) ──────────────► Photos
├── payments (1:N) ──────────────────────► Payment records
├── rental_agreements (1:1) ─────────────► Agreement
└── damage_reports (1:N) ────────────────► Damages

vehicle_units
├── vehicles (vehicle_id) ───────────────► Parent vehicle type
├── damage_reports (1:N) ────────────────► Damage history
└── vehicle_expenses (1:N) ──────────────► Cost tracking
```

### Enums

```typescript
type booking_status = "pending" | "confirmed" | "active" | "completed" | "cancelled";
type alert_type = "verification_pending" | "payment_pending" | "cleaning_required" | 
                  "damage_reported" | "late_return" | "hold_expiring" | 
                  "return_due_soon" | "overdue" | "customer_issue" | "emergency";
type alert_status = "pending" | "acknowledged" | "resolved";
type app_role = "admin" | "staff" | "cleaner" | "finance";
type damage_severity = "minor" | "moderate" | "severe";
type ticket_status = "open" | "in_progress" | "resolved" | "closed" | "assigned" | "waiting_customer";
type verification_status = "pending" | "verified" | "rejected";
```

---

## 7. Authentication & Authorization

### Authentication Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Customer   │────►│  Supabase    │────►│    profiles     │
│   Sign Up   │     │    Auth      │     │  (auto-created) │
└─────────────┘     └──────────────┘     └─────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Session    │
                    │    Token     │
                    └──────────────┘
```

### Guest Checkout Flow

Guest users can complete bookings without an account:

```typescript
// Edge function: create-guest-booking
1. Receive booking request with contact info
2. Check for existing user by email
3. Create new user account if needed (auto-confirmed)
4. Create booking with service role (bypass RLS)
5. Send confirmation notifications
```

### Role-Based Access Control

```sql
-- Database function for role checking
CREATE FUNCTION is_admin_or_staff(_user_id uuid) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'staff', 'cleaner', 'finance')
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### Frontend Protection

```typescript
// AdminProtectedRoute component
function AdminProtectedRoute({ children }) {
  const { user, isLoading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();

  if (!user) return <Navigate to="/auth" />;
  if (!isAdmin) return <AccessDeniedPage />;
  
  return children;
}
```

---

## 8. Component Architecture

### Component Categories

#### 1. UI Primitives (`src/components/ui/`)
40+ shadcn/ui components with custom styling:
- `button.tsx`, `card.tsx`, `dialog.tsx`
- `form.tsx`, `input.tsx`, `select.tsx`
- `table.tsx`, `tabs.tsx`, `toast.tsx`
- etc.

#### 2. Shared Components (`src/components/shared/`)
Reusable business logic components:
- `DataTable.tsx` - Generic data tables
- `StatusBadge.tsx` - Status indicators
- `PhotoLightbox.tsx` - Image viewing
- `LocationSelector.tsx` - Location picker
- `AvailabilityCalendar.tsx` - Date selection

#### 3. Feature Components

**Landing (`src/components/landing/`)**
- `GlassSearchBar.tsx` - Search interface
- `VehicleCard.tsx` - Vehicle display
- `VehicleDetailsModal.tsx` - Quick view modal
- `CategoryCard.tsx` - Category navigation

**Booking (`src/components/booking/`)**
- `BookingProgressStepper.tsx` - Step indicator
- `DriverLicenseUpload.tsx` - License capture
- `RentalAgreementSign.tsx` - Digital signature
- `CustomerWalkaroundAcknowledge.tsx` - Inspection sign-off

**Admin (`src/components/admin/`)**
- `BookingOpsDrawer.tsx` - Quick operations
- `VehicleEditDialog.tsx` - Fleet management
- `DamageReportDialog.tsx` - Damage logging
- `DepositLedgerPanel.tsx` - Financial tracking

### Component Patterns

#### 1. Data Fetching Pattern
```typescript
// Hook-based data fetching with TanStack Query
function VehicleList() {
  const { data: vehicles, isLoading } = useVehicles();
  
  if (isLoading) return <Skeleton />;
  
  return vehicles.map(v => <VehicleCard key={v.id} vehicle={v} />);
}
```

#### 2. Form Pattern
```typescript
// React Hook Form + Zod validation
const schema = z.object({
  email: z.string().email(),
  phone: z.string().min(10),
});

function ContactForm() {
  const form = useForm({ resolver: zodResolver(schema) });
  
  return (
    <Form {...form}>
      <FormField name="email" render={...} />
    </Form>
  );
}
```

#### 3. Modal Pattern
```typescript
// Dialog with controlled state
function VehicleDetailsModal({ vehicle, open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{vehicle.make} {vehicle.model}</DialogTitle>
        </DialogHeader>
        {/* Content */}
      </DialogContent>
    </Dialog>
  );
}
```

---

## 9. State Management

### Global State: RentalBookingContext

The `RentalBookingContext` persists booking flow state across pages:

```typescript
interface RentalSearchData {
  // Location
  pickupLocationId: string | null;
  pickupLocationName: string | null;
  
  // Dates & times
  pickupDate: Date | null;
  pickupTime: string;
  returnDate: Date | null;
  returnTime: string;
  
  // Delivery mode
  deliveryMode: "pickup" | "delivery";
  deliveryAddress: string | null;
  deliveryFee: number;
  
  // Selection
  selectedVehicleId: string | null;
  selectedAddOnIds: string[];
  
  // Age confirmation
  ageConfirmed: boolean;
  ageRange: "21-25" | "25-70" | null;
}
```

**Persistence**: Data is persisted to `localStorage` under key `c2c_rental_context`.

### Server State: TanStack Query

```typescript
// Query client configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,     // 30 seconds
      gcTime: 10 * 60 * 1000,   // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

**Query Key Patterns:**
- `["vehicles"]` - All vehicles
- `["vehicle", id]` - Single vehicle
- `["admin-bookings", filters]` - Filtered bookings
- `["booking", id]` - Single booking with relations

---

## 10. Edge Functions

### Edge Function Architecture

All edge functions follow this pattern:

```typescript
// Standard edge function template
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Process request
    const body = await req.json();
    
    // Business logic...
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

### Key Edge Functions

#### `create-guest-booking`
- Creates user account if needed
- Bypasses RLS with service role
- Sends multi-channel notifications
- Validates vehicle availability

#### `stripe-webhook`
- Handles payment confirmations
- Updates payment status
- Triggers deposit processing
- Creates audit logs

#### `generate-agreement`
- Generates rental agreement PDF
- Populates with booking data
- Stores in Supabase Storage

---

## 11. Real-time Features

### Realtime Subscriptions

```typescript
// Hook for real-time booking updates
export function useRealtimeBookings() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("realtime-bookings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        (payload) => {
          // Invalidate relevant queries
          queryClient.invalidateQueries({ queryKey: ["active-rentals"] });
          queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [queryClient]);
}
```

### Subscribed Tables
- `bookings` - Booking status changes
- `admin_alerts` - New alerts
- `damage_reports` - Damage updates
- `verification_requests` - Verification status

---

## 12. Notification System

### Channels

| Channel | Provider | Edge Function | Use Cases |
|---------|----------|---------------|-----------|
| Email | Resend | `send-booking-email` | Confirmations, agreements, receipts |
| SMS | Twilio | `send-booking-sms` | Pickup reminders, OTP codes |
| In-App | Supabase | `admin_alerts` table | Admin notifications |

### Notification Types

```typescript
const notificationStages = [
  "confirmation",      // Booking created
  "rental_activated",  // Keys handed over
  "rental_completed",  // Vehicle returned
  "payment_received",  // Payment processed
  "deposit_released",  // Deposit refunded
];
```

---

## 13. Payment Processing

### Stripe Integration

```
┌─────────────┐     ┌──────────────────────┐     ┌─────────────┐
│   Client    │────►│ create-payment-intent│────►│   Stripe    │
└─────────────┘     └──────────────────────┘     └─────────────┘
                              │                         │
                              ▼                         ▼
                    ┌──────────────────────┐     ┌─────────────┐
                    │     payments table   │◄────│  Webhook    │
                    └──────────────────────┘     └─────────────┘
```

### Payment Types
- `deposit` - Security deposit (hold/capture)
- `rental` - Rental charges
- `addon` - Add-on products
- `damage` - Damage charges
- `late_fee` - Late return fees

### Deposit Automation

```typescript
// Automatic deposit handling on status change
async function handleDepositOnStatusChange(bookingId, newStatus) {
  if (newStatus === "completed") {
    // Check for damages
    const damages = await getDamages(bookingId);
    
    if (damages.length === 0) {
      await autoReleaseDeposit(bookingId);
    } else {
      await createDepositReviewAlert(bookingId);
    }
  }
}
```

---

## 14. File Storage

### Storage Buckets

| Bucket | Purpose | Public |
|--------|---------|--------|
| `verification-documents` | License uploads | No |
| `condition-photos` | Vehicle photos | No |
| `ticket-attachments` | Support files | No |
| `expense-receipts` | Maintenance receipts | No |
| `driver-licenses` | License images | No |

### Upload Pattern

```typescript
const uploadPhoto = async (file: File, bookingId: string) => {
  const path = `${bookingId}/${Date.now()}-${file.name}`;
  
  const { data, error } = await supabase.storage
    .from("condition-photos")
    .upload(path, file);
    
  return data?.path;
};
```

### Signed URLs

```typescript
// Hook for secure image access
export function useSignedStorageUrl(bucket: string, path: string) {
  return useQuery({
    queryKey: ["signed-url", bucket, path],
    queryFn: async () => {
      const { data } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600); // 1 hour
      return data?.signedUrl;
    },
  });
}
```

---

## 15. Security Implementation

### Row Level Security (RLS)

All tables have RLS enabled with policies for:
- Users can read their own data
- Admin/Staff can read all data
- Write operations restricted by role

### Database Functions

```sql
-- Secure function with SECURITY DEFINER
CREATE FUNCTION has_role(_user_id uuid, _role app_role)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public';
```

### API Security

- **JWT Validation**: Most functions use Supabase's built-in JWT
- **Service Role**: Internal operations use service role key
- **CORS**: Configured per function

### Input Validation

```typescript
// Zod schema validation
const bookingSchema = z.object({
  vehicleId: z.string().uuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  driverAgeBand: z.enum(["21_25", "25_70"]),
});
```

---

## 16. Booking Workflow

### Customer Flow

```
1. SEARCH          2. SELECT          3. CONFIGURE       4. CHECKOUT
┌─────────┐       ┌─────────┐        ┌─────────┐        ┌─────────┐
│ Location│──────►│ Vehicle │───────►│Protection│──────►│ Payment │
│  Dates  │       │  Choose │        │ Add-ons  │       │  Info   │
└─────────┘       └─────────┘        └─────────┘        └─────────┘
                                                              │
                                                              ▼
5. CONFIRM         6. PREPARE         7. PICKUP          8. RETURN
┌─────────┐       ┌─────────┐        ┌─────────┐        ┌─────────┐
│ Booking │◄──────│ License │◄───────│ Inspect │◄───────│  Return │
│  Code   │       │Agreement│        │ Sign-off│        │Inspection│
└─────────┘       └─────────┘        └─────────┘        └─────────┘
```

### Booking Stages

```typescript
type BookingStage = 
  | "intake"      // Initial customer check-in
  | "license"     // License verification
  | "agreement"   // Agreement signing
  | "payment"     // Payment processing
  | "vehicle_prep"// Vehicle preparation
  | "walkaround"  // Pre-rental inspection
  | "handover"    // Key handover
  | "active"      // Rental in progress
  | "return_init" // Return initiated
  | "return_insp" // Return inspection
  | "deposit"     // Deposit processing
  | "wrap_up";    // Final completion
```

---

## 17. Admin Operations

### Operations Wizard (Pickup)

```typescript
const OPS_STEPS = [
  { id: "prep", title: "Vehicle Prep", icon: Wrench },
  { id: "checkin", title: "Customer Check-in", icon: UserCheck },
  { id: "payment", title: "Payment & Deposit", icon: CreditCard },
  { id: "agreement", title: "Agreement", icon: FileText },
  { id: "walkaround", title: "Walkaround", icon: Camera },
  { id: "handover", title: "Handover", icon: Key },
];
```

### Return Operations Wizard

```typescript
const RETURN_STEPS = [
  { id: "intake", title: "Return Intake" },
  { id: "evidence", title: "Evidence Capture" },
  { id: "issues", title: "Issues Review" },
  { id: "fees", title: "Additional Fees" },
  { id: "flags", title: "Return Flags" },
  { id: "deposit", title: "Deposit Release" },
  { id: "closeout", title: "Final Closeout" },
];
```

### Admin Dashboard Sections

| Section | Path | Purpose |
|---------|------|---------|
| Overview | `/admin` | Stats & quick actions |
| Alerts | `/admin/alerts` | Pending attention items |
| Bookings | `/admin/bookings` | All bookings list |
| Pickups | `/admin/pickups` | Today's pickups |
| Active Rentals | `/admin/active-rentals` | In-progress rentals |
| Returns | `/admin/returns` | Pending returns |
| Inventory | `/admin/inventory` | Fleet management |
| Fleet Costs | `/admin/fleet-costs` | Expense tracking |
| Calendar | `/admin/calendar` | Visual calendar |
| Damages | `/admin/damages` | Damage reports |
| Billing | `/admin/billing` | Payment management |
| Tickets | `/admin/tickets` | Customer support |
| Reports | `/admin/reports` | Analytics & reports |

---

## 18. Scalability Considerations

### Current Architecture Limits

| Component | Current Capacity | Scaling Strategy |
|-----------|-----------------|------------------|
| Database | Supabase Free/Pro tier | Upgrade tier as needed |
| Edge Functions | Cold start ~100ms | Keep functions warm |
| File Storage | 1GB free | Upgrade storage quota |
| Realtime Connections | 200 concurrent | Upgrade for more |

### Horizontal Scaling Recommendations

1. **Database**
   - Add read replicas for analytics
   - Consider partitioning bookings by date
   - Archive old bookings to separate tables

2. **Edge Functions**
   - Split monolithic functions
   - Add request queuing for heavy operations
   - Implement caching layer

3. **Frontend**
   - Add CDN for static assets
   - Implement service worker caching
   - Consider SSR for SEO pages

### Data Growth Projections

```
Daily Bookings: 50
Monthly Growth: 20%

Year 1: ~22,000 bookings
Year 2: ~55,000 bookings
Year 3: ~130,000 bookings

Storage (photos): ~5GB/year
```

---

## 19. Performance Optimizations

### Current Optimizations

1. **Lazy Loading**
   - 30+ pages lazy loaded
   - Critical paths eager loaded

2. **Query Caching**
   - 30s stale time
   - 10min garbage collection

3. **Image Optimization**
   - Signed URLs with 1hr expiry
   - Lazy loading images

4. **Code Splitting**
   - Per-page bundles
   - Vendor chunk separation

### Monitoring Points

```typescript
// Query timing
console.log("[Query] admin-bookings took:", endTime - startTime, "ms");

// Realtime events
console.log("[Realtime] Booking change:", payload.eventType);
```

---

## 20. Deployment & DevOps

### Deployment Flow

```
Git Push → Lovable Build → Deploy Frontend → Deploy Edge Functions
                                    │
                                    ▼
                            CDN Distribution
```

### URLs

| Environment | URL |
|-------------|-----|
| Preview | https://id-preview--54271dc8-d163-4520-adb8-38f2d0b29f66.lovable.app |
| Production | https://betterrental.lovable.app |

### Edge Function Deployment

Edge functions auto-deploy on code push. Manual deployment:
```typescript
await supabase.functions.deploy("function-name");
```

---

## 21. Environment Variables

### Frontend (Vite)
```bash
VITE_SUPABASE_URL=https://bsvsveoaihtbsteqikvp.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=bsvsveoaihtbsteqikvp
```

### Edge Functions (Secrets)
```bash
SUPABASE_URL          # Auto-provided
SUPABASE_ANON_KEY     # Auto-provided
SUPABASE_SERVICE_ROLE_KEY  # Auto-provided
STRIPE_SECRET_KEY     # Payment processing
STRIPE_WEBHOOK_SECRET # Webhook validation
TWILIO_ACCOUNT_SID    # SMS
TWILIO_AUTH_TOKEN     # SMS
TWILIO_PHONE_NUMBER   # SMS sender
RESEND_API_KEY        # Email
MAPBOX_PUBLIC_TOKEN   # Maps
```

---

## 22. API Reference

### Supabase Client Usage

```typescript
import { supabase } from "@/integrations/supabase/client";

// Query
const { data, error } = await supabase
  .from("bookings")
  .select("*, vehicles(*)")
  .eq("status", "active");

// Insert
const { data, error } = await supabase
  .from("bookings")
  .insert({ ... })
  .select()
  .single();

// Update
const { error } = await supabase
  .from("bookings")
  .update({ status: "completed" })
  .eq("id", bookingId);

// Edge Function
const { data, error } = await supabase.functions.invoke("send-booking-email", {
  body: { bookingId, templateType: "confirmation" },
});
```

### Key Database Queries

```typescript
// Active rentals with relations
supabase
  .from("bookings")
  .select(`*, vehicles(*), locations(*), profiles(*)`)
  .eq("status", "active")

// Vehicle availability check
supabase
  .from("bookings")
  .select("id")
  .eq("vehicle_id", vehicleId)
  .in("status", ["pending", "confirmed", "active"])
  .or(`and(start_at.lte.${endAt},end_at.gte.${startAt})`)
```

---

## 23. Testing Strategy

### Recommended Testing Layers

1. **Unit Tests** (Not yet implemented)
   - Utility functions (`lib/pricing.ts`, `lib/availability.ts`)
   - State calculations
   - Form validation schemas

2. **Component Tests** (Not yet implemented)
   - UI component rendering
   - Form interactions
   - Modal behaviors

3. **Integration Tests** (Not yet implemented)
   - Booking flow completion
   - Payment processing
   - Admin workflows

4. **E2E Tests** (Not yet implemented)
   - Full customer journey
   - Admin operations
   - Edge cases

### Manual Testing Checklist

- [ ] Guest checkout flow
- [ ] Authenticated checkout
- [ ] Vehicle availability
- [ ] Payment processing
- [ ] Admin booking management
- [ ] Return workflow
- [ ] Notification delivery

---

## 24. Known Limitations

### Current Limitations

1. **No offline support** - Requires internet connection
2. **Single currency** - CAD only
3. **Single timezone** - Pacific Time assumed
4. **No multi-tenancy** - Single rental company
5. **Limited reporting** - Basic analytics only
6. **No mobile app** - Web responsive only
7. **Manual fleet updates** - No telematics integration
8. **Basic search** - No AI-powered recommendations

### Technical Debt

1. Some components over 500 lines
2. Inconsistent error handling patterns
3. Missing loading states in some areas
4. No automated testing suite
5. Some hardcoded strings (needs i18n)

---

## 25. Future Roadmap

### Phase 1: Foundation (Current)
- ✅ Customer booking flow
- ✅ Admin management
- ✅ Payment processing
- ✅ Notification system

### Phase 2: Enhancement
- [ ] Automated testing suite
- [ ] Performance monitoring
- [ ] Advanced analytics
- [ ] Customer reviews

### Phase 3: Scale
- [ ] Multi-location support
- [ ] Franchise/multi-tenant
- [ ] Mobile applications
- [ ] Telematics integration

### Phase 4: Intelligence
- [ ] Dynamic pricing
- [ ] Demand forecasting
- [ ] Maintenance prediction
- [ ] AI recommendations

---

## Appendix A: File Reference

### Core Configuration Files
- `vite.config.ts` - Build configuration
- `tailwind.config.ts` - Styling configuration
- `supabase/config.toml` - Edge function settings
- `src/lib/query-client.ts` - Query caching
- `src/index.css` - Design tokens

### Key Component Files
- `src/App.tsx` - Root routing
- `src/contexts/RentalBookingContext.tsx` - Global state
- `src/components/layout/AdminShell.tsx` - Admin layout
- `src/components/admin/AdminProtectedRoute.tsx` - Auth guard

### Database Types
- `src/integrations/supabase/types.ts` - Auto-generated types

---

## Appendix B: Quick Commands

```bash
# Development
npm run dev

# Build
npm run build

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

*Documentation maintained by the C2C Rental development team.*
