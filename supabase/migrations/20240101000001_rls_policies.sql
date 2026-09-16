-- 20240101000001_rls_policies.sql

-- Enable RLS
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper Functions
CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_school_id() RETURNS UUID AS $$
  SELECT school_id FROM public.profiles
  WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Policies for schools
CREATE POLICY "Super admin can do all on schools" ON schools FOR ALL TO authenticated USING (public.is_super_admin());
CREATE POLICY "School admin can view own school" ON schools FOR SELECT TO authenticated USING (id = public.get_school_id());
CREATE POLICY "Public can view active schools" ON schools FOR SELECT TO anon USING (status = 'ACTIVE');
CREATE POLICY "Public can view active schools (auth)" ON schools FOR SELECT TO authenticated USING (status = 'ACTIVE');

-- Policies for profiles
CREATE POLICY "Super admin can do all on profiles" ON profiles FOR ALL TO authenticated USING (public.is_super_admin());
CREATE POLICY "Users can view and edit own profile" ON profiles FOR ALL TO authenticated USING (id = auth.uid());

-- Global config (academic_years, subjects, exams, grading_rules, csv_templates)
CREATE POLICY "Super admin can do all on global config (academic_years)" ON academic_years FOR ALL TO authenticated USING (public.is_super_admin());
CREATE POLICY "School admin can view active global config (academic_years)" ON academic_years FOR SELECT TO authenticated USING (status = 'ACTIVE');

CREATE POLICY "Super admin can do all on global config (subjects)" ON subjects FOR ALL TO authenticated USING (public.is_super_admin());
CREATE POLICY "School admin can view active global config (subjects)" ON subjects FOR SELECT TO authenticated USING (active = TRUE);

CREATE POLICY "Super admin can do all on global config (exams)" ON exams FOR ALL TO authenticated USING (public.is_super_admin());
CREATE POLICY "School admin can view active global config (exams)" ON exams FOR SELECT TO authenticated USING (status = 'ACTIVE');

CREATE POLICY "Super admin can do all on global config (grading_rules)" ON grading_rules FOR ALL TO authenticated USING (public.is_super_admin());
CREATE POLICY "School admin can view active global config (grading_rules)" ON grading_rules FOR SELECT TO authenticated USING (active = TRUE);

CREATE POLICY "Super admin can do all on global config (csv_templates)" ON csv_templates FOR ALL TO authenticated USING (public.is_super_admin());
CREATE POLICY "School admin can view active global config (csv_templates)" ON csv_templates FOR SELECT TO authenticated USING (active = TRUE);

-- Policies for students
CREATE POLICY "Super admin can do all on students" ON students FOR ALL TO authenticated USING (public.is_super_admin());
CREATE POLICY "School admin can do all on own students" ON students FOR ALL TO authenticated USING (school_id = public.get_school_id());

-- Policies for results
CREATE POLICY "Super admin can do all on results" ON results FOR ALL TO authenticated USING (public.is_super_admin());
CREATE POLICY "School admin can do all on own results" ON results FOR ALL TO authenticated USING (school_id = public.get_school_id());

-- Policies for result_marks
CREATE POLICY "Super admin can do all on result_marks" ON result_marks FOR ALL TO authenticated USING (public.is_super_admin());
CREATE POLICY "School admin can do all on own result_marks" ON result_marks FOR ALL TO authenticated USING (school_id = public.get_school_id());

-- Policies for import_jobs
CREATE POLICY "Super admin can do all on import_jobs" ON import_jobs FOR ALL TO authenticated USING (public.is_super_admin());
CREATE POLICY "School admin can do all on own import_jobs" ON import_jobs FOR ALL TO authenticated USING (school_id = public.get_school_id());

-- Policies for import_errors
CREATE POLICY "Super admin can do all on import_errors" ON import_errors FOR ALL TO authenticated USING (public.is_super_admin());
CREATE POLICY "School admin can view own import_errors" ON import_errors FOR ALL TO authenticated USING (
    import_job_id IN (SELECT id FROM import_jobs WHERE school_id = public.get_school_id())
);

-- Policies for audit_logs
CREATE POLICY "Super admin can do all on audit_logs" ON audit_logs FOR ALL TO authenticated USING (public.is_super_admin());
CREATE POLICY "School admin can view own audit_logs" ON audit_logs FOR SELECT TO authenticated USING (school_id = public.get_school_id());
