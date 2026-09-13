# Universal Attendance & Worker Management System
## Database Migration Report — STEP 05: Core Tables

> **Execution Date**: 2026-09-11  
> **Migration File Created**: [`supabase/migrations/0002_core_tables.sql`](file:///d:/Univarsal%20Attandance/worker-management-system/supabase/migrations/0002_core_tables.sql)  
> **Status**: COMPLETED & VERIFIED (LOCAL MIGRATION FILE CREATED ONLY)  

---

## Executive Summary & Verification Checklist

| Verification Item | Result / Details |
| :--- | :--- |
| **Migration File Path** | [`supabase/migrations/0002_core_tables.sql`](file:///d:/Univarsal%20Attandance/worker-management-system/supabase/migrations/0002_core_tables.sql) |
| **Tables Created** | **4 Core Tables** (`sites`, `sections`, `app_users`, `referrers`) |
| **Dependency Order** | Safe: `sites` -> `sections` -> `app_users` -> `referrers` |
| **Primary Keys Preserved** | `id` (TEXT) for all entities as specified |
| **`CREATE INDEX` Statements** | **0** (Handled in later step) |
| **`CREATE TRIGGER` Statements** | **0** (Handled in later step) |
| **`CREATE POLICY` Statements** | **0** (Handled in later step) |
| **DML Statements (INSERT/UPDATE)**| **0** (No seed data included) |
| **Remote Database Executed?** | **NO** (0 remote SQL queries executed; remote DB untouched) |
| **Frontend UI / Code Altered?** | **NO** (Zero UI or React Context files modified) |

---

## Detailed Table Specifications Summary

### 1. `sites` (Construction Worksites)
- **Column Count**: 11
- **Primary Key**: `id` (TEXT, e.g. `'S001'`)
- **Constraints**: `code` (TEXT UNIQUE NOT NULL)
- **Columns**: `id`, `code`, `name`, `location`, `in_charge`, `mobile`, `address`, `status`, `remarks`, `created_at`, `updated_at`

### 2. `sections` (Worksite Trade Departments)
- **Column Count**: 10
- **Primary Key**: `id` (TEXT, e.g. `'SEC001'`)
- **Foreign Keys**: `site_id` REFERENCES `sites(id)` ON DELETE CASCADE
- **Constraints**: `uq_site_section_code` UNIQUE(`site_id`, `code`)
- **Columns**: `id`, `code`, `name`, `site_id`, `in_charge`, `mobile`, `status`, `remarks`, `created_at`, `updated_at`

### 3. `app_users` (System Admins & Site Supervisors)
- **Column Count**: 15
- **Primary Key**: `id` (TEXT, e.g. `'U001'`)
- **Foreign Keys**:
  - `assigned_site_id` REFERENCES `sites(id)` ON DELETE SET NULL
  - `assigned_section_id` REFERENCES `sections(id)` ON DELETE SET NULL
  - `auth_user_id` REFERENCES `auth.users(id)` ON DELETE SET NULL
- **Constraints**: `username` (UNIQUE NOT NULL), `auth_user_id` (UNIQUE)
- **Columns**: `id`, `auth_user_id`, `username`, `password_hash`, `name`, `role`, `assigned_site_id`, `assigned_section_id`, `team_name`, `mobile`, `email`, `status`, `last_login`, `created_at`, `updated_at`

### 4. `referrers` (Labor Agencies & Employee Referrers)
- **Column Count**: 10
- **Primary Key**: `id` (TEXT, e.g. `'REF001'`)
- **Columns**: `id`, `name`, `mobile`, `address`, `status`, `type`, `worker_id`, `designation`, `remarks`, `created_at`, `updated_at`

---

## Authentication Safety Audit (`app_users`)

- **Password Storage**: `password_hash` (TEXT NOT NULL) is configured for credential storage.
- **Supabase Auth Link**: `auth_user_id` (UUID UNIQUE REFERENCES `auth.users(id)`) enables native Supabase Auth integration without altering the application user entity contract.
- **Production Guidance**: Plain passwords used during frontend prototyping will be securely hashed with bcrypt/argon2 or mapped directly to Supabase Auth users during backend wiring.

---

## Safety Confirmation & Next Step

- **Remote DB Safety**: The SQL script exists strictly locally inside `supabase/migrations/0002_core_tables.sql`. No `supabase db push` or execution was performed.
- **Exact Next Step**: Proceed to **STEP 06** (Worker entities migration: `workers`, `worker_opening_records`, `worker_assignments`, `employment_history`, `site_migrations`).
