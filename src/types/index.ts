export interface Site {
  id: string;          // e.g. "S001"
  code: string;        // unique site code, e.g. "S001"
  name: string;
  location: string;
  inCharge: string;
  mobile: string;
  address?: string;
  status: 'active' | 'inactive';
  createdDate?: string;
  remarks?: string;
}

export interface Section {
  id: string;           // e.g. "SEC001"
  code: string;         // e.g. "SEC-001"
  name: string;
  siteId: string;
  inCharge: string;
  mobile: string;
  status: 'active' | 'inactive';
  createdDate?: string;
  remarks?: string;
}

export interface WorkerAssignment {
  id: string;
  workerId: string;
  siteId: string;
  sectionId: string;
  fromDate: string;
  toDate: string | null;   // null = current active assignment
  status?: 'active' | 'closed';
  reason?: string;
  remarks?: string;
}

export interface EmploymentHistory {
  id: string;
  workerId: string;
  date: string;
  event: 'joined' | 'left' | 'rejoined';
  siteId: string;
  sectionId: string;
  remarks?: string;
}

export interface WorkerOpeningRecord {
  workerId: string;
  originalJoiningDate: string;    // Historical initial joining date with firm/contractor
  asOfDate: string;               // Cutover date up to which opening figures apply
  priorWorkingDays: number;       // Prior full days worked
  priorHalfDays: number;          // Prior half days worked
  totalPriorDays: number;         // priorWorkingDays + (priorHalfDays * 0.5)
  priorEarnedWages: number;       // Cumulative prior gross wages earned
  openingAdvanceBalance: number;  // Old advance loan balance carried forward
  openingPendingWages: number;    // Old pending/unpaid wages due to worker
  netOpeningBalance: number;      // openingPendingWages - openingAdvanceBalance (+ve payable to worker, -ve recoverable)
  openingFoodMeals: number;       // Prior canteen meals count
  remarks?: string;               // Ledger book / register reference
  updatedAt?: string;
  updatedBy?: string;
}

export interface Worker {
  id: string;                 // permanent ID / Employee ID, e.g. "01BGM - Ganesh 7890" or "W001"
  serialNumber?: string;      // site-linked serial number, e.g. "01BGM"
  name: string;
  mobile: string;
  workerType: 'company' | 'outside';
  currentSiteId: string;
  currentSectionId: string;
  joiningDate: string;
  lastRejoinedDate?: string;
  dailyWage: number;
  referrerId: string | null;
  commissionType: 'perDay' | 'percentage' | 'fixedMonthly';
  commissionRate: number;
  attendanceModes: Array<'face' | 'fingerprint' | 'manual'>;
  status: 'active' | 'inactive' | 'left';
  emergencyContact?: string;
  idProofNumber?: string;
  address?: string;
  phonePeNumber?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankIfsc?: string;
  bankHolderName?: string;
  photoUrl?: string;
  faceEnrolled?: boolean;
  fingerprintEnrolled?: boolean;
  designation?: string;       // e.g. "Senior Mason", "Barbender", "Tile Layer", "Carpenter", "General Labor", etc.
  purpose?: string;           // Work role / purpose alias
  remarks?: string;
  openingRecord?: WorkerOpeningRecord; // Prior service and old balance entry (Admin only)
}

export interface Attendance {
  id: string;
  workerId: string;
  assignmentId: string;      // ties attendance to the site/section at that time
  date: string;              // YYYY-MM-DD
  status: 'present' | 'halfDay' | 'absent' | 'leave' | 'holiday';
  method: 'face' | 'fingerprint' | 'manual';
  checkIn?: string;
  checkOut?: string;
  photoUrl?: string;
  remarks?: string;
  markedBy?: string;
  siteId?: string;           // Specific site where employee worked on this date
  sectionId?: string;        // Specific trade section worked on this date
  siteAmountGiven?: number;  // Amount given to employee by this site (wage / cash advance / allowance)
  siteAmountRemarks?: string;// Remarks for amount given by this site
  siteAmountMode?: 'cash' | 'upi' | 'settlement' | 'advance';
  workingPlaceNote?: string; // Field duty / working location details
}

export interface SiteMigrationRecord {
  id: string;
  workerId: string;
  fromSiteId: string;
  fromSectionId: string;
  toSiteId: string;
  toSectionId: string;
  date: string;              // Migration / transfer effective date
  migrationType: 'temporary' | 'permanent'; // Temporary cross-site shift vs permanent transfer
  reason: string;
  approvedBy: string;
  remarks?: string;
  createdAt?: string;
}

export interface AttendanceAudit {
  id: string;
  attendanceId: string;
  workerId: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
  changedAt: string;
  reason: string;
}

export type ReferrerType = 'agency' | 'seniorEmployee';

export interface Referrer {
  id: string;
  name: string;
  mobile: string;
  address?: string;
  status: 'active' | 'inactive';
  remarks?: string;
  type?: ReferrerType;           // 'agency' = External Contractor/Agent, 'seniorEmployee' = Senior Company Employee Referrer
  workerId?: string;             // linked company worker ID if senior employee (e.g. "W001")
  designation?: string;          // e.g. "Senior Mason", "Mestri / Lead Mate", "Site Foreman"
}

export interface AttendanceSettings {
  foodPresentRate: number;       // e.g. 1
  foodHalfDayRate: number;      // e.g. 0.5
  foodAbsentRate: number;       // e.g. 0
  foodLeaveRate: number;        // e.g. 0
  wagePresentMultiplier: number; // e.g. 1.0
  wageHalfDayMultiplier: number; // e.g. 0.5
  wageAbsentMultiplier: number;  // e.g. 0
  commissionPresentMultiplier: number; // e.g. 1.0
  commissionHalfDayMultiplier: number; // e.g. 0.5
  commissionAbsentMultiplier: number;  // e.g. 0
  allowDailyRecovery: boolean;
  allowMonthlyRecovery: boolean;
  allowPercentageRecovery: boolean;
  allowManualRecovery: boolean;
}

export interface FoodSummaryRow {
  date: string;
  siteId: string;
  sectionId: string;
  present: number;
  halfDay: number;
  foodCount: number;   // present*1 + halfDay*0.5, via calculateFood
}

export interface Advance {
  id: string;                 // e.g. "ADV001"
  workerId: string;
  date: string;
  amount: number;
  reason: string;
  recoveryMethod: 'perDay' | 'percentage' | 'fixedMonthly' | 'manual';
  dailyRecoveryAmount?: number;   // used when recoveryMethod = 'perDay'
  recoveryPercentage?: number;    // used when recoveryMethod = 'percentage'
  fixedMonthlyAmount?: number;    // used when recoveryMethod = 'fixedMonthly'
  status: 'pending' | 'processing' | 'active' | 'closed' | 'rejected';
  remarks?: string;
  
  // Advance Payment & Finance Team Submission fields
  sectionId?: string;
  payoutMode?: 'upi' | 'bankTransfer' | 'cash';
  upiNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  workerSignature?: string;      // data URL or digital signature
  supervisorSignature?: string;  // data URL or supervisor sign stamp
  photoUrl?: string;             // photo proof data URL
  sentToFinanceAt?: string;      // timestamp when sent to finance
  processedAt?: string;          // timestamp when finance began processing
  disbursedAt?: string;          // timestamp when payment was cleared/active
  financeRemarks?: string;
}

export interface Recovery {
  id: string;
  advanceId: string;
  workerId: string;
  date: string;
  attendanceId?: string;      // ties recovery to the day's wage, when auto-generated
  amount: number;
  method: 'perDay' | 'percentage' | 'fixedMonthly' | 'manual';
  isManual: boolean;
  remarks?: string;
}

export interface LedgerEntry {
  id: string;
  workerId: string;
  date: string;
  type: 'advance' | 'recovery' | 'deduction';
  amount: number;
  runningBalance: number;     // outstanding advance after this entry
  remarks?: string;
}

export interface WorkerPayment {
  id: string;
  workerId: string;
  workerName?: string;
  date: string;
  siteId: string;
  sectionId?: string;
  attendanceStatus?: 'present' | 'halfDay' | 'absent';
  grossWage: number;
  deductions: number;
  advanceRecovery: number;
  netPay: number;
  paymentMethod: 'cash' | 'bankTransfer';
  status: 'pending' | 'processing' | 'partiallyPaid' | 'paid';
  remarks?: string;
  processedAt?: string;
  paidAt?: string;
}

export interface MonthlySettlementRecord {
  id: string;
  month: string; // YYYY-MM
  workerId: string;
  siteId: string;
  sectionId: string;
  workingDays: number;
  presentDays: number;
  halfDays: number;
  absentDays: number;
  grossWage: number;
  advanceTaken: number;
  advanceRecovery: number;
  otherDeductions: number;
  netPay: number;
  foodDays: number;
  commission: number;
  commissionPaid: number;
  outstandingAdvance: number;
  status: 'draft' | 'reviewed' | 'approved' | 'paid';
  remarks?: string;
}

export interface AppUser {
  id: string;                 // e.g. "U001", "U002"
  username: string;           // e.g. "admin", "site_downtown", "site_marinabay"
  password: string;           // e.g. "Admin@2026", "Downtown@2026"
  name: string;               // e.g. "Amit Singh", "Rahul Dev"
  role: 'admin' | 'supervisor';
  assignedSiteId?: string;    // e.g. "S001", "S002", "S003"
  assignedSectionId?: string; // e.g. "SEC001", "SEC002"
  teamName?: string;          // e.g. "RCC Structure & Rebar Team"
  mobile?: string;            // e.g. "+91 98765 43210"
  email?: string;             // e.g. "downtown@universal.com"
  status: 'active' | 'inactive';
  lastLogin?: string;         // e.g. "2026-08-28 09:30 AM"
  createdDate?: string;       // e.g. "2026-01-01"
}

export type MealType = 'morning' | 'afternoon' | 'night';

export type CanteenOrderStatus =
  | 'draft'                     // Saved as draft at section
  | 'pushed_to_canteen'         // Pushed by section supervisor to canteen kitchen
  | 'packing'                   // Canteen kitchen is packing / in processing
  | 'sent_to_section'           // Canteen dispatched food to section
  | 'received'                  // Section supervisor verified & received quantity
  | 'shortage_resend_requested' // Supervisor reported shortage & requested remaining parcels
  | 'remaining_sent';           // Canteen dispatched remaining parcels to section

export interface SectionFoodOrder {
  id: string;                     // e.g. "FO-SEC001-2026-08-28-morning"
  sectionId: string;              // e.g. "SEC001"
  siteId: string;                 // e.g. "S001"
  date: string;                   // YYYY-MM-DD
  mealType: MealType;             // 'morning' | 'afternoon' | 'night'

  // Indented Quantities
  presentCount: number;           // Auto from attendance, editable
  absentCount: number;            // Auto from attendance, editable
  outsideWorkersCount: number;    // Auto from workerType==='outside', editable
  othersCount: number;            // Drivers, visitors, staff guests
  totalOrderedQty: number;        // Sum: present + absent + outside + others

  // Supervisor Indent Submission
  remarks?: string;               // Remarks for canteen (packaging, dietary notes)
  pushedAt?: string;              // Timestamp when supervisor pushed to canteen
  pushedBy?: string;              // Supervisor name

  // Canteen Processing Status
  status: CanteenOrderStatus;
  canteenRemarks?: string;        // Notes from canteen kitchen
  packingStartedAt?: string;      // Timestamp when canteen started packing
  dispatchedAt?: string;          // Timestamp when canteen dispatched food
  dispatchedBy?: string;          // Delivery personnel / vehicle info
  dispatchedQty?: number;         // Quantity dispatched from canteen

  // Section Receiving Verification
  receivedQty?: number;           // Actual quantity received by supervisor
  receivedAt?: string;            // Timestamp when supervisor verified delivery
  receivedBy?: string;            // Supervisor who acknowledged receipt
  receivingRemarks?: string;      // Discrepancy / damages / quality remarks

  // Shortage & Re-send Tracking
  shortageQty?: number;           // Shortage count: dispatchedQty - receivedQty
  shortageReason?: string;        // Reason for shortage (e.g. damaged during transit, missing packs)
  reSendRequestedAt?: string;     // Timestamp when re-dispatch requested
  reSendDispatchedAt?: string;    // Timestamp when canteen dispatched remaining parcels
  remainingReceivedQty?: number;  // Second batch received count
  reSendReceivedAt?: string;      // Timestamp when remaining parcels received
}

export interface CommissionPaymentRequest {
  id: string;                     // e.g. "COM-REQ-001"
  referrerId: string;
  workerId: string;
  amount: number;
  date: string;                   // YYYY-MM-DD
  payoutMode: 'upi' | 'bankTransfer' | 'cash';
  upiNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  status: 'pending' | 'processing' | 'paid' | 'rejected';
  requestedAt: string;
  processedAt?: string;
  paidAt?: string;
  remarks?: string;
}

