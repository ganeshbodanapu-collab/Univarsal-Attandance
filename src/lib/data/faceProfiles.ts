import { supabase } from '../supabase';

export interface DBWorkerFaceProfile {
  id: string;
  worker_id: string;
  site_id?: string | null;
  section_id?: string | null;
  face_template: number[] | number[][];
  template_version?: string | null;
  is_active: boolean;
  enrolled_at?: string | null;
  enrolled_by?: string | null;
  updated_at?: string | null;
  last_verified_at?: string | null;
}

export interface WorkerFaceProfile {
  id: string;
  workerId: string;
  siteId?: string;
  sectionId?: string;
  faceTemplate: number[]; // 128-float descriptor vector
  templateVersion: string;
  isActive: boolean;
  enrolledAt: string;
  enrolledBy?: string;
}

export const faceProfilesDataService = {
  /**
   * Fetch active face profiles from Supabase worker_face_profiles table
   */
  async listActiveFaceProfiles(siteId?: string): Promise<{ data: WorkerFaceProfile[] | null; error: string | null }> {
    try {
      let query = supabase
        .from('worker_face_profiles')
        .select('*')
        .eq('is_active', true);

      if (siteId && siteId !== 'admin') {
        query = query.eq('site_id', siteId);
      }

      const { data, error } = await query;

      if (error) {
        // Fallback: If table is missing or restricted by RLS, load from workers table remarks
        console.warn('Supabase worker_face_profiles fetch notice:', error.message);
        return this.loadFallbackFromWorkers(siteId);
      }

      if (!data || data.length === 0) {
        return this.loadFallbackFromWorkers(siteId);
      }

      const profiles: WorkerFaceProfile[] = data.map((d: any) => {
        let template: number[] = [];
        if (Array.isArray(d.face_template)) {
          // If array of samples or single sample
          template = Array.isArray(d.face_template[0]) ? d.face_template[0] : d.face_template;
        }
        return {
          id: d.id,
          workerId: d.worker_id,
          siteId: d.site_id || undefined,
          sectionId: d.section_id || undefined,
          faceTemplate: template,
          templateVersion: d.template_version || 'v1.0',
          isActive: Boolean(d.is_active),
          enrolledAt: d.enrolled_at || new Date().toISOString(),
          enrolledBy: d.enrolled_by || undefined,
        };
      });

      return { data: profiles, error: null };
    } catch (err: any) {
      return this.loadFallbackFromWorkers(siteId);
    }
  },

  /**
   * Load enrolled face templates from workers table remarks metadata as fallback
   */
  async loadFallbackFromWorkers(siteId?: string): Promise<{ data: WorkerFaceProfile[] | null; error: string | null }> {
    try {
      let query = supabase
        .from('workers')
        .select('id, current_site_id, current_section_id, face_enrolled, remarks')
        .eq('face_enrolled', true);

      if (siteId && siteId !== 'admin') {
        query = query.eq('current_site_id', siteId);
      }

      const { data, error } = await query;
      if (error || !data) {
        return { data: [], error: error?.message || null };
      }

      const profiles: WorkerFaceProfile[] = [];
      for (const w of data) {
        if (w.remarks) {
          try {
            const parsed = JSON.parse(w.remarks);
            if (parsed && Array.isArray(parsed.face_template)) {
              profiles.push({
                id: `PROFILE-${w.id}`,
                workerId: w.id,
                siteId: w.current_site_id || undefined,
                sectionId: w.current_section_id || undefined,
                faceTemplate: parsed.face_template,
                templateVersion: 'v1.0',
                isActive: true,
                enrolledAt: parsed.enrolled_at || new Date().toISOString(),
              });
            }
          } catch {
            // ignore non-json remarks
          }
        }
      }

      return { data: profiles, error: null };
    } catch (err: any) {
      return { data: [], error: err.message || 'Failed fallback load' };
    }
  },

  /**
   * Save or Update a Worker's Face Profile template in Supabase
   */
  async saveFaceProfile(
    workerId: string,
    siteId: string | undefined,
    sectionId: string | undefined,
    descriptor: number[],
    enrolledBy?: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      // 1. Deactivate old active templates in worker_face_profiles
      try {
        await supabase
          .from('worker_face_profiles')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('worker_id', workerId);
      } catch {
        // ignore
      }

      // 2. Insert new active face profile record
      const { error: insertErr } = await supabase
        .from('worker_face_profiles')
        .insert([{
          worker_id: workerId,
          site_id: siteId || null,
          section_id: sectionId || null,
          face_template: descriptor,
          template_version: 'v1.0',
          is_active: true,
          enrolled_at: new Date().toISOString(),
          enrolled_by: enrolledBy || 'System Admin',
        }]);

      if (insertErr) {
        console.warn('Supabase worker_face_profiles insert notice:', insertErr.message);
      }

      // 3. Update workers table face_enrolled status & remarks JSON payload
      const remarksPayload = JSON.stringify({
        face_template: descriptor,
        enrolled_at: new Date().toISOString(),
        enrolled_by: enrolledBy || 'System Admin',
      });

      await supabase
        .from('workers')
        .update({
          face_enrolled: true,
          remarks: remarksPayload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workerId);

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to save face profile' };
    }
  },

  /**
   * Disable/Deactivate a Worker's Face Profile
   */
  async disableFaceProfile(workerId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      try {
        await supabase
          .from('worker_face_profiles')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('worker_id', workerId);
      } catch {
        // ignore
      }

      await supabase
        .from('workers')
        .update({
          face_enrolled: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workerId);

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to disable face profile' };
    }
  },
};
