-- =========================================
-- 0025: CREATE SYSTEM_CONFIG TABLE & CLEAN TEST DATA
-- =========================================

-- 1. Create system_config table for persistent key-value configurations (e.g. Telegram Admin Chat ID)
CREATE TABLE IF NOT EXISTS public.system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS system_config_select_all ON public.system_config;
CREATE POLICY system_config_select_all ON public.system_config
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS system_config_all ON public.system_config;
CREATE POLICY system_config_all ON public.system_config
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 2. Ensure Default Sites exist
INSERT INTO public.sites (id, code, name, location, in_charge, mobile, status, created_at, updated_at)
VALUES
  ('S001', 'S001', 'Site A - Residency Project', 'Hyderabad', 'Supervisor Site A', '9876543210', 'active', NOW(), NOW()),
  ('S002', 'S002', 'Site B - Commercial Complex', 'Secunderabad', 'Supervisor Site B', '9876543211', 'active', NOW(), NOW()),
  ('S003', 'S003', 'Site C - Highway Infrastructure', 'Vijayawada', 'Supervisor Site C', '9876543212', 'active', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  status = 'active',
  updated_at = NOW();

-- 3. Clean old test login requests
DELETE FROM public.login_requests WHERE requested_user_id LIKE 'sup_test_%' OR requested_user_id LIKE '%test%' OR request_id LIKE '%REQ-TEST%';

-- 4. Clean old orphan login requests older than 7 days
DELETE FROM public.login_requests WHERE requested_at < NOW() - INTERVAL '7 days';
