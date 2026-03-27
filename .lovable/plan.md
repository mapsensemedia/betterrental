

## Fix: Damage Report Trigger Using Invalid Enum Value

### Root Cause

The `auto_create_damage_ticket` trigger function on the `damage_reports` table compares `NEW.severity = 'major'`, but `'major'` is not a valid value in the `damage_severity` enum (`minor`, `moderate`, `severe`). PostgreSQL attempts to cast `'major'` to the enum type for comparison, which throws error `22P02: invalid input value for enum damage_severity: "major"`.

This blocks every damage report insert because the trigger fires before the row can be committed.

**Verified via browser test**: POST to `damage_reports` returns HTTP 400 with `{"code":"22P02","message":"invalid input value for enum damage_severity: \"major\""}`.

### Fix

**One database migration** to replace the trigger function `auto_create_damage_ticket`:

- Change `NEW.severity = 'major'` to `NEW.severity = 'severe'` (the actual highest severity value in the enum)
- This affects two places in the function:
  1. `priority` — `CASE WHEN NEW.severity = 'severe' THEN 'high' ELSE 'medium' END`
  2. `is_urgent` — `NEW.severity = 'severe'`

### What Does NOT Change

- No application code changes needed
- No changes to the `damage_severity` enum itself
- No changes to the `damage_reports` table schema or RLS policies
- No changes to the `DamageReportDialog` component or `useCreateDamage` hook
- The `auto_create_incident_ticket` trigger (on a different table) is not affected

### Files Modified

1. Database migration only — `CREATE OR REPLACE FUNCTION public.auto_create_damage_ticket()`

