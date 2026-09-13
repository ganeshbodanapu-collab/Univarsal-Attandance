import { supabase } from '../supabase';
import type { WorkerPayment } from '../../types';
import { roundMoney } from '../../utils/money';

export interface DBWorkerPayment {
  id: string;
  worker_id: string;
  worker_name?: string | null;
  date: string;
  site_id: string;
  section_id?: string | null;
  attendance_status?: string | null;
  gross_wage: number;
  deductions?: number | null;
  advance_recovery?: number | null;
  net_pay: number;
  payment_method: string;
  status: 'pending' | 'processing' | 'partiallyPaid' | 'paid';
  remarks?: string | null;
  processed_at?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
}

export const mapDBWorkerPaymentToWorkerPayment = (
  dbPay: DBWorkerPayment
): WorkerPayment => ({
  id: dbPay.id,
  workerId: dbPay.worker_id,
  workerName: dbPay.worker_name || undefined,
  date: dbPay.date,
  siteId: dbPay.site_id,
  sectionId: dbPay.section_id || undefined,
  attendanceStatus: (dbPay.attendance_status as 'present' | 'halfDay' | 'absent') || undefined,
  grossWage: roundMoney(dbPay.gross_wage),
  deductions: roundMoney(dbPay.deductions),
  advanceRecovery: roundMoney(dbPay.advance_recovery),
  netPay: roundMoney(dbPay.net_pay),
  paymentMethod: (dbPay.payment_method as 'cash' | 'bankTransfer') || 'cash',
  status: dbPay.status,
  remarks: dbPay.remarks || undefined,
  processedAt: dbPay.processed_at || undefined,
  paidAt: dbPay.paid_at || undefined,
});

export const mapWorkerPaymentToDBWorkerPayment = (
  pay: Partial<WorkerPayment>
): Partial<DBWorkerPayment> => {
  const dbPay: Partial<DBWorkerPayment> = {};
  if (pay.id !== undefined) dbPay.id = pay.id;
  if (pay.workerId !== undefined) dbPay.worker_id = pay.workerId;
  if (pay.workerName !== undefined) dbPay.worker_name = pay.workerName || null;
  if (pay.date !== undefined) dbPay.date = pay.date;
  if (pay.siteId !== undefined) dbPay.site_id = pay.siteId;
  if (pay.sectionId !== undefined) dbPay.section_id = pay.sectionId || null;
  if (pay.attendanceStatus !== undefined) dbPay.attendance_status = pay.attendanceStatus || null;
  if (pay.grossWage !== undefined) dbPay.gross_wage = roundMoney(pay.grossWage);
  if (pay.deductions !== undefined) dbPay.deductions = roundMoney(pay.deductions);
  if (pay.advanceRecovery !== undefined) dbPay.advance_recovery = roundMoney(pay.advanceRecovery);
  if (pay.netPay !== undefined) dbPay.net_pay = roundMoney(pay.netPay);
  if (pay.paymentMethod !== undefined) dbPay.payment_method = pay.paymentMethod;
  if (pay.status !== undefined) dbPay.status = pay.status;
  if (pay.remarks !== undefined) dbPay.remarks = pay.remarks || null;
  if (pay.processedAt !== undefined) dbPay.processed_at = pay.processedAt || null;
  if (pay.paidAt !== undefined) dbPay.paid_at = pay.paidAt || null;
  return dbPay;
};

export const workerPaymentsDataService = {
  /**
   * Fetch all Worker Payments
   */
  async listWorkerPayments(): Promise<{ data: WorkerPayment[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('worker_payments')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      const payments = (data as DBWorkerPayment[]).map(mapDBWorkerPaymentToWorkerPayment);
      return { data: payments, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch worker payments' };
    }
  },

  /**
   * Fetch single payment by ID
   */
  async getWorkerPayment(
    id: string
  ): Promise<{ data: WorkerPayment | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('worker_payments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: mapDBWorkerPaymentToWorkerPayment(data as DBWorkerPayment), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch payment' };
    }
  },

  /**
   * Fetch payments by worker ID
   */
  async listWorkerPaymentsByWorker(
    workerId: string
  ): Promise<{ data: WorkerPayment[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('worker_payments')
        .select('*')
        .eq('worker_id', workerId)
        .order('date', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      const payments = (data as DBWorkerPayment[]).map(mapDBWorkerPaymentToWorkerPayment);
      return { data: payments, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch worker payments' };
    }
  },

  /**
   * Fetch payments by site ID
   */
  async listWorkerPaymentsBySite(
    siteId: string
  ): Promise<{ data: WorkerPayment[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('worker_payments')
        .select('*')
        .eq('site_id', siteId)
        .order('date', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      const payments = (data as DBWorkerPayment[]).map(mapDBWorkerPaymentToWorkerPayment);
      return { data: payments, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch site worker payments' };
    }
  },

  /**
   * Fetch payments by section ID
   */
  async listWorkerPaymentsBySection(
    sectionId: string
  ): Promise<{ data: WorkerPayment[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('worker_payments')
        .select('*')
        .eq('section_id', sectionId)
        .order('date', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      const payments = (data as DBWorkerPayment[]).map(mapDBWorkerPaymentToWorkerPayment);
      return { data: payments, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch section worker payments' };
    }
  },

  /**
   * Create worker payment
   */
  async createWorkerPayment(
    payment: Omit<WorkerPayment, 'id'> & { id?: string }
  ): Promise<{ data: WorkerPayment | null; error: string | null }> {
    try {
      const dbPayload = mapWorkerPaymentToDBWorkerPayment(payment);
      const { data, error } = await supabase
        .from('worker_payments')
        .insert([dbPayload])
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: mapDBWorkerPaymentToWorkerPayment(data as DBWorkerPayment), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to create worker payment' };
    }
  },

  /**
   * Update worker payment
   */
  async updateWorkerPayment(
    id: string,
    updates: Partial<WorkerPayment>
  ): Promise<{ data: WorkerPayment | null; error: string | null }> {
    try {
      const dbPayload = mapWorkerPaymentToDBWorkerPayment(updates);
      const { data, error } = await supabase
        .from('worker_payments')
        .update(dbPayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: mapDBWorkerPaymentToWorkerPayment(data as DBWorkerPayment), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to update worker payment' };
    }
  },

  /**
   * Delete worker payment
   */
  async deleteWorkerPayment(
    id: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.from('worker_payments').delete().eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete worker payment' };
    }
  },
};
