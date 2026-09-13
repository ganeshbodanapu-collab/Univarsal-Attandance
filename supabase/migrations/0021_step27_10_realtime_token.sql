-- STEP 27.10: Add raw_token column to login_requests table
-- Enables direct Realtime delivery of approval tokens to requesting devices (No URL / No Browser)
ALTER TABLE public.login_requests ADD COLUMN IF NOT EXISTS raw_token TEXT;

-- Enable Realtime publication on login_requests table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'login_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.login_requests;
  END IF;
END $$;
