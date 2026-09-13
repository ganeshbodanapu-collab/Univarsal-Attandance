# Supabase Backend Migration Step 09 Report: Food & Commission Tables

> **Date**: 2026-09-11  
> **Target Project**: Universal Attendance & Worker Management System  
> **Supabase Project URL**: `https://gkphikhsgysoqjradbaz.supabase.co`  
> **Status**: STEP 09 COMPLETE (0 Errors)

---

## 1. Migration File Created

- **Path**: [`supabase/migrations/0006_food_commission_tables.sql`](file:///d:/Univarsal%20Attandance/worker-management-system/supabase/migrations/0006_food_commission_tables.sql)
- **Status**: Successfully created locally. NOT executed on remote database.

---

## 2. Tables Included

1. `section_food_orders`
2. `commission_payment_requests`

---

## 3. Column Count & Structure per Table

### Table 1: `section_food_orders` (31 Columns)
- `id` (TEXT, PRIMARY KEY) -- e.g., `'FO-SEC001-2026-08-28-morning'`
- `section_id` (TEXT, NOT NULL, FK -> `sections(id)`)
- `site_id` (TEXT, NOT NULL, FK -> `sites(id)`)
- `date` (DATE, NOT NULL)
- `meal_type` (meal_type ENUM, NOT NULL) -- `'morning' | 'afternoon' | 'night'`
- `present_count` (INTEGER, DEFAULT `0`)
- `absent_count` (INTEGER, DEFAULT `0`)
- `outside_workers_count` (INTEGER, DEFAULT `0`)
- `others_count` (INTEGER, DEFAULT `0`)
- `total_ordered_qty` (INTEGER, DEFAULT `0`)
- `remarks` (TEXT, NULLABLE)
- `pushed_at` (TIMESTAMPTZ, NULLABLE)
- `pushed_by` (TEXT, NULLABLE)
- `status` (canteen_order_status ENUM, NOT NULL DEFAULT `'draft'`)
- `canteen_remarks` (TEXT, NULLABLE)
- `packing_started_at` (TIMESTAMPTZ, NULLABLE)
- `dispatched_at` (TIMESTAMPTZ, NULLABLE)
- `dispatched_by` (TEXT, NULLABLE)
- `dispatched_qty` (INTEGER, NULLABLE)
- `received_qty` (INTEGER, NULLABLE)
- `received_at` (TIMESTAMPTZ, NULLABLE)
- `received_by` (TEXT, NULLABLE)
- `receiving_remarks` (TEXT, NULLABLE)
- `shortage_qty` (INTEGER, NULLABLE)
- `shortage_reason` (TEXT, NULLABLE)
- `re_send_requested_at` (TIMESTAMPTZ, NULLABLE)
- `re_send_dispatched_at` (TIMESTAMPTZ, NULLABLE)
- `remaining_received_qty` (INTEGER, NULLABLE)
- `re_send_received_at` (TIMESTAMPTZ, NULLABLE)
- `created_at` (TIMESTAMPTZ, DEFAULT `NOW()`)
- `updated_at` (TIMESTAMPTZ, DEFAULT `NOW()`)

### Table 2: `commission_payment_requests` (16 Columns)
- `id` (TEXT, PRIMARY KEY) -- e.g., `'COM-REQ-001'`
- `referrer_id` (TEXT, NOT NULL, FK -> `referrers(id)` ON DELETE CASCADE)
- `worker_id` (TEXT, NOT NULL, FK -> `workers(id)`)
- `amount` (NUMERIC(10,2), NOT NULL)
- `date` (DATE, NOT NULL)
- `payout_mode` (payout_mode ENUM, NOT NULL DEFAULT `'cash'`) -- `'upi' | 'bankTransfer' | 'cash'`
- `upi_number` (TEXT, NULLABLE)
- `bank_name` (TEXT, NULLABLE)
- `bank_account_number` (TEXT, NULLABLE)
- `bank_ifsc` (TEXT, NULLABLE)
- `status` (commission_req_status ENUM, NOT NULL DEFAULT `'pending'`) -- `'pending' | 'processing' | 'paid' | 'rejected'`
- `requested_at` (TIMESTAMPTZ, DEFAULT `NOW()`)
- `processed_at` (TIMESTAMPTZ, NULLABLE)
- `paid_at` (TIMESTAMPTZ, NULLABLE)
- `remarks` (TEXT, NULLABLE)
- `created_at` (TIMESTAMPTZ, DEFAULT `NOW()`)

---

## 4. Primary Keys Summary

| Table Name | Primary Key | Data Type |
| :--- | :--- | :--- |
| `section_food_orders` | `id` | TEXT |
| `commission_payment_requests` | `id` | TEXT |

---

## 5. Foreign Keys & Relationships

| Table Name | Foreign Key Column | Target Table & Key | On Delete Behavior |
| :--- | :--- | :--- | :--- |
| `section_food_orders` | `section_id` | `sections(id)` | `NO ACTION` / `RESTRICT` |
| `section_food_orders` | `site_id` | `sites(id)` | `NO ACTION` / `RESTRICT` |
| `commission_payment_requests` | `referrer_id` | `referrers(id)` | `CASCADE` |
| `commission_payment_requests` | `worker_id` | `workers(id)` | `NO ACTION` / `RESTRICT` |

---

## 6. ENUM Usage

All ENUM types referenced were created in `0001_extensions_enums.sql`:
- `meal_type`: `'morning'`, `'afternoon'`, `'night'`
- `canteen_order_status`: `'draft'`, `'pushed_to_canteen'`, `'packing'`, `'sent_to_section'`, `'received'`, `'shortage_resend_requested'`, `'remaining_sent'`
- `payout_mode`: `'upi'`, `'bankTransfer'`, `'cash'`
- `commission_req_status`: `'pending'`, `'processing'`, `'paid'`, `'rejected'`

---

## 7. Food Order & Commission Request Structural Design

- **`section_food_orders` Structural Design**:
  Preserves the single-table per-meal-indent workflow defined in the database specification. It tracks the complete lifecycle from section supervisor ordering $\rightarrow$ kitchen canteen packing/dispatch $\rightarrow$ section receipt verification $\rightarrow$ shortage reporting & re-dispatch without artificial child table normalization (`food_order_items`).

- **`commission_payment_requests` Structural Design**:
  Represents referrer commission claims linking the agent/employee referrer (`referrers`), referred worker (`workers`), payout method/banking details, and request clearance status (`commission_req_status`).

---

## 8. Statement Counts & Safety Verification

| Statement Type | Count in 0006 Migration |
| :--- | :--- |
| `CREATE TABLE` | **2** |
| `CREATE INDEX` | 0 |
| `CREATE TRIGGER` | 0 |
| `CREATE FUNCTION` | 0 |
| `CREATE POLICY` | 0 |
| `INSERT` | 0 |
| `UPDATE` | 0 |
| `DELETE` | 0 |

---

## 9. Remote Database Safety Confirmation

- **SQL Execution**: NO SQL was executed on the remote database.
- **Commands Avoided**: `supabase db push`, `supabase db reset`, `supabase db pull` were NOT run.
- **Remote Database State**: Unchanged (0 tables created remotely in this step).

---

## 10. Build Verification

- **Execution**: `npm run build`
- **Result**: **SUCCESS (0 errors)**. No frontend files were modified.
