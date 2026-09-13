import { supabase } from '../supabase';
import type { Recovery } from '../../types';
import { roundMoney } from '../../utils/money';

export interface DBRecovery {
  id: string;
  advance_id: string;
  worker_id: string;
  date: string;
  attendance_id?: string | null;
  amount: number;
  method: 'perDay' | 'percentage' | 'fixedMonthly' | 'manual';
  is_manual?: boolean | null;
  remarks?: string | null;
  created_at?: string | null;
}

export const mapDBRecoveryToRecovery = (dbRec: DBRecovery): Recovery => ({
  id: dbRec.id,
  advanceId: dbRec.advance_id,
  workerId: dbRec.worker_id,
  date: dbRec.date,
  attendanceId: dbRec.attendance_id || undefined,
  amount: roundMoney(dbRec.amount),
  method: dbRec.method,
  isManual: Boolean(dbRec.is_manual),
  remarks: dbRec.remarks || undefined,
});

export const mapRecoveryToDBRecovery = (
  rec: Partial<Recovery>
): Partial<DBRecovery> => {
  const dbRec: Partial<DBRecovery> = {};
  if (rec.id !== undefined) dbRec.id = rec.id;
  if (rec.advanceId !== undefined) dbRec.advance_id = rec.advanceId;
  if (rec.workerId !== undefined) dbRec.worker_id = rec.workerId;
  if (rec.date !== undefined) dbRec.date = rec.date;
  if (rec.attendanceId !== undefined) dbRec.attendance_id = rec.attendanceId || null;
  if (rec.amount !== undefined) dbRec.amount = roundMoney(rec.amount);
  if (rec.method !== undefined) dbRec.method = rec.method;
  if (rec.isManual !== undefined) dbRec.is_manual = rec.isManual;
  if (rec.remarks !== undefined) dbRec.remarks = rec.remarks || null;
  return dbRec;
};

export const recoveriesDataService = {
  /**
   * List all recoveries from Supabase
   */
  async listRecoveries(): Promise<{ data: Recovery[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('recoveries')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      const recoveries = (data as DBRecovery[]).map(mapDBRecoveryToRecovery);
      return { data: recoveries, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch recoveries' };
    }
  },

  /**
   * Get single recovery by ID
   */
  async getRecovery(id: string): Promise<{ data: Recovery | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('recoveries')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: mapDBRecoveryToRecovery(data as DBRecovery), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch recovery' };
    }
  },

  /**
   * List recoveries by worker ID
   */
  async listRecoveriesByWorker(
    workerId: string
  ): Promise<{ data: Recovery[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('recoveries')
        .select('*')
        .eq('worker_id', workerId)
        .order('date', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      const recoveries = (data as DBRecovery[]).map(mapDBRecoveryToRecovery);
      return { data: recoveries, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch worker recoveries' };
    }
  },

  /**
   * List recoveries by advance ID
   */
  async listRecoveriesByAdvance(
    advanceId: string
  ): Promise<{ data: Recovery[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('recoveries')
        .select('*')
        .eq('advance_id', advanceId)
        .order('date', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      const recoveries = (data as DBRecovery[]).map(mapDBRecoveryToRecovery);
      return { data: recoveries, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch advance recoveries' };
    }
  },

  /**
   * Create recovery record
   */
  async createRecovery(
    rec: Omit<Recovery, 'id'> & { id?: string }
  ): Promise<{ data: Recovery | null; error: string | null }> {
    try {
      const dbPayload = mapRecoveryToDBRecovery(rec);
      const { data, error } = await supabase
        .from('recoveries')
        .insert([dbPayload])
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: mapDBRecoveryToRecovery(data as DBRecovery), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to create recovery' };
    }
  },

  /**
   * Update recovery record
   */
  async updateRecovery(
    id: string,
    updates: Partial<Recovery>
  ): Promise<{ data: Recovery | null; error: string | null }> {
    try {
      const dbPayload = mapRecoveryToDBRecovery(updates);
      const { data, error } = await supabase
        .from('recoveries')
        .update(dbPayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: mapDBRecoveryToRecovery(data as DBRecovery), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to update recovery' };
    }
  },

  /**
   * Delete recovery record
   */
  async deleteRecovery(
    id: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.from('recoveries').delete().eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete recovery' };
    }
  },
};
