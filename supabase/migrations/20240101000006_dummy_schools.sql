-- 20240101000006_dummy_schools.sql

INSERT INTO schools (school_name, school_code, address, status) VALUES
('Springfield Elementary', 'SCH-001', '123 Spring St', 'ACTIVE'),
('Shelbyville Academy', 'SCH-002', '456 Shelby Rd', 'ACTIVE'),
('Capital City High', 'SCH-003', '789 Capital Blvd', 'ACTIVE'),
('Ogdenville Tech', 'SCH-004', '101 Ogden Ave', 'ACTIVE'),
('North Haverbrook Institute', 'SCH-005', '202 North St', 'ACTIVE'),
('Cypress Creek School', 'SCH-006', '303 Cypress Ln', 'ACTIVE'),
('Waverly Hills Academy', 'SCH-007', '404 Waverly Dr', 'ACTIVE'),
('Little Pwagmattasquarmsettport Middle', 'SCH-008', '505 Little Rd', 'ACTIVE')
ON CONFLICT (school_code) DO NOTHING;
