-- =========================================
-- WORKER MANAGEMENT TABLES
-- =========================================

-- 1. Workers (Employee Master Register)
CREATE TABLE workers (
  id TEXT PRIMARY KEY,
  serial_number TEXT,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  worker_type worker_type NOT NULL DEFAULT 'company',
  current_site_id TEXT NOT NULL REFERENCES sites(id),
  current_section_id TEXT NOT NULL REFERENCES sections(id),
  joining_date DATE NOT NULL,
  last_rejoined_date DATE,
  daily_wage NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  referrer_id TEXT REFERENCES referrers(id) ON DELETE SET NULL,
  commission_type commission_type NOT NULL DEFAULT 'perDay',
  commission_rate NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  attendance_modes TEXT[] DEFAULT '{"manual"}',
  status worker_status NOT NULL DEFAULT 'active',
  emergency_contact TEXT,
  id_proof_number TEXT,
  address TEXT,
  phone_pe_number TEXT,
  bank_name TEXT,
  bank_account_no TEXT,
  bank_ifsc TEXT,
  bank_holder_name TEXT,
  photo_url TEXT,
  face_enrolled BOOLEAN DEFAULT FALSE,
  fingerprint_enrolled BOOLEAN DEFAULT FALSE,
  designation TEXT,
  purpose TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Worker Opening Records (Cutover Prior Service & Opening Balances)
CREATE TABLE worker_opening_records (
  worker_id TEXT PRIMARY KEY REFERENCES workers(id) ON DELETE CASCADE,
  original_joining_date DATE NOT NULL,
  as_of_date DATE NOT NULL,
  prior_working_days NUMERIC(8,2) DEFAULT 0,
  prior_half_days NUMERIC(8,2) DEFAULT 0,
  total_prior_days NUMERIC(8,2) DEFAULT 0,
  prior_earned_wages NUMERIC(12,2) DEFAULT 0.00,
  opening_advance_balance NUMERIC(12,2) DEFAULT 0.00,
  opening_pending_wages NUMERIC(12,2) DEFAULT 0.00,
  net_opening_balance NUMERIC(12,2) DEFAULT 0.00,
  opening_food_meals NUMERIC(8,2) DEFAULT 0,
  remarks TEXT,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Worker Assignments (Site & Section Placement Log)
CREATE TABLE worker_assignments (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  site_id TEXT NOT NULL REFERENCES sites(id),
  section_id TEXT NOT NULL REFERENCES sections(id),
  from_date DATE NOT NULL,
  to_date DATE,
  status TEXT DEFAULT 'active',
  reason TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Employment History (Joining, Exit & Rejoin Audit Log)
CREATE TABLE employment_history (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  event employment_event NOT NULL,
  site_id TEXT NOT NULL REFERENCES sites(id),
  section_id TEXT NOT NULL REFERENCES sections(id),
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Site Migrations (Cross-Site Transfer Log)
CREATE TABLE site_migrations (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  from_site_id TEXT NOT NULL REFERENCES sites(id),
  from_section_id TEXT NOT NULL REFERENCES sections(id),
  to_site_id TEXT NOT NULL REFERENCES sites(id),
  to_section_id TEXT NOT NULL REFERENCES sections(id),
  date DATE NOT NULL,
  migration_type migration_type NOT NULL DEFAULT 'permanent',
  reason TEXT NOT NULL,
  approved_by TEXT NOT NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
