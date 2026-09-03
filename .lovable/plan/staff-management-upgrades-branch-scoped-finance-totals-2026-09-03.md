# Staff management upgrades + branch-scoped Finance totals

## 1. Create staff with a password you set

The Add staff dialog currently collects email, full name, employee code, role and branch, then relies on a password-setup email (`manage-staff` → `generateLink`). Since the emails are often not real mailboxes, add a password field.

- Add staff dialog fields: Email, Full name, Employee code, Role (Super Admin / Manager), Branch (required for Manager), Password (min 8 chars, with a "generate" helper and show/hide toggle).
- `manage-staff` `create` uses the supplied password when creating the account (email auto-confirmed) instead of a random temp password, and skips the recovery email when a password was provided.
- If the email already belongs to an existing account, the supplied password overwrites it (so linking an existing account still hands you working credentials).
- Success toast confirms the account is ready to use with the password you entered; keep "Send password setup email" as a separate optional action for real mailboxes.

## 2. Edit, deactivate, reactivate and delete staff

Today the row only supports branch change and activate/deactivate.

- **Edit staff** dialog (per row): full name, employee code, role (Super Admin ↔ Manager), branch, and optional "Set new password".
  - Changing role rewrites `user_roles` for that user so exactly one business role remains (`super_admin` or `manager`); switching to Manager requires a branch, switching to Super Admin clears the branch.
- **Status control** stays as an explicit Active/Inactive control in the row and in the edit dialog.
- **Delete staff** with a confirmation dialog: removes the staff assignment, removes their roles, and deletes the auth account so the login stops working. Guardrails:
  - You cannot delete or demote your own account.
  - You cannot delete the last remaining Super Admin.
  - Historical records that reference the person (processed-by, audit history) are left untouched — they keep showing the stored name.
- New `manage-staff` actions: `update` (name, code, role, branch, password) and `delete`, both Super-Admin-only, same as existing actions.

## 3. Finance totals follow the selected branch

On `/admin/finance` the tables already respect the top-bar branch switcher, but the four stat cards (Total Revenue, Pending, Deposits Held, Invoices) and the tab counts are computed from the unfiltered result sets, so they always show company-wide numbers.

Change them to use the branch-filtered data:

- Total Revenue → completed payments for the selected branch only.
- Pending → pending payments for the selected branch.
- Deposits Held → deposit rows for the selected branch.
- Invoices count and the "Payments (n)" tab badge → branch-filtered counts.
- With "All branches" selected, the numbers stay exactly as today (company-wide).
- Show the active branch name next to the stats so it is obvious the figures are branch-specific, and keep the date-range presets (all time, MTD, 30/90 days, custom) applying on top.

## Technical notes

- `supabase/functions/manage-staff/index.ts`: extend `create` (password), add `update` and `delete` actions; all keep `requireSuperAdmin`.
- `src/pages/admin/Staff.tsx`: password field, Edit dialog, Delete confirmation, status toggle.
- `src/pages/admin/Finance.tsx`: derive the stat card values and tab counts from `filteredPayments` / `filteredInvoices` (lines ~1535-1551 and the tab labels) instead of the raw `payments` / `invoices` arrays. The Overview tab already scopes revenue by branch, so no change there.
- No database migration is required; `staff_assignments`, `user_roles` and `locations` already carry everything needed.
