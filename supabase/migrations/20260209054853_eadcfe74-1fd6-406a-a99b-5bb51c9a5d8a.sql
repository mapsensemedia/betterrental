-- Enable realtime for tables not yet in the publication
-- These are operationally-critical tables that need cross-portal sync

-- booking_add_ons: When ops staff adds/removes add-ons at counter
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_add_ons;

-- final_invoices: When closeout generates invoices visible across Admin/Ops
ALTER PUBLICATION supabase_realtime ADD TABLE public.final_invoices;

-- inspection_metrics: When walkaround/return metrics are recorded
ALTER PUBLICATION supabase_realtime ADD TABLE public.inspection_metrics;

-- audit_logs: For real-time activity timeline updates across panels
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;

-- deposit_ledger: Already in global realtime hook but ensure publication exists
-- deposit_jobs: Already in global realtime hook but ensure publication exists
ALTER PUBLICATION supabase_realtime ADD TABLE public.deposit_ledger;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deposit_jobs;

-- checkin_records: Ensure cross-portal sync for check-in updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.checkin_records;

-- condition_photos: Sync photo captures across portals
ALTER PUBLICATION supabase_realtime ADD TABLE public.condition_photos;

-- payments: Sync payment status across all portals
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;

-- damage_reports: Sync damage reports across all portals
ALTER PUBLICATION supabase_realtime ADD TABLE public.damage_reports;

-- vehicle_units: Sync fleet status across all portals
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_units;

-- verification_requests: Sync verification status
ALTER PUBLICATION supabase_realtime ADD TABLE public.verification_requests;

-- incident_cases: Sync incidents across portals
ALTER PUBLICATION supabase_realtime ADD TABLE public.incident_cases;