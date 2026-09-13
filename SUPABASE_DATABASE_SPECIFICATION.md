# Universal Attendance & Worker Management System
## Supabase Backend & Database Architecture Specification

> **Document Version**: 1.0.0  
> **Target Project**: Universal Attendance & Worker Management System  
> **Supabase Project URL**: `https://gkphikhsgysoqjradbaz.supabase.co`  
> **Status**: APPROVED ARCHITECTURE SPECIFICATION (DO NOT EXECUTE SQL YET)

---

## Executive Summary & System Overview

This specification defines the production-ready PostgreSQL and Supabase backend architecture for the **Universal Attendance & Worker Management System**. The database schema is derived directly from an exhaustive analysis of the existing React frontend, state management layer (`AttendanceContext`), domain interfaces (`src/types/index.ts`), modals, forms, and business logic.

### Design Principles:
1. **Zero UI Disruption**: Schema field names and data types strictly map to existing TypeScript domain types without altering frontend UI contracts.
2. **Multi-Tenant Site Isolation**: Row Level Security (RLS) isolates Site Supervisor access to their assigned `site_id` and `section_id` while providing Central Admins complete read/write access.
3. **Data Integrity & Traceability**: Foreign keys, check constraints, default values, audit trails, and automated `updated_at` triggers enforce ledger-grade consistency across daily attendance, wage calculations, advance recoveries, and food indents.
4. **Hybrid Storage & Offline Capability**: Designed to work seamlessly with Supabase Realtime subscriptions and local caching (`localStorage`) fallbacks.

---

## Frontend Module Analysis & Backend Requirements

| Frontend Module | Primary Screens & Modals | Key Data Entities | Required Backend Operations |
| :--- | :--- | :--- | :--- |
| **Authentication & Access** | Central Admin Login, Supervisor Site Selector | `AppUser` | `SELECT` (Auth), `UPDATE` (Last Login), `INSERT/UPDATE/DELETE` (Supervisor Accounts) |
| **Sites & Sections** | Sites Page, Section Modals, Status Toggles | `Site`, `Section` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` (Soft/Hard) |
| **Worker Management** | Worker List, Worker Profile, Onboarding Form, Opening Balances, Site Transfers, Rejoin/Leave Modals | `Worker`, `WorkerOpeningRecord`, `WorkerAssignment`, `EmploymentHistory`, `SiteMigrationRecord` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` (Soft), Storage upload (Photos) |
| **Attendance & Biometrics** | Daily Attendance Grid, Bulk Mark Attendance, Audit History, Face/Fingerprint Verification | `Attendance`, `AttendanceAudit`, `AttendanceSettings` | `SELECT`, `INSERT`, `UPDATE`, `DELETE`, Realtime updates |
| **Advances & Loans** | Advance Requests, Finance Payout Processing, Manual Recovery Modal, Ledger History | `Advance`, `Recovery`, `LedgerEntry` | `SELECT`, `INSERT`, `UPDATE`, `DELETE`, Storage upload (Signatures & Proofs) |
| **Food & Canteen** | Section Food Indent, Kitchen Packing, Dispatch, Section Receive Verification, Shortage Re-send | `SectionFoodOrder` | `SELECT`, `INSERT`, `UPDATE`, Realtime updates |
| **Referrers & Commission**| Referrers List, Commission Calculator, Commission Payment Requests | `Referrer`, `CommissionPaymentRequest` | `SELECT`, `INSERT`, `UPDATE` |
| **Payments & Settlements** | Daily Worker Payments, Monthly Settlement Rollup, Wage & Recovery Review | `WorkerPayment`, `MonthlySettlementRecord` | `SELECT`, `INSERT`, `UPDATE` |
| **Dashboard & Reports** | Executive Summary, Daily Trends, Attendance Registers, Advance Reports, Food Summaries | All Entities | Aggregate `SELECT` Queries, Views, Index-optimized filtering |

---

## Proposed Database Schema Architecture

### Custom PostgreSQL ENUM Types
```sql
CREATE TYPE user_role AS ENUM ('admin', 'supervisor');
CREATE TYPE user_status AS ENUM ('active', 'inactive');
CREATE TYPE site_status AS ENUM ('active', 'inactive');
CREATE TYPE section_status AS ENUM ('active', 'inactive');
CREATE TYPE worker_type AS ENUM ('company', 'outside');
CREATE TYPE worker_status AS ENUM ('active', 'inactive', 'left');
CREATE TYPE commission_type AS ENUM ('perDay', 'percentage', 'fixedMonthly');
CREATE TYPE attendance_mode AS ENUM ('face', 'fingerprint', 'manual');
CREATE TYPE attendance_status AS ENUM ('present', 'halfDay', 'absent', 'leave', 'holiday');
CREATE TYPE site_amount_mode AS ENUM ('cash', 'upi', 'settlement', 'advance');
CREATE TYPE migration_type AS ENUM ('temporary', 'permanent');
CREATE TYPE employment_event AS ENUM ('joined', 'left', 'rejoined');
CREATE TYPE referrer_type AS ENUM ('agency', 'seniorEmployee');
CREATE TYPE recovery_method AS ENUM ('perDay', 'percentage', 'fixedMonthly', 'manual');
CREATE TYPE advance_status AS ENUM ('pending', 'processing', 'active', 'closed', 'rejected');
CREATE TYPE payout_mode AS ENUM ('upi', 'bankTransfer', 'cash');
CREATE TYPE ledger_type AS ENUM ('advance', 'recovery', 'deduction');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'partiallyPaid', 'paid');
CREATE TYPE settlement_status AS ENUM ('draft', 'reviewed', 'approved', 'paid');
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
CREATE TYPE commission_req_status AS ENUM ('pending', 'processing', 'paid', 'rejected');
```

---

## Detailed Table Specifications

### 1. `app_users` (Site Supervisors & Admins)
- **Primary Key**: `id` (TEXT, e.g., `'U001'`)
- **Supabase Auth Link**: `auth_user_id` (UUID, FK -> `auth.users(id)` ON DELETE SET NULL)
- **Columns**:
  - `id` (TEXT, PRIMARY KEY)
  - `auth_user_id` (UUID, UNIQUE, NULLABLE)
  - `username` (TEXT, UNIQUE, NOT NULL)
  - `password_hash` (TEXT, NOT NULL)
  - `name` (TEXT, NOT NULL)
  - `role` (user_role, NOT NULL DEFAULT 'supervisor')
  - `assigned_site_id` (TEXT, FK -> `sites(id)` ON DELETE SET NULL)
  - `assigned_section_id` (TEXT, FK -> `sections(id)` ON DELETE SET NULL)
  - `team_name` (TEXT)
  - `mobile` (TEXT)
  - `email` (TEXT)
  - `status` (user_status, NOT NULL DEFAULT 'active')
  - `last_login` (TIMESTAMPTZ)
  - `created_at` (TIMESTAMPTZ, DEFAULT NOW())
  - `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

### 2. `sites` (Construction Worksite Locations)
- **Columns**:
  - `id` (TEXT, PRIMARY KEY) -- e.g., 'S001'
  - `code` (TEXT, UNIQUE, NOT NULL)
  - `name` (TEXT, NOT NULL)
  - `location` (TEXT, NOT NULL)
  - `in_charge` (TEXT, NOT NULL)
  - `mobile` (TEXT, NOT NULL)
  - `address` (TEXT)
  - `status` (site_status, NOT NULL DEFAULT 'active')
  - `remarks` (TEXT)
  - `created_at` (TIMESTAMPTZ, DEFAULT NOW())
  - `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

### 3. `sections` (Site Trade/Work Departments)
- **Columns**:
  - `id` (TEXT, PRIMARY KEY) -- e.g., 'SEC001'
  - `code` (TEXT, NOT NULL)
  - `name` (TEXT, NOT NULL)
  - `site_id` (TEXT, NOT NULL, FK -> `sites(id)` ON DELETE CASCADE)
  - `in_charge` (TEXT, NOT NULL)
  - `mobile` (TEXT, NOT NULL)
  - `status` (section_status, NOT NULL DEFAULT 'active')
  - `remarks` (TEXT)
  - `created_at` (TIMESTAMPTZ, DEFAULT NOW())
  - `updated_at` (TIMESTAMPTZ, DEFAULT NOW())
- **Constraints**: UNIQUE(`site_id`, `code`)

### 4. `referrers` (Agencies & Senior Employee Referrers)
- **Columns**:
  - `id` (TEXT, PRIMARY KEY) -- e.g., 'REF001'
  - `name` (TEXT, NOT NULL)
  - `mobile` (TEXT, NOT NULL)
  - `address` (TEXT)
  - `status` (site_status, NOT NULL DEFAULT 'active')
  - `type` (referrer_type, NOT NULL DEFAULT 'agency')
  - `worker_id` (TEXT) -- linked worker ID if senior employee
  - `designation` (TEXT)
  - `remarks` (TEXT)
  - `created_at` (TIMESTAMPTZ, DEFAULT NOW())
  - `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

### 5. `workers` (Employee Master Register)
- **Columns**:
  - `id` (TEXT, PRIMARY KEY) -- e.g., 'W001' or '01BGM - Ganesh 7890'
  - `serial_number` (TEXT)
  - `name` (TEXT, NOT NULL)
  - `mobile` (TEXT, NOT NULL)
  - `worker_type` (worker_type, NOT NULL DEFAULT 'company')
  - `current_site_id` (TEXT, NOT NULL, FK -> `sites(id)`)
  - `current_section_id` (TEXT, NOT NULL, FK -> `sections(id)`)
  - `joining_date` (DATE, NOT NULL)
  - `last_rejoined_date` (DATE)
  - `daily_wage` (NUMERIC(10,2), NOT NULL DEFAULT 0.00)
  - `referrer_id` (TEXT, FK -> `referrers(id)` ON DELETE SET NULL)
  - `commission_type` (commission_type, NOT NULL DEFAULT 'perDay')
  - `commission_rate` (NUMERIC(10,2), NOT NULL DEFAULT 0.00)
  - `attendance_modes` (TEXT[], DEFAULT '{"manual"}')
  - `status` (worker_status, NOT NULL DEFAULT 'active')
  - `emergency_contact` (TEXT)
  - `id_proof_number` (TEXT)
  - `address` (TEXT)
  - `phone_pe_number` (TEXT)
  - `bank_name` (TEXT)
  - `bank_account_no` (TEXT)
  - `bank_ifsc` (TEXT)
  - `bank_holder_name` (TEXT)
  - `photo_url` (TEXT)
  - `face_enrolled` (BOOLEAN, DEFAULT FALSE)
  - `fingerprint_enrolled` (BOOLEAN, DEFAULT FALSE)
  - `designation` (TEXT)
  - `purpose` (TEXT)
  - `remarks` (TEXT)
  - `created_at` (TIMESTAMPTZ, DEFAULT NOW())
  - `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

### 6. `worker_opening_records` (Cutover & Historical Balances)
- **Columns**:
  - `worker_id` (TEXT, PRIMARY KEY, FK -> `workers(id)` ON DELETE CASCADE)
  - `original_joining_date` (DATE, NOT NULL)
  - `as_of_date` (DATE, NOT NULL)
  - `prior_working_days` (NUMERIC(8,2), DEFAULT 0)
  - `prior_half_days` (NUMERIC(8,2), DEFAULT 0)
  - `total_prior_days` (NUMERIC(8,2), DEFAULT 0)
  - `prior_earned_wages` (NUMERIC(12,2), DEFAULT 0.00)
  - `opening_advance_balance` (NUMERIC(12,2), DEFAULT 0.00)
  - `opening_pending_wages` (NUMERIC(12,2), DEFAULT 0.00)
  - `net_opening_balance` (NUMERIC(12,2), DEFAULT 0.00)
  - `opening_food_meals` (NUMERIC(8,2), DEFAULT 0)
  - `remarks` (TEXT)
  - `updated_by` (TEXT)
  - `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

### 7. `worker_assignments` (Site & Section Placement Log)
- **Columns**:
  - `id` (TEXT, PRIMARY KEY)
  - `worker_id` (TEXT, NOT NULL, FK -> `workers(id)` ON DELETE CASCADE)
  - `site_id` (TEXT, NOT NULL, FK -> `sites(id)`)
  - `section_id` (TEXT, NOT NULL, FK -> `sections(id)`)
  - `from_date` (DATE, NOT NULL)
  - `to_date` (DATE) -- NULL = currently active assignment
  - `status` (TEXT, DEFAULT 'active')
  - `reason` (TEXT)
  - `remarks` (TEXT)
  - `created_at` (TIMESTAMPTZ, DEFAULT NOW())

### 8. `employment_history` (Joining, Exit & Rejoin Audit)
- **Columns**:
  - `id` (TEXT, PRIMARY KEY)
  - `worker_id` (TEXT, NOT NULL, FK -> `workers(id)` ON DELETE CASCADE)
  - `date` (DATE, NOT NULL)
  - `event` (employment_event, NOT NULL)
  - `site_id` (TEXT, NOT NULL, FK -> `sites(id)`)
  - `section_id` (TEXT, NOT NULL, FK -> `sections(id)`)
  - `remarks` (TEXT)
  - `created_at` (TIMESTAMPTZ, DEFAULT NOW())

### 9. `site_migrations` (Cross-Site Transfer Log)
- **Columns**:
  - `id` (TEXT, PRIMARY KEY)
  - `worker_id` (TEXT, NOT NULL, FK -> `workers(id)` ON DELETE CASCADE)
  - `from_site_id` (TEXT, NOT NULL, FK -> `sites(id)`)
  - `from_section_id` (TEXT, NOT NULL, FK -> `sections(id)`)
  - `to_site_id` (TEXT, NOT NULL, FK -> `sites(id)`)
  - `to_section_id` (TEXT, NOT NULL, FK -> `sections(id)`)
  - `date` (DATE, NOT NULL)
  - `migration_type` (migration_type, NOT NULL DEFAULT 'permanent')
  - `reason` (TEXT, NOT NULL)
  - `approved_by` (TEXT, NOT NULL)
  - `remarks` (TEXT)
  - `created_at` (TIMESTAMPTZ, DEFAULT NOW())

### 10. `attendance` (Daily Attendance & On-Site Disbursements)
- **Columns**:
  - `id` (TEXT, PRIMARY KEY)
  - `worker_id` (TEXT, NOT NULL, FK -> `workers(id)` ON DELETE CASCADE)
  - `assignment_id` (TEXT, NOT NULL, FK -> `worker_assignments(id)`)
  - `date` (DATE, NOT NULL)
  - `status` (attendance_status, NOT NULL DEFAULT 'present')
  - `method` (attendance_mode, NOT NULL DEFAULT 'manual')
  - `check_in` (TEXT)
  - `check_out` (TEXT)
  - `photo_url` (TEXT)
  - `remarks` (TEXT)
  - `marked_by` (TEXT)
  - `site_id` (TEXT, FK -> `sites(id)`)
  - `section_id` (TEXT, FK -> `sections(id)`)
  - `site_amount_given` (NUMERIC(10,2), DEFAULT 0.00)
  - `site_amount_remarks` (TEXT)
  - `site_amount_mode` (site_amount_mode)
  - `working_place_note` (TEXT)
  - `created_at` (TIMESTAMPTZ, DEFAULT NOW())
  - `updated_at` (TIMESTAMPTZ, DEFAULT NOW())
- **Constraints**: UNIQUE(`worker_id`, `date`)

### 11. `attendance_audits` (Attendance Correction Tracking)
- **Columns**:
  - `id` (TEXT, PRIMARY KEY)
  - `attendance_id` (TEXT, NOT NULL, FK -> `attendance(id)` ON DELETE CASCADE)
  - `worker_id` (TEXT, NOT NULL, FK -> `workers(id)`)
  - `old_status` (TEXT, NOT NULL)
  - `new_status` (TEXT, NOT NULL)
  - `changed_by` (TEXT, NOT NULL)
  - `changed_at` (TIMESTAMPTZ, DEFAULT NOW())
  - `reason` (TEXT, NOT NULL)

### 12. `attendance_settings` (Global Rates & Rule Multipliers)
- **Columns**:
  - `id` (INTEGER, PRIMARY KEY DEFAULT 1)
  - `food_present_rate` (NUMERIC(5,2), DEFAULT 1.00)
  - `food_half_day_rate` (NUMERIC(5,2), DEFAULT 0.50)
  - `food_absent_rate` (NUMERIC(5,2), DEFAULT 0.00)
  - `food_leave_rate` (NUMERIC(5,2), DEFAULT 0.00)
  - `wage_present_multiplier` (NUMERIC(5,2), DEFAULT 1.00)
  - `wage_half_day_multiplier` (NUMERIC(5,2), DEFAULT 0.50)
  - `wage_absent_multiplier` (NUMERIC(5,2), DEFAULT 0.00)
  - `commission_present_multiplier` (NUMERIC(5,2), DEFAULT 1.00)
  - `commission_half_day_multiplier` (NUMERIC(5,2), DEFAULT 0.50)
  - `commission_absent_multiplier` (NUMERIC(5,2), DEFAULT 0.00)
  - `allow_daily_recovery` (BOOLEAN, DEFAULT TRUE)
  - `allow_monthly_recovery` (BOOLEAN, DEFAULT TRUE)
  - `allow_percentage_recovery` (BOOLEAN, DEFAULT TRUE)
  - `allow_manual_recovery` (BOOLEAN, DEFAULT TRUE)
  - `updated_at` (TIMESTAMPTZ, DEFAULT NOW())
- **Constraints**: CHECK(`id` = 1)

### 13. `advances` (Loans & Salary Advances)
- **Columns**:
  - `id` (TEXT, PRIMARY KEY) -- e.g., 'ADV001'
  - `worker_id` (TEXT, NOT NULL, FK -> `workers(id)` ON DELETE CASCADE)
  - `date` (DATE, NOT NULL)
  - `amount` (NUMERIC(10,2), NOT NULL)
  - `reason` (TEXT, NOT NULL)
  - `recovery_method` (recovery_method, NOT NULL DEFAULT 'perDay')
  - `daily_recovery_amount` (NUMERIC(10,2))
  - `recovery_percentage` (NUMERIC(5,2))
  - `fixed_monthly_amount` (NUMERIC(10,2))
  - `status` (advance_status, NOT NULL DEFAULT 'pending')
  - `remarks` (TEXT)
  - `section_id` (TEXT, FK -> `sections(id)`)
  - `payout_mode` (payout_mode)
  - `upi_number` (TEXT)
  - `bank_name` (TEXT)
  - `bank_account_number` (TEXT)
  - `bank_ifsc` (TEXT)
  - `worker_signature` (TEXT)
  - `supervisor_signature` (TEXT)
  - `photo_url` (TEXT)
  - `sent_to_finance_at` (TIMESTAMPTZ)
  - `processed_at` (TIMESTAMPTZ)
  - `disbursed_at` (TIMESTAMPTZ)
  - `finance_remarks` (TEXT)
  - `created_at` (TIMESTAMPTZ, DEFAULT NOW())
  - `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

### 14. `recoveries` (Advance Repayments)
- **Columns**:
  - `id` (TEXT, PRIMARY KEY)
  - `advance_id` (TEXT, NOT NULL, FK -> `advances(id)` ON DELETE CASCADE)
  - `worker_id` (TEXT, NOT NULL, FK -> `workers(id)`)
  - `date` (DATE, NOT NULL)
  - `attendance_id` (TEXT, FK -> `attendance(id)` ON DELETE SET NULL)
  - `amount` (NUMERIC(10,2), NOT NULL)
  - `method` (recovery_method, NOT NULL)
  - `is_manual` (BOOLEAN, DEFAULT FALSE)
  - `remarks` (TEXT)
  - `created_at` (TIMESTAMPTZ, DEFAULT NOW())

### 15. `ledger_entries` (Worker Financial Ledger)
- **Columns**:
  - `id` (TEXT, PRIMARY KEY)
  - `worker_id` (TEXT, NOT NULL, FK -> `workers(id)` ON DELETE CASCADE)
  - `date` (DATE, NOT NULL)
  - `type` (ledger_type, NOT NULL)
  - `amount` (NUMERIC(10,2), NOT NULL)
  - `running_balance` (NUMERIC(10,2), NOT NULL)
  - `remarks` (TEXT)
  - `created_at` (TIMESTAMPTZ, DEFAULT NOW())

### 16. `worker_payments` (Daily/Weekly Wage Disburals)
- **Columns**:
  - `id` (TEXT, PRIMARY KEY)
  - `worker_id` (TEXT, NOT NULL, FK -> `workers(id)` ON DELETE CASCADE)
  - `worker_name` (TEXT)
  - `date` (DATE, NOT NULL)
  - `site_id` (TEXT, NOT NULL, FK -> `sites(id)`)
  - `section_id` (TEXT, FK -> `sections(id)`)
  - `attendance_status` (TEXT)
  - `gross_wage` (NUMERIC(10,2), NOT NULL DEFAULT 0.00)
  - `deductions` (NUMERIC(10,2), DEFAULT 0.00)
  - `advance_recovery` (NUMERIC(10,2), DEFAULT 0.00)
  - `net_pay` (NUMERIC(10,2), NOT NULL DEFAULT 0.00)
  - `payment_method` (TEXT, NOT NULL DEFAULT 'cash')
  - `status` (payment_status, NOT NULL DEFAULT 'pending')
  - `remarks` (TEXT)
  - `processed_at` (TIMESTAMPTZ)
  - `paid_at` (TIMESTAMPTZ)
  - `created_at` (TIMESTAMPTZ, DEFAULT NOW())

### 17. `monthly_settlements` (Monthly Payroll Audit Records)
- **Columns**:
  - `id` (TEXT, PRIMARY KEY)
  - `month` (TEXT, NOT NULL) -- YYYY-MM
  - `worker_id` (TEXT, NOT NULL, FK -> `workers(id)` ON DELETE CASCADE)
  - `site_id` (TEXT, NOT NULL, FK -> `sites(id)`)
  - `section_id` (TEXT, NOT NULL, FK -> `sections(id)`)
  - `working_days` (NUMERIC(5,2), DEFAULT 0)
  - `present_days` (NUMERIC(5,2), DEFAULT 0)
  - `half_days` (NUMERIC(5,2), DEFAULT 0)
  - `absent_days` (NUMERIC(5,2), DEFAULT 0)
  - `gross_wage` (NUMERIC(12,2), DEFAULT 0.00)
  - `advance_taken` (NUMERIC(12,2), DEFAULT 0.00)
  - `advance_recovery` (NUMERIC(12,2), DEFAULT 0.00)
  - `other_deductions` (NUMERIC(12,2), DEFAULT 0.00)
  - `net_pay` (NUMERIC(12,2), DEFAULT 0.00)
  - `food_days` (NUMERIC(5,2), DEFAULT 0)
  - `commission` (NUMERIC(12,2), DEFAULT 0.00)
  - `commission_paid` (NUMERIC(12,2), DEFAULT 0.00)
  - `outstanding_advance` (NUMERIC(12,2), DEFAULT 0.00)
  - `status` (settlement_status, NOT NULL DEFAULT 'draft')
  - `remarks` (TEXT)
  - `created_at` (TIMESTAMPTZ, DEFAULT NOW())
  - `updated_at` (TIMESTAMPTZ, DEFAULT NOW())
- **Constraints**: UNIQUE(`month`, `worker_id`, `site_id`, `section_id`)

### 18. `section_food_orders` (Canteen Meal Orders & Dispatches)
- **Columns**:
  - `id` (TEXT, PRIMARY KEY) -- e.g., 'FO-SEC001-2026-08-28-morning'
  - `section_id` (TEXT, NOT NULL, FK -> `sections(id)`)
  - `site_id` (TEXT, NOT NULL, FK -> `sites(id)`)
  - `date` (DATE, NOT NULL)
  - `meal_type` (meal_type, NOT NULL)
  - `present_count` (INTEGER, DEFAULT 0)
  - `absent_count` (INTEGER, DEFAULT 0)
  - `outside_workers_count` (INTEGER, DEFAULT 0)
  - `others_count` (INTEGER, DEFAULT 0)
  - `total_ordered_qty` (INTEGER, DEFAULT 0)
  - `remarks` (TEXT)
  - `pushed_at` (TIMESTAMPTZ)
  - `pushed_by` (TEXT)
  - `status` (canteen_order_status, NOT NULL DEFAULT 'draft')
  - `canteen_remarks` (TEXT)
  - `packing_started_at` (TIMESTAMPTZ)
  - `dispatched_at` (TIMESTAMPTZ)
  - `dispatched_by` (TEXT)
  - `dispatched_qty` (INTEGER)
  - `received_qty` (INTEGER)
  - `received_at` (TIMESTAMPTZ)
  - `received_by` (TEXT)
  - `receiving_remarks` (TEXT)
  - `shortage_qty` (INTEGER)
  - `shortage_reason` (TEXT)
  - `re_send_requested_at` (TIMESTAMPTZ)
  - `re_send_dispatched_at` (TIMESTAMPTZ)
  - `remaining_received_qty` (INTEGER)
  - `re_send_received_at` (TIMESTAMPTZ)
  - `created_at` (TIMESTAMPTZ, DEFAULT NOW())
  - `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

### 19. `commission_payment_requests` (Referrer Commission Payouts)
- **Columns**:
  - `id` (TEXT, PRIMARY KEY) -- e.g., 'COM-REQ-001'
  - `referrer_id` (TEXT, NOT NULL, FK -> `referrers(id)` ON DELETE CASCADE)
  - `worker_id` (TEXT, NOT NULL, FK -> `workers(id)`)
  - `amount` (NUMERIC(10,2), NOT NULL)
  - `date` (DATE, NOT NULL)
  - `payout_mode` (payout_mode, NOT NULL DEFAULT 'cash')
  - `upi_number` (TEXT)
  - `bank_name` (TEXT)
  - `bank_account_number` (TEXT)
  - `bank_ifsc` (TEXT)
  - `status` (commission_req_status, NOT NULL DEFAULT 'pending')
  - `requested_at` (TIMESTAMPTZ, DEFAULT NOW())
  - `processed_at` (TIMESTAMPTZ)
  - `paid_at` (TIMESTAMPTZ)
  - `remarks` (TEXT)
  - `created_at` (TIMESTAMPTZ, DEFAULT NOW())

---

## Performance Indexes Plan

```sql
CREATE INDEX idx_workers_site_section ON workers(current_site_id, current_section_id);
CREATE INDEX idx_workers_status ON workers(status);
CREATE INDEX idx_attendance_date_site ON attendance(date, site_id);
CREATE INDEX idx_attendance_worker_date ON attendance(worker_id, date);
CREATE INDEX idx_advances_worker_status ON advances(worker_id, status);
CREATE INDEX idx_recoveries_advance_id ON recoveries(advance_id);
CREATE INDEX idx_food_orders_date_site ON section_food_orders(date, site_id, section_id);
CREATE INDEX idx_assignments_worker ON worker_assignments(worker_id, to_date);
CREATE INDEX idx_settlements_month_site ON monthly_settlements(month, site_id);
```

---

## Required Sub-Sections (A - H)

### A. Database ER Relationship Structure

```mermaid
erDiagram
    SITES ||--o{ SECTIONS : "has sections"
    SITES ||--o{ WORKERS : "houses current workers"
    SECTIONS ||--o{ WORKERS : "houses current workers"
    WORKERS ||--o{ WORKER_ASSIGNMENTS : "has placements"
    WORKERS ||--o{ EMPLOYMENT_HISTORY : "logs lifecycle events"
    WORKERS ||--o1 WORKER_OPENING_RECORDS : "has opening balance"
    WORKERS ||--o{ ATTENDANCE : "marks daily attendance"
    SITES ||--o{ ATTENDANCE : "recorded at site"
    SECTIONS ||--o{ ATTENDANCE : "recorded at section"
    ATTENDANCE ||--o{ ATTENDANCE_AUDITS : "tracked in audits"
    REFERRERS ||--o{ WORKERS : "refers workers"
    WORKERS ||--o{ ADVANCES : "borrows loan"
    ADVANCES ||--o{ RECOVERIES : "repays via deductions"
    WORKERS ||--o{ RECOVERIES : "credited to worker"
    ATTENDANCE ||--o| RECOVERIES : "auto-recovered from wage"
    WORKERS ||--o{ LEDGER_ENTRIES : "financial transaction history"
    WORKERS ||--o{ WORKER_PAYMENTS : "receives wage payments"
    WORKERS ||--o{ MONTHLY_SETTLEMENTS : "settled monthly"
    SECTIONS ||--o{ SECTION_FOOD_ORDERS : "places food indents"
    SITES ||--o{ SECTION_FOOD_ORDERS : "site canteen orders"
    REFERRERS ||--o{ COMMISSION_PAYMENT_REQUESTS : "receives commission"
    SITES ||--o{ APP_USERS : "assigned to site"
    SECTIONS ||--o{ APP_USERS : "assigned to section"
```

---

### B. Complete Table List Summary

| Table Name | Primary Purpose | Record Sensitivity & RLS |
| :--- | :--- | :--- |
| `app_users` | User credentials, roles & site assignments | Admin Only write; Supervisor read self |
| `sites` | Worksite locations | Public Read; Admin Write |
| `sections` | Trade/Work departments per site | Public Read; Admin/Supervisor Write assigned |
| `referrers` | Labor agencies & employee referrers | Public Read; Admin/Supervisor Write |
| `workers` | Employee Master Register | Site Isolation RLS |
| `worker_opening_records` | Cutover prior service & opening loans | Admin Only Write |
| `worker_assignments` | Worker placement log by date | Site Isolation RLS |
| `employment_history` | Onboarding, exit & rejoin events | Site Isolation RLS |
| `site_migrations` | Cross-site transfer history | Admin / Transferring Supervisor Write |
| `attendance` | Daily attendance & site cash disbursements | Site Isolation RLS (Supervisor write assigned) |
| `attendance_audits` | Correction tracking & change reasons | Site Isolation RLS |
| `attendance_settings` | Global rates, food counts & recovery rules | Admin Write; All Read |
| `advances` | Advance loans & payment submissions | Site Isolation RLS |
| `recoveries` | Manual & automatic wage advance recoveries | Site Isolation RLS |
| `ledger_entries` | Running balance ledger | Site Isolation RLS |
| `worker_payments` | Daily wage disbursal logs | Site Isolation RLS |
| `monthly_settlements` | Monthly payroll & audit rollups | Site Isolation RLS |
| `section_food_orders` | Canteen food indents & dispatch tracking | Site & Kitchen RLS |
| `commission_payment_requests`| Referrer payout requests | Admin Write / Review |

---

### C. Frontend-to-Database Mapping

| Frontend Page / Component | Frontend UI Element / Action | Database Table | Operation Type | Key Input/Output Fields |
| :--- | :--- | :--- | :--- | :--- |
| `src/pages/auth/Login.tsx` | User Login Form | `app_users` | `SELECT` | `username`, `password_hash`, `role`, `assigned_site_id` |
| `src/pages/sites/Sites.tsx` | "+ Add Site" Modal | `sites` | `INSERT` | `code`, `name`, `location`, `in_charge`, `mobile` |
| `src/pages/sections/Sections.tsx` | "+ Add Section" Modal | `sections` | `INSERT` | `site_id`, `code`, `name`, `in_charge`, `mobile` |
| `src/pages/workers/Workers.tsx` | "+ Add Employee" Modal | `workers`, `worker_assignments`, `employment_history` | `INSERT` (Transaction) | `name`, `mobile`, `daily_wage`, `current_site_id`, `current_section_id` |
| `src/pages/workers/OpeningEmployees.tsx` | "Save Opening Balance" Form | `worker_opening_records` | `INSERT` / `UPDATE` | `worker_id`, `prior_working_days`, `opening_advance_balance`, `net_opening_balance` |
| `src/pages/workers/WorkerProfile.tsx` | Transfer / Rejoin / Exit Modals | `site_migrations`, `employment_history`, `workers` | `INSERT` & `UPDATE` | `worker_id`, `to_site_id`, `to_section_id`, `reason` |
| `src/pages/attendance/AttendanceList.tsx` | Bulk Attendance Table | `attendance`, `attendance_audits`, `recoveries` | `INSERT` / `UPDATE` | `date`, `site_id`, `section_id`, `worker_id`, `status`, `site_amount_given` |
| `src/pages/advances/Advances.tsx` | "Request Advance" & Finance Payout | `advances` | `INSERT` / `UPDATE` | `worker_id`, `amount`, `recovery_method`, `payout_mode`, `signatures` |
| `src/pages/food/Food.tsx` | Food Indent & Kitchen Receiving | `section_food_orders` | `INSERT` / `UPDATE` | `section_id`, `meal_type`, `total_ordered_qty`, `status`, `dispatched_qty`, `received_qty` |
| `src/pages/commission/Commission.tsx` | Commission Payment Request | `commission_payment_requests` | `INSERT` / `UPDATE` | `referrer_id`, `worker_id`, `amount`, `payout_mode`, `status` |
| `src/pages/settings/Settings.tsx` | Add/Edit Site Supervisor Account | `app_users` | `INSERT` / `UPDATE` / `DELETE` | `username`, `password_hash`, `role`, `assigned_site_id`, `assigned_section_id` |

---

### D. RLS & Security Plan

#### Helper Function for Auth User Site Resolution
```sql
CREATE OR REPLACE FUNCTION get_auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM app_users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_auth_user_site()
RETURNS TEXT AS $$
  SELECT assigned_site_id FROM app_users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

#### Row Level Security Policies Syntax Example
1. **Admin Access**:
   ```sql
   CREATE POLICY admin_all_workers ON workers
     FOR ALL TO authenticated
     USING (get_auth_user_role() = 'admin');
   ```
2. **Supervisor Site Isolation**:
   ```sql
   CREATE POLICY supervisor_assigned_workers ON workers
     FOR ALL TO authenticated
     USING (
       get_auth_user_role() = 'admin' OR 
       current_site_id = get_auth_user_site()
     );
   ```

---

### E. Storage Plan (Supabase Storage Buckets)

| Bucket Name | Public Access | Target Artifacts | Security Policy |
| :--- | :--- | :--- | :--- |
| `worker-photos` | Public Read | Worker profile photos & ID Proofs | Authenticated users upload; Public read |
| `attendance-photos` | Private | Facial verification capture photos | Site Supervisors & Admins read/upload |
| `advance-proofs` | Private | Finance payment receipts & screenshots | Finance / Admin & Site Supervisors |
| `signatures` | Private | Digital signatures (Worker & Supervisor) | Authenticated upload; Private read |

---

### F. Realtime Plan

Enable Supabase Realtime subscriptions on specific tables to synchronize across devices without page reloads:
1. `attendance`: Notify Site Supervisors instantly when face/fingerprint attendance is recorded.
2. `section_food_orders`: Realtime updates between Section Supervisors and Kitchen Canteen staff as food passes through `packing` -> `sent_to_section` -> `received` -> `shortage_resend_requested`.
3. `advances`: Notify supervisors when Finance updates advance payment status (`processing` -> `active`).
4. `site_migrations`: Realtime transfer notification when an employee is migrated to a new site.

---

### G. Authentication & Roles Plan

1. **Central Admin Role (`admin`)**:
   - Access to Central Portal (`targetSiteId === 'admin'`).
   - Unrestricted read/write access to all sites, sections, workers, settlements, advances, and supervisor user accounts.
2. **Site Supervisor Role (`supervisor`)**:
   - Restricted login to their specific assigned site (`assigned_site_id`).
   - Full control over their assigned site's daily attendance, section food indents, advance loan requests, and local payment records.
   - Restricted from editing global settings, deleting site master records, or altering historical cutover opening balances.

---

### H. Complete SQL Creation Script (Reference Specification - DO NOT EXECUTE YET)

```sql
-- ============================================================================
-- UNIVERSAL ATTENDANCE & WORKER MANAGEMENT SYSTEM
-- COMPLETE SUPABASE POSTGRESQL DDL SPECIFICATION
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CUSTOM ENUMS
CREATE TYPE user_role AS ENUM ('admin', 'supervisor');
CREATE TYPE user_status AS ENUM ('active', 'inactive');
CREATE TYPE site_status AS ENUM ('active', 'inactive');
CREATE TYPE section_status AS ENUM ('active', 'inactive');
CREATE TYPE worker_type AS ENUM ('company', 'outside');
CREATE TYPE worker_status AS ENUM ('active', 'inactive', 'left');
CREATE TYPE commission_type AS ENUM ('perDay', 'percentage', 'fixedMonthly');
CREATE TYPE attendance_mode AS ENUM ('face', 'fingerprint', 'manual');
CREATE TYPE attendance_status AS ENUM ('present', 'halfDay', 'absent', 'leave', 'holiday');
CREATE TYPE site_amount_mode AS ENUM ('cash', 'upi', 'settlement', 'advance');
CREATE TYPE migration_type AS ENUM ('temporary', 'permanent');
CREATE TYPE employment_event AS ENUM ('joined', 'left', 'rejoined');
CREATE TYPE referrer_type AS ENUM ('agency', 'seniorEmployee');
CREATE TYPE recovery_method AS ENUM ('perDay', 'percentage', 'fixedMonthly', 'manual');
CREATE TYPE advance_status AS ENUM ('pending', 'processing', 'active', 'closed', 'rejected');
CREATE TYPE payout_mode AS ENUM ('upi', 'bankTransfer', 'cash');
CREATE TYPE ledger_type AS ENUM ('advance', 'recovery', 'deduction');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'partiallyPaid', 'paid');
CREATE TYPE settlement_status AS ENUM ('draft', 'reviewed', 'approved', 'paid');
CREATE TYPE meal_type AS ENUM ('morning', 'afternoon', 'night');
CREATE TYPE canteen_order_status AS ENUM (
  'draft', 'pushed_to_canteen', 'packing', 'sent_to_section',
  'received', 'shortage_resend_requested', 'remaining_sent'
);
CREATE TYPE commission_req_status AS ENUM ('pending', 'processing', 'paid', 'rejected');

-- 3. TABLES DEFINITION

-- Sites
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

-- Sections
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

-- Users (App Users synced with Auth)
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

-- Referrers
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

-- Workers
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

-- Worker Opening Records
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

-- Worker Assignments
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

-- Employment History
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

-- Site Migrations
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

-- Attendance
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

-- Attendance Audits
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

-- Attendance Settings
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

-- Advances
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

-- Recoveries
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

-- Ledger Entries
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

-- Worker Payments
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

-- Monthly Settlements
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

-- Section Food Orders
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

-- Commission Payment Requests
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

-- 4. AUTOMATED UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sites_updated_at BEFORE UPDATE ON sites FOR EACH ROW EXECUTE PROCEDURE trigger_set_updated_at();
CREATE TRIGGER trg_sections_updated_at BEFORE UPDATE ON sections FOR EACH ROW EXECUTE PROCEDURE trigger_set_updated_at();
CREATE TRIGGER trg_app_users_updated_at BEFORE UPDATE ON app_users FOR EACH ROW EXECUTE PROCEDURE trigger_set_updated_at();
CREATE TRIGGER trg_referrers_updated_at BEFORE UPDATE ON referrers FOR EACH ROW EXECUTE PROCEDURE trigger_set_updated_at();
CREATE TRIGGER trg_workers_updated_at BEFORE UPDATE ON workers FOR EACH ROW EXECUTE PROCEDURE trigger_set_updated_at();
CREATE TRIGGER trg_attendance_updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE PROCEDURE trigger_set_updated_at();
CREATE TRIGGER trg_advances_updated_at BEFORE UPDATE ON advances FOR EACH ROW EXECUTE PROCEDURE trigger_set_updated_at();
CREATE TRIGGER trg_monthly_settlements_updated_at BEFORE UPDATE ON monthly_settlements FOR EACH ROW EXECUTE PROCEDURE trigger_set_updated_at();
CREATE TRIGGER trg_section_food_orders_updated_at BEFORE UPDATE ON section_food_orders FOR EACH ROW EXECUTE PROCEDURE trigger_set_updated_at();

-- 5. ENABLE ROW LEVEL SECURITY (RLS)
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
```

---

## Conclusion & Next Steps

This document serves as the complete technical blueprint for configuring Supabase for the Universal Attendance application. All field names, data types, constraints, and relationships align 1:1 with the existing codebase without requiring any alterations to the user interface.

**Ready for deployment when approved by the user.**
