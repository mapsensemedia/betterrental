-- Fix incident creation failures by aligning incident_cases constraints with the current app values

-- 1) vehicle_id should reference vehicle_categories (bookings store category IDs)
ALTER TABLE public.incident_cases
  DROP CONSTRAINT IF EXISTS incident_cases_vehicle_id_fkey;

ALTER TABLE public.incident_cases
  ADD CONSTRAINT incident_cases_vehicle_id_fkey
  FOREIGN KEY (vehicle_id)
  REFERENCES public.vehicle_categories(id)
  ON DELETE CASCADE;

-- 2) Expand allowed incident types (keep existing + add UI options)
ALTER TABLE public.incident_cases
  DROP CONSTRAINT IF EXISTS incident_cases_incident_type_check;

ALTER TABLE public.incident_cases
  ADD CONSTRAINT incident_cases_incident_type_check
  CHECK (
    incident_type = ANY (
      ARRAY[
        'accident'::text,
        'collision'::text,
        'damage'::text,
        'customer_damage'::text,
        'weather'::text,
        'mechanical'::text,
        'theft'::text,
        'vandalism'::text,
        'glass'::text,
        'tire'::text,
        'hit_and_run'::text,
        'other'::text
      ]
    )
  );

-- 3) Expand allowed severities (UI supports moderate)
ALTER TABLE public.incident_cases
  DROP CONSTRAINT IF EXISTS incident_cases_severity_check;

ALTER TABLE public.incident_cases
  ADD CONSTRAINT incident_cases_severity_check
  CHECK (
    severity = ANY (
      ARRAY['minor'::text, 'moderate'::text, 'major'::text]
    )
  );

-- 4) Expand allowed statuses to match incident workflow
ALTER TABLE public.incident_cases
  DROP CONSTRAINT IF EXISTS incident_cases_status_check;

ALTER TABLE public.incident_cases
  ADD CONSTRAINT incident_cases_status_check
  CHECK (
    status = ANY (
      ARRAY[
        'reported'::text,
        'investigating'::text,
        'evidence_complete'::text,
        'claim_filed'::text,
        'estimate'::text,
        'approved'::text,
        'in_repair'::text,
        'resolved'::text,
        'ready'::text,
        'closed'::text
      ]
    )
  );
