-- Insert Sample Exams for the 2025-2026 Academic Year
INSERT INTO exams (academic_year_id, exam_name, status)
SELECT id, 'Mid-Term Examination 2025', 'ACTIVE'
FROM academic_years
WHERE name = '2025-2026';

INSERT INTO exams (academic_year_id, exam_name, status)
SELECT id, 'Final Examination 2025', 'ACTIVE'
FROM academic_years
WHERE name = '2025-2026';
