import { supabase } from '../supabase';
import type { SectionFoodOrder, MealType, CanteenOrderStatus } from '../../types';

export interface DBSectionFoodOrder {
  id: string;
  section_id: string;
  site_id: string;
  date: string;
  meal_type: MealType;
  present_count: number;
  absent_count: number;
  outside_workers_count: number;
  others_count: number;
  total_ordered_qty: number;
  remarks: string | null;
  pushed_at: string | null;
  pushed_by: string | null;
  status: CanteenOrderStatus;
  canteen_remarks: string | null;
  packing_started_at: string | null;
  dispatched_at: string | null;
  dispatched_by: string | null;
  dispatched_qty: number | null;
  received_qty: number | null;
  received_at: string | null;
  received_by: string | null;
  receiving_remarks: string | null;
  shortage_qty: number | null;
  shortage_reason: string | null;
  re_send_requested_at: string | null;
  re_send_dispatched_at: string | null;
  remaining_received_qty: number | null;
  re_send_received_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export function mapDBSectionFoodOrderToDomain(row: DBSectionFoodOrder): SectionFoodOrder {
  return {
    id: row.id,
    sectionId: row.section_id,
    siteId: row.site_id,
    date: row.date,
    mealType: row.meal_type,
    presentCount: Number(row.present_count) || 0,
    absentCount: Number(row.absent_count) || 0,
    outsideWorkersCount: Number(row.outside_workers_count) || 0,
    othersCount: Number(row.others_count) || 0,
    totalOrderedQty: Number(row.total_ordered_qty) || 0,
    remarks: row.remarks || undefined,
    pushedAt: row.pushed_at || undefined,
    pushedBy: row.pushed_by || undefined,
    status: row.status,
    canteenRemarks: row.canteen_remarks || undefined,
    packingStartedAt: row.packing_started_at || undefined,
    dispatchedAt: row.dispatched_at || undefined,
    dispatchedBy: row.dispatched_by || undefined,
    dispatchedQty: row.dispatched_qty != null ? Number(row.dispatched_qty) : undefined,
    receivedQty: row.received_qty != null ? Number(row.received_qty) : undefined,
    receivedAt: row.received_at || undefined,
    receivedBy: row.received_by || undefined,
    receivingRemarks: row.receiving_remarks || undefined,
    shortageQty: row.shortage_qty != null ? Number(row.shortage_qty) : undefined,
    shortageReason: row.shortage_reason || undefined,
    reSendRequestedAt: row.re_send_requested_at || undefined,
    reSendDispatchedAt: row.re_send_dispatched_at || undefined,
    remainingReceivedQty: row.remaining_received_qty != null ? Number(row.remaining_received_qty) : undefined,
    reSendReceivedAt: row.re_send_received_at || undefined,
  };
}

export function mapDomainToDBSectionFoodOrder(order: SectionFoodOrder): Partial<DBSectionFoodOrder> {
  return {
    id: order.id,
    section_id: order.sectionId,
    site_id: order.siteId,
    date: order.date,
    meal_type: order.mealType,
    present_count: order.presentCount ?? 0,
    absent_count: order.absentCount ?? 0,
    outside_workers_count: order.outsideWorkersCount ?? 0,
    others_count: order.othersCount ?? 0,
    total_ordered_qty: order.totalOrderedQty ?? 0,
    remarks: order.remarks || null,
    pushed_at: order.pushedAt || null,
    pushed_by: order.pushedBy || null,
    status: order.status,
    canteen_remarks: order.canteenRemarks || null,
    packing_started_at: order.packingStartedAt || null,
    dispatched_at: order.dispatchedAt || null,
    dispatched_by: order.dispatchedBy || null,
    dispatched_qty: order.dispatchedQty ?? null,
    received_qty: order.receivedQty ?? null,
    received_at: order.receivedAt || null,
    received_by: order.receivedBy || null,
    receiving_remarks: order.receivingRemarks || null,
    shortage_qty: order.shortageQty ?? null,
    shortage_reason: order.shortageReason || null,
    re_send_requested_at: order.reSendRequestedAt || null,
    re_send_dispatched_at: order.reSendDispatchedAt || null,
    remaining_received_qty: order.remainingReceivedQty ?? null,
    re_send_received_at: order.reSendReceivedAt || null,
    updated_at: new Date().toISOString(),
  };
}

export function mapPartialDomainToDBSectionFoodOrder(updates: Partial<SectionFoodOrder>): Partial<DBSectionFoodOrder> {
  const dbUpdates: Partial<DBSectionFoodOrder> = {};
  if (updates.sectionId !== undefined) dbUpdates.section_id = updates.sectionId;
  if (updates.siteId !== undefined) dbUpdates.site_id = updates.siteId;
  if (updates.date !== undefined) dbUpdates.date = updates.date;
  if (updates.mealType !== undefined) dbUpdates.meal_type = updates.mealType;
  if (updates.presentCount !== undefined) dbUpdates.present_count = updates.presentCount;
  if (updates.absentCount !== undefined) dbUpdates.absent_count = updates.absentCount;
  if (updates.outsideWorkersCount !== undefined) dbUpdates.outside_workers_count = updates.outsideWorkersCount;
  if (updates.othersCount !== undefined) dbUpdates.others_count = updates.othersCount;
  if (updates.totalOrderedQty !== undefined) dbUpdates.total_ordered_qty = updates.totalOrderedQty;
  if (updates.remarks !== undefined) dbUpdates.remarks = updates.remarks || null;
  if (updates.pushedAt !== undefined) dbUpdates.pushed_at = updates.pushedAt || null;
  if (updates.pushedBy !== undefined) dbUpdates.pushed_by = updates.pushedBy || null;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.canteenRemarks !== undefined) dbUpdates.canteen_remarks = updates.canteenRemarks || null;
  if (updates.packingStartedAt !== undefined) dbUpdates.packing_started_at = updates.packingStartedAt || null;
  if (updates.dispatchedAt !== undefined) dbUpdates.dispatched_at = updates.dispatchedAt || null;
  if (updates.dispatchedBy !== undefined) dbUpdates.dispatched_by = updates.dispatchedBy || null;
  if (updates.dispatchedQty !== undefined) dbUpdates.dispatched_qty = updates.dispatchedQty ?? null;
  if (updates.receivedQty !== undefined) dbUpdates.received_qty = updates.receivedQty ?? null;
  if (updates.receivedAt !== undefined) dbUpdates.received_at = updates.receivedAt || null;
  if (updates.receivedBy !== undefined) dbUpdates.received_by = updates.receivedBy || null;
  if (updates.receivingRemarks !== undefined) dbUpdates.receiving_remarks = updates.receivingRemarks || null;
  if (updates.shortageQty !== undefined) dbUpdates.shortage_qty = updates.shortageQty ?? null;
  if (updates.shortageReason !== undefined) dbUpdates.shortage_reason = updates.shortageReason || null;
  if (updates.reSendRequestedAt !== undefined) dbUpdates.re_send_requested_at = updates.reSendRequestedAt || null;
  if (updates.reSendDispatchedAt !== undefined) dbUpdates.re_send_dispatched_at = updates.reSendDispatchedAt || null;
  if (updates.remainingReceivedQty !== undefined) dbUpdates.remaining_received_qty = updates.remainingReceivedQty ?? null;
  if (updates.reSendReceivedAt !== undefined) dbUpdates.re_send_received_at = updates.reSendReceivedAt || null;

  dbUpdates.updated_at = new Date().toISOString();
  return dbUpdates;
}

export const sectionFoodOrdersDataService = {
  async listSectionFoodOrders(): Promise<{ data: SectionFoodOrder[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('section_food_orders')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching section_food_orders:', error);
        return { data: null, error };
      }

      return { data: (data as DBSectionFoodOrder[]).map(mapDBSectionFoodOrderToDomain), error: null };
    } catch (err: any) {
      console.error('Exception fetching section_food_orders:', err);
      return { data: null, error: err };
    }
  },

  async getSectionFoodOrder(id: string): Promise<{ data: SectionFoodOrder | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('section_food_orders')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error(`Error fetching section_food_order ${id}:`, error);
        return { data: null, error };
      }

      return { data: mapDBSectionFoodOrderToDomain(data as DBSectionFoodOrder), error: null };
    } catch (err: any) {
      console.error(`Exception fetching section_food_order ${id}:`, err);
      return { data: null, error: err };
    }
  },

  async listSectionFoodOrdersBySite(siteId: string): Promise<{ data: SectionFoodOrder[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('section_food_orders')
        .select('*')
        .eq('site_id', siteId)
        .order('date', { ascending: false });

      if (error) {
        console.error(`Error fetching section_food_orders for site ${siteId}:`, error);
        return { data: null, error };
      }

      return { data: (data as DBSectionFoodOrder[]).map(mapDBSectionFoodOrderToDomain), error: null };
    } catch (err: any) {
      console.error(`Exception fetching section_food_orders for site ${siteId}:`, err);
      return { data: null, error: err };
    }
  },

  async listSectionFoodOrdersBySection(sectionId: string): Promise<{ data: SectionFoodOrder[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('section_food_orders')
        .select('*')
        .eq('section_id', sectionId)
        .order('date', { ascending: false });

      if (error) {
        console.error(`Error fetching section_food_orders for section ${sectionId}:`, error);
        return { data: null, error };
      }

      return { data: (data as DBSectionFoodOrder[]).map(mapDBSectionFoodOrderToDomain), error: null };
    } catch (err: any) {
      console.error(`Exception fetching section_food_orders for section ${sectionId}:`, err);
      return { data: null, error: err };
    }
  },

  async listSectionFoodOrdersByDate(date: string): Promise<{ data: SectionFoodOrder[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('section_food_orders')
        .select('*')
        .eq('date', date);

      if (error) {
        console.error(`Error fetching section_food_orders for date ${date}:`, error);
        return { data: null, error };
      }

      return { data: (data as DBSectionFoodOrder[]).map(mapDBSectionFoodOrderToDomain), error: null };
    } catch (err: any) {
      console.error(`Exception fetching section_food_orders for date ${date}:`, err);
      return { data: null, error: err };
    }
  },

  async createSectionFoodOrder(order: SectionFoodOrder): Promise<{ data: SectionFoodOrder | null; error: Error | null }> {
    try {
      const dbRow = mapDomainToDBSectionFoodOrder(order);
      const { data, error } = await supabase
        .from('section_food_orders')
        .insert(dbRow)
        .select()
        .single();

      if (error) {
        console.error('Error creating section_food_order:', error);
        return { data: null, error };
      }

      return { data: mapDBSectionFoodOrderToDomain(data as DBSectionFoodOrder), error: null };
    } catch (err: any) {
      console.error('Exception creating section_food_order:', err);
      return { data: null, error: err };
    }
  },

  async updateSectionFoodOrder(id: string, updates: Partial<SectionFoodOrder>): Promise<{ data: SectionFoodOrder | null; error: Error | null }> {
    try {
      const dbUpdates = mapPartialDomainToDBSectionFoodOrder(updates);
      const { data, error } = await supabase
        .from('section_food_orders')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Error updating section_food_order ${id}:`, error);
        return { data: null, error };
      }

      return { data: mapDBSectionFoodOrderToDomain(data as DBSectionFoodOrder), error: null };
    } catch (err: any) {
      console.error(`Exception updating section_food_order ${id}:`, err);
      return { data: null, error: err };
    }
  },

  async upsertSectionFoodOrder(order: SectionFoodOrder): Promise<{ data: SectionFoodOrder | null; error: Error | null }> {
    try {
      const dbRow = mapDomainToDBSectionFoodOrder(order);
      const { data, error } = await supabase
        .from('section_food_orders')
        .upsert(dbRow, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('Error upserting section_food_order:', error);
        return { data: null, error };
      }

      return { data: mapDBSectionFoodOrderToDomain(data as DBSectionFoodOrder), error: null };
    } catch (err: any) {
      console.error('Exception upserting section_food_order:', err);
      return { data: null, error: err };
    }
  },

  async deleteSectionFoodOrder(id: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('section_food_orders')
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`Error deleting section_food_order ${id}:`, error);
        return { error };
      }

      return { error: null };
    } catch (err: any) {
      console.error(`Exception deleting section_food_order ${id}:`, err);
      return { error: err };
    }
  },
};
