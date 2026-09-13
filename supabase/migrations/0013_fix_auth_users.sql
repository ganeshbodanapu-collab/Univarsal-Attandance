-- Fix Auth users passwords and email confirmation for production accounts

DO $$
DECLARE
  v_admin_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_s001_id  UUID := 'b2c3d4e5-f6a7-8901-bcde-f23456789012';
  v_s002_id  UUID := 'c3d4e5f6-a7b8-9012-cdef-345678901234';
  v_s003_id  UUID := 'd4e5f6a7-b8c9-0123-defa-456789012345';
BEGIN
  -- Admin
  UPDATE auth.users
  SET
    email = 'admin@universalattendance.com',
    encrypted_password = extensions.crypt('ProdAdmin#2026!SecuredVal', extensions.gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    aud = 'authenticated',
    role = 'authenticated',
    updated_at = NOW()
  WHERE id = v_admin_id OR email = 'admin@universalattendance.com';

  -- Supervisor S001
  UPDATE auth.users
  SET
    email = 'site_s001@universalattendance.com',
    encrypted_password = extensions.crypt('SiteS001#Pass2026!', extensions.gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    aud = 'authenticated',
    role = 'authenticated',
    updated_at = NOW()
  WHERE id = v_s001_id OR email = 'site_s001@universalattendance.com';

  -- Supervisor S002
  UPDATE auth.users
  SET
    email = 'site_s002@universalattendance.com',
    encrypted_password = extensions.crypt('SiteS002#Pass2026!', extensions.gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    aud = 'authenticated',
    role = 'authenticated',
    updated_at = NOW()
  WHERE id = v_s002_id OR email = 'site_s002@universalattendance.com';

  -- Supervisor S003
  UPDATE auth.users
  SET
    email = 'site_s003@universalattendance.com',
    encrypted_password = extensions.crypt('SiteS003#Pass2026!', extensions.gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    aud = 'authenticated',
    role = 'authenticated',
    updated_at = NOW()
  WHERE id = v_s003_id OR email = 'site_s003@universalattendance.com';
END $$;
