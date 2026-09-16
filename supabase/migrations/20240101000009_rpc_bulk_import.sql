-- Migration: Bulk Import RPC

CREATE OR REPLACE FUNCTION rpc_bulk_import_results(payload JSON)
RETURNS JSON AS $$
DECLARE
    academic_year_id UUID;
    exam_id UUID;
    row_data JSON;
    v_school_id UUID;
    v_student_id UUID;
    v_result_id UUID;
    mark_data JSON;
    imported_count INT := 0;
BEGIN
    academic_year_id := (payload->>'academic_year_id')::UUID;
    exam_id := (payload->>'exam_id')::UUID;

    FOR row_data IN SELECT * FROM json_array_elements(payload->'rows')
    LOOP
        v_school_id := (row_data->>'school_id')::UUID;
        
        -- Upsert Student
        INSERT INTO students (
            school_id, academic_year_id, roll_number, student_name, 
            date_of_birth, class_name, division, status
        )
        VALUES (
            v_school_id, 
            academic_year_id, 
            row_data->>'roll_number', 
            row_data->>'student_name', 
            CASE WHEN (row_data->>'date_of_birth') IS NOT NULL AND (row_data->>'date_of_birth') != '' 
                 THEN (row_data->>'date_of_birth')::DATE 
                 ELSE NULL END,
            COALESCE(row_data->>'class_name', 'Unspecified'),
            COALESCE(row_data->>'division', 'A'),
            'ACTIVE'
        )
        ON CONFLICT (school_id, academic_year_id, roll_number)
        DO UPDATE SET 
            student_name = EXCLUDED.student_name,
            date_of_birth = EXCLUDED.date_of_birth,
            class_name = EXCLUDED.class_name,
            division = EXCLUDED.division,
            updated_at = NOW()
        RETURNING id INTO v_student_id;

        -- Upsert Result
        INSERT INTO results (
            school_id, student_id, exam_id, 
            total_marks, maximum_marks, percentage, grade, result_status, 
            publication_status, published_at, metadata
        )
        VALUES (
            v_school_id, v_student_id, exam_id,
            (row_data->>'total_marks')::DECIMAL,
            (row_data->>'maximum_marks')::DECIMAL,
            (row_data->>'percentage')::DECIMAL,
            row_data->>'grade',
            row_data->>'result_status',
            'PUBLISHED',
            NOW(),
            row_data->'metadata'
        )
        ON CONFLICT (student_id, exam_id)
        DO UPDATE SET 
            total_marks = EXCLUDED.total_marks,
            maximum_marks = EXCLUDED.maximum_marks,
            percentage = EXCLUDED.percentage,
            grade = EXCLUDED.grade,
            result_status = EXCLUDED.result_status,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
        RETURNING id INTO v_result_id;

        -- Upsert Marks
        IF (row_data->'marks') IS NOT NULL AND json_typeof(row_data->'marks') = 'array' THEN
            FOR mark_data IN SELECT * FROM json_array_elements(row_data->'marks')
            LOOP
                INSERT INTO result_marks (
                    school_id, result_id, subject_id, 
                    marks_obtained, maximum_marks, passing_marks
                )
                VALUES (
                    v_school_id,
                    v_result_id,
                    (mark_data->>'subject_id')::UUID,
                    (mark_data->>'marks_obtained')::DECIMAL,
                    (mark_data->>'maximum_marks')::DECIMAL,
                    (mark_data->>'passing_marks')::DECIMAL
                )
                ON CONFLICT (result_id, subject_id)
                DO UPDATE SET 
                    marks_obtained = EXCLUDED.marks_obtained,
                    maximum_marks = EXCLUDED.maximum_marks,
                    passing_marks = EXCLUDED.passing_marks;
            END LOOP;
        END IF;

        imported_count := imported_count + 1;
    END LOOP;

    RETURN json_build_object('success', true, 'count', imported_count);
EXCEPTION WHEN OTHERS THEN
    -- If any row fails, the entire transaction automatically rolls back.
    -- Return the error message safely.
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
