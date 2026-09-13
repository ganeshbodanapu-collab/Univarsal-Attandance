import { supabase } from './supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { mapDBAttendanceToAttendance, type DBAttendance } from './data/attendance';
import { mapDBSectionFoodOrderToDomain, type DBSectionFoodOrder } from './data/sectionFoodOrders';
import { mapDBAdvanceToAdvance, type DBAdvance } from './data/advances';
import { mapDBSiteMigrationRecordToRecord, type DBSiteMigrationRecord } from './data/siteMigrations';
import type { Attendance, SectionFoodOrder, Advance, SiteMigrationRecord } from '../types';

export type RealtimeTable =
  | 'attendance'
  | 'section_food_orders'
  | 'advances'
  | 'site_migrations';

export type RealtimeStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

export interface RealtimeHandlers {
  onAttendanceChange?: (
    event: 'INSERT' | 'UPDATE' | 'DELETE',
    record: Attendance,
    oldRecord?: Partial<Attendance>
  ) => void;
  onFoodOrderChange?: (
    event: 'INSERT' | 'UPDATE' | 'DELETE',
    record: SectionFoodOrder,
    oldRecord?: Partial<SectionFoodOrder>
  ) => void;
  onAdvanceChange?: (
    event: 'INSERT' | 'UPDATE' | 'DELETE',
    record: Advance,
    oldRecord?: Partial<Advance>
  ) => void;
  onSiteMigrationChange?: (
    event: 'INSERT' | 'UPDATE' | 'DELETE',
    record: SiteMigrationRecord,
    oldRecord?: Partial<SiteMigrationRecord>
  ) => void;
  onStatusChange?: (status: RealtimeStatus) => void;
}

let activeChannel: RealtimeChannel | null = null;
let currentStatus: RealtimeStatus = 'DISCONNECTED';

export const realtimeService = {
  /**
   * Returns current Realtime connection status.
   */
  getStatus(): RealtimeStatus {
    return currentStatus;
  },

  /**
   * Subscribes to realtime PostgreSQL changes for the 4 configured tables:
   * attendance, section_food_orders, advances, site_migrations.
   * Returns an unsubscribe cleanup function.
   */
  subscribeToRealtime(handlers: RealtimeHandlers): () => void {
    // If a channel already exists, unsubscribe first to prevent duplicate channels
    if (activeChannel) {
      this.unsubscribe();
    }

    currentStatus = 'CONNECTING';
    handlers.onStatusChange?.(currentStatus);

    const channel = supabase.channel('universal_attendance_realtime');

    // 1. Attendance Listener
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'attendance' },
      (payload: RealtimePostgresChangesPayload<DBAttendance>) => {
        const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
        if (eventType === 'DELETE' && payload.old) {
          const dummyRecord: Attendance = {
            id: (payload.old as DBAttendance).id || '',
            workerId: (payload.old as DBAttendance).worker_id || '',
            assignmentId: '',
            date: (payload.old as DBAttendance).date || '',
            status: 'absent',
            method: 'manual',
          };
          handlers.onAttendanceChange?.('DELETE', dummyRecord);
        } else if (payload.new && Object.keys(payload.new).length > 0) {
          const domainRecord = mapDBAttendanceToAttendance(payload.new as DBAttendance);
          const oldDomainRecord = payload.old && Object.keys(payload.old).length > 0
            ? mapDBAttendanceToAttendance(payload.old as DBAttendance)
            : undefined;
          handlers.onAttendanceChange?.(eventType, domainRecord, oldDomainRecord);
        }
      }
    );

    // 2. Section Food Orders Listener
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'section_food_orders' },
      (payload: RealtimePostgresChangesPayload<DBSectionFoodOrder>) => {
        const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
        if (eventType === 'DELETE' && payload.old) {
          const dummyRecord: SectionFoodOrder = {
            id: (payload.old as DBSectionFoodOrder).id || '',
            sectionId: (payload.old as DBSectionFoodOrder).section_id || '',
            siteId: (payload.old as DBSectionFoodOrder).site_id || '',
            date: (payload.old as DBSectionFoodOrder).date || '',
            mealType: 'morning',
            presentCount: 0,
            absentCount: 0,
            outsideWorkersCount: 0,
            othersCount: 0,
            totalOrderedQty: 0,
            status: 'draft',
          };
          handlers.onFoodOrderChange?.('DELETE', dummyRecord);
        } else if (payload.new && Object.keys(payload.new).length > 0) {
          const domainRecord = mapDBSectionFoodOrderToDomain(payload.new as DBSectionFoodOrder);
          const oldDomainRecord = payload.old && Object.keys(payload.old).length > 0
            ? mapDBSectionFoodOrderToDomain(payload.old as DBSectionFoodOrder)
            : undefined;
          handlers.onFoodOrderChange?.(eventType, domainRecord, oldDomainRecord);
        }
      }
    );

    // 3. Advances Listener
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'advances' },
      (payload: RealtimePostgresChangesPayload<DBAdvance>) => {
        const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
        if (eventType === 'DELETE' && payload.old) {
          const dummyRecord: Advance = {
            id: (payload.old as DBAdvance).id || '',
            workerId: (payload.old as DBAdvance).worker_id || '',
            date: (payload.old as DBAdvance).date || '',
            amount: 0,
            reason: '',
            recoveryMethod: 'perDay',
            status: 'pending',
          };
          handlers.onAdvanceChange?.('DELETE', dummyRecord);
        } else if (payload.new && Object.keys(payload.new).length > 0) {
          const domainRecord = mapDBAdvanceToAdvance(payload.new as DBAdvance);
          const oldDomainRecord = payload.old && Object.keys(payload.old).length > 0
            ? mapDBAdvanceToAdvance(payload.old as DBAdvance)
            : undefined;
          handlers.onAdvanceChange?.(eventType, domainRecord, oldDomainRecord);
        }
      }
    );

    // 4. Site Migrations Listener
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'site_migrations' },
      (payload: RealtimePostgresChangesPayload<DBSiteMigrationRecord>) => {
        const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
        if (eventType === 'DELETE' && payload.old) {
          const dummyRecord: SiteMigrationRecord = {
            id: (payload.old as DBSiteMigrationRecord).id || '',
            workerId: (payload.old as DBSiteMigrationRecord).worker_id || '',
            fromSiteId: (payload.old as DBSiteMigrationRecord).from_site_id || '',
            fromSectionId: (payload.old as DBSiteMigrationRecord).from_section_id || '',
            toSiteId: (payload.old as DBSiteMigrationRecord).to_site_id || '',
            toSectionId: (payload.old as DBSiteMigrationRecord).to_section_id || '',
            date: (payload.old as DBSiteMigrationRecord).date || '',
            migrationType: 'permanent',
            reason: '',
            approvedBy: '',
          };
          handlers.onSiteMigrationChange?.('DELETE', dummyRecord);
        } else if (payload.new && Object.keys(payload.new).length > 0) {
          const domainRecord = mapDBSiteMigrationRecordToRecord(payload.new as DBSiteMigrationRecord);
          const oldDomainRecord = payload.old && Object.keys(payload.old).length > 0
            ? mapDBSiteMigrationRecordToRecord(payload.old as DBSiteMigrationRecord)
            : undefined;
          handlers.onSiteMigrationChange?.(eventType, domainRecord, oldDomainRecord);
        }
      }
    );

    // Subscribe to channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        currentStatus = 'CONNECTED';
        handlers.onStatusChange?.(currentStatus);
      } else if (status === 'CLOSED' || status === 'TIMED_OUT') {
        currentStatus = 'DISCONNECTED';
        handlers.onStatusChange?.(currentStatus);
      } else if (status === 'CHANNEL_ERROR') {
        currentStatus = 'ERROR';
        handlers.onStatusChange?.(currentStatus);
      }
    });

    activeChannel = channel;

    // Return cleanup function
    return () => {
      this.unsubscribe();
    };
  },

  /**
   * Cleans up and unsubscribes the active Realtime channel.
   */
  unsubscribe() {
    if (activeChannel) {
      supabase.removeChannel(activeChannel).catch((err) => {
        console.warn('Notice removing realtime channel:', err);
      });
      activeChannel = null;
    }
    currentStatus = 'DISCONNECTED';
  },
};
