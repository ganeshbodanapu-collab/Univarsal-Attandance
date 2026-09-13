-- STEP 27.10: Add SELECT policy on login_requests for anon & authenticated users
-- Required for Supabase Realtime broadcast and request status checks on login screen
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'login_requests' 
    AND policyname = 'login_requests_all_select'
  ) THEN
    CREATE POLICY login_requests_all_select ON public.login_requests
      FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;
