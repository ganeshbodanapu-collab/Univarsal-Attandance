-- STEP 27.8: Remove password_hash requirement from app_users
-- Supabase Auth is the sole password authority. Zero passwords stored in app_users.
ALTER TABLE public.app_users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE public.app_users ALTER COLUMN password_hash SET DEFAULT NULL;
