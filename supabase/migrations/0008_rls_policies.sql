-- =========================================
-- ROW LEVEL SECURITY & HELPER FUNCTIONS
-- =========================================

-- Helper Function for Auth User Role Resolution
CREATE OR REPLACE FUNCTION get_auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM app_users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper Function for Auth User Site Resolution
CREATE OR REPLACE FUNCTION get_auth_user_site()
RETURNS TEXT AS $$
  SELECT assigned_site_id FROM app_users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Enable Row Level Security on All Tables
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_opening_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE recoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_food_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_payment_requests ENABLE ROW LEVEL SECURITY;

-- =========================================
-- RLS POLICIES BY COMPONENT
-- =========================================

-- 1. Sites
CREATE POLICY sites_select_policy ON sites FOR SELECT TO authenticated USING (true);
CREATE POLICY sites_admin_all_policy ON sites FOR ALL TO authenticated USING (get_auth_user_role() = 'admin');

-- 2. Sections
CREATE POLICY sections_select_policy ON sections FOR SELECT TO authenticated USING (true);
CREATE POLICY sections_admin_all_policy ON sections FOR ALL TO authenticated USING (get_auth_user_role() = 'admin');
CREATE POLICY sections_supervisor_write_policy ON sections FOR ALL TO authenticated USING (get_auth_user_role() = 'supervisor' AND site_id = get_auth_user_site());

-- 3. App Users
CREATE POLICY app_users_admin_all_policy ON app_users FOR ALL TO authenticated USING (get_auth_user_role() = 'admin');
CREATE POLICY app_users_self_select_policy ON app_users FOR SELECT TO authenticated USING (auth_user_id = auth.uid());
CREATE POLICY app_users_self_update_policy ON app_users FOR UPDATE TO authenticated USING (auth_user_id = auth.uid());

-- 4. Referrers
CREATE POLICY referrers_select_policy ON referrers FOR SELECT TO authenticated USING (true);
CREATE POLICY referrers_admin_supervisor_all_policy ON referrers FOR ALL TO authenticated USING (get_auth_user_role() = 'admin' OR get_auth_user_role() = 'supervisor');

-- 5. Workers
CREATE POLICY workers_admin_supervisor_policy ON workers FOR ALL TO authenticated USING (get_auth_user_role() = 'admin' OR current_site_id = get_auth_user_site());

-- 6. Worker Opening Records
CREATE POLICY worker_opening_admin_all_policy ON worker_opening_records FOR ALL TO authenticated USING (get_auth_user_role() = 'admin');
CREATE POLICY worker_opening_supervisor_select_policy ON worker_opening_records FOR SELECT TO authenticated USING (
  get_auth_user_role() = 'admin' OR EXISTS (
    SELECT 1 FROM workers w WHERE w.id = worker_opening_records.worker_id AND w.current_site_id = get_auth_user_site()
  )
);

-- 7. Worker Assignments
CREATE POLICY worker_assignments_admin_supervisor_policy ON worker_assignments FOR ALL TO authenticated USING (get_auth_user_role() = 'admin' OR site_id = get_auth_user_site());

-- 8. Employment History
CREATE POLICY employment_history_admin_supervisor_policy ON employment_history FOR ALL TO authenticated USING (get_auth_user_role() = 'admin' OR site_id = get_auth_user_site());

-- 9. Site Migrations
CREATE POLICY site_migrations_admin_supervisor_policy ON site_migrations FOR ALL TO authenticated USING (
  get_auth_user_role() = 'admin' OR from_site_id = get_auth_user_site() OR to_site_id = get_auth_user_site()
);

-- 10. Attendance
CREATE POLICY attendance_admin_supervisor_policy ON attendance FOR ALL TO authenticated USING (get_auth_user_role() = 'admin' OR site_id = get_auth_user_site());

-- 11. Attendance Audits
CREATE POLICY attendance_audits_admin_supervisor_policy ON attendance_audits FOR ALL TO authenticated USING (
  get_auth_user_role() = 'admin' OR EXISTS (
    SELECT 1 FROM attendance a WHERE a.id = attendance_audits.attendance_id AND a.site_id = get_auth_user_site()
  )
);

-- 12. Attendance Settings
CREATE POLICY attendance_settings_select_policy ON attendance_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY attendance_settings_admin_all_policy ON attendance_settings FOR ALL TO authenticated USING (get_auth_user_role() = 'admin');

-- 13. Advances
CREATE POLICY advances_admin_supervisor_policy ON advances FOR ALL TO authenticated USING (
  get_auth_user_role() = 'admin' OR EXISTS (
    SELECT 1 FROM workers w WHERE w.id = advances.worker_id AND w.current_site_id = get_auth_user_site()
  )
);

-- 14. Recoveries
CREATE POLICY recoveries_admin_supervisor_policy ON recoveries FOR ALL TO authenticated USING (
  get_auth_user_role() = 'admin' OR EXISTS (
    SELECT 1 FROM workers w WHERE w.id = recoveries.worker_id AND w.current_site_id = get_auth_user_site()
  )
);

-- 15. Ledger Entries
CREATE POLICY ledger_entries_admin_supervisor_policy ON ledger_entries FOR ALL TO authenticated USING (
  get_auth_user_role() = 'admin' OR EXISTS (
    SELECT 1 FROM workers w WHERE w.id = ledger_entries.worker_id AND w.current_site_id = get_auth_user_site()
  )
);

-- 16. Worker Payments
CREATE POLICY worker_payments_admin_supervisor_policy ON worker_payments FOR ALL TO authenticated USING (get_auth_user_role() = 'admin' OR site_id = get_auth_user_site());

-- 17. Monthly Settlements
CREATE POLICY monthly_settlements_admin_supervisor_policy ON monthly_settlements FOR ALL TO authenticated USING (get_auth_user_role() = 'admin' OR site_id = get_auth_user_site());

-- 18. Section Food Orders
CREATE POLICY section_food_orders_admin_supervisor_policy ON section_food_orders FOR ALL TO authenticated USING (get_auth_user_role() = 'admin' OR site_id = get_auth_user_site());

-- 19. Commission Payment Requests
CREATE POLICY commission_payment_requests_admin_supervisor_policy ON commission_payment_requests FOR ALL TO authenticated USING (
  get_auth_user_role() = 'admin' OR EXISTS (
    SELECT 1 FROM workers w WHERE w.id = commission_payment_requests.worker_id AND w.current_site_id = get_auth_user_site()
  )
);
