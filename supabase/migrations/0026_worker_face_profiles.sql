-- Migration 0026: Worker Face Profiles table and RLS policies
CREATE TABLE IF NOT EXISTS public.worker_face_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id TEXT NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
    site_id TEXT REFERENCES public.sites(id) ON DELETE SET NULL,
    section_id TEXT REFERENCES public.sections(id) ON DELETE SET NULL,
    face_template JSONB NOT NULL,
    template_version TEXT DEFAULT 'v1.0',
    is_active BOOLEAN NOT NULL DEFAULT true,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    enrolled_by TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_worker_face_profiles_worker_id ON public.worker_face_profiles(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_face_profiles_active ON public.worker_face_profiles(worker_id, is_active);
CREATE INDEX IF NOT EXISTS idx_worker_face_profiles_site ON public.worker_face_profiles(site_id);

ALTER TABLE public.worker_face_profiles ENABLE ROW LEVEL SECURITY;

-- Admin full access policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'worker_face_profiles' AND policyname = 'Admin full access on worker_face_profiles'
  ) THEN
    CREATE POLICY "Admin full access on worker_face_profiles"
    ON public.worker_face_profiles FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.app_users
        WHERE app_users.auth_user_id = auth.uid()
        AND app_users.role = 'admin'
      )
    );
  END IF;
END $$;

-- Supervisor access restricted to assigned site
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'worker_face_profiles' AND policyname = 'Supervisor access on worker_face_profiles'
  ) THEN
    CREATE POLICY "Supervisor access on worker_face_profiles"
    ON public.worker_face_profiles FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.app_users
        WHERE app_users.auth_user_id = auth.uid()
        AND (
          app_users.role = 'admin'
          OR (
            app_users.role = 'supervisor'
            AND worker_face_profiles.site_id = app_users.assigned_site_id
          )
        )
      )
    );
  END IF;
END $$;
