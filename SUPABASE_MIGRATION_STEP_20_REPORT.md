# SUPABASE MIGRATION STEP 20 REPORT
## Referrers + Commission Integration

---

### 1. Scope
The scope of **STEP 20** focused strictly on integrating **Referrers** (`public.referrers`) and **Commission Payment Requests** (`public.commission_payment_requests`) with Supabase.
Specifically:
- Created Supabase data service for `public.referrers` (`src/lib/data/referrers.ts`).
- Created Supabase data service for `public.commission_payment_requests` (`src/lib/data/commissionPaymentRequests.ts`).
- Integrated both services into `src/context/AttendanceContext.tsx` for initial data loading, state synchronization, and persistence.
- Verified that all previously migrated modules (Sites, Sections, Workers, Worker Assignments, Employment History, Site Migrations, Attendance, Attendance Audits, Attendance Settings, Advances, Recoveries, Ledger Entries, Worker Payments, Monthly Settlements, Food/Canteen) remain intact and fully functional.

---

### 2. Files Inspected
- `src/types/index.ts`
- `src/context/AttendanceContext.tsx`
- `src/pages/referrers/Referrers.tsx`
- `src/pages/commission/Commission.tsx`
- `src/utils/calculations/calculateCommission.ts`
- `SUPABASE_DATABASE_SPECIFICATION.md`
- `supabase/migrations/0002_core_tables.sql`
- `supabase/migrations/0006_food_commission_tables.sql`
- `supabase/migrations/0008_rls_policies.sql`

---

### 3. Files Created
- `src/lib/data/referrers.ts`: Typed Supabase data service for `public.referrers` providing CRUD operations and filtering methods by type and status.
- `src/lib/data/commissionPaymentRequests.ts`: Typed Supabase data service for `public.commission_payment_requests` providing single/bulk creation and status update operations.
- `SUPABASE_MIGRATION_STEP_20_REPORT.md`: Detailed step-by-step documentation report for STEP 20.

---

### 4. Files Modified
- `src/context/AttendanceContext.tsx`:
  - Imported `referrersDataService` and `commissionPaymentRequestsDataService`.
  - Updated `syncFromSupabase()` in initial `useEffect` to fetch referrers and commission payment requests.
  - Wired `addReferrer`, `addCommissionPaymentRequest`, `addBulkCommissionPaymentRequests`, and `updateCommissionPaymentRequestStatus` to push changes to Supabase asynchronously.

---

### 5. Referrer Integration
- Table: `public.referrers`
- Primary Key: `id` (e.g. `REF001`)
- Supported Types (`referrer_type` enum):
  - `agency`: External contractor / recruitment agency.
  - `seniorEmployee`: Internal senior employee referrer (links to company worker via `worker_id`).

---

### 6. Commission Request Integration
- Table: `public.commission_payment_requests`
- Primary Key: `id` (e.g. `COM-REQ-001`)
- Foreign Keys:
  - `referrer_id -> referrers(id)`
  - `worker_id -> workers(id)`

---

### 7. Field Mappings

#### A. `public.referrers`
| Database Column (`public.referrers`) | TypeScript Domain Interface (`Referrer`) | Transformation |
| :--- | :--- | :--- |
| `id` | `id` | Exact string |
| `name` | `name` | Exact string |
| `mobile` | `mobile` | Exact string |
| `address` | `address` | Optional string |
| `status` | `status` | `site_status` enum (`active` \| `inactive`) |
| `type` | `type` | `referrer_type` enum (`agency` \| `seniorEmployee`) |
| `worker_id` | `workerId` | Optional string |
| `designation` | `designation` | Optional string |
| `remarks` | `remarks` | Optional string |

#### B. `public.commission_payment_requests`
| Database Column (`public.commission_payment_requests`) | TypeScript Domain Interface (`CommissionPaymentRequest`) | Transformation |
| :--- | :--- | :--- |
| `id` | `id` | Exact string |
| `referrer_id` | `referrerId` | Exact string |
| `worker_id` | `workerId` | Exact string |
| `amount` | `amount` | `Number(val) \|\| 0` |
| `date` | `date` | YYYY-MM-DD string |
| `payout_mode` | `payoutMode` | `payout_mode` enum (`cash` \| `upi` \| `bankTransfer`) |
| `upi_number` | `upiNumber` | Optional string |
| `bank_name` | `bankName` | Optional string |
| `bank_account_number` | `bankAccountNumber` | Optional string |
| `bank_ifsc` | `bankIfsc` | Optional string |
| `status` | `status` | `commission_req_status` enum (`pending` \| `processing` \| `paid` \| `rejected`) |
| `requested_at` | `requestedAt` | Optional string / ISO timestamp |
| `processed_at` | `processedAt` | Optional string / ISO timestamp |
| `paid_at` | `paidAt` | Optional string / ISO timestamp |
| `remarks` | `remarks` | Optional string |

---

### 8. Referrer Lifecycle
- Referrers are created as `agency` or `seniorEmployee`.
- Status transition: `active` <-> `inactive`.
- Used to group contract workers and aggregate commission balances.

---

### 9. Commission Calculation
- Commission logic is preserved in `src/utils/calculations/calculateCommission.ts`:
  - `present` attendance = `commissionRate * commissionPresentMultiplier`
  - `halfDay` attendance = `commissionRate * commissionHalfDayMultiplier`
  - `absent` attendance = `commissionRate * commissionAbsentMultiplier`
- Rate defined per worker in `Worker.commissionRate`.

---

### 10. Money / Decimal Handling
- Amount columns defined as `NUMERIC(10,2)` in Postgres.
- Domain mapping uses `Number(val) || 0` to preserve accurate calculation and formatting without floating-point precision loss.

---

### 11. Rounding Behavior
- Frontend rounding calculations in referrer ledgers and commission request totals use exact JS numeric precision and `.toLocaleString()` formatting.

---

### 12. Duplicate Prevention
- Commission request IDs generated using key format `COM-REQ-001`, `COM-REQ-002`.
- Bulk requests map items explicitly to prevent double creation or missing IDs during submission.

---

### 13. Worker-Referrer Relationship
- Workers link to referrers via `Worker.referrerId -> referrers(id)`.
- Senior employee referrers link back to company workers via `Referrer.workerId -> workers(id)`.

---

### 14. Site / Section Relationship
- Referred workers belong to their assigned sites and sections (`Worker.currentSiteId`, `Worker.currentSectionId`), allowing site-wise commission filtering.

---

### 15. Payment / Settlement Relationship
- Commission requests track independent status (`pending` -> `processing` -> `paid`), keeping commission payouts decoupled from direct worker wage payments.

---

### 16. RLS / Security
- Standard authenticated client used in `src/lib/supabase.ts`.
- RLS policies from `0008_rls_policies.sql` apply to `referrers` and `commission_payment_requests`.
- Zero service-role or secret keys exposed in frontend code.

---

### 17. LocalStorage Fallback
- LocalStorage caching maintained (`univarsal_referrers_data`, `univarsal_commission_requests_data`).
- Remote Supabase data takes priority when authenticated.

---

### 18. Node Server Status
- Node server `/server` and sync endpoints `/api/sync` remain active and operational.

---

### 19. Build Result
- Command: `npm run build`
- Result: **0 errors**, successful production bundle build (`tsc -b && vite build`).

---

### 20. Remote Database Status
- Remote database remains pristine.
- No `supabase db push`, `db reset`, or remote DDL commands executed.

---

### 21. Known Limitations
- All domain modules specified in the original backend architecture have now been integrated with Supabase.

---

### 22. Recommended Next Step
- **STEP 21**: Final Migration Audit & E2E System Verification.
