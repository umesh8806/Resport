-- 20240101000003_class_subjects.sql

-- 1. SCENARIO PREVENTION: Historical Data Mutation
-- Previously, result_marks relied on the global 'subjects' table for maximum_marks.
-- If a subject's max marks changed, old results would recalculate and break.
-- FIX: Snapshot maximum_marks and passing_marks in result_marks at the time of import.
ALTER TABLE result_marks ADD COLUMN IF NOT EXISTS maximum_marks NUMERIC;
ALTER TABLE result_marks ADD COLUMN IF NOT EXISTS passing_marks NUMERIC;

-- Backfill existing data to prevent breaking existing results
UPDATE result_marks rm
SET maximum_marks = s.maximum_marks, passing_marks = s.passing_marks
FROM subjects s WHERE rm.subject_id = s.id AND rm.maximum_marks IS NULL;

-- Make them NOT NULL for future safety
ALTER TABLE result_marks ALTER COLUMN maximum_marks SET NOT NULL;
ALTER TABLE result_marks ALTER COLUMN passing_marks SET NOT NULL;

-- 2. DYNAMIC CLASS-SUBJECT MAPPING
-- Allows different classes to have different subjects and different mark scales
CREATE TABLE IF NOT EXISTS class_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_name VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS class_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_config_id UUID REFERENCES class_configs(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    maximum_marks NUMERIC NOT NULL,
    passing_marks NUMERIC NOT NULL,
    UNIQUE(class_config_id, subject_id)
);

-- RLS Policies
ALTER TABLE class_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;

-- Super Admin can do everything
CREATE POLICY "Super admin can do all on class_configs" ON class_configs FOR ALL TO authenticated USING (public.is_super_admin());
CREATE POLICY "Super admin can do all on class_subjects" ON class_subjects FOR ALL TO authenticated USING (public.is_super_admin());

-- School Admins (authenticated) can view
CREATE POLICY "School admin can view class_configs" ON class_configs FOR SELECT TO authenticated USING (status = 'ACTIVE');
CREATE POLICY "School admin can view class_subjects" ON class_subjects FOR SELECT TO authenticated USING (true);

-- 3. AUTOMATIC BACKFILL FOR EXISTING STUDENTS
INSERT INTO class_configs (class_name)
SELECT DISTINCT class_name FROM students
ON CONFLICT (class_name) DO NOTHING;

INSERT INTO class_subjects (class_config_id, subject_id, maximum_marks, passing_marks)
SELECT c.id, s.id, s.maximum_marks, s.passing_marks
FROM class_configs c
CROSS JOIN subjects s
WHERE s.active = true
ON CONFLICT (class_config_id, subject_id) DO NOTHING;

-- 4. UPDATE RPC TO SNAPSHOT MAX AND PASSING MARKS
CREATE OR REPLACE FUNCTION public.execute_import_job(p_job_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_job RECORD;
    v_school_id UUID;
    v_acad_year_id UUID;
    v_exam_id UUID;
    v_row JSONB;
    v_student_id UUID;
    v_result_id UUID;
    v_subject_code TEXT;
    v_mark_data JSONB;
BEGIN
    SELECT * INTO v_job FROM import_jobs WHERE id = p_job_id AND status = 'VALID' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Job not found or not in VALID state'; END IF;
    
    v_school_id := v_job.school_id;
    v_acad_year_id := v_job.academic_year_id;
    v_exam_id := v_job.exam_id;
    
    UPDATE import_jobs SET status = 'IMPORTING', started_at = NOW() WHERE id = p_job_id;

    FOR v_row IN SELECT * FROM jsonb_array_elements(v_job.staged_data)
    LOOP
        INSERT INTO students (school_id, academic_year_id, roll_number, student_name, date_of_birth, class_name, division, status)
        VALUES (v_school_id, v_acad_year_id, v_row->>'roll_number', v_row->>'student_name', (v_row->>'date_of_birth')::DATE, v_row->>'class_name', v_row->>'division', 'ACTIVE')
        ON CONFLICT (school_id, academic_year_id, roll_number) 
        DO UPDATE SET student_name = EXCLUDED.student_name, date_of_birth = EXCLUDED.date_of_birth, class_name = EXCLUDED.class_name, division = EXCLUDED.division
        RETURNING id INTO v_student_id;
        
        INSERT INTO results (school_id, student_id, exam_id, total_marks, maximum_marks, percentage, grade, result_status, publication_status, calculation_version)
        VALUES (v_school_id, v_student_id, v_exam_id, (v_row->'calculated'->>'total_marks')::NUMERIC, (v_row->'calculated'->>'maximum_marks')::NUMERIC, (v_row->'calculated'->>'percentage')::NUMERIC, v_row->'calculated'->>'grade', v_row->'calculated'->>'result_status', 'DRAFT', (v_row->'calculated'->>'calculation_version')::INTEGER)
        ON CONFLICT (student_id, exam_id)
        DO UPDATE SET total_marks = EXCLUDED.total_marks, maximum_marks = EXCLUDED.maximum_marks, percentage = EXCLUDED.percentage, grade = EXCLUDED.grade, result_status = EXCLUDED.result_status, calculation_version = EXCLUDED.calculation_version
        RETURNING id INTO v_result_id;
        
        FOR v_subject_code, v_mark_data IN SELECT key, value FROM jsonb_each(v_row->'marks')
        LOOP
            INSERT INTO result_marks (school_id, result_id, subject_id, marks_obtained, maximum_marks, passing_marks)
            VALUES (
                v_school_id, v_result_id, v_subject_code::UUID, 
                (v_mark_data->>'marks_obtained')::NUMERIC,
                (v_mark_data->>'maximum_marks')::NUMERIC,
                (v_mark_data->>'passing_marks')::NUMERIC
            )
            ON CONFLICT (result_id, subject_id)
            DO UPDATE SET marks_obtained = EXCLUDED.marks_obtained, maximum_marks = EXCLUDED.maximum_marks, passing_marks = EXCLUDED.passing_marks;
        END LOOP;
    END LOOP;
    
    UPDATE import_jobs SET status = 'COMPLETED', completed_at = NOW(), staged_data = NULL WHERE id = p_job_id;
    INSERT INTO audit_logs (school_id, actor_id, action, entity, entity_id, description) VALUES (v_school_id, v_job.uploaded_by, 'CSV_IMPORTED', 'import_jobs', p_job_id, 'Imported CSV successfully');

    RETURN jsonb_build_object('success', true);
END;
$$;
