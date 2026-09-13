import { supabase } from '../supabase';
import type { Advance } from '../../types';
import { roundMoney } from '../../utils/money';

export interface DBAdvance {
  id: string;
  worker_id: string;
  date: string;
  amount: number;
  reason: string;
  recovery_method: 'perDay' | 'percentage' | 'fixedMonthly' | 'manual';
  daily_recovery_amount?: number | null;
  recovery_percentage?: number | null;
  fixed_monthly_amount?: number | null;
  status: 'pending' | 'processing' | 'active' | 'closed' | 'rejected';
  remarks?: string | null;
  section_id?: string | null;
  payout_mode?: 'upi' | 'bankTransfer' | 'cash' | null;
  upi_number?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  worker_signature?: string | null;
  supervisor_signature?: string | null;
  photo_url?: string | null;
  sent_to_finance_at?: string | null;
  processed_at?: string | null;
  disbursed_at?: string | null;
  finance_remarks?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export const mapDBAdvanceToAdvance = (dbAdv: DBAdvance): Advance => ({
  id: dbAdv.id,
  workerId: dbAdv.worker_id,
  date: dbAdv.date,
  amount: roundMoney(dbAdv.amount),
  reason: dbAdv.reason,
  recoveryMethod: dbAdv.recovery_method,
  dailyRecoveryAmount: dbAdv.daily_recovery_amount !== null && dbAdv.daily_recovery_amount !== undefined ? roundMoney(dbAdv.daily_recovery_amount) : undefined,
  recoveryPercentage: dbAdv.recovery_percentage !== null && dbAdv.recovery_percentage !== undefined ? Number(dbAdv.recovery_percentage) : undefined,
  fixedMonthlyAmount: dbAdv.fixed_monthly_amount !== null && dbAdv.fixed_monthly_amount !== undefined ? roundMoney(dbAdv.fixed_monthly_amount) : undefined,
  status: dbAdv.status,
  remarks: dbAdv.remarks || undefined,
  sectionId: dbAdv.section_id || undefined,
  payoutMode: dbAdv.payout_mode || undefined,
  upiNumber: dbAdv.upi_number || undefined,
  bankName: dbAdv.bank_name || undefined,
  bankAccountNumber: dbAdv.bank_account_number || undefined,
  bankIfsc: dbAdv.bank_ifsc || undefined,
  workerSignature: dbAdv.worker_signature || undefined,
  supervisorSignature: dbAdv.supervisor_signature || undefined,
  photoUrl: dbAdv.photo_url || undefined,
  sentToFinanceAt: dbAdv.sent_to_finance_at || undefined,
  processedAt: dbAdv.processed_at || undefined,
  disbursedAt: dbAdv.disbursed_at || undefined,
  financeRemarks: dbAdv.finance_remarks || undefined,
});

export const mapAdvanceToDBAdvance = (adv: Partial<Advance>): Partial<DBAdvance> => {
  const dbAdv: Partial<DBAdvance> = {};
  if (adv.id !== undefined) dbAdv.id = adv.id;
  if (adv.workerId !== undefined) dbAdv.worker_id = adv.workerId;
  if (adv.date !== undefined) dbAdv.date = adv.date;
  if (adv.amount !== undefined) dbAdv.amount = roundMoney(adv.amount);
  if (adv.reason !== undefined) dbAdv.reason = adv.reason;
  if (adv.recoveryMethod !== undefined) dbAdv.recovery_method = adv.recoveryMethod;
  if (adv.dailyRecoveryAmount !== undefined) dbAdv.daily_recovery_amount = adv.dailyRecoveryAmount !== null && adv.dailyRecoveryAmount !== undefined ? roundMoney(adv.dailyRecoveryAmount) : null;
  if (adv.recoveryPercentage !== undefined) dbAdv.recovery_percentage = adv.recoveryPercentage ?? null;
  if (adv.fixedMonthlyAmount !== undefined) dbAdv.fixed_monthly_amount = adv.fixedMonthlyAmount !== null && adv.fixedMonthlyAmount !== undefined ? roundMoney(adv.fixedMonthlyAmount) : null;
  if (adv.status !== undefined) dbAdv.status = adv.status;
  if (adv.remarks !== undefined) dbAdv.remarks = adv.remarks || null;
  if (adv.sectionId !== undefined) dbAdv.section_id = adv.sectionId || null;
  if (adv.payoutMode !== undefined) dbAdv.payout_mode = adv.payoutMode || null;
  if (adv.upiNumber !== undefined) dbAdv.upi_number = adv.upiNumber || null;
  if (adv.bankName !== undefined) dbAdv.bank_name = adv.bankName || null;
  if (adv.bankAccountNumber !== undefined) dbAdv.bank_account_number = adv.bankAccountNumber || null;
  if (adv.bankIfsc !== undefined) dbAdv.bank_ifsc = adv.bankIfsc || null;
  if (adv.workerSignature !== undefined) dbAdv.worker_signature = adv.workerSignature || null;
  if (adv.supervisorSignature !== undefined) dbAdv.supervisor_signature = adv.supervisorSignature || null;
  if (adv.photoUrl !== undefined) dbAdv.photo_url = adv.photoUrl || null;
  if (adv.sentToFinanceAt !== undefined) dbAdv.sent_to_finance_at = adv.sentToFinanceAt || null;
  if (adv.processedAt !== undefined) dbAdv.processed_at = adv.processedAt || null;
  if (adv.disbursedAt !== undefined) dbAdv.disbursed_at = adv.disbursedAt || null;
  if (adv.financeRemarks !== undefined) dbAdv.finance_remarks = adv.financeRemarks || null;
  return dbAdv;
};

export const advancesDataService = {
  /**
   * Fetch all advances from Supabase
   */
  async listAdvances(): Promise<{ data: Advance[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('advances')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      const advances = (data as DBAdvance[]).map(mapDBAdvanceToAdvance);
      return { data: advances, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch advances' };
    }
  },

  /**
   * Fetch single advance by ID
   */
  async getAdvance(id: string): Promise<{ data: Advance | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('advances')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: mapDBAdvanceToAdvance(data as DBAdvance), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch advance' };
    }
  },

  /**
   * Fetch advances by worker ID
   */
  async listAdvancesByWorker(
    workerId: string
  ): Promise<{ data: Advance[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('advances')
        .select('*')
        .eq('worker_id', workerId)
        .order('date', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      const advances = (data as DBAdvance[]).map(mapDBAdvanceToAdvance);
      return { data: advances, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch worker advances' };
    }
  },

  /**
   * Create advance record
   */
  async createAdvance(
    adv: Omit<Advance, 'id'> & { id?: string }
  ): Promise<{ data: Advance | null; error: string | null }> {
    try {
      const dbPayload = mapAdvanceToDBAdvance(adv);
      const { data, error } = await supabase
        .from('advances')
        .insert([dbPayload])
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: mapDBAdvanceToAdvance(data as DBAdvance), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to create advance' };
    }
  },

  /**
   * Update advance record
   */
  async updateAdvance(
    id: string,
    updates: Partial<Advance>
  ): Promise<{ data: Advance | null; error: string | null }> {
    try {
      const dbPayload = mapAdvanceToDBAdvance(updates);
      const { data, error } = await supabase
        .from('advances')
        .update(dbPayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: mapDBAdvanceToAdvance(data as DBAdvance), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to update advance' };
    }
  },

  /**
   * Delete advance record
   */
  async deleteAdvance(
    id: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.from('advances').delete().eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete advance' };
    }
  },
};
