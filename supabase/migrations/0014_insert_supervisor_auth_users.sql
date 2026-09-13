-- Ensure all Supervisor accounts exist in auth.users with valid encrypted passwords and confirmed email

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
VALUES
(
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
),
(
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
),
(
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
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = NOW(),
  aud = 'authenticated',
  role = 'authenticated',
  updated_at = NOW();

UPDATE public.app_users
SET auth_user_id = 'b2c3d4e5-f6a7-8901-bcde-f23456789012', status = 'active'
WHERE username = 'site_s001';

UPDATE public.app_users
SET auth_user_id = 'c3d4e5f6-a7b8-9012-cdef-345678901234', status = 'active'
WHERE username = 'site_s002';

UPDATE public.app_users
SET auth_user_id = 'd4e5f6a7-b8c9-0123-defa-456789012345', status = 'active'
WHERE username = 'site_s003';
