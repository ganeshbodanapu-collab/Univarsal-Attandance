import { supabase } from '../supabase';
import type { Referrer, ReferrerType } from '../../types';

export interface DBReferrer {
  id: string;
  name: string;
  mobile: string;
  address: string | null;
  status: 'active' | 'inactive';
  type: ReferrerType;
  worker_id: string | null;
  designation: string | null;
  remarks: string | null;
  created_at?: string;
  updated_at?: string;
}

export function mapDBReferrerToReferrer(row: DBReferrer): Referrer {
  return {
    id: row.id,
    name: row.name,
    mobile: row.mobile,
    address: row.address || undefined,
    status: row.status,
    type: row.type || 'agency',
    workerId: row.worker_id || undefined,
    designation: row.designation || undefined,
    remarks: row.remarks || undefined,
  };
}

export function mapReferrerToDBReferrer(referrer: Referrer): Partial<DBReferrer> {
  return {
    id: referrer.id,
    name: referrer.name,
    mobile: referrer.mobile,
    address: referrer.address || null,
    status: referrer.status || 'active',
    type: referrer.type || 'agency',
    worker_id: referrer.workerId || null,
    designation: referrer.designation || null,
    remarks: referrer.remarks || null,
    updated_at: new Date().toISOString(),
  };
}

export const referrersDataService = {
  async listReferrers(): Promise<{ data: Referrer[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('referrers')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error('Error fetching referrers:', error);
        return { data: null, error };
      }

      return { data: (data as DBReferrer[]).map(mapDBReferrerToReferrer), error: null };
    } catch (err: any) {
      console.error('Exception fetching referrers:', err);
      return { data: null, error: err };
    }
  },

  async getReferrer(id: string): Promise<{ data: Referrer | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('referrers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error(`Error fetching referrer ${id}:`, error);
        return { data: null, error };
      }

      return { data: mapDBReferrerToReferrer(data as DBReferrer), error: null };
    } catch (err: any) {
      console.error(`Exception fetching referrer ${id}:`, err);
      return { data: null, error: err };
    }
  },

  async listReferrersByType(type: ReferrerType): Promise<{ data: Referrer[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('referrers')
        .select('*')
        .eq('type', type)
        .order('id', { ascending: true });

      if (error) {
        console.error(`Error fetching referrers by type ${type}:`, error);
        return { data: null, error };
      }

      return { data: (data as DBReferrer[]).map(mapDBReferrerToReferrer), error: null };
    } catch (err: any) {
      console.error(`Exception fetching referrers by type ${type}:`, err);
      return { data: null, error: err };
    }
  },

  async listActiveReferrers(): Promise<{ data: Referrer[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('referrers')
        .select('*')
        .eq('status', 'active')
        .order('id', { ascending: true });

      if (error) {
        console.error('Error fetching active referrers:', error);
        return { data: null, error };
      }

      return { data: (data as DBReferrer[]).map(mapDBReferrerToReferrer), error: null };
    } catch (err: any) {
      console.error('Exception fetching active referrers:', err);
      return { data: null, error: err };
    }
  },

  async createReferrer(referrer: Referrer): Promise<{ data: Referrer | null; error: Error | null }> {
    try {
      const dbRow = mapReferrerToDBReferrer(referrer);
      const { data, error } = await supabase
        .from('referrers')
        .insert(dbRow)
        .select()
        .single();

      if (error) {
        console.error('Error creating referrer:', error);
        return { data: null, error };
      }

      return { data: mapDBReferrerToReferrer(data as DBReferrer), error: null };
    } catch (err: any) {
      console.error('Exception creating referrer:', err);
      return { data: null, error: err };
    }
  },

  async updateReferrer(id: string, updates: Partial<Referrer>): Promise<{ data: Referrer | null; error: Error | null }> {
    try {
      const dbUpdates: Partial<DBReferrer> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.mobile !== undefined) dbUpdates.mobile = updates.mobile;
      if (updates.address !== undefined) dbUpdates.address = updates.address || null;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.workerId !== undefined) dbUpdates.worker_id = updates.workerId || null;
      if (updates.designation !== undefined) dbUpdates.designation = updates.designation || null;
      if (updates.remarks !== undefined) dbUpdates.remarks = updates.remarks || null;
      dbUpdates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('referrers')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Error updating referrer ${id}:`, error);
        return { data: null, error };
      }

      return { data: mapDBReferrerToReferrer(data as DBReferrer), error: null };
    } catch (err: any) {
      console.error(`Exception updating referrer ${id}:`, err);
      return { data: null, error: err };
    }
  },

  async deleteReferrer(id: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('referrers')
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`Error deleting referrer ${id}:`, error);
        return { error };
      }

      return { error: null };
    } catch (err: any) {
      console.error(`Exception deleting referrer ${id}:`, err);
      return { error: err };
    }
  },
};
