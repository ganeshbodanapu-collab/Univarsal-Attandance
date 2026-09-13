-- =========================================
-- DATABASE INDEXES
-- =========================================

-- Workers & Assignments
CREATE INDEX idx_workers_site_section ON workers(current_site_id, current_section_id);
CREATE INDEX idx_workers_status ON workers(status);
CREATE INDEX idx_assignments_worker ON worker_assignments(worker_id, to_date);

-- Attendance
CREATE INDEX idx_attendance_date_site ON attendance(date, site_id);
CREATE INDEX idx_attendance_worker_date ON attendance(worker_id, date);

-- Finance & Payroll
CREATE INDEX idx_advances_worker_status ON advances(worker_id, status);
CREATE INDEX idx_recoveries_advance_id ON recoveries(advance_id);
CREATE INDEX idx_settlements_month_site ON monthly_settlements(month, site_id);

-- Canteen Food Management
CREATE INDEX idx_food_orders_date_site ON section_food_orders(date, site_id, section_id);
