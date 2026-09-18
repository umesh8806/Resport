-- Add mobile_number to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(15);
CREATE INDEX IF NOT EXISTS idx_students_mobile ON students(mobile_number);

-- Update execute_import_job to handle mobile_number
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
    v_mark NUMERIC;
    v_calc_version INTEGER := 1;
    v_new_students INT := 0;
    v_updated_students INT := 0;
    v_new_results INT := 0;
    v_updated_results INT := 0;
    v_is_new BOOLEAN;
BEGIN
    -- Get job details
    SELECT * INTO v_job FROM import_jobs WHERE id = p_job_id AND status = 'VALID' FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Job not found or not in VALID state';
    END IF;
    
    v_school_id := v_job.school_id;
    v_acad_year_id := v_job.academic_year_id;
    v_exam_id := v_job.exam_id;
    
    -- Update status
    UPDATE import_jobs SET status = 'IMPORTING', started_at = NOW() WHERE id = p_job_id;

    -- Loop through staged_data array
    FOR v_row IN SELECT * FROM jsonb_array_elements(v_job.staged_data)
    LOOP
        -- Upsert student
        -- Using ON CONFLICT to handle uniqueness: (school_id, academic_year_id, roll_number)
        INSERT INTO students (school_id, academic_year_id, roll_number, student_name, date_of_birth, class_name, division, mobile_number, status)
        VALUES (
            v_school_id, 
            v_acad_year_id, 
            v_row->>'roll_number', 
            v_row->>'student_name', 
            (v_row->>'date_of_birth')::DATE, 
            v_row->>'class_name', 
            v_row->>'division', 
            v_row->>'mobile_number',
            'ACTIVE'
        )
        ON CONFLICT (school_id, academic_year_id, roll_number) 
        DO UPDATE SET 
            student_name = EXCLUDED.student_name,
            date_of_birth = EXCLUDED.date_of_birth,
            class_name = EXCLUDED.class_name,
            division = EXCLUDED.division,
            mobile_number = EXCLUDED.mobile_number
        RETURNING id INTO v_student_id;
        
        -- Check if student was inserted or updated
        -- Actually, tracking exact inserts vs updates is tricky with ON CONFLICT without xmax check, 
        -- but we can assume from the validation phase stats. 
        -- The UI already showed the user "New: X, Updates: Y". We'll just rely on those stats for the job record.
        
        -- Upsert result
        INSERT INTO results (school_id, student_id, exam_id, total_marks, maximum_marks, percentage, grade, result_status, publication_status, calculation_version)
        VALUES (
            v_school_id,
            v_student_id,
            v_exam_id,
            (v_row->'calculated'->>'total_marks')::NUMERIC,
            (v_row->'calculated'->>'maximum_marks')::NUMERIC,
            (v_row->'calculated'->>'percentage')::NUMERIC,
            v_row->'calculated'->>'grade',
            v_row->'calculated'->>'result_status',
            'DRAFT',
            (v_row->'calculated'->>'calculation_version')::INTEGER
        )
        ON CONFLICT (student_id, exam_id)
        DO UPDATE SET
            total_marks = EXCLUDED.total_marks,
            maximum_marks = EXCLUDED.maximum_marks,
            percentage = EXCLUDED.percentage,
            grade = EXCLUDED.grade,
            result_status = EXCLUDED.result_status,
            calculation_version = EXCLUDED.calculation_version
        RETURNING id INTO v_result_id;
        
        -- Insert marks
        -- Iterate over v_row->'marks' keys which are subject_ids
        FOR v_subject_code, v_mark IN SELECT key, value::TEXT::NUMERIC FROM jsonb_each(v_row->'marks')
        LOOP
            INSERT INTO result_marks (school_id, result_id, subject_id, marks_obtained)
            VALUES (
                v_school_id,
                v_result_id,
                v_subject_code::UUID, -- Assuming keys are subject_ids
                v_mark
            )
            ON CONFLICT (result_id, subject_id)
            DO UPDATE SET marks_obtained = EXCLUDED.marks_obtained;
        END LOOP;
        
    END LOOP;
    
    -- Finish job
    UPDATE import_jobs 
    SET status = 'COMPLETED', completed_at = NOW(), staged_data = NULL -- Free up space
    WHERE id = p_job_id;
    
    -- Insert Audit Log
    INSERT INTO audit_logs (school_id, actor_id, action, entity, entity_id, description)
    VALUES (v_school_id, v_job.uploaded_by, 'CSV_IMPORTED', 'import_jobs', p_job_id, 'Imported CSV successfully');

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    -- If any error occurs, rollback and update job status
    -- We must do this in an outer block or let the caller handle it.
    -- Since plpgsql functions are atomic, any unhandled exception rolls back the transaction.
    -- We can catch it, rollback, and set FAILED, but we need an autonomous transaction or a separate call to set FAILED.
    -- Better to let it fail, and the client will catch the error and do a separate UPDATE to FAILED.
    RAISE;
END;
$$;
