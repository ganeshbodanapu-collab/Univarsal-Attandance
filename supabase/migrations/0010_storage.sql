-- =========================================
-- SUPABASE STORAGE BUCKET & RLS POLICIES
-- =========================================

-- 1. Create Private Storage Bucket 'universal-attendance'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'universal-attendance',
  'universal-attendance',
  false, -- PRIVATE BUCKET
  10485760, -- 10 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- 2. Drop existing policies if any to prevent duplication conflicts
DROP POLICY IF EXISTS "Authenticated users read storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users update storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete storage objects" ON storage.objects;

-- 3. Storage SELECT Policy: Authenticated Admins & Supervisors can read storage objects
CREATE POLICY "Authenticated users read storage objects"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'universal-attendance' 
  AND (get_auth_user_role() = 'admin' OR get_auth_user_role() = 'supervisor')
);

-- 4. Storage INSERT Policy: Authenticated Admins & Supervisors can upload storage objects
CREATE POLICY "Authenticated users upload storage objects"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'universal-attendance'
  AND (get_auth_user_role() = 'admin' OR get_auth_user_role() = 'supervisor')
);

-- 5. Storage UPDATE Policy: Authenticated Admins & Supervisors can update storage objects
CREATE POLICY "Authenticated users update storage objects"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'universal-attendance'
  AND (get_auth_user_role() = 'admin' OR get_auth_user_role() = 'supervisor')
);

-- 6. Storage DELETE Policy: Admins can delete storage objects
CREATE POLICY "Admin delete storage objects"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'universal-attendance'
  AND get_auth_user_role() = 'admin'
);
