-- Add fee_group column to locations for DB-driven drop-off fee computation
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS fee_group text;

-- Backfill existing locations based on their known IDs
UPDATE public.locations SET fee_group = 'surrey' WHERE id = 'a1b2c3d4-1111-4000-8000-000000000001';
UPDATE public.locations SET fee_group = 'langley' WHERE id = 'a1b2c3d4-2222-4000-8000-000000000002';
UPDATE public.locations SET fee_group = 'abbotsford' WHERE id = 'a1b2c3d4-3333-4000-8000-000000000003';

-- Add CHECK constraint allowing known groups or null (for future locations)
ALTER TABLE public.locations ADD CONSTRAINT locations_fee_group_check 
  CHECK (fee_group IS NULL OR fee_group IN ('surrey', 'langley', 'abbotsford'));