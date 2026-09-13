import { supabase } from '../supabase';
import type { Site } from '../../types';

export interface DBSite {
  id: string;
  code: string;
  name: string;
  location: string;
  in_charge: string;
  mobile: string;
  address?: string | null;
  status: 'active' | 'inactive';
  remarks?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export const mapDBSiteToSite = (dbSite: DBSite): Site => ({
  id: dbSite.id,
  code: dbSite.code,
  name: dbSite.name,
  location: dbSite.location,
  inCharge: dbSite.in_charge,
  mobile: dbSite.mobile,
  address: dbSite.address || undefined,
  status: dbSite.status,
  createdDate: dbSite.created_at ? dbSite.created_at.split('T')[0] : undefined,
  remarks: dbSite.remarks || undefined,
});

export const mapSiteToDBSite = (site: Partial<Site>): Partial<DBSite> => {
  const dbSite: Partial<DBSite> = {};
  if (site.id !== undefined) dbSite.id = site.id;
  if (site.code !== undefined) dbSite.code = site.code;
  if (site.name !== undefined) dbSite.name = site.name;
  if (site.location !== undefined) dbSite.location = site.location;
  if (site.inCharge !== undefined) dbSite.in_charge = site.inCharge;
  if (site.mobile !== undefined) dbSite.mobile = site.mobile;
  if (site.address !== undefined) dbSite.address = site.address;
  if (site.status !== undefined) dbSite.status = site.status;
  if (site.remarks !== undefined) dbSite.remarks = site.remarks;
  return dbSite;
};

export const sitesDataService = {
  /**
   * Fetch all Sites from Supabase public.sites table
   */
  async listSites(): Promise<{ data: Site[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        return { data: null, error: error.message };
      }

      const sites = (data as DBSite[]).map(mapDBSiteToSite);
      return { data: sites, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch sites' };
    }
  },

  /**
   * Fetch a single Site by ID from Supabase
   */
  async getSite(id: string): Promise<{ data: Site | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: mapDBSiteToSite(data as DBSite), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch site' };
    }
  },

  /**
   * Create a new Site in Supabase
   */
  async createSite(site: Omit<Site, 'id'> & { id?: string }): Promise<{ data: Site | null; error: string | null }> {
    try {
      const dbPayload = mapSiteToDBSite(site);
      const { data, error } = await supabase
        .from('sites')
        .insert([dbPayload])
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: mapDBSiteToSite(data as DBSite), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to create site' };
    }
  },

  /**
   * Update an existing Site in Supabase
   */
  async updateSite(id: string, updates: Partial<Site>): Promise<{ data: Site | null; error: string | null }> {
    try {
      const dbPayload = mapSiteToDBSite(updates);
      const { data, error } = await supabase
        .from('sites')
        .update(dbPayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: mapDBSiteToSite(data as DBSite), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to update site' };
    }
  },

  /**
   * Delete a Site from Supabase
   */
  async deleteSite(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('sites')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete site' };
    }
  },
};
