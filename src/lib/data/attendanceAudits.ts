import { supabase } from '../supabase';
import type { AttendanceAudit } from '../../types';

export interface DBAttendanceAudit {
  id: string;
  attendance_id: string;
  worker_id: string;
  old_status: string;
  new_status: string;
  changed_by: string;
  changed_at?: string | null;
  reason: string;
}

export const mapDBAttendanceAuditToAudit = (
  dbAudit: DBAttendanceAudit
): AttendanceAudit => ({
  id: dbAudit.id,
  attendanceId: dbAudit.attendance_id,
  workerId: dbAudit.worker_id,
  oldStatus: dbAudit.old_status,
  newStatus: dbAudit.new_status,
  changedBy: dbAudit.changed_by,
  changedAt: dbAudit.changed_at || new Date().toISOString(),
  reason: dbAudit.reason,
});

export const mapAuditToDBAttendanceAudit = (
  audit: Partial<AttendanceAudit>
): Partial<DBAttendanceAudit> => {
  const dbAudit: Partial<DBAttendanceAudit> = {};
  if (audit.id !== undefined) dbAudit.id = audit.id;
  if (audit.attendanceId !== undefined) dbAudit.attendance_id = audit.attendanceId;
  if (audit.workerId !== undefined) dbAudit.worker_id = audit.workerId;
  if (audit.oldStatus !== undefined) dbAudit.old_status = audit.oldStatus;
  if (audit.newStatus !== undefined) dbAudit.new_status = audit.newStatus;
  if (audit.changedBy !== undefined) dbAudit.changed_by = audit.changedBy;
  if (audit.changedAt !== undefined) dbAudit.changed_at = audit.changedAt;
  if (audit.reason !== undefined) dbAudit.reason = audit.reason;
  return dbAudit;
};

export const attendanceAuditsDataService = {
  /**
   * List attendance audit records (optionally filtered by attendanceId)
   */
  async listAttendanceAudits(
    attendanceId?: string
  ): Promise<{ data: AttendanceAudit[] | null; error: string | null }> {
    try {
      let query = supabase
        .from('attendance_audits')
        .select('*')
        .order('changed_at', { ascending: false });

      if (attendanceId) {
        query = query.eq('attendance_id', attendanceId);
      }

      const { data, error } = await query;

      if (error) {
        return { data: null, error: error.message };
      }

      const audits = (data as DBAttendanceAudit[]).map(mapDBAttendanceAuditToAudit);
      return { data: audits, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch attendance audits' };
    }
  },

  /**
   * Create an attendance audit record
   */
  async createAttendanceAudit(
    audit: Omit<AttendanceAudit, 'id'> & { id?: string }
  ): Promise<{ data: AttendanceAudit | null; error: string | null }> {
    try {
      const dbPayload = mapAuditToDBAttendanceAudit(audit);
      const { data, error } = await supabase
        .from('attendance_audits')
        .insert([dbPayload])
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: mapDBAttendanceAuditToAudit(data as DBAttendanceAudit), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to create attendance audit' };
    }
  },
};
