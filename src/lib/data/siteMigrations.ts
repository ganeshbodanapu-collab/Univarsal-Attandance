import { supabase } from '../supabase';
import type { SiteMigrationRecord } from '../../types';

export interface DBSiteMigrationRecord {
  id: string;
  worker_id: string;
  from_site_id: string;
  from_section_id: string;
  to_site_id: string;
  to_section_id: string;
  date: string;
  migration_type: 'temporary' | 'permanent';
  reason: string;
  approved_by: string;
  remarks?: string | null;
  created_at?: string | null;
}

export const mapDBSiteMigrationRecordToRecord = (
  dbMig: DBSiteMigrationRecord
): SiteMigrationRecord => ({
  id: dbMig.id,
  workerId: dbMig.worker_id,
  fromSiteId: dbMig.from_site_id,
  fromSectionId: dbMig.from_section_id,
  toSiteId: dbMig.to_site_id,
  toSectionId: dbMig.to_section_id,
  date: dbMig.date,
  migrationType: dbMig.migration_type,
  reason: dbMig.reason,
  approvedBy: dbMig.approved_by,
  remarks: dbMig.remarks || undefined,
  createdAt: dbMig.created_at || undefined,
});

export const mapRecordToDBSiteMigrationRecord = (
  mig: Partial<SiteMigrationRecord>
): Partial<DBSiteMigrationRecord> => {
  const dbMig: Partial<DBSiteMigrationRecord> = {};
  if (mig.id !== undefined) dbMig.id = mig.id;
  if (mig.workerId !== undefined) dbMig.worker_id = mig.workerId;
  if (mig.fromSiteId !== undefined) dbMig.from_site_id = mig.fromSiteId;
  if (mig.fromSectionId !== undefined) dbMig.from_section_id = mig.fromSectionId;
  if (mig.toSiteId !== undefined) dbMig.to_site_id = mig.toSiteId;
  if (mig.toSectionId !== undefined) dbMig.to_section_id = mig.toSectionId;
  if (mig.date !== undefined) dbMig.date = mig.date;
  if (mig.migrationType !== undefined) dbMig.migration_type = mig.migrationType;
  if (mig.reason !== undefined) dbMig.reason = mig.reason;
  if (mig.approvedBy !== undefined) dbMig.approved_by = mig.approvedBy;
  if (mig.remarks !== undefined) dbMig.remarks = mig.remarks || null;
  return dbMig;
};

export const siteMigrationsDataService = {
  /**
   * Fetch Site Migrations (optionally filtered by workerId)
   */
  async listSiteMigrations(
    workerId?: string
  ): Promise<{ data: SiteMigrationRecord[] | null; error: string | null }> {
    try {
      let query = supabase.from('site_migrations').select('*').order('date', { ascending: false });
      if (workerId) {
        query = query.eq('worker_id', workerId);
      }
      const { data, error } = await query;
      if (error) {
        return { data: null, error: error.message };
      }
      const migrations = (data as DBSiteMigrationRecord[]).map(
        mapDBSiteMigrationRecordToRecord
      );
      return { data: migrations, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch site migrations' };
    }
  },

  /**
   * Create a Site Migration record
   */
  async createSiteMigration(
    record: Omit<SiteMigrationRecord, 'id' | 'createdAt'> & { id?: string }
  ): Promise<{ data: SiteMigrationRecord | null; error: string | null }> {
    try {
      const dbPayload = mapRecordToDBSiteMigrationRecord(record);
      const { data, error } = await supabase
        .from('site_migrations')
        .insert([dbPayload])
        .select()
        .single();
      if (error) {
        return { data: null, error: error.message };
      }
      return { data: mapDBSiteMigrationRecordToRecord(data as DBSiteMigrationRecord), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to create site migration' };
    }
  },

  /**
   * Delete a Site Migration record
   */
  async deleteSiteMigration(
    id: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.from('site_migrations').delete().eq('id', id);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete site migration' };
    }
  },
};
