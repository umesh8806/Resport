-- 20240101000005_per_school_classes.sql

-- Add school_id to class_configs
ALTER TABLE class_configs ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE CASCADE;

-- Drop the global class_name unique constraint
ALTER TABLE class_configs DROP CONSTRAINT IF EXISTS class_configs_class_name_key;

-- Add a per-school unique constraint for class_name
-- If there are duplicates currently with school_id = NULL, it will allow it temporarily, but new inserts will be scoped
ALTER TABLE class_configs ADD CONSTRAINT class_configs_school_class_key UNIQUE (school_id, class_name);

-- Update RLS policies to allow School Admins to view only their school's classes (if desired, currently global view is fine for Super Admin)
-- The UI handles filtering by school_id natively now.
