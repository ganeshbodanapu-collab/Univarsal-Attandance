# STEP 15 — Workers & Worker Assignments Supabase Data Integration Report

## 1. Existing Worker Architecture
The Worker module manages worker registrations, profiles, daily wage rates, trade designations, contact details, bank details, attendance mode preferences, and prior opening balances. Previously, workers were initialized from `mockWorkers`, `mockWorkerAssignments`, `mockEmploymentHistory`, `mockSiteMigrations` in `src/data/mock/` and saved to `localStorage` under `univarsal_workers_data`, `univarsal_assignments_data`, `univarsal_employment_history_data`, `univarsal_site_migrations_data`.

## 2. Database Worker Schema
Canonical database schema from `0003_worker_tables.sql`:

### `public.workers`
- `id` (TEXT PRIMARY KEY)
- `serial_number` (TEXT)
- `name` (TEXT NOT NULL)
- `mobile` (TEXT NOT NULL)
- `worker_type` (`worker_type` ENUM: `'company' | 'outside'`)
- `current_site_id` (TEXT NOT NULL REFERENCES `sites(id)`)
- `current_section_id` (TEXT NOT NULL REFERENCES `sections(id)`)
- `joining_date` (DATE NOT NULL)
- `last_rejoined_date` (DATE)
- `daily_wage` (NUMERIC(10,2) NOT NULL DEFAULT 0.00)
- `referrer_id` (TEXT REFERENCES `referrers(id)` ON DELETE SET NULL)
- `commission_type` (`commission_type` ENUM: `'perDay' | 'percentage' | 'fixedMonthly'`)
- `commission_rate` (NUMERIC(10,2) NOT NULL DEFAULT 0.00)
- `attendance_modes` (TEXT[] DEFAULT `'{"manual"}'`)
- `status` (`worker_status` ENUM: `'active' | 'inactive' | 'left'`)
- `emergency_contact` (TEXT)
- `id_proof_number` (TEXT)
- `address` (TEXT)
- `phone_pe_number` (TEXT)
- `bank_name` (TEXT)
- `bank_account_no` (TEXT)
- `bank_ifsc` (TEXT)
- `bank_holder_name` (TEXT)
- `photo_url` (TEXT)
- `face_enrolled` (BOOLEAN DEFAULT FALSE)
- `fingerprint_enrolled` (BOOLEAN DEFAULT FALSE)
- `designation` (TEXT)
- `purpose` (TEXT)
- `remarks` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### `public.worker_opening_records`
- `worker_id` (TEXT PRIMARY KEY REFERENCES `workers(id)` ON DELETE CASCADE)
- `original_joining_date` (DATE NOT NULL)
- `as_of_date` (DATE NOT NULL)
- `prior_working_days` (NUMERIC(8,2))
- `prior_half_days` (NUMERIC(8,2))
- `total_prior_days` (NUMERIC(8,2))
- `prior_earned_wages` (NUMERIC(12,2))
- `opening_advance_balance` (NUMERIC(12,2))
- `opening_pending_wages` (NUMERIC(12,2))
- `net_opening_balance` (NUMERIC(12,2))
- `opening_food_meals` (NUMERIC(8,2))
- `remarks` (TEXT)
- `updated_by` (TEXT)
- `updated_at` (TIMESTAMPTZ)

### `public.worker_assignments`
- `id` (TEXT PRIMARY KEY)
- `worker_id` (TEXT NOT NULL REFERENCES `workers(id)` ON DELETE CASCADE)
- `site_id` (TEXT NOT NULL REFERENCES `sites(id)`)
- `section_id` (TEXT NOT NULL REFERENCES `sections(id)`)
- `from_date` (DATE NOT NULL)
- `to_date` (DATE)
- `status` (TEXT DEFAULT `'active'`)
- `reason` (TEXT)
- `remarks` (TEXT)
- `created_at` (TIMESTAMPTZ)

### `public.employment_history`
- `id` (TEXT PRIMARY KEY)
- `worker_id` (TEXT NOT NULL REFERENCES `workers(id)` ON DELETE CASCADE)
- `date` (DATE NOT NULL)
- `event` (`employment_event` ENUM: `'joined' | 'left' | 'rejoined'`)
- `site_id` (TEXT NOT NULL REFERENCES `sites(id)`)
- `section_id` (TEXT NOT NULL REFERENCES `sections(id)`)
- `remarks` (TEXT)
- `created_at` (TIMESTAMPTZ)

### `public.site_migrations`
- `id` (TEXT PRIMARY KEY)
- `worker_id` (TEXT NOT NULL REFERENCES `workers(id)` ON DELETE CASCADE)
- `from_site_id` (TEXT NOT NULL REFERENCES `sites(id)`)
- `from_section_id` (TEXT NOT NULL REFERENCES `sections(id)`)
- `to_site_id` (TEXT NOT NULL REFERENCES `sites(id)`)
- `to_section_id` (TEXT NOT NULL REFERENCES `sections(id)`)
- `date` (DATE NOT NULL)
- `migration_type` (`migration_type` ENUM: `'temporary' | 'permanent'`)
- `reason` (TEXT NOT NULL)
- `approved_by` (TEXT NOT NULL)
- `remarks` (TEXT)
- `created_at` (TIMESTAMPTZ)

## 3. Files Created
1. [`src/lib/data/workers.ts`](file:///d:/Univarsal%20Attandance/worker-management-system/src/lib/data/workers.ts): Data service layer for `public.workers` with `DBWorker` interface, mapping functions, and CRUD helper methods.
2. [`src/lib/data/workerAssignments.ts`](file:///d:/Univarsal%20Attandance/worker-management-system/src/lib/data/workerAssignments.ts): Data service layer for `public.worker_assignments` with `DBWorkerAssignment` interface, mapping functions, and query methods.
3. [`src/lib/data/workerOpeningRecords.ts`](file:///d:/Univarsal%20Attandance/worker-management-system/src/lib/data/workerOpeningRecords.ts): Data service layer for `public.worker_opening_records` with `DBWorkerOpeningRecord` interface and upsert/fetch methods.
4. [`src/lib/data/employmentHistory.ts`](file:///d:/Univarsal%20Attandance/worker-management-system/src/lib/data/employmentHistory.ts): Data service layer for `public.employment_history` with `DBEmploymentHistory` interface and append/list methods.
5. [`src/lib/data/siteMigrations.ts`](file:///d:/Univarsal%20Attandance/worker-management-system/src/lib/data/siteMigrations.ts): Data service layer for `public.site_migrations` with `DBSiteMigrationRecord` interface and migration tracking methods.

## 4. Files Modified
1. [`src/context/AttendanceContext.tsx`](file:///d:/Univarsal%20Attandance/worker-management-system/src/context/AttendanceContext.tsx): Wired `workersDataService`, `workerAssignmentsDataService`, `workerOpeningRecordsDataService`, `employmentHistoryDataService`, and `siteMigrationsDataService` into state initialization, sync effects, and CRUD/transfer/rejoin/left handlers.

## 5. Worker Data Services
- `workersDataService`: `listWorkers()`, `getWorker(id)`, `listWorkersBySite(siteId)`, `listWorkersBySection(sectionId)`, `createWorker(data)`, `updateWorker(id, data)`, `deleteWorker(id)`.
- `workerAssignmentsDataService`: `listWorkerAssignments(workerId?)`, `getWorkerAssignment(id)`, `createWorkerAssignment(data)`, `updateWorkerAssignment(id, data)`, `deleteWorkerAssignment(id)`.
- `workerOpeningRecordsDataService`: `listWorkerOpeningRecords()`, `getWorkerOpeningRecord(workerId)`, `upsertWorkerOpeningRecord(data)`.
- `employmentHistoryDataService`: `listEmploymentHistory(workerId?)`, `createEmploymentHistory(data)`.
- `siteMigrationsDataService`: `listSiteMigrations(workerId?)`, `createSiteMigration(data)`, `deleteSiteMigration(id)`.

## 6. Worker CRUD Integration
- `addWorker`: Creates `workers` record, initial active `worker_assignments` record, and `'joined'` `employment_history` record.
- `updateWorker`: Updates `workers` record and closes/opens `worker_assignments` if site/section changed.
- `deleteWorker`: Deletes `workers` record (cascading dependent logs via database FKs).

## 7. Worker Assignment Integration
- Managed via `public.worker_assignments`.
- Maintained historical assignments with `from_date`, `to_date`, `status`, and `reason`.
- Pointers `current_site_id` and `current_section_id` on `workers` table reflect the active assignment (`to_date IS NULL`).

## 8. Opening Record Integration
- Managed via `public.worker_opening_records` (1:1 with `workers.id`).
- Cutover calculations and prior service figures (`prior_working_days`, `opening_advance_balance`, `net_opening_balance`) remain fully aligned with the canonical specification.

## 9. Employment History Integration
- Managed via `public.employment_history`.
- Logs `'joined'`, `'left'`, and `'rejoined'` events with event timestamps, site/section contexts, and remarks.

## 10. Site Migration Integration
- Managed via `public.site_migrations`.
- Tracks cross-site transfers with `from_site_id`, `to_site_id`, `migration_type` (`'temporary' | 'permanent'`), `reason`, and `approved_by`.

## 11. Site/Section Relationship
- `current_site_id` and `current_section_id` reference valid `public.sites` and `public.sections` records.
- Deletion or filtering respects parent Site/Section constraints.

## 12. Referrer Relationship Handling
- `workers.referrer_id` references `referrers.id`.
- Referrer module data remains local/mock for STEP 15 as referrers are not yet migrated to Supabase. Nullable FK handling allows seamless transition when referrers are migrated.

## 13. RLS Behavior
- All queries execute using the authenticated `supabase` client.
- Scoped data access follows RLS policies in `0008_rls_policies.sql`.
- No service-role key or frontend bypass mechanisms are used.

## 14. Authentication Dependency
- Data access requires an active Supabase session.

## 15. Mock/localStorage Handling
- Fallback local storage remains intact to preserve unmigrated modules and offline capabilities until remote DB deployment.

## 16. Unmigrated Modules
The following modules remain untouched:
- Attendance & Audits
- Advances & Recoveries
- Payments & Monthly Settlements
- Food/Canteen Orders
- Referrers & Commission Requests

## 17. Node Server Status
- `/server` and `/api/sync` remain intact for backward compatibility.

## 18. Error Handling
- Service methods catch and report errors gracefully via structured return objects (`{ data, error }`).

## 19. Build Verification
- Command: `npm run build`
- Result: **0 errors**, build succeeded in 4.79s.

## 20. Remote Database Status
- Remote database (`gkphikhsgysoqjradbaz`) remains unpushed as per project rules.
- No remote SQL executed, no `supabase db push` executed, no seed data inserted.
