-- =========================================
-- ATTENDANCE TABLES
-- =========================================

-- 1. Attendance (Daily Attendance Records & On-Site Cash Disbursements)
CREATE TABLE attendance (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  assignment_id TEXT NOT NULL REFERENCES worker_assignments(id),
  date DATE NOT NULL,
  status attendance_status NOT NULL DEFAULT 'present',
  method attendance_mode NOT NULL DEFAULT 'manual',
  check_in TEXT,
  check_out TEXT,
  photo_url TEXT,
  remarks TEXT,
  marked_by TEXT,
  site_id TEXT REFERENCES sites(id),
  section_id TEXT REFERENCES sections(id),
  site_amount_given NUMERIC(10,2) DEFAULT 0.00,
  site_amount_remarks TEXT,
  site_amount_mode site_amount_mode,
  working_place_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_worker_date UNIQUE(worker_id, date)
);

-- 2. Attendance Audits (Attendance Correction & Change History Log)
CREATE TABLE attendance_audits (
  id TEXT PRIMARY KEY,
  attendance_id TEXT NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
  worker_id TEXT NOT NULL REFERENCES workers(id),
  old_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT NOT NULL
);

-- 3. Attendance Settings (Global Rule Multipliers & Recovery Settings)
CREATE TABLE attendance_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  food_present_rate NUMERIC(5,2) DEFAULT 1.00,
  food_half_day_rate NUMERIC(5,2) DEFAULT 0.50,
  food_absent_rate NUMERIC(5,2) DEFAULT 0.00,
  food_leave_rate NUMERIC(5,2) DEFAULT 0.00,
  wage_present_multiplier NUMERIC(5,2) DEFAULT 1.00,
  wage_half_day_multiplier NUMERIC(5,2) DEFAULT 0.50,
  wage_absent_multiplier NUMERIC(5,2) DEFAULT 0.00,
  commission_present_multiplier NUMERIC(5,2) DEFAULT 1.00,
  commission_half_day_multiplier NUMERIC(5,2) DEFAULT 0.50,
  commission_absent_multiplier NUMERIC(5,2) DEFAULT 0.00,
  allow_daily_recovery BOOLEAN DEFAULT TRUE,
  allow_monthly_recovery BOOLEAN DEFAULT TRUE,
  allow_percentage_recovery BOOLEAN DEFAULT TRUE,
  allow_manual_recovery BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
