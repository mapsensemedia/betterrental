
-- Temporarily disable the financial integrity trigger to backfill correct drop-off fees
ALTER TABLE bookings DISABLE TRIGGER trg_block_sensitive_booking_updates;

-- Backfill existing bookings with correct tiered drop-off fees
-- Surrey <-> Langley = $50, (Surrey or Langley) <-> Abbotsford = $75
UPDATE bookings b
SET different_dropoff_fee = CASE
  WHEN (pl.fee_group = 'surrey' AND rl.fee_group = 'langley') OR (pl.fee_group = 'langley' AND rl.fee_group = 'surrey') THEN 50
  WHEN (pl.fee_group = 'abbotsford' AND rl.fee_group IN ('surrey','langley')) OR (pl.fee_group IN ('surrey','langley') AND rl.fee_group = 'abbotsford') THEN 75
  ELSE 0
END
FROM locations pl, locations rl
WHERE pl.id = b.location_id
  AND rl.id = b.return_location_id
  AND b.return_location_id IS NOT NULL
  AND b.return_location_id != b.location_id
  AND b.different_dropoff_fee NOT IN (50, 75);

-- Re-enable the trigger
ALTER TABLE bookings ENABLE TRIGGER trg_block_sensitive_booking_updates;
