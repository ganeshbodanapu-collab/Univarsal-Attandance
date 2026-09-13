import { supabase } from '../supabase';
import type { EmploymentHistory } from '../../types';

export interface DBEmploymentHistory {
  id: string;
  worker_id: string;
  date: string;
  event: 'joined' | 'left' | 'rejoined';
  site_id: string;
  section_id: string;
  remarks?: string | null;
  created_at?: string | null;
}

export const mapDBEmploymentHistoryToEmploymentHistory = (
  dbEmp: DBEmploymentHistory
): EmploymentHistory => ({
  id: dbEmp.id,
  workerId: dbEmp.worker_id,
  date: dbEmp.date,
  event: dbEmp.event,
  siteId: dbEmp.site_id,
  sectionId: dbEmp.section_id,
  remarks: dbEmp.remarks || undefined,
});

export const mapEmploymentHistoryToDBEmploymentHistory = (
  emp: Partial<EmploymentHistory>
): Partial<DBEmploymentHistory> => {
  const dbEmp: Partial<DBEmploymentHistory> = {};
  if (emp.id !== undefined) dbEmp.id = emp.id;
  if (emp.workerId !== undefined) dbEmp.worker_id = emp.workerId;
  if (emp.date !== undefined) dbEmp.date = emp.date;
  if (emp.event !== undefined) dbEmp.event = emp.event;
  if (emp.siteId !== undefined) dbEmp.site_id = emp.siteId;
  if (emp.sectionId !== undefined) dbEmp.section_id = emp.sectionId;
  if (emp.remarks !== undefined) dbEmp.remarks = emp.remarks || null;
  return dbEmp;
};

export const employmentHistoryDataService = {
  /**
   * Fetch Employment History records (optionally filtered by workerId)
   */
  async listEmploymentHistory(
    workerId?: string
  ): Promise<{ data: EmploymentHistory[] | null; error: string | null }> {
    try {
      let query = supabase.from('employment_history').select('*').order('date', { ascending: false });
      if (workerId) {
        query = query.eq('worker_id', workerId);
      }
      const { data, error } = await query;
      if (error) {
        return { data: null, error: error.message };
      }
      const history = (data as DBEmploymentHistory[]).map(
        mapDBEmploymentHistoryToEmploymentHistory
      );
      return { data: history, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch employment history' };
    }
  },

  /**
   * Create an Employment History record
   */
  async createEmploymentHistory(
    record: Omit<EmploymentHistory, 'id'> & { id?: string }
  ): Promise<{ data: EmploymentHistory | null; error: string | null }> {
    try {
      const dbPayload = mapEmploymentHistoryToDBEmploymentHistory(record);
      const { data, error } = await supabase
        .from('employment_history')
        .insert([dbPayload])
        .select()
        .single();
      if (error) {
        return { data: null, error: error.message };
      }
      return { data: mapDBEmploymentHistoryToEmploymentHistory(data as DBEmploymentHistory), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to record employment history' };
    }
  },
};
