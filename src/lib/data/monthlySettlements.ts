import { supabase } from '../supabase';
import type { MonthlySettlementRecord } from '../../types';
import { roundMoney } from '../../utils/money';

export interface DBMonthlySettlement {
  id: string;
  month: string;
  worker_id: string;
  site_id: string;
  section_id: string;
  working_days: number;
  present_days: number;
  half_days: number;
  absent_days: number;
  gross_wage: number;
  advance_taken: number;
  advance_recovery: number;
  other_deductions: number;
  net_pay: number;
  food_days: number;
  commission: number;
  commission_paid: number;
  outstanding_advance: number;
  status: 'draft' | 'reviewed' | 'approved' | 'paid';
  remarks?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export const mapDBMonthlySettlementToRecord = (
  dbSet: DBMonthlySettlement
): MonthlySettlementRecord => ({
  id: dbSet.id,
  month: dbSet.month,
  workerId: dbSet.worker_id,
  siteId: dbSet.site_id,
  sectionId: dbSet.section_id,
  workingDays: Number(dbSet.working_days) || 0,
  presentDays: Number(dbSet.present_days) || 0,
  halfDays: Number(dbSet.half_days) || 0,
  absentDays: Number(dbSet.absent_days) || 0,
  grossWage: roundMoney(dbSet.gross_wage),
  advanceTaken: roundMoney(dbSet.advance_taken),
  advanceRecovery: roundMoney(dbSet.advance_recovery),
  otherDeductions: roundMoney(dbSet.other_deductions),
  netPay: roundMoney(dbSet.net_pay),
  foodDays: Number(dbSet.food_days) || 0,
  commission: roundMoney(dbSet.commission),
  commissionPaid: roundMoney(dbSet.commission_paid),
  outstandingAdvance: roundMoney(dbSet.outstanding_advance),
  status: dbSet.status,
  remarks: dbSet.remarks || undefined,
});

export const mapRecordToDBMonthlySettlement = (
  rec: Partial<MonthlySettlementRecord>
): Partial<DBMonthlySettlement> => {
  const dbSet: Partial<DBMonthlySettlement> = {};
  if (rec.id !== undefined) dbSet.id = rec.id;
  if (rec.month !== undefined) dbSet.month = rec.month;
  if (rec.workerId !== undefined) dbSet.worker_id = rec.workerId;
  if (rec.siteId !== undefined) dbSet.site_id = rec.siteId;
  if (rec.sectionId !== undefined) dbSet.section_id = rec.sectionId;
  if (rec.workingDays !== undefined) dbSet.working_days = rec.workingDays;
  if (rec.presentDays !== undefined) dbSet.present_days = rec.presentDays;
  if (rec.halfDays !== undefined) dbSet.half_days = rec.halfDays;
  if (rec.absentDays !== undefined) dbSet.absent_days = rec.absentDays;
  if (rec.grossWage !== undefined) dbSet.gross_wage = roundMoney(rec.grossWage);
  if (rec.advanceTaken !== undefined) dbSet.advance_taken = roundMoney(rec.advanceTaken);
  if (rec.advanceRecovery !== undefined) dbSet.advance_recovery = roundMoney(rec.advanceRecovery);
  if (rec.otherDeductions !== undefined) dbSet.other_deductions = roundMoney(rec.otherDeductions);
  if (rec.netPay !== undefined) dbSet.net_pay = roundMoney(rec.netPay);
  if (rec.foodDays !== undefined) dbSet.food_days = rec.foodDays;
  if (rec.commission !== undefined) dbSet.commission = roundMoney(rec.commission);
  if (rec.commissionPaid !== undefined) dbSet.commission_paid = roundMoney(rec.commissionPaid);
  if (rec.outstandingAdvance !== undefined) dbSet.outstanding_advance = roundMoney(rec.outstandingAdvance);
  if (rec.status !== undefined) dbSet.status = rec.status;
  if (rec.remarks !== undefined) dbSet.remarks = rec.remarks || null;
  return dbSet;
};

export const monthlySettlementsDataService = {
  /**
   * List all Monthly Settlements
   */
  async listMonthlySettlements(): Promise<{
    data: MonthlySettlementRecord[] | null;
    error: string | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('monthly_settlements')
        .select('*')
        .order('month', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      const settlements = (data as DBMonthlySettlement[]).map(mapDBMonthlySettlementToRecord);
      return { data: settlements, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch monthly settlements' };
    }
  },

  /**
   * Get single settlement by ID
   */
  async getMonthlySettlement(
    id: string
  ): Promise<{ data: MonthlySettlementRecord | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('monthly_settlements')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: mapDBMonthlySettlementToRecord(data as DBMonthlySettlement), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch monthly settlement' };
    }
  },

  /**
   * List settlements by worker ID
   */
  async listMonthlySettlementsByWorker(
    workerId: string
  ): Promise<{ data: MonthlySettlementRecord[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('monthly_settlements')
        .select('*')
        .eq('worker_id', workerId)
        .order('month', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      const settlements = (data as DBMonthlySettlement[]).map(mapDBMonthlySettlementToRecord);
      return { data: settlements, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch worker settlements' };
    }
  },

  /**
   * List settlements by site ID
   */
  async listMonthlySettlementsBySite(
    siteId: string
  ): Promise<{ data: MonthlySettlementRecord[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('monthly_settlements')
        .select('*')
        .eq('site_id', siteId)
        .order('month', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      const settlements = (data as DBMonthlySettlement[]).map(mapDBMonthlySettlementToRecord);
      return { data: settlements, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch site settlements' };
    }
  },

  /**
   * List settlements by month (YYYY-MM)
   */
  async listMonthlySettlementsByMonth(
    month: string
  ): Promise<{ data: MonthlySettlementRecord[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('monthly_settlements')
        .select('*')
        .eq('month', month);

      if (error) {
        return { data: null, error: error.message };
      }

      const settlements = (data as DBMonthlySettlement[]).map(mapDBMonthlySettlementToRecord);
      return { data: settlements, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch month settlements' };
    }
  },

  /**
   * Create monthly settlement
   */
  async createMonthlySettlement(
    settlement: Omit<MonthlySettlementRecord, 'id'> & { id?: string }
  ): Promise<{ data: MonthlySettlementRecord | null; error: string | null }> {
    try {
      const dbPayload = mapRecordToDBMonthlySettlement(settlement);
      const { data, error } = await supabase
        .from('monthly_settlements')
        .insert([dbPayload])
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: mapDBMonthlySettlementToRecord(data as DBMonthlySettlement), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to create monthly settlement' };
    }
  },

  /**
   * Update monthly settlement
   */
  async updateMonthlySettlement(
    id: string,
    updates: Partial<MonthlySettlementRecord>
  ): Promise<{ data: MonthlySettlementRecord | null; error: string | null }> {
    try {
      const dbPayload = mapRecordToDBMonthlySettlement(updates);
      const { data, error } = await supabase
        .from('monthly_settlements')
        .update(dbPayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: mapDBMonthlySettlementToRecord(data as DBMonthlySettlement), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to update monthly settlement' };
    }
  },

  /**
   * Upsert monthly settlement respecting uq_month_worker_site_section constraint
   */
  async upsertMonthlySettlement(
    settlement: MonthlySettlementRecord
  ): Promise<{ data: MonthlySettlementRecord | null; error: string | null }> {
    try {
      const dbPayload = mapRecordToDBMonthlySettlement(settlement);
      const { data, error } = await supabase
        .from('monthly_settlements')
        .upsert(dbPayload, { onConflict: 'month,worker_id,site_id,section_id' })
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: mapDBMonthlySettlementToRecord(data as DBMonthlySettlement), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to upsert monthly settlement' };
    }
  },

  /**
   * Delete monthly settlement
   */
  async deleteMonthlySettlement(
    id: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.from('monthly_settlements').delete().eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete monthly settlement' };
    }
  },
};
