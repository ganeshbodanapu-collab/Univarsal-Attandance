-- =========================================
-- FINANCE TABLES
-- =========================================

-- advances
CREATE TABLE advances (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  reason TEXT NOT NULL,
  recovery_method recovery_method NOT NULL DEFAULT 'perDay',
  daily_recovery_amount NUMERIC(10,2),
  recovery_percentage NUMERIC(5,2),
  fixed_monthly_amount NUMERIC(10,2),
  status advance_status NOT NULL DEFAULT 'pending',
  remarks TEXT,
  section_id TEXT REFERENCES sections(id),
  payout_mode payout_mode,
  upi_number TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_ifsc TEXT,
  worker_signature TEXT,
  supervisor_signature TEXT,
  photo_url TEXT,
  sent_to_finance_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  disbursed_at TIMESTAMPTZ,
  finance_remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- recoveries
CREATE TABLE recoveries (
  id TEXT PRIMARY KEY,
  advance_id TEXT NOT NULL REFERENCES advances(id) ON DELETE CASCADE,
  worker_id TEXT NOT NULL REFERENCES workers(id),
  date DATE NOT NULL,
  attendance_id TEXT REFERENCES attendance(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  method recovery_method NOT NULL,
  is_manual BOOLEAN DEFAULT FALSE,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ledger_entries
CREATE TABLE ledger_entries (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type ledger_type NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  running_balance NUMERIC(10,2) NOT NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- worker_payments
CREATE TABLE worker_payments (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  worker_name TEXT,
  date DATE NOT NULL,
  site_id TEXT NOT NULL REFERENCES sites(id),
  section_id TEXT REFERENCES sections(id),
  attendance_status TEXT,
  gross_wage NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  deductions NUMERIC(10,2) DEFAULT 0.00,
  advance_recovery NUMERIC(10,2) DEFAULT 0.00,
  net_pay NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  status payment_status NOT NULL DEFAULT 'pending',
  remarks TEXT,
  processed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- monthly_settlement_records
CREATE TABLE monthly_settlements (
  id TEXT PRIMARY KEY,
  month TEXT NOT NULL,
  worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  site_id TEXT NOT NULL REFERENCES sites(id),
  section_id TEXT NOT NULL REFERENCES sections(id),
  working_days NUMERIC(5,2) DEFAULT 0,
  present_days NUMERIC(5,2) DEFAULT 0,
  half_days NUMERIC(5,2) DEFAULT 0,
  absent_days NUMERIC(5,2) DEFAULT 0,
  gross_wage NUMERIC(12,2) DEFAULT 0.00,
  advance_taken NUMERIC(12,2) DEFAULT 0.00,
  advance_recovery NUMERIC(12,2) DEFAULT 0.00,
  other_deductions NUMERIC(12,2) DEFAULT 0.00,
  net_pay NUMERIC(12,2) DEFAULT 0.00,
  food_days NUMERIC(5,2) DEFAULT 0,
  commission NUMERIC(12,2) DEFAULT 0.00,
  commission_paid NUMERIC(12,2) DEFAULT 0.00,
  outstanding_advance NUMERIC(12,2) DEFAULT 0.00,
  status settlement_status NOT NULL DEFAULT 'draft',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_month_worker_site_section UNIQUE(month, worker_id, site_id, section_id)
);
