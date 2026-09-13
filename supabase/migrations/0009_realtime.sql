-- =========================================
-- SUPABASE REALTIME CONFIGURATION
-- =========================================

-- Ensure the supabase_realtime publication exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Set REPLICA IDENTITY FULL for operational tables requiring complete realtime payload streaming
ALTER TABLE attendance REPLICA IDENTITY FULL;
ALTER TABLE section_food_orders REPLICA IDENTITY FULL;
ALTER TABLE advances REPLICA IDENTITY FULL;
ALTER TABLE site_migrations REPLICA IDENTITY FULL;

-- Add specified operational tables to supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE section_food_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE advances;
ALTER PUBLICATION supabase_realtime ADD TABLE site_migrations;
