-- P2: Add unique partial index on payments.transaction_id to prevent duplicate webhook inserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_unique_transaction_id 
  ON public.payments(transaction_id) 
  WHERE transaction_id IS NOT NULL;