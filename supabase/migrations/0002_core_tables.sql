-- =========================================
-- CORE TABLES
-- =========================================

-- 1. Sites (Construction Worksite Locations)
CREATE TABLE sites (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  in_charge TEXT NOT NULL,
  mobile TEXT NOT NULL,
  address TEXT,
  status site_status NOT NULL DEFAULT 'active',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Sections (Site Trade/Work Departments)
CREATE TABLE sections (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  in_charge TEXT NOT NULL,
  mobile TEXT NOT NULL,
  status section_status NOT NULL DEFAULT 'active',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_site_section_code UNIQUE(site_id, code)
);

-- 3. App Users (Site Supervisors & System Admins, linked to Supabase Auth)
CREATE TABLE app_users (
  id TEXT PRIMARY KEY,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'supervisor',
  assigned_site_id TEXT REFERENCES sites(id) ON DELETE SET NULL,
  assigned_section_id TEXT REFERENCES sections(id) ON DELETE SET NULL,
  team_name TEXT,
  mobile TEXT,
  email TEXT,
  status user_status NOT NULL DEFAULT 'active',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Referrers (Labor Agencies & Senior Employee Referrers)
CREATE TABLE referrers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  address TEXT,
  status site_status NOT NULL DEFAULT 'active',
  type referrer_type NOT NULL DEFAULT 'agency',
  worker_id TEXT,
  designation TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
