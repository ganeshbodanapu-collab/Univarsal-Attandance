-- =========================================
-- Extensions
-- =========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================
-- Custom Enum Types
-- =========================================

-- User & Authentication Enums
CREATE TYPE user_role AS ENUM ('admin', 'supervisor');
CREATE TYPE user_status AS ENUM ('active', 'inactive');

-- Site & Section Status Enums
CREATE TYPE site_status AS ENUM ('active', 'inactive');
CREATE TYPE section_status AS ENUM ('active', 'inactive');

-- Worker Management Enums
CREATE TYPE worker_type AS ENUM ('company', 'outside');
CREATE TYPE worker_status AS ENUM ('active', 'inactive', 'left');
CREATE TYPE employment_event AS ENUM ('joined', 'left', 'rejoined');
CREATE TYPE migration_type AS ENUM ('temporary', 'permanent');

-- Referrer & Commission Enums
CREATE TYPE referrer_type AS ENUM ('agency', 'seniorEmployee');
CREATE TYPE commission_type AS ENUM ('perDay', 'percentage', 'fixedMonthly');
CREATE TYPE commission_req_status AS ENUM ('pending', 'processing', 'paid', 'rejected');

-- Attendance Enums
CREATE TYPE attendance_mode AS ENUM ('face', 'fingerprint', 'manual');
CREATE TYPE attendance_status AS ENUM ('present', 'halfDay', 'absent', 'leave', 'holiday');
CREATE TYPE site_amount_mode AS ENUM ('cash', 'upi', 'settlement', 'advance');

-- Advances & Financial Ledger Enums
CREATE TYPE recovery_method AS ENUM ('perDay', 'percentage', 'fixedMonthly', 'manual');
CREATE TYPE advance_status AS ENUM ('pending', 'processing', 'active', 'closed', 'rejected');
CREATE TYPE payout_mode AS ENUM ('upi', 'bankTransfer', 'cash');
CREATE TYPE ledger_type AS ENUM ('advance', 'recovery', 'deduction');

-- Wage Payments & Payroll Settlement Enums
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'partiallyPaid', 'paid');
CREATE TYPE settlement_status AS ENUM ('draft', 'reviewed', 'approved', 'paid');

-- Food & Canteen Management Enums
CREATE TYPE meal_type AS ENUM ('morning', 'afternoon', 'night');
CREATE TYPE canteen_order_status AS ENUM (
  'draft',
  'pushed_to_canteen',
  'packing',
  'sent_to_section',
  'received',
  'shortage_resend_requested',
  'remaining_sent'
);
