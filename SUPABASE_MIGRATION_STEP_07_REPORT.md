# Universal Attendance & Worker Management System
## Database Migration Report — STEP 07: Attendance Tables

> **Execution Date**: 2026-09-11  
> **Migration File Created**: [`supabase/migrations/0004_attendance_tables.sql`](file:///d:/Univarsal%20Attandance/worker-management-system/supabase/migrations/0004_attendance_tables.sql)  
> **Status**: COMPLETED & VERIFIED (LOCAL MIGRATION FILE CREATED ONLY)  

---

## Executive Summary & Verification Checklist

| Verification Item | Result / Details |
| :--- | :--- |
| **Migration File Path** | [`supabase/migrations/0004_attendance_tables.sql`](file:///d:/Univarsal%20Attandance/worker-management-system/supabase/migrations/0004_attendance_tables.sql) |
| **Tables Created** | **3 Attendance Tables** (`attendance`, `attendance_audits`, `attendance_settings`) |
| **Dependency Order** | Safe: `attendance` -> `attendance_audits` -> `attendance_settings` |
| **Primary Keys Preserved** | `id` (TEXT) for attendance/audits; `id` (INTEGER DEFAULT 1) for global settings |
| **Uniqueness Rule** | `CONSTRAINT uq_worker_date UNIQUE(worker_id, date)` |
| **`CREATE INDEX` Statements** | **0** (Handled in later step) |
| **`CREATE TRIGGER` Statements** | **0** (Handled in later step) |
| **`CREATE POLICY` Statements** | **0** (Handled in later step) |
| **DML Statements (INSERT/UPDATE)**| **0** (No seed data included) |
| **Remote Database Executed?** | **NO** (0 remote SQL queries executed; remote DB untouched) |
| **Frontend UI / Code Altered?** | **NO** (Zero UI or React Context files modified) |

---

## Detailed Table Specifications Summary

### 1. `attendance` (Daily Attendance & On-Site Disbursements)
- **Column Count**: 19
- **Primary Key**: `id` (TEXT, e.g. `'ATT00001'`)
- **Foreign Keys**:
  - `worker_id` REFERENCES `workers(id)` ON DELETE CASCADE
  - `assignment_id` REFERENCES `worker_assignments(id)`
  - `site_id` REFERENCES `sites(id)`
  - `section_id` REFERENCES `sections(id)`
- **Enum Fields**: `status` (`attendance_status`), `method` (`attendance_mode`), `site_amount_mode` (`site_amount_mode`)
- **Uniqueness Constraint**: `CONSTRAINT uq_worker_date UNIQUE(worker_id, date)`
- **Columns**: `id`, `worker_id`, `assignment_id`, `date`, `status`, `method`, `check_in`, `check_out`, `photo_url`, `remarks`, `marked_by`, `site_id`, `section_id`, `site_amount_given`, `site_amount_remarks`, `site_amount_mode`, `working_place_note`, `created_at`, `updated_at`

### 2. `attendance_audits` (Correction & Change History Log)
- **Column Count**: 8
- **Primary Key**: `id` (TEXT, e.g. `'AUD001'`)
- **Foreign Keys**:
  - `attendance_id` REFERENCES `attendance(id)` ON DELETE CASCADE
  - `worker_id` REFERENCES `workers(id)`
- **Columns**: `id`, `attendance_id`, `worker_id`, `old_status`, `new_status`, `changed_by`, `changed_at`, `reason`

### 3. `attendance_settings` (Global Rate & Multiplier Multipliers)
- **Column Count**: 16
- **Primary Key**: `id` (INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1))
- **Scope**: Global system configuration single-row table.
- **Columns**: `id`, `food_present_rate`, `food_half_day_rate`, `food_absent_rate`, `food_leave_rate`, `wage_present_multiplier`, `wage_half_day_multiplier`, `wage_absent_multiplier`, `commission_present_multiplier`, `commission_half_day_multiplier`, `commission_absent_multiplier`, `allow_daily_recovery`, `allow_monthly_recovery`, `allow_percentage_recovery`, `allow_manual_recovery`, `updated_at`

---

## Safety Confirmation & Next Step

- **Remote DB Safety**: The SQL script exists strictly locally inside `supabase/migrations/0004_attendance_tables.sql`. No `supabase db push` or execution was performed.
- **Exact Next Step**: Proceed to **STEP 08** (Financial & Operational modules migration: `advances`, `recoveries`, `ledger_entries`, `worker_payments`, `monthly_settlements`, `section_food_orders`, `commission_payment_requests`).
