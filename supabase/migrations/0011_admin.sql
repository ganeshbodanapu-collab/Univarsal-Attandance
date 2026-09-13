-- =========================================
-- PRODUCTION CENTRAL ADMIN ACCOUNT & PROFILE
-- =========================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create Central Admin in auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'authenticated',
  'authenticated',
  'admin.production@universalattendance.com',
  extensions.crypt('ProdAdmin#2026!SecuredVal', extensions.gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;

-- 2. Link profile in public.app_users
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
  'admin.production@universalattendance.com',
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  email = EXCLUDED.email,
  status = 'active',
  updated_at = NOW();
