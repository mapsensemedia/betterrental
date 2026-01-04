-- Add new alert types for rental monitoring
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'return_due_soon';
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'overdue';
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'customer_issue';
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'emergency';