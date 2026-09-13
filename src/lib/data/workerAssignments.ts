import { supabase } from '../supabase';
import type { WorkerAssignment } from '../../types';

export interface DBWorkerAssignment {
  id: string;
  worker_id: string;
  site_id: string;
  section_id: string;
  from_date: string;
  to_date?: string | null;
  status?: string | null;
  reason?: string | null;
  remarks?: string | null;
  created_at?: string | null;
}

export const mapDBWorkerAssignmentToWorkerAssignment = (
  dbAsg: DBWorkerAssignment
): WorkerAssignment => ({
  id: dbAsg.id,
  workerId: dbAsg.worker_id,
  siteId: dbAsg.site_id,
  sectionId: dbAsg.section_id,
  fromDate: dbAsg.from_date,
  toDate: dbAsg.to_date || null,
  status: (dbAsg.status as 'active' | 'closed') || undefined,
  reason: dbAsg.reason || undefined,
  remarks: dbAsg.remarks || undefined,
});

export const mapWorkerAssignmentToDBWorkerAssignment = (
  asg: Partial<WorkerAssignment>
): Partial<DBWorkerAssignment> => {
  const dbAsg: Partial<DBWorkerAssignment> = {};
  if (asg.id !== undefined) dbAsg.id = asg.id;
  if (asg.workerId !== undefined) dbAsg.worker_id = asg.workerId;
  if (asg.siteId !== undefined) dbAsg.site_id = asg.siteId;
  if (asg.sectionId !== undefined) dbAsg.section_id = asg.sectionId;
  if (asg.fromDate !== undefined) dbAsg.from_date = asg.fromDate;
  if (asg.toDate !== undefined) dbAsg.to_date = asg.toDate;
  if (asg.status !== undefined) dbAsg.status = asg.status;
  if (asg.reason !== undefined) dbAsg.reason = asg.reason || null;
  if (asg.remarks !== undefined) dbAsg.remarks = asg.remarks || null;
  return dbAsg;
};

export const workerAssignmentsDataService = {
  /**
   * Fetch worker assignments (optionally filtered by workerId)
   */
  async listWorkerAssignments(
    workerId?: string
  ): Promise<{ data: WorkerAssignment[] | null; error: string | null }> {
    try {
      let query = supabase.from('worker_assignments').select('*').order('from_date', { ascending: false });
      if (workerId) {
        query = query.eq('worker_id', workerId);
      }
      const { data, error } = await query;
      if (error) {
        return { data: null, error: error.message };
      }
      const assignments = (data as DBWorkerAssignment[]).map(
        mapDBWorkerAssignmentToWorkerAssignment
      );
      return { data: assignments, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch worker assignments' };
    }
  },

  /**
   * Get a single assignment by ID
   */
  async getWorkerAssignment(
    id: string
  ): Promise<{ data: WorkerAssignment | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('worker_assignments')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        return { data: null, error: error.message };
      }
      return { data: mapDBWorkerAssignmentToWorkerAssignment(data as DBWorkerAssignment), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch assignment' };
    }
  },

  /**
   * Create a new worker assignment
   */
  async createWorkerAssignment(
    assignment: Omit<WorkerAssignment, 'id'> & { id?: string }
  ): Promise<{ data: WorkerAssignment | null; error: string | null }> {
    try {
      const dbPayload = mapWorkerAssignmentToDBWorkerAssignment(assignment);
      const { data, error } = await supabase
        .from('worker_assignments')
        .insert([dbPayload])
        .select()
        .single();
      if (error) {
        return { data: null, error: error.message };
      }
      return { data: mapDBWorkerAssignmentToWorkerAssignment(data as DBWorkerAssignment), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to create worker assignment' };
    }
  },

  /**
   * Update an existing worker assignment
   */
  async updateWorkerAssignment(
    id: string,
    updates: Partial<WorkerAssignment>
  ): Promise<{ data: WorkerAssignment | null; error: string | null }> {
    try {
      const dbPayload = mapWorkerAssignmentToDBWorkerAssignment(updates);
      const { data, error } = await supabase
        .from('worker_assignments')
        .update(dbPayload)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        return { data: null, error: error.message };
      }
      return { data: mapDBWorkerAssignmentToWorkerAssignment(data as DBWorkerAssignment), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to update worker assignment' };
    }
  },

  /**
   * Delete a worker assignment
   */
  async deleteWorkerAssignment(
    id: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.from('worker_assignments').delete().eq('id', id);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete worker assignment' };
    }
  },
};
