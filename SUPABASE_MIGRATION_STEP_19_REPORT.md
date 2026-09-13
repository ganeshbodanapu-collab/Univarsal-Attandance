# SUPABASE MIGRATION STEP 19 REPORT
## Food / Canteen Supabase Integration

---

### 1. Scope
The scope of **STEP 19** focused exclusively on integrating the **Food / Canteen** module (`public.section_food_orders`) with Supabase.
Specifically:
- Created Supabase data service for `public.section_food_orders` (`src/lib/data/sectionFoodOrders.ts`).
- Integrated `sectionFoodOrdersDataService` into `src/context/AttendanceContext.tsx` for initial data loading, state updates, and persistence across the canteen pipeline.
- Verified that all previously migrated modules (Sites, Sections, Workers, Worker Assignments, Employment History, Site Migrations, Attendance, Attendance Audits, Attendance Settings, Advances, Recoveries, Ledger Entries, Worker Payments, Monthly Settlements) remain intact and operational.
- Excluded unmigrated modules (Referrers, Commission).

---

### 2. Files Inspected
- `src/types/index.ts`
- `src/context/AttendanceContext.tsx`
- `src/pages/food/Food.tsx`
- `src/components/food/SectionFoodOrderModal.tsx`
- `SUPABASE_DATABASE_SPECIFICATION.md`
- `supabase/migrations/0006_food_commission_tables.sql`
- `src/lib/data/attendance.ts`
- `src/lib/data/workers.ts`

---

### 3. Files Created
- `src/lib/data/sectionFoodOrders.ts`: Typed Supabase data service for `public.section_food_orders` providing CRUD and query methods by site, section, and date.
- `SUPABASE_MIGRATION_STEP_19_REPORT.md`: Detailed migration documentation report for STEP 19.

---

### 4. Files Modified
- `src/context/AttendanceContext.tsx`:
  - Imported `sectionFoodOrdersDataService`.
  - Updated `syncFromSupabase()` to load food orders from Supabase on application startup.
  - Wired food order pipeline methods (`saveSectionFoodOrder`, `pushFoodOrderToCanteen`, `updateCanteenStatus`, `receiveFoodOrderAtSection`, `requestShortageReSend`, `dispatchRemainingParcels`, `confirmRemainingParcelsReceived`) to persist changes to Supabase asynchronously.

---

### 5. section_food_orders Integration
- Table: `public.section_food_orders`
- Primary Key: `id` (e.g. `FO-SEC001-2026-08-28-morning`)
- Foreign Keys:
  - `site_id -> sites(id)`
  - `section_id -> sections(id)`

---

### 6. Field Mappings

| Database Column (`public.section_food_orders`) | TypeScript Domain Interface (`SectionFoodOrder`) | Transformation |
| :--- | :--- | :--- |
| `id` | `id` | Exact string |
| `section_id` | `sectionId` | Exact string |
| `site_id` | `siteId` | Exact string |
| `date` | `date` | YYYY-MM-DD string |
| `meal_type` | `mealType` | `meal_type` enum (`morning` \| `afternoon` \| `night`) |
| `present_count` | `presentCount` | `Number(val) \|\| 0` |
| `absent_count` | `absentCount` | `Number(val) \|\| 0` |
| `outside_workers_count` | `outsideWorkersCount` | `Number(val) \|\| 0` |
| `others_count` | `othersCount` | `Number(val) \|\| 0` |
| `total_ordered_qty` | `totalOrderedQty` | `Number(val) \|\| 0` |
| `remarks` | `remarks` | Optional string |
| `pushed_at` | `pushedAt` | Optional ISO string / timestamp |
| `pushed_by` | `pushedBy` | Optional string |
| `status` | `status` | `canteen_order_status` enum |
| `canteen_remarks` | `canteenRemarks` | Optional string |
| `packing_started_at` | `packingStartedAt` | Optional ISO string / timestamp |
| `dispatched_at` | `dispatchedAt` | Optional ISO string / timestamp |
| `dispatched_by` | `dispatchedBy` | Optional string |
| `dispatched_qty` | `dispatchedQty` | Optional integer (`Number(val)`) |
| `received_qty` | `receivedQty` | Optional integer (`Number(val)`) |
| `received_at` | `receivedAt` | Optional ISO string / timestamp |
| `received_by` | `receivedBy` | Optional string |
| `receiving_remarks` | `receivingRemarks` | Optional string |
| `shortage_qty` | `shortageQty` | Optional integer (`Number(val)`) |
| `shortage_reason` | `shortageReason` | Optional string |
| `re_send_requested_at` | `reSendRequestedAt` | Optional ISO string / timestamp |
| `re_send_dispatched_at` | `reSendDispatchedAt` | Optional ISO string / timestamp |
| `remaining_received_qty` | `remainingReceivedQty` | Optional integer (`Number(val)`) |
| `re_send_received_at` | `reSendReceivedAt` | Optional ISO string / timestamp |

---

### 7. Food Order Lifecycle
Supported statuses from existing `canteen_order_status` enum:
1. `draft`: Order saved at section level.
2. `pushed_to_canteen`: Order submitted by supervisor to canteen kitchen.
3. `packing`: Canteen kitchen initiated packaging.
4. `sent_to_section`: Canteen kitchen dispatched food parcels to section.
5. `received`: Supervisor verified and received delivery.
6. `shortage_resend_requested`: Supervisor reported quantity shortage and requested remaining parcels.
7. `remaining_sent`: Canteen kitchen dispatched second batch for shortage.

---

### 8. Meal Type Handling
- Uses canonical `meal_type` enum (`morning`, `afternoon`, `night`).
- Mapped directly between domain types and database values without mutation.

---

### 9. Quantity Handling
- Count fields (`presentCount`, `absentCount`, `outsideWorkersCount`, `othersCount`, `totalOrderedQty`, `dispatchedQty`, `receivedQty`, `shortageQty`, `remainingReceivedQty`) are represented as integers.
- Total ordered quantity calculated as `presentCount + absentCount + outsideWorkersCount + othersCount`.

---

### 10. Cost / Amount Handling
- Meal units for food reporting calculated based on attendance rules:
  - Full Day Present = 1.0 Meal unit
  - Half Day Present = 0.5 Meal unit
- Estimated food cost calculations in reporting continue using `totalMealUnits * 65`.

---

### 11. Duplicate Prevention
- Order ID generated using key format: `FO-${sectionId}-${date}-${mealType}`.
- Application-level upsert in `saveSectionFoodOrder` ensures existing draft orders for the same section, date, and meal type are updated rather than duplicated.

---

### 12. Site / Section Relationship
- Section food orders explicitly preserve foreign key links:
  - `site_id` links order to the project site.
  - `section_id` links order to the work trade section.
- Section filtering and site-level isolation enforced across supervisor roles.

---

### 13. Attendance / Worker Integration
- Attendance counts (`presentCount`, `absentCount`, `outsideWorkersCount`) auto-derive from `public.attendance` and `public.workers` for section food order initial values.

---

### 14. RLS / Security
- Utilizes standard authenticated Supabase client (`src/lib/supabase.ts`).
- RLS policies from `0008_rls_policies.sql` apply to `section_food_orders`.
- No service_role or secret keys exposed in frontend code.

---

### 15. LocalStorage Fallback
- LocalStorage caching maintained (`univarsal_food_orders_data`).
- Populated from Supabase when connected, with local fallback for offline state.

---

### 16. Node Server Status
- Node server `/server` and sync endpoints `/api/sync` remain active and operational.

---

### 17. Build Result
- Command: `npm run build`
- Result: **0 errors**, successful production bundle build (`tsc -b && vite build`).

---

### 18. Remote Database Status
- Remote database remains untouched.
- No `supabase db push`, `db reset`, or remote DDL commands executed.

---

### 19. Known Limitations
- Referrers and Commission modules remain to be integrated in STEP 20.

---

### 20. Recommended STEP 20
- **STEP 20**: Migrate Referrers (`referrers`) and Commission Payment Requests (`commission_payment_requests`) to Supabase.
