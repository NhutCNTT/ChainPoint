-- Apply once before deployment; skip if this column already exists.
-- False preserves older pending transfers whose points were already deducted.
ALTER TABLE bills ADD COLUMN redemption_reserved BOOLEAN NOT NULL DEFAULT FALSE;
