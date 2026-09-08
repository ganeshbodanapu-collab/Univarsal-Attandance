import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  Site,
  Section,
  Worker,
  WorkerAssignment,
  EmploymentHistory,
  Attendance,
  AttendanceAudit,
  AttendanceSettings,
  Advance,
  Recovery,
  Referrer,
  WorkerPayment,
  MonthlySettlementRecord,
  AppUser,
  SectionFoodOrder,
  MealType,
  CanteenOrderStatus,
  CommissionPaymentRequest,
  WorkerOpeningRecord,
  SiteMigrationRecord,
} from '../types';
import { mockSites } from '../data/mock/sites';
import { mockSections } from '../data/mock/sections';
import { mockWorkers, mockWorkerAssignments, mockEmploymentHistory } from '../data/mock/workers';
import { mockAttendance, mockAttendanceAudits } from '../data/mock/attendance';
import { mockAdvances, mockRecoveries } from '../data/mock/advances';
import { mockReferrers } from '../data/mock/referrers';
import { mockPayments } from '../data/mock/payments';
import { mockSettlements } from '../data/mock/settlements';
import { mockAppUsers } from '../data/mock/users';
import { mockFoodOrders } from '../data/mock/foodOrders';
import { mockCommissionRequests } from '../data/mock/commissionRequests';
import { mockSiteMigrations } from '../data/mock/migrations';
import { defaultSettings } from '../utils/calculations/calculateFood';
import { calculateDailyRecovery } from '../utils/calculations/calculateAdvanceBalance';

interface AttendanceContextType {
  sites: Site[];
  sections: Section[];
  workers: Worker[];
  assignments: WorkerAssignment[];
  employmentHistory: EmploymentHistory[];
  attendance: Attendance[];
  audits: AttendanceAudit[];
  settings: AttendanceSettings;
  advances: Advance[];
  recoveries: Recovery[];
  referrers: Referrer[];
  payments: WorkerPayment[];
  settlementRecords: MonthlySettlementRecord[];
  currentUser: AppUser | null;
  appUsers: AppUser[];
  switchUser: (userId: string) => void;
  loginWithCredentials: (username: string, password: string, targetSiteId?: string) => { success: boolean; message?: string; user?: AppUser };
  logout: () => void;
  addAppUser: (user: Omit<AppUser, 'id'>) => AppUser;
  updateAppUser: (id: string, updates: Partial<AppUser>) => void;
  deleteAppUser: (id: string) => void;
  updateSettings: (newSettings: Partial<AttendanceSettings>) => void;
  addAttendanceRecord: (record: Omit<Attendance, 'id'>) => Attendance;
  registerOrUpdateAttendance: (record: Omit<Attendance, 'id'>) => Attendance;
  updateAttendanceStatus: (
    attendanceId: string,
    newStatus: Attendance['status'],
    changedBy: string,
    reason: string
  ) => void;
  bulkSaveAttendance: (
    date: string,
    siteId: string,
    sectionId: string,
    records: Array<{ workerId: string; status: Attendance['status'] }>,
    changedBy: string,
    reasons: Record<string, string> // maps workerId -> reason
  ) => void;
  addAdvance: (advance: Omit<Advance, 'id' | 'status'> & { status?: Advance['status'] }) => Advance;
  updateAdvancePaymentStatus: (advanceId: string, status: Advance['status'], details?: { remarks?: string }) => void;
  addManualRecovery: (recovery: Omit<Recovery, 'id' | 'isManual' | 'method'>) => void;
  closeAdvance: (advanceId: string, remarks?: string) => void;
  addSite: (site: Omit<Site, 'id'>) => void;
  updateSite: (site: Site) => void;
  deleteSite: (siteId: string) => void;
  toggleSiteStatus: (siteId: string) => void;
  addSection: (section: Omit<Section, 'id'>) => void;
  updateSection: (section: Section) => void;
  deleteSection: (sectionId: string) => void;
  toggleSectionStatus: (sectionId: string) => void;
  addWorker: (worker: Omit<Worker, 'id'> & { id?: string }) => Worker;
  updateWorker: (worker: Worker) => void;
  deleteWorker: (workerId: string) => void;
  updateWorkerOpening: (workerId: string, opening: WorkerOpeningRecord) => void;
  bulkUpdateWorkerOpenings: (openings: WorkerOpeningRecord[]) => void;
  transferWorker: (
    workerId: string,
    toSiteId: string,
    toSectionId: string,
    date: string,
    reason?: string,
    remarks?: string
  ) => void;
  markWorkerLeft: (workerId: string, date: string, remarks?: string) => void;
  rejoinWorker: (
    workerId: string,
    toSiteId: string,
    toSectionId: string,
    date: string,
    remarks?: string
  ) => void;
  addReferrer: (referrer: Omit<Referrer, 'id'>) => void;
  markPaymentPaid: (paymentId: string) => void;
  updatePaymentStatus: (paymentId: string, status: WorkerPayment['status']) => void;
  updateSettlementStatus: (settlementId: string, status: MonthlySettlementRecord['status']) => void;
  foodOrders: SectionFoodOrder[];
  saveSectionFoodOrder: (order: Partial<SectionFoodOrder> & { sectionId: string; date: string; mealType: MealType; siteId: string }) => SectionFoodOrder;
  pushFoodOrderToCanteen: (orderId: string, remarks?: string) => void;
  updateCanteenStatus: (orderId: string, status: CanteenOrderStatus, details?: { canteenRemarks?: string; dispatchedBy?: string; dispatchedQty?: number }) => void;
  receiveFoodOrderAtSection: (orderId: string, receivedQty: number, receivedBy: string, remarks?: string) => void;
  requestShortageReSend: (orderId: string, receivedQty: number, shortageQty: number, shortageReason: string, supervisorName: string) => void;
  dispatchRemainingParcels: (orderId: string, dispatchedQty: number, driverInfo?: string) => void;
  confirmRemainingParcelsReceived: (orderId: string, receivedRemainingQty: number, supervisorName: string) => void;
  commissionRequests: CommissionPaymentRequest[];
  addCommissionPaymentRequest: (
    req: Omit<CommissionPaymentRequest, 'id' | 'requestedAt' | 'status'> & { status?: CommissionPaymentRequest['status'] }
  ) => CommissionPaymentRequest;
  addBulkCommissionPaymentRequests: (
    reqs: Array<Omit<CommissionPaymentRequest, 'id' | 'requestedAt' | 'status'> & { status?: CommissionPaymentRequest['status'] }>
  ) => CommissionPaymentRequest[];
  updateCommissionPaymentRequestStatus: (
    id: string,
    status: CommissionPaymentRequest['status'],
    details?: { remarks?: string }
  ) => void;
  deleteAttendanceRecord: (attendanceId: string) => void;
  siteMigrations: SiteMigrationRecord[];
  addSiteMigration: (migration: Omit<SiteMigrationRecord, 'id' | 'createdAt'>) => SiteMigrationRecord;
  deleteSiteMigration: (id: string) => void;
  resetToDefaultData: () => void;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.error(`Error reading ${key} from storage:`, err);
  }
  return fallback;
}

function saveToStorage<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving ${key} to storage:`, err);
  }
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Auto-clear old mock data if this is the first load after the clean-slate update
  // Version key: bump this string to force a localStorage wipe for all users
  const DATA_VERSION = 'v2.0-clean';
  const storedVersion = localStorage.getItem('univarsal_data_version');
  if (storedVersion !== DATA_VERSION) {
    const keysToRemove = [
      'univarsal_sites_data', 'univarsal_sections_data', 'univarsal_workers_data',
      'univarsal_assignments_data', 'univarsal_employment_history_data',
      'univarsal_attendance_data', 'univarsal_audits_data', 'univarsal_settings_data',
      'univarsal_advances_data', 'univarsal_recoveries_data', 'univarsal_referrers_data',
      'univarsal_payments_data', 'univarsal_settlements_data', 'univarsal_food_orders_data',
      'univarsal_commission_requests_data', 'univarsal_site_migrations_data', 'univarsal_app_users_data',
    ];
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    localStorage.setItem('univarsal_data_version', DATA_VERSION);
  }

  const [sites, setSites] = useState<Site[]>(() => loadFromStorage('univarsal_sites_data', mockSites));
  const [sections, setSections] = useState<Section[]>(() => loadFromStorage('univarsal_sections_data', mockSections));
  const [workers, setWorkers] = useState<Worker[]>(() => loadFromStorage('univarsal_workers_data', mockWorkers));
  const [assignments, setAssignments] = useState<WorkerAssignment[]>(() => loadFromStorage('univarsal_assignments_data', mockWorkerAssignments));
  const [employmentHistory, setEmploymentHistory] = useState<EmploymentHistory[]>(() => loadFromStorage('univarsal_employment_history_data', mockEmploymentHistory));
  const [attendance, setAttendance] = useState<Attendance[]>(() => loadFromStorage('univarsal_attendance_data', mockAttendance));
  const [audits, setAudits] = useState<AttendanceAudit[]>(() => loadFromStorage('univarsal_audits_data', mockAttendanceAudits));
  const [settings, setSettings] = useState<AttendanceSettings>(() => loadFromStorage('univarsal_settings_data', defaultSettings));
  const [advances, setAdvances] = useState<Advance[]>(() => loadFromStorage('univarsal_advances_data', mockAdvances));
  const [recoveries, setRecoveries] = useState<Recovery[]>(() => loadFromStorage('univarsal_recoveries_data', mockRecoveries));
  const [referrers, setReferrers] = useState<Referrer[]>(() => loadFromStorage('univarsal_referrers_data', mockReferrers));
  const [payments, setPayments] = useState<WorkerPayment[]>(() => loadFromStorage('univarsal_payments_data', mockPayments));
  const [settlementRecords, setSettlementRecords] = useState<MonthlySettlementRecord[]>(() => loadFromStorage('univarsal_settlements_data', mockSettlements));
  const [foodOrders, setFoodOrders] = useState<SectionFoodOrder[]>(() => loadFromStorage('univarsal_food_orders_data', mockFoodOrders));
  const [commissionRequests, setCommissionRequests] = useState<CommissionPaymentRequest[]>(() => loadFromStorage('univarsal_commission_requests_data', mockCommissionRequests));
  const [siteMigrations, setSiteMigrations] = useState<SiteMigrationRecord[]>(() => loadFromStorage('univarsal_site_migrations_data', mockSiteMigrations));

  // App Auth/Role State & Site-wise Credentials
  const [appUsers, setAppUsers] = useState<AppUser[]>(() => loadFromStorage('univarsal_app_users_data', mockAppUsers));

  // Auto-persist state changes to localStorage and Backend API
  useEffect(() => { saveToStorage('univarsal_sites_data', sites); }, [sites]);
  useEffect(() => { saveToStorage('univarsal_sections_data', sections); }, [sections]);
  useEffect(() => { saveToStorage('univarsal_workers_data', workers); }, [workers]);
  useEffect(() => { saveToStorage('univarsal_assignments_data', assignments); }, [assignments]);
  useEffect(() => { saveToStorage('univarsal_employment_history_data', employmentHistory); }, [employmentHistory]);
  useEffect(() => { saveToStorage('univarsal_attendance_data', attendance); }, [attendance]);
  useEffect(() => { saveToStorage('univarsal_audits_data', audits); }, [audits]);
  useEffect(() => { saveToStorage('univarsal_settings_data', settings); }, [settings]);
  useEffect(() => { saveToStorage('univarsal_advances_data', advances); }, [advances]);
  useEffect(() => { saveToStorage('univarsal_recoveries_data', recoveries); }, [recoveries]);
  useEffect(() => { saveToStorage('univarsal_referrers_data', referrers); }, [referrers]);
  useEffect(() => { saveToStorage('univarsal_payments_data', payments); }, [payments]);
  useEffect(() => { saveToStorage('univarsal_settlements_data', settlementRecords); }, [settlementRecords]);
  useEffect(() => { saveToStorage('univarsal_food_orders_data', foodOrders); }, [foodOrders]);
  useEffect(() => { saveToStorage('univarsal_commission_requests_data', commissionRequests); }, [commissionRequests]);
  useEffect(() => { saveToStorage('univarsal_site_migrations_data', siteMigrations); }, [siteMigrations]);
  useEffect(() => { saveToStorage('univarsal_app_users_data', appUsers); }, [appUsers]);

  // Backend API Sync
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  useEffect(() => {
    fetch('/api/sync/export')
      .then((res) => {
        if (!res.ok) throw new Error('Backend not available');
        return res.json();
      })
      .then((data) => {
        if (data && typeof data === 'object') {
          if (Array.isArray(data.sites)) setSites(data.sites);
          if (Array.isArray(data.sections)) setSections(data.sections);
          if (Array.isArray(data.workers)) setWorkers(data.workers);
          if (Array.isArray(data.assignments)) setAssignments(data.assignments);
          if (Array.isArray(data.employment_history)) setEmploymentHistory(data.employment_history);
          if (Array.isArray(data.attendance)) setAttendance(data.attendance);
          if (Array.isArray(data.advances)) setAdvances(data.advances);
          if (Array.isArray(data.recoveries)) setRecoveries(data.recoveries);
          if (Array.isArray(data.referrers)) setReferrers(data.referrers);
          if (Array.isArray(data.payments)) setPayments(data.payments);
          if (Array.isArray(data.settlements)) setSettlementRecords(data.settlements);
          if (Array.isArray(data.food_orders)) setFoodOrders(data.food_orders);
          if (Array.isArray(data.commission_requests)) setCommissionRequests(data.commission_requests);
          if (Array.isArray(data.site_migrations)) setSiteMigrations(data.site_migrations);
          if (Array.isArray(data.users)) setAppUsers(data.users);
          if (data.settings && typeof data.settings === 'object' && Object.keys(data.settings).length > 0) {
            setSettings(data.settings);
          }
          setIsBackendConnected(true);
        }
      })
      .catch((err) => {
        console.warn('Backend server disconnected, using local storage mode:', err.message);
        setIsBackendConnected(false);
      });
  }, []);

  // Sync state to backend when any collection changes
  useEffect(() => {
    if (!isBackendConnected) return;
    const fullDb = {
      sites,
      sections,
      workers,
      assignments,
      employment_history: employmentHistory,
      attendance,
      advances,
      recoveries,
      referrers,
      payments,
      settlements: settlementRecords,
      food_orders: foodOrders,
      commission_requests: commissionRequests,
      site_migrations: siteMigrations,
      users: appUsers,
      settings,
    };
    fetch('/api/sync/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullDb),
    }).catch(() => {});
  }, [
    sites, sections, workers, assignments, employmentHistory, attendance,
    advances, recoveries, referrers, payments, settlementRecords, foodOrders,
    commissionRequests, siteMigrations, appUsers, settings, isBackendConnected,
  ]);

  // Cross-tab live synchronization listener
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.newValue) return;
      try {
        if (e.key === 'univarsal_workers_data') setWorkers(JSON.parse(e.newValue));
        else if (e.key === 'univarsal_attendance_data') setAttendance(JSON.parse(e.newValue));
        else if (e.key === 'univarsal_advances_data') setAdvances(JSON.parse(e.newValue));
        else if (e.key === 'univarsal_recoveries_data') setRecoveries(JSON.parse(e.newValue));
        else if (e.key === 'univarsal_payments_data') setPayments(JSON.parse(e.newValue));
        else if (e.key === 'univarsal_sites_data') setSites(JSON.parse(e.newValue));
        else if (e.key === 'univarsal_sections_data') setSections(JSON.parse(e.newValue));
        else if (e.key === 'univarsal_settlements_data') setSettlementRecords(JSON.parse(e.newValue));
        else if (e.key === 'univarsal_food_orders_data') setFoodOrders(JSON.parse(e.newValue));
        else if (e.key === 'univarsal_site_migrations_data') setSiteMigrations(JSON.parse(e.newValue));
      } catch (err) {
        console.error('Error syncing storage event:', err);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const resetToDefaultData = () => {
    const keys = [
      'univarsal_sites_data',
      'univarsal_sections_data',
      'univarsal_workers_data',
      'univarsal_assignments_data',
      'univarsal_employment_history_data',
      'univarsal_attendance_data',
      'univarsal_audits_data',
      'univarsal_settings_data',
      'univarsal_advances_data',
      'univarsal_recoveries_data',
      'univarsal_referrers_data',
      'univarsal_payments_data',
      'univarsal_settlements_data',
      'univarsal_food_orders_data',
      'univarsal_commission_requests_data',
      'univarsal_site_migrations_data',
      'univarsal_app_users_data',
    ];
    keys.forEach((k) => localStorage.removeItem(k));
    setSites(mockSites);
    setSections(mockSections);
    setWorkers(mockWorkers);
    setAssignments(mockWorkerAssignments);
    setEmploymentHistory(mockEmploymentHistory);
    setAttendance(mockAttendance);
    setAudits(mockAttendanceAudits);
    setSettings(defaultSettings);
    setAdvances(mockAdvances);
    setRecoveries(mockRecoveries);
    setReferrers(mockReferrers);
    setPayments(mockPayments);
    setSettlementRecords(mockSettlements);
    setFoodOrders(mockFoodOrders);
    setCommissionRequests(mockCommissionRequests);
    setSiteMigrations(mockSiteMigrations);
    setAppUsers(mockAppUsers);
  };
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem('univarsal_user_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Load persisted appUsers to find the current user (handles dynamically added users)
        const storedUsers: AppUser[] = loadFromStorage('univarsal_app_users_data', mockAppUsers);
        const match = storedUsers.find((u) => u.id === parsed.id);
        if (match) return match;
      }
    } catch {
      // ignore
    }
    return null;
  });

  const switchUser = (userId: string) => {
    const found = appUsers.find((u) => u.id === userId);
    if (found) {
      setCurrentUser(found);
      try {
        localStorage.setItem(
          'univarsal_user_session',
          JSON.stringify({ id: found.id, username: found.username })
        );
      } catch {
        // ignore
      }
    }
  };

  const loginWithCredentials = (username: string, password: string, targetSiteId?: string) => {
    const cleanUser = username.trim().toLowerCase();
    const found = appUsers.find((u) => u.username.toLowerCase() === cleanUser);
    if (!found) {
      return { success: false, message: 'Invalid User ID. Please check and try again.' };
    }
    if (found.password !== password) {
      return { success: false, message: 'Incorrect Password. Please try again.' };
    }
    if (found.status === 'inactive') {
      return { success: false, message: 'This site user account is currently deactivated.' };
    }

    // Role-wise site permission validation
    if (targetSiteId && targetSiteId !== 'admin') {
      if (found.role !== 'admin' && found.assignedSiteId !== targetSiteId) {
        const targetSiteObj = sites.find((s) => s.id === targetSiteId);
        const userSiteObj = sites.find((s) => s.id === found.assignedSiteId);
        return {
          success: false,
          message: `Access denied. "${found.username}" is assigned to ${userSiteObj?.name || found.assignedSiteId}, not ${targetSiteObj?.name || targetSiteId}.`,
        };
      }
    }
    if (targetSiteId === 'admin' && found.role !== 'admin') {
      return {
        success: false,
        message: 'Access denied. Only Universal System Admins can log in to the Central Portal.',
      };
    }

    const nowStr = new Date().toLocaleString();
    const updatedUser: AppUser = { ...found, lastLogin: nowStr };
    setAppUsers((prev) => prev.map((u) => (u.id === found.id ? updatedUser : u)));
    setCurrentUser(updatedUser);
    try {
      localStorage.setItem(
        'univarsal_user_session',
        JSON.stringify({ id: updatedUser.id, username: updatedUser.username })
      );
    } catch {
      // ignore
    }
    return { success: true, user: updatedUser };
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('univarsal_user_session');
    } catch {
      // ignore
    }
  };

  const addAppUser = (user: Omit<AppUser, 'id'>) => {
    const newId = `U${String(appUsers.length + 1).padStart(3, '0')}`;
    const newUser: AppUser = {
      ...user,
      id: newId,
      createdDate: user.createdDate || new Date().toISOString().split('T')[0],
      status: user.status || 'active',
    };
    setAppUsers((prev) => [...prev, newUser]);
    return newUser;
  };

  const updateAppUser = (id: string, updates: Partial<AppUser>) => {
    setAppUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const updated = { ...u, ...updates };
          if (currentUser?.id === id) {
            setCurrentUser(updated);
            try {
              localStorage.setItem(
                'univarsal_user_session',
                JSON.stringify({ id: updated.id, username: updated.username })
              );
            } catch {
              // ignore
            }
          }
          return updated;
        }
        return u;
      })
    );
  };

  const deleteAppUser = (id: string) => {
    setAppUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const updateSettings = (newSettings: Partial<AttendanceSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const addSite = (site: Omit<Site, 'id'>) => {
    const newId = `S${String(sites.length + 1).padStart(3, '0')}`;
    setSites((prev) => [...prev, { ...site, id: newId }]);
  };

  const addSection = (section: Omit<Section, 'id'>) => {
    const newId = `SEC${String(sections.length + 1).padStart(3, '0')}`;
    setSections((prev) => [...prev, { ...section, id: newId }]);
  };

  const addWorker = (worker: Omit<Worker, 'id'> & { id?: string }): Worker => {
    const newId = worker.id && worker.id.trim()
      ? worker.id.trim()
      : `W${String(workers.length + 1).padStart(3, '0')}`;
    const newWorker: Worker = {
      ...worker,
      id: newId,
      designation: worker.designation || worker.purpose || undefined,
      purpose: worker.purpose || worker.designation || undefined,
    };
    setWorkers((prev) => [...prev, newWorker]);

    const asgId = `ASG${String(assignments.length + 1 + Math.random()).substring(2, 6)}`;
    setAssignments((prev) => [
      ...prev,
      {
        id: asgId,
        workerId: newId,
        siteId: worker.currentSiteId,
        sectionId: worker.currentSectionId,
        fromDate: worker.joiningDate,
        toDate: null,
        reason: 'Initial onboard assignment',
      },
    ]);

    setEmploymentHistory((prev) => [
      ...prev,
      {
        id: `EMP${String(employmentHistory.length + 1 + Math.random()).substring(2, 6)}`,
        workerId: newId,
        date: worker.joiningDate,
        event: 'joined',
        siteId: worker.currentSiteId,
        sectionId: worker.currentSectionId,
        remarks: 'New employee onboarding to section',
      },
    ]);

    return newWorker;
  };

  const addReferrer = (referrer: Omit<Referrer, 'id'>) => {
    const newId = `REF${String(referrers.length + 1).padStart(3, '0')}`;
    setReferrers((prev) => [...prev, { ...referrer, id: newId }]);
  };

  const addAttendanceRecord = (record: Omit<Attendance, 'id'>) => {
    const newId = `ATT${String(attendance.length + 1).padStart(5, '0')}`;
    let checkIn = record.checkIn;
    let checkOut = record.checkOut;

    if (!checkIn && !checkOut) {
      if (record.status === 'present') {
        checkIn = '08:45';
        checkOut = '17:30';
      } else if (record.status === 'halfDay') {
        checkIn = '08:45';
        checkOut = '13:00';
      }
    }

    const worker = workers.find((w) => w.id === record.workerId);
    let assignmentId = record.assignmentId;
    if (!assignmentId) {
      const activeAsg = assignments.find((asg) => asg.workerId === record.workerId && asg.toDate === null);
      assignmentId = activeAsg?.id || `ASG-${record.workerId}-AUTO`;
    }

    const siteId = record.siteId || worker?.currentSiteId;
    const sectionId = record.sectionId || worker?.currentSectionId;

    const newRecord: Attendance = {
      ...record,
      id: newId,
      assignmentId,
      siteId,
      sectionId,
      checkIn,
      checkOut,
    };

    setAttendance((prev) => [newRecord, ...prev]);

    // Check if worker has active advances to auto-recover from daily wage
    const activeAdvance = advances.find(a => a.workerId === record.workerId && a.status === 'active');
    if (activeAdvance && worker && (newRecord.status === 'present' || newRecord.status === 'halfDay')) {
      const dailyRecovery = calculateDailyRecovery(activeAdvance, newRecord.status, worker.dailyWage, settings);
      if (dailyRecovery > 0) {
        const advRecoveries = recoveries.filter(r => r.advanceId === activeAdvance.id);
        const totalRecovered = advRecoveries.reduce((sum, r) => sum + r.amount, 0);
        const outstanding = Math.max(0, activeAdvance.amount - totalRecovered);

        if (outstanding > 0) {
          const finalRecoveryAmt = Math.min(dailyRecovery, outstanding);
          const newRecId = `REC${String(recoveries.length + 1 + Math.random()).substring(2, 6)}`;
          const autoRecovery: Recovery = {
            id: newRecId,
            advanceId: activeAdvance.id,
            workerId: record.workerId,
            date: record.date,
            attendanceId: newId,
            amount: finalRecoveryAmt,
            method: activeAdvance.recoveryMethod,
            isManual: false,
            remarks: 'Auto-recovered from daily wage',
          };

          setRecoveries(prev => [...prev, autoRecovery]);

          if (outstanding - finalRecoveryAmt <= 0) {
            setAdvances(prev => prev.map(a => a.id === activeAdvance.id ? { ...a, status: 'closed' } : a));
          }
        }
      }
    }

    return newRecord;
  };

  const registerOrUpdateAttendance = (record: Omit<Attendance, 'id'>): Attendance => {
    // Check if attendance already exists for this worker on this date
    const existingIndex = attendance.findIndex(
      (a) => a.workerId === record.workerId && a.date === record.date
    );

    let checkIn = record.checkIn;
    let checkOut = record.checkOut;

    if (!checkIn && !checkOut) {
      if (record.status === 'present') {
        checkIn = '08:45';
        checkOut = '17:30';
      } else if (record.status === 'halfDay') {
        checkIn = '08:45';
        checkOut = '13:00';
      }
    }

    if (existingIndex >= 0) {
      const existing = attendance[existingIndex];
      const updated: Attendance = {
        ...existing,
        ...record,
        checkIn: checkIn ?? existing.checkIn,
        checkOut: checkOut ?? existing.checkOut,
        photoUrl: record.photoUrl !== undefined ? record.photoUrl : existing.photoUrl,
        remarks: record.remarks !== undefined ? record.remarks : existing.remarks,
        markedBy: record.markedBy !== undefined ? record.markedBy : existing.markedBy,
        siteId: record.siteId !== undefined ? record.siteId : existing.siteId,
        sectionId: record.sectionId !== undefined ? record.sectionId : existing.sectionId,
        siteAmountGiven: record.siteAmountGiven !== undefined ? record.siteAmountGiven : existing.siteAmountGiven,
        siteAmountRemarks: record.siteAmountRemarks !== undefined ? record.siteAmountRemarks : existing.siteAmountRemarks,
        siteAmountMode: record.siteAmountMode !== undefined ? record.siteAmountMode : existing.siteAmountMode,
        workingPlaceNote: record.workingPlaceNote !== undefined ? record.workingPlaceNote : existing.workingPlaceNote,
      };

      setAttendance((prev) => prev.map((a, i) => (i === existingIndex ? updated : a)));
      return updated;
    } else {
      return addAttendanceRecord({
        ...record,
        checkIn,
        checkOut,
      });
    }
  };

  const deleteAttendanceRecord = (attendanceId: string) => {
    setAttendance((prev) => prev.filter((a) => a.id !== attendanceId));
    setAudits((prev) => prev.filter((aud) => aud.attendanceId !== attendanceId));
    setRecoveries((prev) => prev.filter((r) => r.attendanceId !== attendanceId));
  };

  const updateAttendanceStatus = (
    attendanceId: string,
    newStatus: Attendance['status'],
    changedBy: string,
    reason: string
  ) => {
    setAttendance((prevAttendance) => {
      return prevAttendance.map((item) => {
        if (item.id === attendanceId) {
          const oldStatus = item.status;
          if (oldStatus === newStatus) return item;

          const newAudit: AttendanceAudit = {
            id: `AUD${String(audits.length + 1).padStart(3, '0')}`,
            attendanceId: item.id,
            workerId: item.workerId,
            oldStatus,
            newStatus,
            changedBy,
            changedAt: new Date().toISOString(),
            reason,
          };
          setAudits((prevAudits) => [newAudit, ...prevAudits]);

          let checkIn = item.checkIn;
          let checkOut = item.checkOut;
          if (newStatus === 'present') {
            checkIn = '08:45';
            checkOut = '17:30';
          } else if (newStatus === 'halfDay') {
            checkIn = '08:45';
            checkOut = '13:00';
          } else {
            checkIn = undefined;
            checkOut = undefined;
          }

          return {
            ...item,
            status: newStatus,
            checkIn,
            checkOut,
          };
        }
        return item;
      });
    });
  };

  const bulkSaveAttendance = (
    date: string,
    siteId: string,
    sectionId: string,
    records: Array<{ workerId: string; status: Attendance['status'] }>,
    changedBy: string,
    reasons: Record<string, string>
  ) => {
    setAttendance((prevAttendance) => {
      const updatedAttendance = [...prevAttendance];

      records.forEach((rec) => {
        const workerAssignment = assignments.find((asg) => {
          if (asg.workerId !== rec.workerId) return false;
          if (asg.siteId !== siteId || asg.sectionId !== sectionId) return false;
          const fromDate = new Date(asg.fromDate);
          const toDate = asg.toDate ? new Date(asg.toDate) : null;
          const targetDate = new Date(date);
          return targetDate >= fromDate && (!toDate || targetDate <= toDate);
        });

        if (!workerAssignment) return;

        const existingIndex = updatedAttendance.findIndex(
          (att) => att.workerId === rec.workerId && att.date === date
        );

        let checkIn: string | undefined;
        let checkOut: string | undefined;
        if (rec.status === 'present') {
          checkIn = '08:45';
          checkOut = '17:30';
        } else if (rec.status === 'halfDay') {
          checkIn = '08:45';
          checkOut = '13:00';
        }

        let savedRecordId = '';

        if (existingIndex > -1) {
          const oldRecord = updatedAttendance[existingIndex];
          if (oldRecord && oldRecord.status !== rec.status) {
            savedRecordId = oldRecord.id;
            const newAudit: AttendanceAudit = {
              id: `AUD${String(audits.length + 1 + Math.random()).substring(2, 6)}`,
              attendanceId: oldRecord.id,
              workerId: rec.workerId,
              oldStatus: oldRecord.status,
              newStatus: rec.status,
              changedBy,
              changedAt: new Date().toISOString(),
              reason: reasons[rec.workerId] || 'Manual bulk status update',
            };
            setAudits((prevAudits) => [newAudit, ...prevAudits]);

            updatedAttendance[existingIndex] = {
              ...oldRecord,
              status: rec.status,
              checkIn,
              checkOut,
            };
          }
        } else {
          const newId = `ATT${String(updatedAttendance.length + 1).padStart(5, '0')}`;
          savedRecordId = newId;
          updatedAttendance.push({
            id: newId,
            workerId: rec.workerId,
            assignmentId: workerAssignment.id,
            date,
            status: rec.status,
            method: 'manual',
            checkIn,
            checkOut,
          });
        }

        if (savedRecordId && (rec.status === 'present' || rec.status === 'halfDay')) {
          const activeAdvance = advances.find(a => a.workerId === rec.workerId && a.status === 'active');
          const worker = workers.find(w => w.id === rec.workerId);
          if (activeAdvance && worker) {
            const dailyRecovery = calculateDailyRecovery(activeAdvance, rec.status, worker.dailyWage, settings);
            if (dailyRecovery > 0) {
              const advRecoveries = recoveries.filter(r => r.advanceId === activeAdvance.id);
              const totalRecovered = advRecoveries.reduce((sum, r) => sum + r.amount, 0);
              const outstanding = Math.max(0, activeAdvance.amount - totalRecovered);

              if (outstanding > 0) {
                const finalRecoveryAmt = Math.min(dailyRecovery, outstanding);
                const newRecId = `REC${String(recoveries.length + 1 + Math.random()).substring(2, 6)}`;
                const autoRecovery: Recovery = {
                  id: newRecId,
                  advanceId: activeAdvance.id,
                  workerId: rec.workerId,
                  date,
                  attendanceId: savedRecordId,
                  amount: finalRecoveryAmt,
                  method: activeAdvance.recoveryMethod,
                  isManual: false,
                  remarks: 'Auto-recovered from daily wage',
                };
                setRecoveries((prev) => [...prev, autoRecovery]);

                if (outstanding - finalRecoveryAmt <= 0) {
                  setAdvances(prev => prev.map(a => a.id === activeAdvance.id ? { ...a, status: 'closed' } : a));
                }
              }
            }
          }
        }
      });

      return updatedAttendance;
    });
  };

  const addAdvance = (advance: Omit<Advance, 'id' | 'status'> & { status?: Advance['status'] }): Advance => {
    const newId = `ADV${String(advances.length + 1).padStart(3, '0')}`;
    const newRecord: Advance = {
      ...advance,
      id: newId,
      status: advance.status || 'pending',
    };
    setAdvances((prev) => [newRecord, ...prev]);
    return newRecord;
  };

  const updateAdvancePaymentStatus = (
    advanceId: string,
    status: Advance['status'],
    details?: { remarks?: string }
  ) => {
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    setAdvances((prev) =>
      prev.map((adv) => {
        if (adv.id !== advanceId) return adv;
        const updates: Partial<Advance> = { status };
        if (status === 'processing') {
          updates.processedAt = adv.processedAt || timestamp;
        } else if (status === 'active') {
          updates.disbursedAt = adv.disbursedAt || timestamp;
        }
        if (details?.remarks) {
          updates.financeRemarks = details.remarks;
        }
        return { ...adv, ...updates };
      })
    );
  };

  const addManualRecovery = (recovery: Omit<Recovery, 'id' | 'isManual' | 'method'>) => {
    const newId = `REC${String(recoveries.length + 1).padStart(4, '0')}`;
    const newRecord: Recovery = {
      ...recovery,
      id: newId,
      isManual: true,
      method: 'manual',
    };
    setRecoveries((prev) => [...prev, newRecord]);

    setAdvances((prevAdvances) => {
      return prevAdvances.map((adv) => {
        if (adv.id === recovery.advanceId) {
          const currentRecoveries = [...recoveries, newRecord].filter((r) => r.advanceId === adv.id);
          const totalRecovered = currentRecoveries.reduce((sum, r) => sum + r.amount, 0);
          if (totalRecovered >= adv.amount) {
            return {
              ...adv,
              status: 'closed',
            };
          }
        }
        return adv;
      });
    });
  };

  const closeAdvance = (advanceId: string, remarks?: string) => {
    setAdvances((prev) =>
      prev.map((adv) => {
        if (adv.id === advanceId) {
          return {
            ...adv,
            status: 'closed',
            remarks: remarks
              ? `${adv.remarks || ''}; ${remarks}`.trim().replace(/^; /, '')
              : adv.remarks,
          };
        }
        return adv;
      })
    );
  };

  const updateSite = (site: Site) => {
    setSites((prev) => prev.map((s) => (s.id === site.id ? site : s)));
  };

  const deleteSite = (siteId: string) => {
    setSites((prev) => prev.filter((s) => s.id !== siteId));
    setSections((prev) => prev.filter((sec) => sec.siteId !== siteId));
    setWorkers((prev) => prev.filter((w) => w.currentSiteId !== siteId));
    setAppUsers((prev) => prev.filter((u) => u.assignedSiteId !== siteId));
  };

  const toggleSiteStatus = (siteId: string) => {
    setSites((prev) =>
      prev.map((s) => (s.id === siteId ? { ...s, status: s.status === 'active' ? 'inactive' : 'active' } : s))
    );
  };

  const updateSection = (section: Section) => {
    setSections((prev) => prev.map((sec) => (sec.id === section.id ? section : sec)));
  };

  const deleteSection = (sectionId: string) => {
    setSections((prev) => prev.filter((sec) => sec.id !== sectionId));
    setWorkers((prev) => prev.filter((w) => w.currentSectionId !== sectionId));
  };

  const toggleSectionStatus = (sectionId: string) => {
    setSections((prev) =>
      prev.map((sec) => (sec.id === sectionId ? { ...sec, status: sec.status === 'active' ? 'inactive' : 'active' } : sec))
    );
  };

  const updateWorker = (updatedWorker: Worker) => {
    const finalWorker: Worker = {
      ...updatedWorker,
      designation: updatedWorker.designation || updatedWorker.purpose || undefined,
      purpose: updatedWorker.purpose || updatedWorker.designation || undefined,
    };

    setWorkers((prev) => prev.map((w) => (w.id === finalWorker.id ? finalWorker : w)));

    // Synchronize assignment if site or section changed or if no active assignment exists
    const todayStr = new Date().toISOString().split('T')[0];
    setAssignments((prev) => {
      const activeAsgIndex = prev.findIndex(
        (asg) => asg.workerId === finalWorker.id && asg.toDate === null
      );

      if (activeAsgIndex >= 0) {
        const currentAsg = prev[activeAsgIndex];
        if (
          currentAsg.siteId !== finalWorker.currentSiteId ||
          currentAsg.sectionId !== finalWorker.currentSectionId
        ) {
          const closed: WorkerAssignment = {
            ...currentAsg,
            toDate: todayStr,
            status: 'closed',
            reason: 'Site/Section updated in worker profile',
          };
          const newAsg: WorkerAssignment = {
            id: `ASG${String(prev.length + 1 + Math.random()).substring(2, 6)}`,
            workerId: finalWorker.id,
            siteId: finalWorker.currentSiteId,
            sectionId: finalWorker.currentSectionId,
            fromDate: todayStr,
            toDate: null,
            status: 'active',
            reason: 'Site/Section updated in worker profile',
          };
          const updatedList = [...prev];
          updatedList[activeAsgIndex] = closed;
          updatedList.push(newAsg);
          return updatedList;
        }
        return prev;
      } else {
        const newAsg: WorkerAssignment = {
          id: `ASG${String(prev.length + 1 + Math.random()).substring(2, 6)}`,
          workerId: finalWorker.id,
          siteId: finalWorker.currentSiteId,
          sectionId: finalWorker.currentSectionId,
          fromDate: finalWorker.joiningDate || todayStr,
          toDate: null,
          status: 'active',
          reason: 'Auto-linked active assignment',
        };
        return [...prev, newAsg];
      }
    });
  };

  const deleteWorker = (workerId: string) => {
    setWorkers((prev) => prev.filter((w) => w.id !== workerId));
    setAttendance((prev) => prev.filter((a) => a.workerId !== workerId));
    setAdvances((prev) => prev.filter((adv) => adv.workerId !== workerId));
    setRecoveries((prev) => prev.filter((r) => r.workerId !== workerId));
    setAssignments((prev) => prev.filter((asg) => asg.workerId !== workerId));
    setPayments((prev) => prev.filter((p) => p.workerId !== workerId));
  };

  const updateWorkerOpening = (workerId: string, opening: WorkerOpeningRecord) => {
    setWorkers((prev) =>
      prev.map((w) => {
        if (w.id === workerId) {
          return {
            ...w,
            openingRecord: opening,
            joiningDate: opening.originalJoiningDate || w.joiningDate,
          };
        }
        return w;
      })
    );
  };

  const bulkUpdateWorkerOpenings = (openings: WorkerOpeningRecord[]) => {
    const openingMap = new Map<string, WorkerOpeningRecord>();
    openings.forEach((o) => openingMap.set(o.workerId, o));

    setWorkers((prev) =>
      prev.map((w) => {
        const opening = openingMap.get(w.id);
        if (opening) {
          return {
            ...w,
            openingRecord: opening,
            joiningDate: opening.originalJoiningDate || w.joiningDate,
          };
        }
        return w;
      })
    );
  };

  const transferWorker = (
    workerId: string,
    toSiteId: string,
    toSectionId: string,
    date: string,
    reason?: string,
    remarks?: string
  ) => {
    // 1. Close current active assignment
    setAssignments((prev) =>
      prev.map((asg) => {
        if (asg.workerId === workerId && asg.toDate === null) {
          return {
            ...asg,
            toDate: date,
            status: 'closed',
            reason: reason || 'Transferred',
          };
        }
        return asg;
      })
    );

    // 2. Open new assignment
    const asgId = `ASG${String(assignments.length + 1 + Math.random()).substring(2, 6)}`;
    setAssignments((prev) => [
      ...prev,
      {
        id: asgId,
        workerId,
        siteId: toSiteId,
        sectionId: toSectionId,
        fromDate: date,
        toDate: null,
        status: 'active',
        reason: reason || 'Transfer',
        remarks,
      },
    ]);

    // 3. Update worker's current assignment pointers
    setWorkers((prev) =>
      prev.map((w) =>
        w.id === workerId
          ? {
              ...w,
              currentSiteId: toSiteId,
              currentSectionId: toSectionId,
              remarks: remarks ? `${w.remarks || ''}; ${remarks}`.trim().replace(/^; /, '') : w.remarks,
            }
          : w
      )
    );
  };

  const addSiteMigration = (
    migration: Omit<SiteMigrationRecord, 'id' | 'createdAt'>
  ): SiteMigrationRecord => {
    const newId = `MIG${String(siteMigrations.length + 1).padStart(3, '0')}`;
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const newRecord: SiteMigrationRecord = {
      ...migration,
      id: newId,
      createdAt: timestamp,
    };
    setSiteMigrations((prev) => [newRecord, ...prev]);

    // Apply movement to worker and assignments
    transferWorker(
      migration.workerId,
      migration.toSiteId,
      migration.toSectionId,
      migration.date,
      migration.reason,
      migration.remarks
    );

    return newRecord;
  };

  const deleteSiteMigration = (id: string) => {
    setSiteMigrations((prev) => prev.filter((m) => m.id !== id));
  };

  const markWorkerLeft = (workerId: string, date: string, remarks?: string) => {
    let targetSite = 'S001';
    let targetSection = 'SEC001';

    // 1. Mark status as 'left'
    setWorkers((prev) =>
      prev.map((w) => {
        if (w.id === workerId) {
          targetSite = w.currentSiteId;
          targetSection = w.currentSectionId;
          return { ...w, status: 'left', remarks: remarks || w.remarks };
        }
        return w;
      })
    );

    // 2. Close active assignment
    setAssignments((prev) =>
      prev.map((asg) => {
        if (asg.workerId === workerId && asg.toDate === null) {
          return { ...asg, toDate: date, status: 'closed', reason: 'Worker left employment' };
        }
        return asg;
      })
    );

    // 3. Append to employment history
    const ehId = `EH${String(employmentHistory.length + 1).padStart(3, '0')}`;
    setEmploymentHistory((prev) => [
      ...prev,
      {
        id: ehId,
        workerId,
        date,
        event: 'left',
        siteId: targetSite,
        sectionId: targetSection,
        remarks: remarks || 'Worker departed / marked as left',
      },
    ]);
  };

  const rejoinWorker = (
    workerId: string,
    toSiteId: string,
    toSectionId: string,
    date: string,
    remarks?: string
  ) => {
    // 1. Reactivate worker with same permanent ID!
    setWorkers((prev) =>
      prev.map((w) =>
        w.id === workerId
          ? {
              ...w,
              status: 'active',
              currentSiteId: toSiteId,
              currentSectionId: toSectionId,
              lastRejoinedDate: date,
              remarks: remarks ? `${w.remarks || ''}; ${remarks}`.trim().replace(/^; /, '') : w.remarks,
            }
          : w
      )
    );

    // 2. Open new assignment
    const asgId = `ASG${String(assignments.length + 1 + Math.random()).substring(2, 6)}`;
    setAssignments((prev) => [
      ...prev,
      {
        id: asgId,
        workerId,
        siteId: toSiteId,
        sectionId: toSectionId,
        fromDate: date,
        toDate: null,
        status: 'active',
        reason: 'Worker Rejoined',
        remarks,
      },
    ]);

    // 3. Log event in employment history
    const ehId = `EH${String(employmentHistory.length + 1).padStart(3, '0')}`;
    setEmploymentHistory((prev) => [
      ...prev,
      {
        id: ehId,
        workerId,
        date,
        event: 'rejoined',
        siteId: toSiteId,
        sectionId: toSectionId,
        remarks: remarks || 'Rejoined workforce with permanent ID',
      },
    ]);
  };

  const markPaymentPaid = (paymentId: string) => {
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    setPayments((prev) =>
      prev.map((p) => (p.id === paymentId ? { ...p, status: 'paid', paidAt: p.paidAt || timestamp } : p))
    );
  };

  const updatePaymentStatus = (paymentId: string, status: WorkerPayment['status']) => {
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    setPayments((prev) =>
      prev.map((p) => {
        if (p.id !== paymentId) return p;
        const updates: Partial<WorkerPayment> = { status };
        if (status === 'processing') {
          updates.processedAt = p.processedAt || timestamp;
        } else if (status === 'paid') {
          updates.paidAt = p.paidAt || timestamp;
        }
        return { ...p, ...updates };
      })
    );
  };

  const updateSettlementStatus = (settlementId: string, status: MonthlySettlementRecord['status']) => {
    setSettlementRecords((prev) =>
      prev.map((s) => (s.id === settlementId ? { ...s, status } : s))
    );
  };

  // Section Food Orders & Canteen Pipeline Methods
  const saveSectionFoodOrder = (
    orderData: Partial<SectionFoodOrder> & {
      sectionId: string;
      date: string;
      mealType: MealType;
      siteId: string;
    }
  ): SectionFoodOrder => {
    const existingIndex = foodOrders.findIndex(
      (o) =>
        o.sectionId === orderData.sectionId &&
        o.date === orderData.date &&
        o.mealType === orderData.mealType
    );

    const generatedId = `FO-${orderData.sectionId}-${orderData.date}-${orderData.mealType}`;
    const totalQty =
      (orderData.presentCount ?? 0) +
      (orderData.absentCount ?? 0) +
      (orderData.outsideWorkersCount ?? 0) +
      (orderData.othersCount ?? 0);

    let finalOrder: SectionFoodOrder;

    if (existingIndex > -1) {
      finalOrder = {
        ...foodOrders[existingIndex]!,
        ...orderData,
        totalOrderedQty: totalQty,
      };
      setFoodOrders((prev) => {
        const next = [...prev];
        next[existingIndex] = finalOrder;
        return next;
      });
    } else {
      finalOrder = {
        presentCount: 0,
        absentCount: 0,
        outsideWorkersCount: 0,
        othersCount: 0,
        status: 'draft',
        ...orderData,
        id: generatedId,
        totalOrderedQty: totalQty,
      };
      setFoodOrders((prev) => [finalOrder, ...prev]);
    }
    return finalOrder;
  };

  const pushFoodOrderToCanteen = (orderId: string, remarks?: string) => {
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    setFoodOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          status: 'pushed_to_canteen',
          pushedAt: o.pushedAt || timestamp,
          pushedBy: o.pushedBy || currentUser?.name || 'Section Supervisor',
          remarks: remarks !== undefined ? remarks : o.remarks,
        };
      })
    );
  };

  const updateCanteenStatus = (
    orderId: string,
    status: CanteenOrderStatus,
    details?: {
      canteenRemarks?: string;
      dispatchedBy?: string;
      dispatchedQty?: number;
    }
  ) => {
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    setFoodOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const updates: Partial<SectionFoodOrder> = { status };
        if (details?.canteenRemarks !== undefined) updates.canteenRemarks = details.canteenRemarks;
        if (details?.dispatchedBy) updates.dispatchedBy = details.dispatchedBy;
        if (details?.dispatchedQty !== undefined) updates.dispatchedQty = details.dispatchedQty;

        if (status === 'packing') {
          updates.packingStartedAt = o.packingStartedAt || timestamp;
        } else if (status === 'sent_to_section') {
          updates.dispatchedAt = o.dispatchedAt || timestamp;
          updates.dispatchedQty = details?.dispatchedQty ?? o.totalOrderedQty;
        }
        return { ...o, ...updates };
      })
    );
  };

  const receiveFoodOrderAtSection = (
    orderId: string,
    receivedQty: number,
    receivedBy: string,
    remarks?: string
  ) => {
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    setFoodOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          status: 'received',
          receivedQty,
          receivedAt: timestamp,
          receivedBy: receivedBy || currentUser?.name || 'Section Supervisor',
          receivingRemarks: remarks !== undefined ? remarks : o.receivingRemarks,
        };
      })
    );
  };

  const requestShortageReSend = (
    orderId: string,
    receivedQty: number,
    shortageQty: number,
    shortageReason: string,
    supervisorName: string
  ) => {
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    setFoodOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          status: 'shortage_resend_requested',
          receivedQty,
          shortageQty,
          shortageReason,
          reSendRequestedAt: timestamp,
          receivedBy: supervisorName || currentUser?.name || 'Section Supervisor',
          receivingRemarks: `Initial received: ${receivedQty} meals. Shortage of ${shortageQty} reported (${shortageReason}). Requested Canteen to re-send remaining parcels.`,
        };
      })
    );
  };

  const dispatchRemainingParcels = (
    orderId: string,
    dispatchedQty: number,
    driverInfo?: string
  ) => {
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    setFoodOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          status: 'remaining_sent',
          reSendDispatchedAt: timestamp,
          canteenRemarks: `Remaining ${dispatchedQty} parcels packed & dispatched at ${timestamp} via ${driverInfo || 'Canteen Express'}.`,
        };
      })
    );
  };

  const confirmRemainingParcelsReceived = (
    orderId: string,
    receivedRemainingQty: number,
    supervisorName: string
  ) => {
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    setFoodOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const totalFinalReceived = (o.receivedQty || 0) + receivedRemainingQty;
        return {
          ...o,
          status: 'received',
          remainingReceivedQty: receivedRemainingQty,
          receivedQty: totalFinalReceived,
          reSendReceivedAt: timestamp,
          receivedBy: supervisorName || currentUser?.name || 'Section Supervisor',
          receivingRemarks: `Full order fulfilled: ${o.receivedQty} initial + ${receivedRemainingQty} remaining parcels verified and received at ${timestamp}.`,
        };
      })
    );
  };

  const addCommissionPaymentRequest = (
    req: Omit<CommissionPaymentRequest, 'id' | 'requestedAt' | 'status'> & { status?: CommissionPaymentRequest['status'] }
  ): CommissionPaymentRequest => {
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const newId = `COM-REQ-${String(commissionRequests.length + 1).padStart(3, '0')}`;
    const newRecord: CommissionPaymentRequest = {
      ...req,
      id: newId,
      status: req.status || 'pending',
      requestedAt: timestamp,
    };
    setCommissionRequests((prev) => [newRecord, ...prev]);
    return newRecord;
  };

  const addBulkCommissionPaymentRequests = (
    reqs: Array<Omit<CommissionPaymentRequest, 'id' | 'requestedAt' | 'status'> & { status?: CommissionPaymentRequest['status'] }>
  ): CommissionPaymentRequest[] => {
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const created: CommissionPaymentRequest[] = [];
    setCommissionRequests((prev) => {
      let currentCount = prev.length;
      const newItems: CommissionPaymentRequest[] = reqs.map((req) => {
        currentCount++;
        const newId = `COM-REQ-${String(currentCount).padStart(3, '0')}`;
        return {
          ...req,
          id: newId,
          status: req.status || 'pending',
          requestedAt: timestamp,
        };
      });
      created.push(...newItems);
      return [...newItems, ...prev];
    });
    return created;
  };

  const updateCommissionPaymentRequestStatus = (
    id: string,
    status: CommissionPaymentRequest['status'],
    details?: { remarks?: string }
  ) => {
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    setCommissionRequests((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updates: Partial<CommissionPaymentRequest> = {
          status,
          ...(details?.remarks ? { remarks: details.remarks } : {}),
        };
        if (status === 'processing') updates.processedAt = timestamp;
        if (status === 'paid') updates.paidAt = timestamp;
        return { ...r, ...updates };
      })
    );
  };

  return (
    <AttendanceContext.Provider
      value={{
        sites,
        sections,
        workers,
        assignments,
        employmentHistory,
        attendance,
        audits,
        settings,
        advances,
        recoveries,
        referrers,
        payments,
        settlementRecords,
        currentUser,
        appUsers,
        switchUser,
        loginWithCredentials,
        logout,
        addAppUser,
        updateAppUser,
        deleteAppUser,
        updateSettings,
        addAttendanceRecord,
        registerOrUpdateAttendance,
        updateAttendanceStatus,
        bulkSaveAttendance,
        addAdvance,
        updateAdvancePaymentStatus,
        addManualRecovery,
        closeAdvance,
        addSite,
        updateSite,
        deleteSite,
        toggleSiteStatus,
        addSection,
        updateSection,
        deleteSection,
        toggleSectionStatus,
        addWorker,
        updateWorker,
        deleteWorker,
        updateWorkerOpening,
        bulkUpdateWorkerOpenings,
        transferWorker,
        markWorkerLeft,
        rejoinWorker,
        addReferrer,
        markPaymentPaid,
        updatePaymentStatus,
        updateSettlementStatus,
        foodOrders,
        saveSectionFoodOrder,
        pushFoodOrderToCanteen,
        updateCanteenStatus,
        receiveFoodOrderAtSection,
        requestShortageReSend,
        dispatchRemainingParcels,
        confirmRemainingParcelsReceived,
        commissionRequests,
        addCommissionPaymentRequest,
        addBulkCommissionPaymentRequests,
        updateCommissionPaymentRequestStatus,
        deleteAttendanceRecord,
        siteMigrations,
        addSiteMigration,
        deleteSiteMigration,
        resetToDefaultData,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendanceContext = () => {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendanceContext must be used within an AttendanceProvider');
  }
  return context;
};
