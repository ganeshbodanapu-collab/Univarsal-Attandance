import { supabase } from '../supabase';
import type { Worker } from '../../types';
import { roundMoney } from '../../utils/money';

export interface DBWorker {
  id: string;
  serial_number?: string | null;
  name: string;
  mobile: string;
  worker_type: 'company' | 'outside';
  current_site_id: string;
  current_section_id: string;
  joining_date: string;
  last_rejoined_date?: string | null;
  daily_wage: number;
  referrer_id?: string | null;
  commission_type: 'perDay' | 'percentage' | 'fixedMonthly';
  commission_rate: number;
  attendance_modes?: string[] | null;
  status: 'active' | 'inactive' | 'left';
  emergency_contact?: string | null;
  id_proof_number?: string | null;
  address?: string | null;
  phone_pe_number?: string | null;
  bank_name?: string | null;
  bank_account_no?: string | null;
  bank_ifsc?: string | null;
  bank_holder_name?: string | null;
  photo_url?: string | null;
  face_enrolled?: boolean | null;
  fingerprint_enrolled?: boolean | null;
  designation?: string | null;
  purpose?: string | null;
  remarks?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export const mapDBWorkerToWorker = (dbWorker: DBWorker): Worker => ({
  id: dbWorker.id,
  serialNumber: dbWorker.serial_number || undefined,
  name: dbWorker.name,
  mobile: dbWorker.mobile,
  workerType: dbWorker.worker_type,
  currentSiteId: dbWorker.current_site_id,
  currentSectionId: dbWorker.current_section_id,
  joiningDate: dbWorker.joining_date,
  lastRejoinedDate: dbWorker.last_rejoined_date || undefined,
  dailyWage: roundMoney(dbWorker.daily_wage),
  referrerId: dbWorker.referrer_id || null,
  commissionType: dbWorker.commission_type,
  commissionRate: roundMoney(dbWorker.commission_rate),
  attendanceModes: (dbWorker.attendance_modes as Array<'face' | 'fingerprint' | 'manual'>) || ['manual'],
  status: dbWorker.status,
  emergencyContact: dbWorker.emergency_contact || undefined,
  idProofNumber: dbWorker.id_proof_number || undefined,
  address: dbWorker.address || undefined,
  phonePeNumber: dbWorker.phone_pe_number || undefined,
  bankName: dbWorker.bank_name || undefined,
  bankAccountNo: dbWorker.bank_account_no || undefined,
  bankIfsc: dbWorker.bank_ifsc || undefined,
  bankHolderName: dbWorker.bank_holder_name || undefined,
  photoUrl: dbWorker.photo_url || undefined,
  faceEnrolled: Boolean(dbWorker.face_enrolled),
  fingerprintEnrolled: Boolean(dbWorker.fingerprint_enrolled),
  designation: dbWorker.designation || undefined,
  purpose: dbWorker.purpose || undefined,
  remarks: dbWorker.remarks || undefined,
});

export const mapWorkerToDBWorker = (worker: Partial<Worker>): Partial<DBWorker> => {
  const dbWorker: Partial<DBWorker> = {};
  if (worker.id !== undefined) dbWorker.id = worker.id;
  if (worker.serialNumber !== undefined) dbWorker.serial_number = worker.serialNumber || null;
  if (worker.name !== undefined) dbWorker.name = worker.name;
  if (worker.mobile !== undefined) dbWorker.mobile = worker.mobile;
  if (worker.workerType !== undefined) dbWorker.worker_type = worker.workerType;
  if (worker.currentSiteId !== undefined) dbWorker.current_site_id = worker.currentSiteId;
  if (worker.currentSectionId !== undefined) dbWorker.current_section_id = worker.currentSectionId;
  if (worker.joiningDate !== undefined) dbWorker.joining_date = worker.joiningDate;
  if (worker.lastRejoinedDate !== undefined) dbWorker.last_rejoined_date = worker.lastRejoinedDate || null;
  if (worker.dailyWage !== undefined) dbWorker.daily_wage = roundMoney(worker.dailyWage);
  if (worker.referrerId !== undefined) dbWorker.referrer_id = worker.referrerId || null;
  if (worker.commissionType !== undefined) dbWorker.commission_type = worker.commissionType;
  if (worker.commissionRate !== undefined) dbWorker.commission_rate = roundMoney(worker.commissionRate);
  if (worker.attendanceModes !== undefined) dbWorker.attendance_modes = worker.attendanceModes;
  if (worker.status !== undefined) dbWorker.status = worker.status;
  if (worker.emergencyContact !== undefined) dbWorker.emergency_contact = worker.emergencyContact || null;
  if (worker.idProofNumber !== undefined) dbWorker.id_proof_number = worker.idProofNumber || null;
  if (worker.address !== undefined) dbWorker.address = worker.address || null;
  if (worker.phonePeNumber !== undefined) dbWorker.phone_pe_number = worker.phonePeNumber || null;
  if (worker.bankName !== undefined) dbWorker.bank_name = worker.bankName || null;
  if (worker.bankAccountNo !== undefined) dbWorker.bank_account_no = worker.bankAccountNo || null;
  if (worker.bankIfsc !== undefined) dbWorker.bank_ifsc = worker.bankIfsc || null;
  if (worker.bankHolderName !== undefined) dbWorker.bank_holder_name = worker.bankHolderName || null;
  if (worker.photoUrl !== undefined) dbWorker.photo_url = worker.photoUrl || null;
  if (worker.faceEnrolled !== undefined) dbWorker.face_enrolled = worker.faceEnrolled;
  if (worker.fingerprintEnrolled !== undefined) dbWorker.fingerprint_enrolled = worker.fingerprintEnrolled;
  if (worker.designation !== undefined) dbWorker.designation = worker.designation || null;
  if (worker.purpose !== undefined) dbWorker.purpose = worker.purpose || null;
  if (worker.remarks !== undefined) dbWorker.remarks = worker.remarks || null;
  return dbWorker;
};

export const workersDataService = {
  /**
   * Fetch all Workers from Supabase public.workers table
   */
  async listWorkers(): Promise<{ data: Worker[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        return { data: null, error: error.message };
      }

      const workers = (data as DBWorker[]).map(mapDBWorkerToWorker);
      return { data: workers, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch workers' };
    }
  },

  /**
   * Fetch a single Worker by ID
   */
  async getWorker(id: string): Promise<{ data: Worker | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: mapDBWorkerToWorker(data as DBWorker), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch worker' };
    }
  },

  /**
   * Fetch Workers filtered by Site
   */
  async listWorkersBySite(siteId: string): Promise<{ data: Worker[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('current_site_id', siteId)
        .order('id', { ascending: true });

      if (error) {
        return { data: null, error: error.message };
      }

      const workers = (data as DBWorker[]).map(mapDBWorkerToWorker);
      return { data: workers, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch workers for site' };
    }
  },

  /**
   * Fetch Workers filtered by Section
   */
  async listWorkersBySection(sectionId: string): Promise<{ data: Worker[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('current_section_id', sectionId)
        .order('id', { ascending: true });

      if (error) {
        return { data: null, error: error.message };
      }

      const workers = (data as DBWorker[]).map(mapDBWorkerToWorker);
      return { data: workers, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch workers for section' };
    }
  },

  /**
   * Create a new Worker in Supabase
   */
  async createWorker(worker: Omit<Worker, 'id'> & { id?: string }): Promise<{ data: Worker | null; error: string | null }> {
    try {
      const dbPayload = mapWorkerToDBWorker(worker);
      const { data, error } = await supabase
        .from('workers')
        .insert([dbPayload])
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: mapDBWorkerToWorker(data as DBWorker), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to create worker' };
    }
  },

  /**
   * Update an existing Worker in Supabase
   */
  async updateWorker(id: string, updates: Partial<Worker>): Promise<{ data: Worker | null; error: string | null }> {
    try {
      const dbPayload = mapWorkerToDBWorker(updates);
      const { data, error } = await supabase
        .from('workers')
        .update(dbPayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: mapDBWorkerToWorker(data as DBWorker), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to update worker' };
    }
  },

  /**
   * Delete a Worker from Supabase
   */
  async deleteWorker(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('workers')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete worker' };
    }
  },
};
