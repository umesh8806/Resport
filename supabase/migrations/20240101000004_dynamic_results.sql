-- 20240101000004_dynamic_results.sql

-- Allow dynamic, arbitrary columns to be stored for a result
ALTER TABLE results ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Drop NOT NULL constraints on total_marks, percentage, etc. so we can just store raw data if calculation isn't possible
ALTER TABLE results ALTER COLUMN total_marks DROP NOT NULL;
ALTER TABLE results ALTER COLUMN maximum_marks DROP NOT NULL;
ALTER TABLE results ALTER COLUMN percentage DROP NOT NULL;
ALTER TABLE results ALTER COLUMN grade DROP NOT NULL;
ALTER TABLE results ALTER COLUMN result_status DROP NOT NULL;
