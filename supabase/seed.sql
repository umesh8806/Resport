-- supabase/seed.sql

-- Replace these with real values in your project
-- Note: User creation should ideally happen via Auth API to get a real UUID, 
-- but for seeding a Super Admin if you know the UUID of an already signed-up user:
-- 
-- INSERT INTO profiles (id, role, name, status)
-- VALUES ('<YOUR_UUID_HERE>', 'SUPER_ADMIN', 'Platform Admin', 'ACTIVE');

-- Insert initial Global Configuration
INSERT INTO academic_years (name, status) VALUES 
('2025-2026', 'ACTIVE'),
('2026-2027', 'ACTIVE');

INSERT INTO subjects (subject_code, subject_name, maximum_marks, passing_marks, display_order, active) VALUES
('SUB-ENG', 'English', 100, 35, 1, true),
('SUB-MATH', 'Mathematics', 100, 35, 2, true),
('SUB-SCI', 'Science', 100, 35, 3, true),
('SUB-HIS', 'History', 100, 35, 4, true);

INSERT INTO grading_rules (min_percentage, max_percentage, grade, result_status, version, active) VALUES
(90, 100, 'A+', 'PASS', 1, true),
(80, 89.99, 'A', 'PASS', 1, true),
(70, 79.99, 'B+', 'PASS', 1, true),
(60, 69.99, 'B', 'PASS', 1, true),
(50, 59.99, 'C', 'PASS', 1, true),
(35, 49.99, 'D', 'PASS', 1, true),
(0, 34.99, 'F', 'FAIL', 1, true);

INSERT INTO csv_templates (version, columns, active) VALUES
('v1', '["roll_number", "student_name", "date_of_birth", "class_name", "division", "SUB-ENG", "SUB-MATH", "SUB-SCI", "SUB-HIS"]', true);
