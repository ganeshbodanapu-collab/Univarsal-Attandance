-- Create auth.identities entries for auth users so Supabase GoTrue auth service functions properly

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '{"sub":"a1b2c3d4-e5f6-7890-abcd-ef1234567890","email":"admin@universalattendance.com"}',
  'email',
  'admin@universalattendance.com',
  NOW(),
  NOW(),
  NOW()
),
(
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  '{"sub":"b2c3d4e5-f6a7-8901-bcde-f23456789012","email":"site_s001@universalattendance.com"}',
  'email',
  'site_s001@universalattendance.com',
  NOW(),
  NOW(),
  NOW()
),
(
  'c3d4e5f6-a7b8-9012-cdef-345678901234',
  'c3d4e5f6-a7b8-9012-cdef-345678901234',
  '{"sub":"c3d4e5f6-a7b8-9012-cdef-345678901234","email":"site_s002@universalattendance.com"}',
  'email',
  'site_s002@universalattendance.com',
  NOW(),
  NOW(),
  NOW()
),
(
  'd4e5f6a7-b8c9-0123-defa-456789012345',
  'd4e5f6a7-b8c9-0123-defa-456789012345',
  '{"sub":"d4e5f6a7-b8c9-0123-defa-456789012345","email":"site_s003@universalattendance.com"}',
  'email',
  'site_s003@universalattendance.com',
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (provider_id, provider) DO UPDATE SET
  identity_data = EXCLUDED.identity_data,
  updated_at = NOW();
