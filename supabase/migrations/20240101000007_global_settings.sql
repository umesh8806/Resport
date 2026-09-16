-- 20240101000007_global_settings.sql

CREATE TABLE IF NOT EXISTS global_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(50) UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default setting for Public Portal Search Mode
INSERT INTO global_settings (setting_key, setting_value) 
VALUES ('public_search_mode', '{"mode": "SCHOOL_ROLL_DOB"}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Allow public read access to settings so the portal can read it
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read global settings" ON global_settings FOR SELECT USING (true);
CREATE POLICY "Super admin can update global settings" ON global_settings FOR ALL TO authenticated USING (public.is_super_admin());
