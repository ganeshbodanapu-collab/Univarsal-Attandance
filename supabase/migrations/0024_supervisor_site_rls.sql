-- =========================================================
-- MIGRATION 0024: ENFORCE SUPERVISOR SITE & SECTION RLS ISOLATION
-- =========================================================

DROP POLICY IF EXISTS sites_select_policy ON sites;
DROP POLICY IF EXISTS sites_anon_select_policy ON sites;
DROP POLICY IF EXISTS sections_select_policy ON sections;
DROP POLICY IF EXISTS sections_anon_select_policy ON sections;

-- 1. Sites Select Policies:
-- Admins can SELECT all sites (active or inactive)
-- Supervisors can SELECT ONLY their assigned site
CREATE POLICY sites_select_policy ON sites FOR SELECT TO authenticated USING (
  get_auth_user_role() = 'admin' OR id = get_auth_user_site()
);

-- Anon users (login screen dropdown) can SELECT active sites ONLY
CREATE POLICY sites_anon_select_policy ON sites FOR SELECT TO anon USING (
  status = 'active'
);

-- 2. Sections Select Policies:
-- Admins can SELECT all sections
-- Supervisors can SELECT ONLY sections belonging to their assigned site
CREATE POLICY sections_select_policy ON sections FOR SELECT TO authenticated USING (
  get_auth_user_role() = 'admin' OR site_id = get_auth_user_site()
);

-- Anon users (login screen dropdown) can SELECT sections for active sites
CREATE POLICY sections_anon_select_policy ON sections FOR SELECT TO anon USING (true);
