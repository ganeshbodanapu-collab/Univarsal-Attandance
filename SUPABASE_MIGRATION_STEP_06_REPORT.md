# Universal Attendance & Worker Management System
## Database Migration Report — STEP 06: Worker Management Tables

> **Execution Date**: 2026-09-11  
> **Migration File Created**: [`supabase/migrations/0003_worker_tables.sql`](file:///d:/Univarsal%20Attandance/worker-management-system/supabase/migrations/0003_worker_tables.sql)  
> **Status**: COMPLETED & VERIFIED (LOCAL MIGRATION FILE CREATED ONLY)  

---

## Executive Summary & Verification Checklist

| Verification Item | Result / Details |
| :--- | :--- |
| **Migration File Path** | [`supabase/migrations/0003_worker_tables.sql`](file:///d:/Univarsal%20Attandance/worker-management-system/supabase/migrations/0003_worker_tables.sql) |
| **Tables Created** | **5 Worker Management Tables** (`workers`, `worker_opening_records`, `worker_assignments`, `employment_history`, `site_migrations`) |
| **Dependency Order** | Safe: `workers` -> `worker_opening_records` -> `worker_assignments` -> `employment_history` -> `site_migrations` |
| **Primary Keys Preserved** | `id` (TEXT) for all entities; `worker_id` (TEXT) for 1:1 opening records |
| **`CREATE INDEX` Statements** | **0** (Handled in later step) |
| **`CREATE TRIGGER` Statements** | **0** (Handled in later step) |
| **`CREATE POLICY` Statements** | **0** (Handled in later step) |
| **DML Statements (INSERT/UPDATE)**| **0** (No seed data included) |
| **Remote Database Executed?** | **NO** (0 remote SQL queries executed; remote DB untouched) |
| **Frontend UI / Code Altered?** | **NO** (Zero UI or React Context files modified) |

---

## Detailed Table Specifications Summary

### 1. `workers` (Employee Master Register)
- **Column Count**: 31
- **Primary Key**: `id` (TEXT, e.g. `'W001'` or `'01BGM - Ganesh 7890'`)
- **Foreign Keys**:
  - `current_site_id` REFERENCES `sites(id)`
  - `current_section_id` REFERENCES `sections(id)`
  - `referrer_id` REFERENCES `referrers(id)` ON DELETE SET NULL
- **Enum Fields**: `worker_type`, `commission_type`, `status` (`worker_status`)
- **Columns**: `id`, `serial_number`, `name`, `mobile`, `worker_type`, `current_site_id`, `current_section_id`, `joining_date`, `last_rejoined_date`, `daily_wage`, `referrer_id`, `commission_type`, `commission_rate`, `attendance_modes`, `status`, `emergency_contact`, `id_proof_number`, `address`, `phone_pe_number`, `bank_name`, `bank_account_no`, `bank_ifsc`, `bank_holder_name`, `photo_url`, `face_enrolled`, `fingerprint_enrolled`, `designation`, `purpose`, `remarks`, `created_at`, `updated_at`

### 2. `worker_opening_records` (Cutover Service & Opening Balances)
- **Column Count**: 14
- **Primary Key**: `worker_id` (TEXT, 1:1 relationship with `workers(id)`)
- **Foreign Keys**: `worker_id` REFERENCES `workers(id)` ON DELETE CASCADE
- **Columns**: `worker_id`, `original_joining_date`, `as_of_date`, `prior_working_days`, `prior_half_days`, `total_prior_days`, `prior_earned_wages`, `opening_advance_balance`, `opening_pending_wages`, `net_opening_balance`, `opening_food_meals`, `remarks`, `updated_by`, `updated_at`

### 3. `worker_assignments` (Site & Section Placement Log)
- **Column Count**: 10
- **Primary Key**: `id` (TEXT, e.g. `'ASG001'`)
- **Foreign Keys**:
  - `worker_id` REFERENCES `workers(id)` ON DELETE CASCADE
  - `site_id` REFERENCES `sites(id)`
  - `section_id` REFERENCES `sections(id)`
- **Columns**: `id`, `worker_id`, `site_id`, `section_id`, `from_date`, `to_date`, `status`, `reason`, `remarks`, `created_at`

### 4. `employment_history` (Joining, Exit & Rejoin Audit Log)
- **Column Count**: 8
- **Primary Key**: `id` (TEXT, e.g. `'EMP001'`)
- **Foreign Keys**:
  - `worker_id` REFERENCES `workers(id)` ON DELETE CASCADE
  - `site_id` REFERENCES `sites(id)`
  - `section_id` REFERENCES `sections(id)`
- **Enum Fields**: `event` (`employment_event`)
- **Columns**: `id`, `worker_id`, `date`, `event`, `site_id`, `section_id`, `remarks`, `created_at`

### 5. `site_migrations` (Cross-Site Transfer Log)
- **Column Count**: 12
- **Primary Key**: `id` (TEXT, e.g. `'MIG001'`)
- **Foreign Keys**:
  - `worker_id` REFERENCES `workers(id)` ON DELETE CASCADE
  - `from_site_id` REFERENCES `sites(id)`
  - `from_section_id` REFERENCES `sections(id)`
  - `to_site_id` REFERENCES `sites(id)`
  - `to_section_id` REFERENCES `sections(id)`
- **Enum Fields**: `migration_type` (`temporary`, `permanent`)
- **Columns**: `id`, `worker_id`, `from_site_id`, `from_section_id`, `to_site_id`, `to_section_id`, `date`, `migration_type`, `reason`, `approved_by`, `remarks`, `created_at`

---

## Safety Confirmation & Next Step

- **Remote DB Safety**: The SQL script exists strictly locally inside `supabase/migrations/0003_worker_tables.sql`. No `supabase db push` or execution was performed.
- **Exact Next Step**: Proceed to **STEP 07** (Attendance & Financial modules migration: `attendance`, `attendance_audits`, `attendance_settings`, `advances`, `recoveries`, `ledger_entries`, `worker_payments`, `monthly_settlements`, `section_food_orders`, `commission_payment_requests`).
