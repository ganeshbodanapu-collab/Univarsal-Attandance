import { supabase } from '../supabase';
import type { Attendance } from '../../types';

export interface DBAttendance {
  id: string;
  worker_id: string;
  assignment_id: string;
  date: string;
  status: 'present' | 'halfDay' | 'absent' | 'leave' | 'holiday';
  method: 'face' | 'fingerprint' | 'manual';
  check_in?: string | null;
  check_out?: string | null;
  photo_url?: string | null;
  remarks?: string | null;
  marked_by?: string | null;
  site_id?: string | null;
  section_id?: string | null;
  site_amount_given?: number | null;
  site_amount_remarks?: string | null;
  site_amount_mode?: 'cash' | 'upi' | 'settlement' | 'advance' | null;
  working_place_note?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export const mapDBAttendanceToAttendance = (dbAtt: DBAttendance): Attendance => ({
  id: dbAtt.id,
  workerId: dbAtt.worker_id,
  assignmentId: dbAtt.assignment_id,
  date: dbAtt.date,
  status: dbAtt.status,
  method: dbAtt.method,
  checkIn: dbAtt.check_in || undefined,
  checkOut: dbAtt.check_out || undefined,
  photoUrl: dbAtt.photo_url || undefined,
  remarks: dbAtt.remarks || undefined,
  markedBy: dbAtt.marked_by || undefined,
  siteId: dbAtt.site_id || undefined,
  sectionId: dbAtt.section_id || undefined,
  siteAmountGiven: dbAtt.site_amount_given !== null && dbAtt.site_amount_given !== undefined ? Number(dbAtt.site_amount_given) : undefined,
  siteAmountRemarks: dbAtt.site_amount_remarks || undefined,
  siteAmountMode: dbAtt.site_amount_mode || undefined,
  workingPlaceNote: dbAtt.working_place_note || undefined,
});

export const mapAttendanceToDBAttendance = (
  att: Partial<Attendance>
): Partial<DBAttendance> => {
  const dbAtt: Partial<DBAttendance> = {};
  if (att.id !== undefined) dbAtt.id = att.id;
  if (att.workerId !== undefined) dbAtt.worker_id = att.workerId;
  if (att.assignmentId !== undefined) dbAtt.assignment_id = att.assignmentId;
  if (att.date !== undefined) dbAtt.date = att.date;
  if (att.status !== undefined) dbAtt.status = att.status;
  if (att.method !== undefined) dbAtt.method = att.method;
  if (att.checkIn !== undefined) dbAtt.check_in = att.checkIn || null;
  if (att.checkOut !== undefined) dbAtt.check_out = att.checkOut || null;
  if (att.photoUrl !== undefined) dbAtt.photo_url = att.photoUrl || null;
  if (att.remarks !== undefined) dbAtt.remarks = att.remarks || null;
  if (att.markedBy !== undefined) dbAtt.marked_by = att.markedBy || null;
  if (att.siteId !== undefined) dbAtt.site_id = att.siteId || null;
  if (att.sectionId !== undefined) dbAtt.section_id = att.sectionId || null;
  if (att.siteAmountGiven !== undefined) dbAtt.site_amount_given = att.siteAmountGiven ?? null;
  if (att.siteAmountRemarks !== undefined) dbAtt.site_amount_remarks = att.siteAmountRemarks || null;
  if (att.siteAmountMode !== undefined) dbAtt.site_amount_mode = att.siteAmountMode || null;
  if (att.workingPlaceNote !== undefined) dbAtt.working_place_note = att.workingPlaceNote || null;
  return dbAtt;
};

export const attendanceDataService = {
  /**
   * List all attendance records from Supabase
   */
  async listAttendance(): Promise<{ data: Attendance[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      const attendanceList = (data as DBAttendance[]).map(mapDBAttendanceToAttendance);
      return { data: attendanceList, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch attendance records' };
    }
  },

  /**
   * Get attendance by ID
   */
  async getAttendance(id: string): Promise<{ data: Attendance | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: mapDBAttendanceToAttendance(data as DBAttendance), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch attendance record' };
    }
  },

  /**
   * Get attendance by worker ID
   */
  async getAttendanceByWorker(
    workerId: string
  ): Promise<{ data: Attendance[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('worker_id', workerId)
        .order('date', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      const attendanceList = (data as DBAttendance[]).map(mapDBAttendanceToAttendance);
      return { data: attendanceList, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch worker attendance' };
    }
  },

  /**
   * List attendance by date
   */
  async listAttendanceByDate(
    date: string
  ): Promise<{ data: Attendance[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', date);

      if (error) {
        return { data: null, error: error.message };
      }

      const attendanceList = (data as DBAttendance[]).map(mapDBAttendanceToAttendance);
      return { data: attendanceList, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch date attendance' };
    }
  },

  /**
   * List attendance by Site
   */
  async listAttendanceBySite(
    siteId: string
  ): Promise<{ data: Attendance[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('site_id', siteId)
        .order('date', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      const attendanceList = (data as DBAttendance[]).map(mapDBAttendanceToAttendance);
      return { data: attendanceList, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch site attendance' };
    }
  },

  /**
   * List attendance by Section
   */
  async listAttendanceBySection(
    sectionId: string
  ): Promise<{ data: Attendance[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('section_id', sectionId)
        .order('date', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      const attendanceList = (data as DBAttendance[]).map(mapDBAttendanceToAttendance);
      return { data: attendanceList, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch section attendance' };
    }
  },

  /**
   * Create attendance record
   */
  async createAttendance(
    att: Omit<Attendance, 'id'> & { id?: string }
  ): Promise<{ data: Attendance | null; error: string | null }> {
    try {
      const dbPayload = mapAttendanceToDBAttendance(att);
      const { data, error } = await supabase
        .from('attendance')
        .insert([dbPayload])
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: mapDBAttendanceToAttendance(data as DBAttendance), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to create attendance record' };
    }
  },

  /**
   * Update attendance record
   */
  async updateAttendance(
    id: string,
    updates: Partial<Attendance>
  ): Promise<{ data: Attendance | null; error: string | null }> {
    try {
      const dbPayload = mapAttendanceToDBAttendance(updates);
      const { data, error } = await supabase
        .from('attendance')
        .update(dbPayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: mapDBAttendanceToAttendance(data as DBAttendance), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to update attendance record' };
    }
  },

  /**
   * Upsert attendance record respecting (worker_id, date) constraint
   */
  async upsertAttendance(
    att: Attendance
  ): Promise<{ data: Attendance | null; error: string | null }> {
    try {
      const dbPayload = mapAttendanceToDBAttendance(att);
      const { data, error } = await supabase
        .from('attendance')
        .upsert(dbPayload, { onConflict: 'worker_id,date' })
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: mapDBAttendanceToAttendance(data as DBAttendance), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to upsert attendance record' };
    }
  },

  /**
   * Delete attendance record
   */
  async deleteAttendance(
    id: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.from('attendance').delete().eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete attendance record' };
    }
  },
};
