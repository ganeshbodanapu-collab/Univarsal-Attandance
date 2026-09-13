-- =========================================
-- STEP 27: LOGIN REQUESTS, AUDIT LOGS & USER MAPPING
-- =========================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create login_requests table
CREATE TABLE IF NOT EXISTS public.login_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT UNIQUE NOT NULL,
  requested_user_id TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'WEB',
  request_type TEXT NOT NULL DEFAULT 'Login Access Request',
  status TEXT NOT NULL DEFAULT 'PENDING',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  approved_by TEXT,
  rejected_by TEXT,
  assigned_site_id TEXT REFERENCES public.sites(id) ON DELETE SET NULL,
  assigned_section_id TEXT REFERENCES public.sections(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  actor_id TEXT,
  target_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on login_requests and audit_logs
ALTER TABLE public.login_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for login_requests
CREATE POLICY login_requests_admin_all ON public.login_requests
  FOR ALL TO authenticated USING (get_auth_user_role() = 'admin');

CREATE POLICY login_requests_anon_insert ON public.login_requests
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- RLS Policies for audit_logs
CREATE POLICY audit_logs_admin_select ON public.audit_logs
  FOR SELECT TO authenticated USING (get_auth_user_role() = 'admin');

CREATE POLICY audit_logs_insert_all ON public.audit_logs
  FOR INSERT TO authenticated, anon WITH CHECK (true);

-- 3. Seed Production Sites if missing
INSERT INTO public.sites (id, code, name, location, in_charge, mobile, status, created_at, updated_at)
VALUES
  ('S001', 'S001', 'Site A - Residency Project', 'Hyderabad', 'Supervisor Site A', '9876543210', 'active', NOW(), NOW()),
  ('S002', 'S002', 'Site B - Commercial Complex', 'Secunderabad', 'Supervisor Site B', '9876543211', 'active', NOW(), NOW()),
  ('S003', 'S003', 'Site C - Highway Infrastructure', 'Vijayawada', 'Supervisor Site C', '9876543212', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 4. Seed Production App Users and Auth Users
-- Admin User
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'authenticated',
  'authenticated',
  'admin@universalattendance.com',
  extensions.crypt('ProdAdmin#2026!SecuredVal', extensions.gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.app_users (
  id,
  auth_user_id,
  username,
  password_hash,
  name,
  role,
  email,
  status,
  created_at,
  updated_at
)
VALUES (
  'USR_ADMIN_001',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'admin',
  '[SUPABASE_AUTH]',
  'Central System Administrator',
  'admin',
  'admin@universalattendance.com',
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (username) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  status = 'active',
  role = 'admin',
  updated_at = NOW();

-- Site S001 Supervisor
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  'authenticated',
  'authenticated',
  'site_s001@universalattendance.com',
  extensions.crypt('SiteS001#Pass2026!', extensions.gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.app_users (
  id,
  auth_user_id,
  username,
  password_hash,
  name,
  role,
  assigned_site_id,
  email,
  status,
  created_at,
  updated_at
)
VALUES (
  'USR_SUP_S001',
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  'site_s001',
  '[SUPABASE_AUTH]',
  'Supervisor Site A',
  'supervisor',
  'S001',
  'site_s001@universalattendance.com',
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (username) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  assigned_site_id = 'S001',
  status = 'active',
  updated_at = NOW();

-- Site S002 Supervisor
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'c3d4e5f6-a7b8-9012-cdef-345678901234',
  'authenticated',
  'authenticated',
  'site_s002@universalattendance.com',
  extensions.crypt('SiteS002#Pass2026!', extensions.gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.app_users (
  id,
  auth_user_id,
  username,
  password_hash,
  name,
  role,
  assigned_site_id,
  email,
  status,
  created_at,
  updated_at
)
VALUES (
  'USR_SUP_S002',
  'c3d4e5f6-a7b8-9012-cdef-345678901234',
  'site_s002',
  '[SUPABASE_AUTH]',
  'Supervisor Site B',
  'supervisor',
  'S002',
  'site_s002@universalattendance.com',
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (username) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  assigned_site_id = 'S002',
  status = 'active',
  updated_at = NOW();

-- Site S003 Supervisor
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'd4e5f6a7-b8c9-0123-defa-456789012345',
  'authenticated',
  'authenticated',
  'site_s003@universalattendance.com',
  extensions.crypt('SiteS003#Pass2026!', extensions.gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.app_users (
  id,
  auth_user_id,
  username,
  password_hash,
  name,
  role,
  assigned_site_id,
  email,
  status,
  created_at,
  updated_at
)
VALUES (
  'USR_SUP_S003',
  'd4e5f6a7-b8c9-0123-defa-456789012345',
  'site_s003',
  '[SUPABASE_AUTH]',
  'Supervisor Site C',
  'supervisor',
  'S003',
  'site_s003@universalattendance.com',
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (username) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  assigned_site_id = 'S003',
  status = 'active',
  updated_at = NOW();
