import { supabase } from '../supabase';
import type { Section } from '../../types';

export interface DBSection {
  id: string;
  code: string;
  name: string;
  site_id: string;
  in_charge: string;
  mobile: string;
  status: 'active' | 'inactive';
  remarks?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export const mapDBSectionToSection = (dbSection: DBSection): Section => ({
  id: dbSection.id,
  code: dbSection.code,
  name: dbSection.name,
  siteId: dbSection.site_id,
  inCharge: dbSection.in_charge,
  mobile: dbSection.mobile,
  status: dbSection.status,
  createdDate: dbSection.created_at ? dbSection.created_at.split('T')[0] : undefined,
  remarks: dbSection.remarks || undefined,
});

export const mapSectionToDBSection = (section: Partial<Section>): Partial<DBSection> => {
  const dbSection: Partial<DBSection> = {};
  if (section.id !== undefined) dbSection.id = section.id;
  if (section.code !== undefined) dbSection.code = section.code;
  if (section.name !== undefined) dbSection.name = section.name;
  if (section.siteId !== undefined) dbSection.site_id = section.siteId;
  if (section.inCharge !== undefined) dbSection.in_charge = section.inCharge;
  if (section.mobile !== undefined) dbSection.mobile = section.mobile;
  if (section.status !== undefined) dbSection.status = section.status;
  if (section.remarks !== undefined) dbSection.remarks = section.remarks;
  return dbSection;
};

export const sectionsDataService = {
  /**
   * Fetch all Sections from Supabase public.sections table
   */
  async listSections(): Promise<{ data: Section[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        return { data: null, error: error.message };
      }

      const sections = (data as DBSection[]).map(mapDBSectionToSection);
      return { data: sections, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch sections' };
    }
  },

  /**
   * Fetch Sections filtered by siteId
   */
  async listSectionsBySite(siteId: string): Promise<{ data: Section[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('site_id', siteId)
        .order('id', { ascending: true });

      if (error) {
        return { data: null, error: error.message };
      }

      const sections = (data as DBSection[]).map(mapDBSectionToSection);
      return { data: sections, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch sections for site' };
    }
  },

  /**
   * Fetch a single Section by ID from Supabase
   */
  async getSection(id: string): Promise<{ data: Section | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: mapDBSectionToSection(data as DBSection), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch section' };
    }
  },

  /**
   * Create a new Section in Supabase
   */
  async createSection(section: Omit<Section, 'id'> & { id?: string }): Promise<{ data: Section | null; error: string | null }> {
    try {
      const dbPayload = mapSectionToDBSection(section);
      const { data, error } = await supabase
        .from('sections')
        .insert([dbPayload])
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: mapDBSectionToSection(data as DBSection), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to create section' };
    }
  },

  /**
   * Update an existing Section in Supabase
   */
  async updateSection(id: string, updates: Partial<Section>): Promise<{ data: Section | null; error: string | null }> {
    try {
      const dbPayload = mapSectionToDBSection(updates);
      const { data, error } = await supabase
        .from('sections')
        .update(dbPayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: mapDBSectionToSection(data as DBSection), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to update section' };
    }
  },

  /**
   * Delete a Section from Supabase
   */
  async deleteSection(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('sections')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete section' };
    }
  },
};
