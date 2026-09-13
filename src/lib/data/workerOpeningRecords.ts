import { supabase } from '../supabase';
import type { WorkerOpeningRecord } from '../../types';
import { roundMoney } from '../../utils/money';

export interface DBWorkerOpeningRecord {
  worker_id: string;
  original_joining_date: string;
  as_of_date: string;
  prior_working_days: number;
  prior_half_days: number;
  total_prior_days: number;
  prior_earned_wages: number;
  opening_advance_balance: number;
  opening_pending_wages: number;
  net_opening_balance: number;
  opening_food_meals: number;
  remarks?: string | null;
  updated_by?: string | null;
  updated_at?: string | null;
}

export const mapDBWorkerOpeningRecordToRecord = (
  dbRec: DBWorkerOpeningRecord
): WorkerOpeningRecord => ({
  workerId: dbRec.worker_id,
  originalJoiningDate: dbRec.original_joining_date,
  asOfDate: dbRec.as_of_date,
  priorWorkingDays: Number(dbRec.prior_working_days) || 0,
  priorHalfDays: Number(dbRec.prior_half_days) || 0,
  totalPriorDays: Number(dbRec.total_prior_days) || 0,
  priorEarnedWages: roundMoney(dbRec.prior_earned_wages),
  openingAdvanceBalance: roundMoney(dbRec.opening_advance_balance),
  openingPendingWages: roundMoney(dbRec.opening_pending_wages),
  netOpeningBalance: roundMoney(dbRec.net_opening_balance),
  openingFoodMeals: Number(dbRec.opening_food_meals) || 0,
  remarks: dbRec.remarks || undefined,
  updatedBy: dbRec.updated_by || undefined,
  updatedAt: dbRec.updated_at || undefined,
});

export const mapRecordToDBWorkerOpeningRecord = (
  rec: Partial<WorkerOpeningRecord>
): Partial<DBWorkerOpeningRecord> => {
  const dbRec: Partial<DBWorkerOpeningRecord> = {};
  if (rec.workerId !== undefined) dbRec.worker_id = rec.workerId;
  if (rec.originalJoiningDate !== undefined) dbRec.original_joining_date = rec.originalJoiningDate;
  if (rec.asOfDate !== undefined) dbRec.as_of_date = rec.asOfDate;
  if (rec.priorWorkingDays !== undefined) dbRec.prior_working_days = rec.priorWorkingDays;
  if (rec.priorHalfDays !== undefined) dbRec.prior_half_days = rec.priorHalfDays;
  if (rec.totalPriorDays !== undefined) dbRec.total_prior_days = rec.totalPriorDays;
  if (rec.priorEarnedWages !== undefined) dbRec.prior_earned_wages = roundMoney(rec.priorEarnedWages);
  if (rec.openingAdvanceBalance !== undefined) dbRec.opening_advance_balance = roundMoney(rec.openingAdvanceBalance);
  if (rec.openingPendingWages !== undefined) dbRec.opening_pending_wages = roundMoney(rec.openingPendingWages);
  if (rec.netOpeningBalance !== undefined) dbRec.net_opening_balance = roundMoney(rec.netOpeningBalance);
  if (rec.openingFoodMeals !== undefined) dbRec.opening_food_meals = rec.openingFoodMeals;
  if (rec.remarks !== undefined) dbRec.remarks = rec.remarks || null;
  if (rec.updatedBy !== undefined) dbRec.updated_by = rec.updatedBy || null;
  return dbRec;
};

export const workerOpeningRecordsDataService = {
  /**
   * Fetch all Worker Opening Records
   */
  async listWorkerOpeningRecords(): Promise<{
    data: WorkerOpeningRecord[] | null;
    error: string | null;
  }> {
    try {
      const { data, error } = await supabase.from('worker_opening_records').select('*');
      if (error) {
        return { data: null, error: error.message };
      }
      const records = (data as DBWorkerOpeningRecord[]).map(mapDBWorkerOpeningRecordToRecord);
      return { data: records, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch opening records' };
    }
  },

  /**
   * Fetch Opening Record for a single Worker
   */
  async getWorkerOpeningRecord(
    workerId: string
  ): Promise<{ data: WorkerOpeningRecord | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('worker_opening_records')
        .select('*')
        .eq('worker_id', workerId)
        .single();
      if (error) {
        return { data: null, error: error.message };
      }
      return { data: mapDBWorkerOpeningRecordToRecord(data as DBWorkerOpeningRecord), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch opening record' };
    }
  },

  /**
   * Upsert a Worker Opening Record
   */
  async upsertWorkerOpeningRecord(
    rec: WorkerOpeningRecord
  ): Promise<{ data: WorkerOpeningRecord | null; error: string | null }> {
    try {
      const dbPayload = mapRecordToDBWorkerOpeningRecord(rec);
      const { data, error } = await supabase
        .from('worker_opening_records')
        .upsert(dbPayload, { onConflict: 'worker_id' })
        .select()
        .single();
      if (error) {
        return { data: null, error: error.message };
      }
      return { data: mapDBWorkerOpeningRecordToRecord(data as DBWorkerOpeningRecord), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to save opening record' };
    }
  },
};
