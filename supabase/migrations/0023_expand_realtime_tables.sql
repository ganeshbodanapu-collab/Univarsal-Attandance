-- =========================================
-- EXPAND REALTIME PUBLICATION TO ALL TABLES
-- =========================================

ALTER TABLE workers REPLICA IDENTITY FULL;
ALTER TABLE sites REPLICA IDENTITY FULL;
ALTER TABLE sections REPLICA IDENTITY FULL;
ALTER TABLE worker_payments REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'workers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE workers;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'sites'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sites;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'sections'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sections;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'worker_payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE worker_payments;
  END IF;
END $$;
