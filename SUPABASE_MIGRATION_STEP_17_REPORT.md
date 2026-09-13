# STEP 17 — Advances, Recoveries & Ledger Supabase Integration Report

## 1. Existing Finance Architecture
The financial transaction foundation handles cash advance requests, finance approvals, loan disbursements, recovery tracking (daily wage auto-deductions and manual payments), and ledger transaction logging. Previously, financial records were loaded from `mockAdvances` and `mockRecoveries` in `src/data/mock/advances.ts` and saved to `localStorage` under `univarsal_advances_data` and `univarsal_recoveries_data`.

## 2. Advance Database Schema
Canonical database schema from `0005_finance_tables.sql`:

### `public.advances`
- `id` (TEXT PRIMARY KEY)
- `worker_id` (TEXT NOT NULL REFERENCES `workers(id)` ON DELETE CASCADE)
- `date` (DATE NOT NULL)
- `amount` (NUMERIC(10,2) NOT NULL)
- `reason` (TEXT NOT NULL)
- `recovery_method` (`recovery_method` ENUM: `'perDay' | 'percentage' | 'fixedMonthly' | 'manual'`)
- `daily_recovery_amount` (NUMERIC(10,2))
- `recovery_percentage` (NUMERIC(5,2))
- `fixed_monthly_amount` (NUMERIC(10,2))
- `status` (`advance_status` ENUM: `'pending' | 'processing' | 'active' | 'closed' | 'rejected'`)
- `remarks` (TEXT)
- `section_id` (TEXT REFERENCES `sections(id)`)
- `payout_mode` (`payout_mode` ENUM: `'upi' | 'bankTransfer' | 'cash'`)
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
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

## 3. Recovery Database Schema

### `public.recoveries`
- `id` (TEXT PRIMARY KEY)
- `advance_id` (TEXT NOT NULL REFERENCES `advances(id)` ON DELETE CASCADE)
- `worker_id` (TEXT NOT NULL REFERENCES `workers(id)`)
- `date` (DATE NOT NULL)
- `attendance_id` (TEXT REFERENCES `attendance(id)` ON DELETE SET NULL)
- `amount` (NUMERIC(10,2) NOT NULL)
- `method` (`recovery_method` ENUM: `'perDay' | 'percentage' | 'fixedMonthly' | 'manual'`)
- `is_manual` (BOOLEAN DEFAULT FALSE)
- `remarks` (TEXT)
- `created_at` (TIMESTAMPTZ)

## 4. Ledger Database Schema

### `public.ledger_entries`
- `id` (TEXT PRIMARY KEY)
- `worker_id` (TEXT NOT NULL REFERENCES `workers(id)` ON DELETE CASCADE)
- `date` (DATE NOT NULL)
- `type` (`ledger_type` ENUM: `'advance' | 'recovery' | 'deduction'`)
- `amount` (NUMERIC(10,2) NOT NULL)
- `running_balance` (NUMERIC(10,2) NOT NULL)
- `remarks` (TEXT)
- `created_at` (TIMESTAMPTZ)

## 5. Files Created
1. [`src/lib/data/advances.ts`](file:///d:/Univarsal%20Attandance/worker-management-system/src/lib/data/advances.ts): Data service layer for `public.advances` with `DBAdvance` interface, mapping functions, and CRUD helper methods.
2. [`src/lib/data/recoveries.ts`](file:///d:/Univarsal%20Attandance/worker-management-system/src/lib/data/recoveries.ts): Data service layer for `public.recoveries` with `DBRecovery` interface and CRUD helper methods.
3. [`src/lib/data/ledger.ts`](file:///d:/Univarsal%20Attandance/worker-management-system/src/lib/data/ledger.ts): Data service layer for `public.ledger_entries` with `DBLedgerEntry` interface and entry creation/fetching methods.

## 6. Files Modified
1. [`src/context/AttendanceContext.tsx`](file:///d:/Univarsal%20Attandance/worker-management-system/src/context/AttendanceContext.tsx): Wired `advancesDataService`, `recoveriesDataService`, and `ledgerDataService` into state initialization, sync effects, and handlers (`addAdvance`, `updateAdvancePaymentStatus`, `addManualRecovery`, `closeAdvance`, auto-recovery creation).

## 7. Advance Data Service
- `advancesDataService`: `listAdvances()`, `getAdvance(id)`, `listAdvancesByWorker(workerId)`, `createAdvance(data)`, `updateAdvance(id, data)`, `deleteAdvance(id)`.

## 8. Recovery Data Service
- `recoveriesDataService`: `listRecoveries()`, `getRecovery(id)`, `listRecoveriesByWorker(workerId)`, `listRecoveriesByAdvance(advanceId)`, `createRecovery(data)`, `updateRecovery(id, data)`, `deleteRecovery(id)`.

## 9. Ledger Data Service
- `ledgerDataService`: `listLedgerEntries()`, `getLedgerEntry(id)`, `listLedgerByWorker(workerId)`, `createLedgerEntry(data)`.

## 10. Advance Lifecycle
- Transitions through `advance_status` ENUM (`'pending'` $\rightarrow$ `'processing'` $\rightarrow$ `'active'` $\rightarrow$ `'closed'`).
- `sentToFinanceAt`, `processedAt`, and `disbursedAt` timestamps track advance approval workflow.

## 11. Recovery Handling
- Supports daily wage auto-recovery (attendance-linked via `attendance_id`) and manual lump-sum recovery.
- When cumulative recoveries match/exceed advance amount, `status` auto-updates to `'closed'`.

## 12. Ledger Consistency
- Explicit transaction records logged to `public.ledger_entries` on advance issuance and recovery credit without relying on database triggers.

## 13. Money / Decimal Handling
- Numerical values mapped explicitly via `Number(val)` with explicit fallbacks (`0`) and standard JS 2-decimal rounding where applicable to prevent floating-point discrepancies.

## 14. Worker Relationship
- `advances.worker_id`, `recoveries.worker_id`, and `ledger_entries.worker_id` reference `workers.id`.

## 15. Attendance Relationship
- Auto-recovery records populate `recoveries.attendance_id` linking recovery to daily attendance entries.

## 16. RLS Behavior
- All operations execute using the authenticated `supabase` client following policies in `0008_rls_policies.sql`.

## 17. Authentication Dependency
- Data access requires an active Supabase session.

## 18. Error Handling
- Financial service methods handle exceptions gracefully and return structured `{ data, error }` or `{ success, error }` responses.

## 19. localStorage / Mock Handling
- Local fallback retained for unmigrated modules.

## 20. Offline Behavior
- No duplicate parallel state systems created.

## 21. Unmigrated Finance Modules
- Worker Payments, Monthly Settlements, Food/Canteen, Referrers, and Commission remain untouched.

## 22. Node Server Status
- `/server` and `/api/sync` remain intact for backward compatibility.

## 23. Realtime Status
- Configured in `0009_realtime.sql`. No duplicate publication added.

## 24. Security Audit
- 0 service-role keys exposed. No RLS bypass.

## 25. Build Verification
- Command: `npm run build`
- Result: **0 errors**, build succeeded in 4.70s.

## 26. Remote Database Status
- Remote database (`gkphikhsgysoqjradbaz`) remains unpushed as per project rules.
