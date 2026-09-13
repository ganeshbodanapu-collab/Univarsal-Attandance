import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
import { defaultSettings } from '../utils/calculations/calculateFood';
import { calculateDailyRecovery } from '../utils/calculations/calculateAdvanceBalance';
import { roundMoney, addMoney, subtractMoney } from '../utils/money';
import { sitesDataService } from '../lib/data/sites';
import { sectionsDataService } from '../lib/data/sections';
import { workersDataService } from '../lib/data/workers';
import { workerAssignmentsDataService } from '../lib/data/workerAssignments';
import { workerOpeningRecordsDataService } from '../lib/data/workerOpeningRecords';
import { employmentHistoryDataService } from '../lib/data/employmentHistory';
import { siteMigrationsDataService } from '../lib/data/siteMigrations';
import { attendanceDataService } from '../lib/data/attendance';
import { attendanceAuditsDataService } from '../lib/data/attendanceAudits';
import { attendanceSettingsDataService } from '../lib/data/attendanceSettings';
import { advancesDataService } from '../lib/data/advances';
import { recoveriesDataService } from '../lib/data/recoveries';
import { ledgerDataService } from '../lib/data/ledger';
import { workerPaymentsDataService } from '../lib/data/workerPayments';
import { monthlySettlementsDataService } from '../lib/data/monthlySettlements';
import { sectionFoodOrdersDataService } from '../lib/data/sectionFoodOrders';
import { referrersDataService } from '../lib/data/referrers';
import { commissionPaymentRequestsDataService } from '../lib/data/commissionPaymentRequests';
import { realtimeService, type RealtimeStatus } from '../lib/realtime';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

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
  setCurrentUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  appUsers: AppUser[];
  switchUser: (userId: string) => void;
  loginWithCredentials: (username: string, password: string, targetSiteId?: string) => Promise<{ success: boolean; message?: string; user?: AppUser }> | { success: boolean; message?: string; user?: AppUser };
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
  realtimeStatus: RealtimeStatus;
}

/*
function saveToStorage<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving ${key} to storage:`, err);
  }
}
*/


const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Pure Supabase Production Data Authority (No Business LocalStorage Fallback)
  const [sites, setSites] = useState<Site[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [assignments, setAssignments] = useState<WorkerAssignment[]>([]);
  const [employmentHistory, setEmploymentHistory] = useState<EmploymentHistory[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [audits, setAudits] = useState<AttendanceAudit[]>([]);
  const [settings, setSettings] = useState<AttendanceSettings>(defaultSettings);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [recoveries, setRecoveries] = useState<Recovery[]>([]);
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [payments, setPayments] = useState<WorkerPayment[]>([]);
  const [settlementRecords, setSettlementRecords] = useState<MonthlySettlementRecord[]>([]);
  const [foodOrders, setFoodOrders] = useState<SectionFoodOrder[]>([]);
  const [commissionRequests, setCommissionRequests] = useState<CommissionPaymentRequest[]>([]);
  const [siteMigrations, setSiteMigrations] = useState<SiteMigrationRecord[]>([]);

  // App Auth/Role State
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);

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

  // Supabase Data Sync (STEP 14 Sites & Sections, STEP 15 Workers & History, STEP 16 Attendance & Settings, STEP 17 Advances & Recoveries)
  const syncFromSupabase = useCallback(async () => {
    try {
      const [
        sitesRes,
        sectionsRes,
        workersRes,
        asgRes,
        empHistRes,
        migRes,
        openingRes,
        attRes,
        auditsRes,
        settingsRes,
        advancesRes,
        recoveriesRes,
        paymentsRes,
        settlementsRes,
        foodOrdersRes,
        referrersRes,
        commissionReqsRes,
      ] = await Promise.all([
        sitesDataService.listSites(),
        sectionsDataService.listSections(),
        workersDataService.listWorkers(),
        workerAssignmentsDataService.listWorkerAssignments(),
        employmentHistoryDataService.listEmploymentHistory(),
        siteMigrationsDataService.listSiteMigrations(),
        workerOpeningRecordsDataService.listWorkerOpeningRecords(),
        attendanceDataService.listAttendance(),
        attendanceAuditsDataService.listAttendanceAudits(),
        attendanceSettingsDataService.getAttendanceSettings(),
        advancesDataService.listAdvances(),
        recoveriesDataService.listRecoveries(),
        workerPaymentsDataService.listWorkerPayments(),
        monthlySettlementsDataService.listMonthlySettlements(),
        sectionFoodOrdersDataService.listSectionFoodOrders(),
        referrersDataService.listReferrers(),
        commissionPaymentRequestsDataService.listCommissionPaymentRequests(),
      ]);
      if (sitesRes.data) setSites(sitesRes.data);
      if (sectionsRes.data) setSections(sectionsRes.data);
      if (asgRes.data) setAssignments(asgRes.data);
      if (empHistRes.data) setEmploymentHistory(empHistRes.data);
      if (migRes.data) setSiteMigrations(migRes.data);
      if (attRes.data) setAttendance(attRes.data);
      if (auditsRes.data) setAudits(auditsRes.data);
      if (settingsRes.data) setSettings(settingsRes.data);
      if (advancesRes.data) setAdvances(advancesRes.data);
      if (recoveriesRes.data) setRecoveries(recoveriesRes.data);
      if (paymentsRes.data) setPayments(paymentsRes.data);
      if (settlementsRes.data) setSettlementRecords(settlementsRes.data);
      if (foodOrdersRes.data) setFoodOrders(foodOrdersRes.data);
      if (referrersRes.data) setReferrers(referrersRes.data);
      if (commissionReqsRes.data) setCommissionRequests(commissionReqsRes.data);
      if (workersRes.data) {
        let loadedWorkers = workersRes.data;
        if (openingRes.data && openingRes.data.length > 0) {
          const openingMap = new Map(openingRes.data.map((o) => [o.workerId, o]));
          loadedWorkers = loadedWorkers.map((w) => {
            const op = openingMap.get(w.id);
            return op ? { ...w, openingRecord: op } : w;
          });
        }
        setWorkers(loadedWorkers);
      }
    } catch (err) {
      console.warn('Supabase data sync notice:', err);
    }
  }, []);

  useEffect(() => {
    syncFromSupabase();
  }, [syncFromSupabase]);

  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('DISCONNECTED');

  // Supabase Realtime Live Subscription (STEP 22: attendance, section_food_orders, advances, site_migrations)
  useEffect(() => {
    const unsubscribe = realtimeService.subscribeToRealtime({
      onStatusChange: (status) => {
        setRealtimeStatus(status);
      },
      onAttendanceChange: (event, record) => {
        if (event === 'DELETE') {
          setAttendance((prev) => prev.filter((a) => a.id !== record.id));
        } else {
          setAttendance((prev) => {
            const idx = prev.findIndex(
              (a) => a.id === record.id || (a.workerId === record.workerId && a.date === record.date)
            );
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = { ...updated[idx]!, ...record };
              return updated;
            }
            return [record, ...prev];
          });
        }
      },
      onFoodOrderChange: (event, record) => {
        if (event === 'DELETE') {
          setFoodOrders((prev) => prev.filter((o) => o.id !== record.id));
        } else {
          setFoodOrders((prev) => {
            const idx = prev.findIndex(
              (o) =>
                o.id === record.id ||
                (o.sectionId === record.sectionId && o.date === record.date && o.mealType === record.mealType)
            );
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = { ...updated[idx]!, ...record };
              return updated;
            }
            return [record, ...prev];
          });
        }
      },
      onAdvanceChange: (event, record) => {
        if (event === 'DELETE') {
          setAdvances((prev) => prev.filter((adv) => adv.id !== record.id));
        } else {
          setAdvances((prev) => {
            const idx = prev.findIndex((adv) => adv.id === record.id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = { ...updated[idx]!, ...record };
              return updated;
            }
            return [record, ...prev];
          });
        }
      },
      onSiteMigrationChange: (event, record) => {
        if (event === 'DELETE') {
          setSiteMigrations((prev) => prev.filter((m) => m.id !== record.id));
        } else {
          setSiteMigrations((prev) => {
            const idx = prev.findIndex((m) => m.id === record.id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = { ...updated[idx]!, ...record };
              return updated;
            }
            return [record, ...prev];
          });
        }
      },
    });

    return () => {
      unsubscribe();
    };
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
    // Trigger fresh data sync directly from Supabase PostgreSQL database
    syncFromSupabase();
  };

  const auth = useAuth();
  const currentUser = auth.appUser;
  const setCurrentUser = (_user: React.SetStateAction<AppUser | null>) => {
    auth.refreshProfile();
  };

  const switchUser = (userId: string) => {
    const found = appUsers.find((u) => u.id === userId);
    if (found) {
      console.log(`[AttendanceContext] Switched current display user to ${found.username}`);
    }
  };

  const loginWithCredentials = async (
    username: string,
    password: string,
    targetSiteId?: string
  ): Promise<{ success: boolean; message?: string; user?: AppUser }> => {
    const cleanUser = username.trim().toLowerCase();

    let loginEmail = cleanUser;
    let foundProfile: any = null;

    if (!cleanUser.includes('@')) {
      try {
        const { data: userProfile } = await supabase
          .from('app_users')
          .select('*')
          .ilike('username', cleanUser)
          .maybeSingle();

        if (userProfile) {
          foundProfile = userProfile;
          if (userProfile.email) {
            loginEmail = userProfile.email;
          } else {
            loginEmail = `${cleanUser}@universalattendance.com`;
          }
        } else {
          loginEmail = `${cleanUser}@universalattendance.com`;
        }
      } catch {
        loginEmail = `${cleanUser}@universalattendance.com`;
      }
    }

    // 1. Supabase Auth sign in
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: password,
    });

    if (authErr || !authData.user) {
      return { success: false, message: 'Invalid User ID or Password.' };
    }

    // 2. Fetch app_users record
    let profile = foundProfile;
    if (!profile || profile.auth_user_id !== authData.user.id) {
      const { data: fetchedProfile } = await supabase
        .from('app_users')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .maybeSingle();

      if (fetchedProfile) {
        profile = fetchedProfile;
      } else if (foundProfile) {
        // Link auth_user_id to foundProfile
        await supabase
          .from('app_users')
          .update({ auth_user_id: authData.user.id, email: loginEmail })
          .eq('id', foundProfile.id);
        profile = { ...foundProfile, auth_user_id: authData.user.id, email: loginEmail };
      }
    }

    if (!profile) {
      await supabase.auth.signOut();
      return { success: false, message: 'Access denied: User profile not found in app database.' };
    }

    if (profile.status === 'inactive') {
      await supabase.auth.signOut();
      return { success: false, message: 'This site user account is currently deactivated.' };
    }

    // 3. Role-wise site permission validation
    if (targetSiteId && targetSiteId !== 'admin') {
      if (profile.role !== 'admin' && profile.assigned_site_id !== targetSiteId) {
        const targetSiteObj = sites.find((s) => s.id === targetSiteId);
        const userSiteObj = sites.find((s) => s.id === profile.assigned_site_id);
        await supabase.auth.signOut();
        return {
          success: false,
          message: `Access denied. "${profile.username}" is assigned to ${userSiteObj?.name || profile.assigned_site_id}, not ${targetSiteObj?.name || targetSiteId}.`,
        };
      }
    }
    if (targetSiteId === 'admin' && profile.role !== 'admin') {
      await supabase.auth.signOut();
      return {
        success: false,
        message: 'Access denied. Only Universal System Admins can log in to the Central Portal.',
      };
    }

    const nowIso = new Date().toISOString();
    const nowStr = new Date().toLocaleString();

    // Update last_login in app_users
    await supabase.from('app_users').update({ last_login: nowIso }).eq('id', profile.id);

    const authenticatedAppUser: AppUser = {
      id: profile.id,
      username: profile.username,
      password: '',
      name: profile.name,
      role: profile.role,
      assignedSiteId: profile.assigned_site_id || undefined,
      assignedSectionId: profile.assigned_section_id || undefined,
      teamName: profile.team_name || undefined,
      mobile: profile.mobile || undefined,
      email: profile.email || undefined,
      status: profile.status,
      lastLogin: nowStr,
      createdDate: profile.created_at ? profile.created_at.split('T')[0] : undefined,
    };

    setCurrentUser(authenticatedAppUser);
    try {
      localStorage.setItem(
        'univarsal_user_session',
        JSON.stringify({ id: authenticatedAppUser.id, username: authenticatedAppUser.username })
      );
    } catch {
      // ignore
    }
    return { success: true, user: authenticatedAppUser };
  };

  const logout = async () => {
    try {
      await auth.signOut();
    } catch (err) {
      console.warn('Logout notice:', err);
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
    const { password: _p, ...safeUpdates } = updates;
    setAppUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const updated: AppUser = { ...u, ...safeUpdates, password: '' };
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
    attendanceSettingsDataService.updateAttendanceSettings(newSettings).catch((err) => {
      console.warn('Supabase attendance settings update notice:', err);
    });
  };

  const addSite = (site: Omit<Site, 'id'>) => {
    const newId = `S${String(sites.length + 1).padStart(3, '0')}`;
    const siteObj: Site = { ...site, id: newId };
    setSites((prev) => [...prev, siteObj]);
    sitesDataService.createSite(siteObj).catch((err) => {
      console.warn('Supabase site create notice:', err);
    });
  };

  const addSection = (section: Omit<Section, 'id'>) => {
    const newId = `SEC${String(sections.length + 1).padStart(3, '0')}`;
    const secObj: Section = { ...section, id: newId };
    setSections((prev) => [...prev, secObj]);
    sectionsDataService.createSection(secObj).catch((err) => {
      console.warn('Supabase section create notice:', err);
    });
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
    workersDataService.createWorker(newWorker).catch((err) => {
      console.warn('Supabase worker create notice:', err);
    });

    const asgId = `ASG${String(assignments.length + 1 + Math.random()).substring(2, 6)}`;
    const newAsg: WorkerAssignment = {
      id: asgId,
      workerId: newId,
      siteId: worker.currentSiteId,
      sectionId: worker.currentSectionId,
      fromDate: worker.joiningDate,
      toDate: null,
      reason: 'Initial onboard assignment',
    };
    setAssignments((prev) => [...prev, newAsg]);
    workerAssignmentsDataService.createWorkerAssignment(newAsg).catch((err) => {
      console.warn('Supabase worker assignment create notice:', err);
    });

    const newEmpHist: EmploymentHistory = {
      id: `EMP${String(employmentHistory.length + 1 + Math.random()).substring(2, 6)}`,
      workerId: newId,
      date: worker.joiningDate,
      event: 'joined',
      siteId: worker.currentSiteId,
      sectionId: worker.currentSectionId,
      remarks: 'New employee onboarding to section',
    };
    setEmploymentHistory((prev) => [...prev, newEmpHist]);
    employmentHistoryDataService.createEmploymentHistory(newEmpHist).catch((err) => {
      console.warn('Supabase employment history create notice:', err);
    });

    return newWorker;
  };

  const addReferrer = (referrer: Omit<Referrer, 'id'>) => {
    const newId = `REF${String(referrers.length + 1).padStart(3, '0')}`;
    const newRecord: Referrer = { ...referrer, id: newId };
    setReferrers((prev) => [...prev, newRecord]);
    referrersDataService.createReferrer(newRecord).catch((err) => {
      console.warn('Supabase referrer create notice:', err);
    });
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
    attendanceDataService.upsertAttendance(newRecord).catch((err) => {
      console.warn('Supabase attendance create notice:', err);
    });

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

          setRecoveries((prev) => [...prev, autoRecovery]);
          recoveriesDataService.createRecovery(autoRecovery).catch((err) => {
            console.warn('Supabase auto recovery create notice:', err);
          });

          if (outstanding - finalRecoveryAmt <= 0) {
            setAdvances((prev) => prev.map((a) => (a.id === activeAdvance.id ? { ...a, status: 'closed' } : a)));
            advancesDataService.updateAdvance(activeAdvance.id, { status: 'closed' }).catch((err) => {
              console.warn('Supabase advance close notice:', err);
            });
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
      attendanceDataService.upsertAttendance(updated).catch((err) => {
        console.warn('Supabase attendance update notice:', err);
      });
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
    attendanceDataService.deleteAttendance(attendanceId).catch((err) => {
      console.warn('Supabase attendance delete notice:', err);
    });
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
          attendanceAuditsDataService.createAttendanceAudit(newAudit).catch((err) => {
            console.warn('Supabase attendance audit create notice:', err);
          });

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

          const updatedItem = {
            ...item,
            status: newStatus,
            checkIn,
            checkOut,
          };
          attendanceDataService.updateAttendance(item.id, { status: newStatus, checkIn, checkOut }).catch((err) => {
            console.warn('Supabase attendance status update notice:', err);
          });
          return updatedItem;
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
            attendanceAuditsDataService.createAttendanceAudit(newAudit).catch((err) => {
              console.warn('Supabase bulk audit create notice:', err);
            });

            const updatedRec: Attendance = {
              ...oldRecord,
              status: rec.status,
              checkIn,
              checkOut,
            };
            updatedAttendance[existingIndex] = updatedRec;
            attendanceDataService.upsertAttendance(updatedRec).catch((err) => {
              console.warn('Supabase bulk attendance update notice:', err);
            });
          }
        } else {
          const newId = `ATT${String(updatedAttendance.length + 1).padStart(5, '0')}`;
          savedRecordId = newId;
          const newAttRec: Attendance = {
            id: newId,
            workerId: rec.workerId,
            assignmentId: workerAssignment.id,
            date,
            status: rec.status,
            method: 'manual',
            checkIn,
            checkOut,
          };
          updatedAttendance.push(newAttRec);
          attendanceDataService.upsertAttendance(newAttRec).catch((err) => {
            console.warn('Supabase bulk attendance insert notice:', err);
          });
        }

        if (savedRecordId && (rec.status === 'present' || rec.status === 'halfDay')) {
          const activeAdvance = advances.find(a => a.workerId === rec.workerId && a.status === 'active');
          const worker = workers.find(w => w.id === rec.workerId);
          if (activeAdvance && worker) {
            const dailyRecovery = calculateDailyRecovery(activeAdvance, rec.status, worker.dailyWage, settings);
            if (dailyRecovery > 0) {
              const advRecoveries = recoveries.filter(r => r.advanceId === activeAdvance.id);
            const totalRecovered = roundMoney(advRecoveries.reduce((sum, r) => sum + r.amount, 0));
            const outstanding = Math.max(0, subtractMoney(activeAdvance.amount, totalRecovered));

            if (outstanding > 0) {
              const finalRecoveryAmt = roundMoney(Math.min(dailyRecovery, outstanding));
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
              recoveriesDataService.createRecovery(autoRecovery).catch((err) => {
                console.warn('Supabase auto recovery create notice:', err);
              });

              if (outstanding - finalRecoveryAmt <= 0) {
                setAdvances((prev) => prev.map((a) => (a.id === activeAdvance.id ? { ...a, status: 'closed' } : a)));
                advancesDataService.updateAdvance(activeAdvance.id, { status: 'closed' }).catch((err) => {
                  console.warn('Supabase advance close notice:', err);
                });
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
    const roundedAmount = roundMoney(advance.amount);
    const newRecord: Advance = {
      ...advance,
      id: newId,
      amount: roundedAmount,
      dailyRecoveryAmount: advance.dailyRecoveryAmount !== undefined ? roundMoney(advance.dailyRecoveryAmount) : undefined,
      fixedMonthlyAmount: advance.fixedMonthlyAmount !== undefined ? roundMoney(advance.fixedMonthlyAmount) : undefined,
      status: advance.status || 'pending',
    };
    setAdvances((prev) => [newRecord, ...prev]);
    advancesDataService.createAdvance(newRecord).catch((err) => {
      console.warn('Supabase advance create notice:', err);
    });

    // Create ledger entry
    ledgerDataService.createLedgerEntry({
      id: `LED${String(Date.now()).slice(-6)}`,
      workerId: newRecord.workerId,
      date: newRecord.date,
      type: 'advance',
      amount: roundedAmount,
      runningBalance: roundedAmount,
      remarks: `Advance given: ${newRecord.reason}`,
    }).catch(() => {});

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
        advancesDataService.updateAdvance(advanceId, updates).catch((err) => {
          console.warn('Supabase advance status update notice:', err);
        });
        return { ...adv, ...updates };
      })
    );
  };

  const addManualRecovery = (recovery: Omit<Recovery, 'id' | 'isManual' | 'method'>) => {
    const newId = `REC${String(recoveries.length + 1).padStart(4, '0')}`;
    const roundedAmount = roundMoney(recovery.amount);
    const newRecord: Recovery = {
      ...recovery,
      id: newId,
      amount: roundedAmount,
      isManual: true,
      method: 'manual',
    };
    setRecoveries((prev) => [...prev, newRecord]);
    recoveriesDataService.createRecovery(newRecord).catch((err) => {
      console.warn('Supabase manual recovery create notice:', err);
    });

    // Create ledger entry
    ledgerDataService.createLedgerEntry({
      id: `LED${String(Date.now()).slice(-6)}`,
      workerId: newRecord.workerId,
      date: newRecord.date,
      type: 'recovery',
      amount: roundedAmount,
      runningBalance: 0,
      remarks: `Manual recovery for advance ${newRecord.advanceId}`,
    }).catch(() => {});

    setAdvances((prevAdvances) => {
      return prevAdvances.map((adv) => {
        if (adv.id === recovery.advanceId) {
          const currentRecoveries = [...recoveries, newRecord].filter((r) => r.advanceId === adv.id);
          const totalRecovered = roundMoney(currentRecoveries.reduce((sum, r) => addMoney(sum, r.amount), 0));
          if (totalRecovered >= adv.amount) {
            advancesDataService.updateAdvance(adv.id, { status: 'closed' }).catch(() => {});
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
          const updatedRemarks = remarks
            ? `${adv.remarks || ''}; ${remarks}`.trim().replace(/^; /, '')
            : adv.remarks;
          advancesDataService.updateAdvance(advanceId, { status: 'closed', remarks: updatedRemarks }).catch((err) => {
            console.warn('Supabase close advance notice:', err);
          });
          return {
            ...adv,
            status: 'closed',
            remarks: updatedRemarks,
          };
        }
        return adv;
      })
    );
  };

  const updateSite = (site: Site) => {
    setSites((prev) => prev.map((s) => (s.id === site.id ? site : s)));
    sitesDataService.updateSite(site.id, site).catch((err) => {
      console.warn('Supabase site update notice:', err);
    });
  };

  const deleteSite = (siteId: string) => {
    setSites((prev) => prev.filter((s) => s.id !== siteId));
    setSections((prev) => prev.filter((sec) => sec.siteId !== siteId));
    setWorkers((prev) => prev.filter((w) => w.currentSiteId !== siteId));
    setAppUsers((prev) => prev.filter((u) => u.assignedSiteId !== siteId));
    sitesDataService.deleteSite(siteId).catch((err) => {
      console.warn('Supabase site delete notice:', err);
    });
  };

  const toggleSiteStatus = (siteId: string) => {
    const target = sites.find((s) => s.id === siteId);
    if (!target) return;
    const newStatus: Site['status'] = target.status === 'active' ? 'inactive' : 'active';
    setSites((prev) =>
      prev.map((s) => (s.id === siteId ? { ...s, status: newStatus } : s))
    );
    sitesDataService.updateSite(siteId, { status: newStatus }).catch((err) => {
      console.warn('Supabase site status update notice:', err);
    });
  };

  const updateSection = (section: Section) => {
    setSections((prev) => prev.map((sec) => (sec.id === section.id ? section : sec)));
    sectionsDataService.updateSection(section.id, section).catch((err) => {
      console.warn('Supabase section update notice:', err);
    });
  };

  const deleteSection = (sectionId: string) => {
    setSections((prev) => prev.filter((sec) => sec.id !== sectionId));
    setWorkers((prev) => prev.filter((w) => w.currentSectionId !== sectionId));
    sectionsDataService.deleteSection(sectionId).catch((err) => {
      console.warn('Supabase section delete notice:', err);
    });
  };

  const toggleSectionStatus = (sectionId: string) => {
    const target = sections.find((sec) => sec.id === sectionId);
    if (!target) return;
    const newStatus: Section['status'] = target.status === 'active' ? 'inactive' : 'active';
    setSections((prev) =>
      prev.map((sec) => (sec.id === sectionId ? { ...sec, status: newStatus } : sec))
    );
    sectionsDataService.updateSection(sectionId, { status: newStatus }).catch((err) => {
      console.warn('Supabase section status update notice:', err);
    });
  };

  const updateWorker = (updatedWorker: Worker) => {
    const finalWorker: Worker = {
      ...updatedWorker,
      designation: updatedWorker.designation || updatedWorker.purpose || undefined,
      purpose: updatedWorker.purpose || updatedWorker.designation || undefined,
    };

    setWorkers((prev) => prev.map((w) => (w.id === finalWorker.id ? finalWorker : w)));
    workersDataService.updateWorker(finalWorker.id, finalWorker).catch((err) => {
      console.warn('Supabase worker update notice:', err);
    });

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
          workerAssignmentsDataService.updateWorkerAssignment(closed.id, closed).catch(() => {});
          workerAssignmentsDataService.createWorkerAssignment(newAsg).catch(() => {});
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
        workerAssignmentsDataService.createWorkerAssignment(newAsg).catch(() => {});
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
    workersDataService.deleteWorker(workerId).catch((err) => {
      console.warn('Supabase worker delete notice:', err);
    });
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
    workerOpeningRecordsDataService.upsertWorkerOpeningRecord(opening).catch((err) => {
      console.warn('Supabase worker opening upsert notice:', err);
    });
  };

  const bulkUpdateWorkerOpenings = (openings: WorkerOpeningRecord[]) => {
    const openingMap = new Map<string, WorkerOpeningRecord>();
    openings.forEach((o) => {
      openingMap.set(o.workerId, o);
      workerOpeningRecordsDataService.upsertWorkerOpeningRecord(o).catch((err) => {
        console.warn('Supabase bulk opening upsert notice:', err);
      });
    });

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
          const closed = {
            ...asg,
            toDate: date,
            status: 'closed' as const,
            reason: reason || 'Transferred',
          };
          workerAssignmentsDataService.updateWorkerAssignment(asg.id, closed).catch(() => {});
          return closed;
        }
        return asg;
      })
    );

    // 2. Open new assignment
    const asgId = `ASG${String(assignments.length + 1 + Math.random()).substring(2, 6)}`;
    const newAsg: WorkerAssignment = {
      id: asgId,
      workerId,
      siteId: toSiteId,
      sectionId: toSectionId,
      fromDate: date,
      toDate: null,
      status: 'active',
      reason: reason || 'Transfer',
      remarks,
    };
    setAssignments((prev) => [...prev, newAsg]);
    workerAssignmentsDataService.createWorkerAssignment(newAsg).catch(() => {});

    // 3. Update worker's current assignment pointers
    setWorkers((prev) =>
      prev.map((w) => {
        if (w.id === workerId) {
          const updated = {
            ...w,
            currentSiteId: toSiteId,
            currentSectionId: toSectionId,
            remarks: remarks ? `${w.remarks || ''}; ${remarks}`.trim().replace(/^; /, '') : w.remarks,
          };
          workersDataService.updateWorker(workerId, {
            currentSiteId: toSiteId,
            currentSectionId: toSectionId,
            remarks: updated.remarks,
          }).catch(() => {});
          return updated;
        }
        return w;
      })
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
    siteMigrationsDataService.createSiteMigration(newRecord).catch((err) => {
      console.warn('Supabase site migration create notice:', err);
    });

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
    siteMigrationsDataService.deleteSiteMigration(id).catch((err) => {
      console.warn('Supabase site migration delete notice:', err);
    });
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
          const updated = { ...w, status: 'left' as const, remarks: remarks || w.remarks };
          workersDataService.updateWorker(workerId, { status: 'left', remarks: updated.remarks }).catch(() => {});
          return updated;
        }
        return w;
      })
    );

    // 2. Close active assignment
    setAssignments((prev) =>
      prev.map((asg) => {
        if (asg.workerId === workerId && asg.toDate === null) {
          const closed = { ...asg, toDate: date, status: 'closed' as const, reason: 'Worker left employment' };
          workerAssignmentsDataService.updateWorkerAssignment(asg.id, closed).catch(() => {});
          return closed;
        }
        return asg;
      })
    );

    // 3. Append to employment history
    const ehId = `EH${String(employmentHistory.length + 1).padStart(3, '0')}`;
    const newEmpHist: EmploymentHistory = {
      id: ehId,
      workerId,
      date,
      event: 'left',
      siteId: targetSite,
      sectionId: targetSection,
      remarks: remarks || 'Worker departed / marked as left',
    };
    setEmploymentHistory((prev) => [...prev, newEmpHist]);
    employmentHistoryDataService.createEmploymentHistory(newEmpHist).catch((err) => {
      console.warn('Supabase employment history create notice:', err);
    });
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
      prev.map((w) => {
        if (w.id === workerId) {
          const updated = {
            ...w,
            status: 'active' as const,
            currentSiteId: toSiteId,
            currentSectionId: toSectionId,
            lastRejoinedDate: date,
            remarks: remarks ? `${w.remarks || ''}; ${remarks}`.trim().replace(/^; /, '') : w.remarks,
          };
          workersDataService.updateWorker(workerId, {
            status: 'active',
            currentSiteId: toSiteId,
            currentSectionId: toSectionId,
            lastRejoinedDate: date,
            remarks: updated.remarks,
          }).catch(() => {});
          return updated;
        }
        return w;
      })
    );

    // 2. Open new assignment
    const asgId = `ASG${String(assignments.length + 1 + Math.random()).substring(2, 6)}`;
    const newAsg: WorkerAssignment = {
      id: asgId,
      workerId,
      siteId: toSiteId,
      sectionId: toSectionId,
      fromDate: date,
      toDate: null,
      status: 'active',
      reason: 'Worker rejoined employment',
      remarks,
    };
    setAssignments((prev) => [...prev, newAsg]);
    workerAssignmentsDataService.createWorkerAssignment(newAsg).catch(() => {});

    // 3. Append to employment history
    const ehId = `EH${String(employmentHistory.length + 1).padStart(3, '0')}`;
    const newEmpHist: EmploymentHistory = {
      id: ehId,
      workerId,
      date,
      event: 'rejoined',
      siteId: toSiteId,
      sectionId: toSectionId,
      remarks: remarks || 'Worker rejoined workforce',
    };
    setEmploymentHistory((prev) => [...prev, newEmpHist]);
    employmentHistoryDataService.createEmploymentHistory(newEmpHist).catch((err) => {
      console.warn('Supabase employment history create notice:', err);
    });
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
    workerPaymentsDataService.updateWorkerPayment(paymentId, { status: 'paid', paidAt: timestamp }).catch((err) => {
      console.warn('Supabase worker payment update notice:', err);
    });
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
        workerPaymentsDataService.updateWorkerPayment(paymentId, updates).catch((err) => {
          console.warn('Supabase worker payment update notice:', err);
        });
        return { ...p, ...updates };
      })
    );
  };

  const updateSettlementStatus = (settlementId: string, status: MonthlySettlementRecord['status']) => {
    setSettlementRecords((prev) =>
      prev.map((s) => (s.id === settlementId ? { ...s, status } : s))
    );
    monthlySettlementsDataService.updateMonthlySettlement(settlementId, { status }).catch((err) => {
      console.warn('Supabase monthly settlement update notice:', err);
    });
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

    sectionFoodOrdersDataService.upsertSectionFoodOrder(finalOrder).catch((err) => {
      console.warn('Supabase section food order upsert notice:', err);
    });

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
        const updated: SectionFoodOrder = {
          ...o,
          status: 'pushed_to_canteen',
          pushedAt: o.pushedAt || timestamp,
          pushedBy: o.pushedBy || currentUser?.name || 'Section Supervisor',
          remarks: remarks !== undefined ? remarks : o.remarks,
        };
        sectionFoodOrdersDataService.updateSectionFoodOrder(orderId, {
          status: updated.status,
          pushedAt: updated.pushedAt,
          pushedBy: updated.pushedBy,
          remarks: updated.remarks,
        }).catch((err) => {
          console.warn('Supabase push food order notice:', err);
        });
        return updated;
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
        sectionFoodOrdersDataService.updateSectionFoodOrder(orderId, updates).catch((err) => {
          console.warn('Supabase update canteen status notice:', err);
        });
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
        const updated: SectionFoodOrder = {
          ...o,
          status: 'received',
          receivedQty,
          receivedAt: timestamp,
          receivedBy: receivedBy || currentUser?.name || 'Section Supervisor',
          receivingRemarks: remarks !== undefined ? remarks : o.receivingRemarks,
        };
        sectionFoodOrdersDataService.updateSectionFoodOrder(orderId, {
          status: updated.status,
          receivedQty: updated.receivedQty,
          receivedAt: updated.receivedAt,
          receivedBy: updated.receivedBy,
          receivingRemarks: updated.receivingRemarks,
        }).catch((err) => {
          console.warn('Supabase receive food order notice:', err);
        });
        return updated;
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
        const updated: SectionFoodOrder = {
          ...o,
          status: 'shortage_resend_requested',
          receivedQty,
          shortageQty,
          shortageReason,
          reSendRequestedAt: timestamp,
          receivedBy: supervisorName || currentUser?.name || 'Section Supervisor',
          receivingRemarks: `Initial received: ${receivedQty} meals. Shortage of ${shortageQty} reported (${shortageReason}). Requested Canteen to re-send remaining parcels.`,
        };
        sectionFoodOrdersDataService.updateSectionFoodOrder(orderId, {
          status: updated.status,
          receivedQty: updated.receivedQty,
          shortageQty: updated.shortageQty,
          shortageReason: updated.shortageReason,
          reSendRequestedAt: updated.reSendRequestedAt,
          receivedBy: updated.receivedBy,
          receivingRemarks: updated.receivingRemarks,
        }).catch((err) => {
          console.warn('Supabase request shortage resend notice:', err);
        });
        return updated;
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
        const updated: SectionFoodOrder = {
          ...o,
          status: 'remaining_sent',
          reSendDispatchedAt: timestamp,
          canteenRemarks: `Remaining ${dispatchedQty} parcels packed & dispatched at ${timestamp} via ${driverInfo || 'Canteen Express'}.`,
        };
        sectionFoodOrdersDataService.updateSectionFoodOrder(orderId, {
          status: updated.status,
          reSendDispatchedAt: updated.reSendDispatchedAt,
          canteenRemarks: updated.canteenRemarks,
        }).catch((err) => {
          console.warn('Supabase dispatch remaining parcels notice:', err);
        });
        return updated;
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
        const updated: SectionFoodOrder = {
          ...o,
          status: 'received',
          remainingReceivedQty: receivedRemainingQty,
          receivedQty: totalFinalReceived,
          reSendReceivedAt: timestamp,
          receivedBy: supervisorName || currentUser?.name || 'Section Supervisor',
          receivingRemarks: `Full order fulfilled: ${o.receivedQty} initial + ${receivedRemainingQty} remaining parcels verified and received at ${timestamp}.`,
        };
        sectionFoodOrdersDataService.updateSectionFoodOrder(orderId, {
          status: updated.status,
          remainingReceivedQty: updated.remainingReceivedQty,
          receivedQty: updated.receivedQty,
          reSendReceivedAt: updated.reSendReceivedAt,
          receivedBy: updated.receivedBy,
          receivingRemarks: updated.receivingRemarks,
        }).catch((err) => {
          console.warn('Supabase confirm remaining parcels notice:', err);
        });
        return updated;
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
      amount: roundMoney(req.amount),
      status: req.status || 'pending',
      requestedAt: timestamp,
    };
    setCommissionRequests((prev) => [newRecord, ...prev]);
    commissionPaymentRequestsDataService.createCommissionPaymentRequest(newRecord).catch((err) => {
      console.warn('Supabase commission request create notice:', err);
    });
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
          amount: roundMoney(req.amount),
          status: req.status || 'pending',
          requestedAt: timestamp,
        };
      });
      created.push(...newItems);
      commissionPaymentRequestsDataService.createBulkCommissionPaymentRequests(newItems).catch((err) => {
        console.warn('Supabase bulk commission requests create notice:', err);
      });
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
        commissionPaymentRequestsDataService.updateCommissionPaymentRequest(id, updates).catch((err) => {
          console.warn('Supabase update commission request status notice:', err);
        });
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
        setCurrentUser,
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
        realtimeStatus,
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
