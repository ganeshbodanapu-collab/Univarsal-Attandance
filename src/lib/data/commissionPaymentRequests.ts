import { supabase } from '../supabase';
import type { CommissionPaymentRequest } from '../../types';
import { roundMoney } from '../../utils/money';

export interface DBCommissionPaymentRequest {
  id: string;
  referrer_id: string;
  worker_id: string;
  amount: number;
  date: string;
  payout_mode: 'upi' | 'bankTransfer' | 'cash';
  upi_number: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  status: 'pending' | 'processing' | 'paid' | 'rejected';
  requested_at: string | null;
  processed_at: string | null;
  paid_at: string | null;
  remarks: string | null;
  created_at?: string;
}

export function mapDBCommissionRequestToDomain(row: DBCommissionPaymentRequest): CommissionPaymentRequest {
  return {
    id: row.id,
    referrerId: row.referrer_id,
    workerId: row.worker_id,
    amount: roundMoney(row.amount),
    date: row.date,
    payoutMode: row.payout_mode,
    upiNumber: row.upi_number || undefined,
    bankName: row.bank_name || undefined,
    bankAccountNumber: row.bank_account_number || undefined,
    bankIfsc: row.bank_ifsc || undefined,
    status: row.status,
    requestedAt: row.requested_at || new Date().toISOString(),
    processedAt: row.processed_at || undefined,
    paidAt: row.paid_at || undefined,
    remarks: row.remarks || undefined,
  };
}

export function mapDomainToDBCommissionRequest(req: CommissionPaymentRequest): Partial<DBCommissionPaymentRequest> {
  return {
    id: req.id,
    referrer_id: req.referrerId,
    worker_id: req.workerId,
    amount: roundMoney(req.amount ?? 0),
    date: req.date,
    payout_mode: req.payoutMode || 'cash',
    upi_number: req.upiNumber || null,
    bank_name: req.bankName || null,
    bank_account_number: req.bankAccountNumber || null,
    bank_ifsc: req.bankIfsc || null,
    status: req.status || 'pending',
    requested_at: req.requestedAt || new Date().toISOString(),
    processed_at: req.processedAt || null,
    paid_at: req.paidAt || null,
    remarks: req.remarks || null,
  };
}

export const commissionPaymentRequestsDataService = {
  async listCommissionPaymentRequests(): Promise<{ data: CommissionPaymentRequest[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('commission_payment_requests')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching commission_payment_requests:', error);
        return { data: null, error };
      }

      return { data: (data as DBCommissionPaymentRequest[]).map(mapDBCommissionRequestToDomain), error: null };
    } catch (err: any) {
      console.error('Exception fetching commission_payment_requests:', err);
      return { data: null, error: err };
    }
  },

  async getCommissionPaymentRequest(id: string): Promise<{ data: CommissionPaymentRequest | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('commission_payment_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error(`Error fetching commission_payment_request ${id}:`, error);
        return { data: null, error };
      }

      return { data: mapDBCommissionRequestToDomain(data as DBCommissionPaymentRequest), error: null };
    } catch (err: any) {
      console.error(`Exception fetching commission_payment_request ${id}:`, err);
      return { data: null, error: err };
    }
  },

  async listCommissionRequestsByReferrer(referrerId: string): Promise<{ data: CommissionPaymentRequest[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('commission_payment_requests')
        .select('*')
        .eq('referrer_id', referrerId)
        .order('date', { ascending: false });

      if (error) {
        console.error(`Error fetching commission_payment_requests for referrer ${referrerId}:`, error);
        return { data: null, error };
      }

      return { data: (data as DBCommissionPaymentRequest[]).map(mapDBCommissionRequestToDomain), error: null };
    } catch (err: any) {
      console.error(`Exception fetching commission_payment_requests for referrer ${referrerId}:`, err);
      return { data: null, error: err };
    }
  },

  async createCommissionPaymentRequest(req: CommissionPaymentRequest): Promise<{ data: CommissionPaymentRequest | null; error: Error | null }> {
    try {
      const dbRow = mapDomainToDBCommissionRequest(req);
      const { data, error } = await supabase
        .from('commission_payment_requests')
        .insert(dbRow)
        .select()
        .single();

      if (error) {
        console.error('Error creating commission_payment_request:', error);
        return { data: null, error };
      }

      return { data: mapDBCommissionRequestToDomain(data as DBCommissionPaymentRequest), error: null };
    } catch (err: any) {
      console.error('Exception creating commission_payment_request:', err);
      return { data: null, error: err };
    }
  },

  async createBulkCommissionPaymentRequests(reqs: CommissionPaymentRequest[]): Promise<{ data: CommissionPaymentRequest[] | null; error: Error | null }> {
    try {
      const dbRows = reqs.map(mapDomainToDBCommissionRequest);
      const { data, error } = await supabase
        .from('commission_payment_requests')
        .insert(dbRows)
        .select();

      if (error) {
        console.error('Error bulk creating commission_payment_requests:', error);
        return { data: null, error };
      }

      return { data: (data as DBCommissionPaymentRequest[]).map(mapDBCommissionRequestToDomain), error: null };
    } catch (err: any) {
      console.error('Exception bulk creating commission_payment_requests:', err);
      return { data: null, error: err };
    }
  },

  async updateCommissionPaymentRequest(id: string, updates: Partial<CommissionPaymentRequest>): Promise<{ data: CommissionPaymentRequest | null; error: Error | null }> {
    try {
      const dbUpdates: Partial<DBCommissionPaymentRequest> = {};
      if (updates.referrerId !== undefined) dbUpdates.referrer_id = updates.referrerId;
      if (updates.workerId !== undefined) dbUpdates.worker_id = updates.workerId;
      if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
      if (updates.date !== undefined) dbUpdates.date = updates.date;
      if (updates.payoutMode !== undefined) dbUpdates.payout_mode = updates.payoutMode;
      if (updates.upiNumber !== undefined) dbUpdates.upi_number = updates.upiNumber || null;
      if (updates.bankName !== undefined) dbUpdates.bank_name = updates.bankName || null;
      if (updates.bankAccountNumber !== undefined) dbUpdates.bank_account_number = updates.bankAccountNumber || null;
      if (updates.bankIfsc !== undefined) dbUpdates.bank_ifsc = updates.bankIfsc || null;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.processedAt !== undefined) dbUpdates.processed_at = updates.processedAt || null;
      if (updates.paidAt !== undefined) dbUpdates.paid_at = updates.paidAt || null;
      if (updates.remarks !== undefined) dbUpdates.remarks = updates.remarks || null;

      const { data, error } = await supabase
        .from('commission_payment_requests')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Error updating commission_payment_request ${id}:`, error);
        return { data: null, error };
      }

      return { data: mapDBCommissionRequestToDomain(data as DBCommissionPaymentRequest), error: null };
    } catch (err: any) {
      console.error(`Exception updating commission_payment_request ${id}:`, err);
      return { data: null, error: err };
    }
  },

  async deleteCommissionPaymentRequest(id: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('commission_payment_requests')
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`Error deleting commission_payment_request ${id}:`, error);
        return { error };
      }

      return { error: null };
    } catch (err: any) {
      console.error(`Exception deleting commission_payment_request ${id}:`, err);
      return { error: err };
    }
  },
};
