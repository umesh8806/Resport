-- 20240101000008_performance_indexes.sql

-- PERFORMANCE OPTIMIZATION: Create B-Tree indexes on high-traffic search columns and Foreign Keys
-- This dramatically speeds up Public Portal searches and Admin Dashboard table rendering

-- 1. Students Table
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_academic_year_id ON students(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_students_roll_number ON students(roll_number);

-- 2. Results Table
CREATE INDEX IF NOT EXISTS idx_results_student_id ON results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_school_id ON results(school_id);
CREATE INDEX IF NOT EXISTS idx_results_exam_id ON results(exam_id);
CREATE INDEX IF NOT EXISTS idx_results_publication_status ON results(publication_status);

-- 3. Result Marks Table
CREATE INDEX IF NOT EXISTS idx_result_marks_result_id ON result_marks(result_id);
CREATE INDEX IF NOT EXISTS idx_result_marks_subject_id ON result_marks(subject_id);

-- 4. Composite index for the strict search mode (School + Roll + DOB)
CREATE INDEX IF NOT EXISTS idx_students_search_strict ON students(school_id, roll_number, date_of_birth);
