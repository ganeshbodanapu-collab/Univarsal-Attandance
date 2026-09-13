-- =========================================
-- FOOD + COMMISSION TABLES
-- =========================================

-- section_food_orders
CREATE TABLE section_food_orders (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL REFERENCES sections(id),
  site_id TEXT NOT NULL REFERENCES sites(id),
  date DATE NOT NULL,
  meal_type meal_type NOT NULL,
  present_count INTEGER DEFAULT 0,
  absent_count INTEGER DEFAULT 0,
  outside_workers_count INTEGER DEFAULT 0,
  others_count INTEGER DEFAULT 0,
  total_ordered_qty INTEGER DEFAULT 0,
  remarks TEXT,
  pushed_at TIMESTAMPTZ,
  pushed_by TEXT,
  status canteen_order_status NOT NULL DEFAULT 'draft',
  canteen_remarks TEXT,
  packing_started_at TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  dispatched_by TEXT,
  dispatched_qty INTEGER,
  received_qty INTEGER,
  received_at TIMESTAMPTZ,
  received_by TEXT,
  receiving_remarks TEXT,
  shortage_qty INTEGER,
  shortage_reason TEXT,
  re_send_requested_at TIMESTAMPTZ,
  re_send_dispatched_at TIMESTAMPTZ,
  remaining_received_qty INTEGER,
  re_send_received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- commission_payment_requests
CREATE TABLE commission_payment_requests (
  id TEXT PRIMARY KEY,
  referrer_id TEXT NOT NULL REFERENCES referrers(id) ON DELETE CASCADE,
  worker_id TEXT NOT NULL REFERENCES workers(id),
  amount NUMERIC(10,2) NOT NULL,
  date DATE NOT NULL,
  payout_mode payout_mode NOT NULL DEFAULT 'cash',
  upi_number TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_ifsc TEXT,
  status commission_req_status NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
