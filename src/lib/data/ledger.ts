import { supabase } from '../supabase';
import type { LedgerEntry } from '../../types';
import { roundMoney } from '../../utils/money';

export interface DBLedgerEntry {
  id: string;
  worker_id: string;
  date: string;
  type: 'advance' | 'recovery' | 'deduction';
  amount: number;
  running_balance: number;
  remarks?: string | null;
  created_at?: string | null;
}

export const mapDBLedgerEntryToLedgerEntry = (
  dbLedger: DBLedgerEntry
): LedgerEntry => ({
  id: dbLedger.id,
  workerId: dbLedger.worker_id,
  date: dbLedger.date,
  type: dbLedger.type,
  amount: roundMoney(dbLedger.amount),
  runningBalance: roundMoney(dbLedger.running_balance),
  remarks: dbLedger.remarks || undefined,
});

export const mapLedgerEntryToDBLedgerEntry = (
  entry: Partial<LedgerEntry>
): Partial<DBLedgerEntry> => {
  const dbLedger: Partial<DBLedgerEntry> = {};
  if (entry.id !== undefined) dbLedger.id = entry.id;
  if (entry.workerId !== undefined) dbLedger.worker_id = entry.workerId;
  if (entry.date !== undefined) dbLedger.date = entry.date;
  if (entry.type !== undefined) dbLedger.type = entry.type;
  if (entry.amount !== undefined) dbLedger.amount = roundMoney(entry.amount);
  if (entry.runningBalance !== undefined) dbLedger.running_balance = roundMoney(entry.runningBalance);
  if (entry.remarks !== undefined) dbLedger.remarks = entry.remarks || null;
  return dbLedger;
};

export const ledgerDataService = {
  /**
   * List all ledger entries from Supabase
   */
  async listLedgerEntries(): Promise<{ data: LedgerEntry[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('ledger_entries')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      const entries = (data as DBLedgerEntry[]).map(mapDBLedgerEntryToLedgerEntry);
      return { data: entries, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch ledger entries' };
    }
  },

  /**
   * Get ledger entry by ID
   */
  async getLedgerEntry(id: string): Promise<{ data: LedgerEntry | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: mapDBLedgerEntryToLedgerEntry(data as DBLedgerEntry), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch ledger entry' };
    }
  },

  /**
   * List ledger entries for a worker
   */
  async listLedgerByWorker(
    workerId: string
  ): Promise<{ data: LedgerEntry[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('worker_id', workerId)
        .order('date', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      const entries = (data as DBLedgerEntry[]).map(mapDBLedgerEntryToLedgerEntry);
      return { data: entries, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch worker ledger' };
    }
  },

  /**
   * Create ledger entry
   */
  async createLedgerEntry(
    entry: Omit<LedgerEntry, 'id'> & { id?: string }
  ): Promise<{ data: LedgerEntry | null; error: string | null }> {
    try {
      const dbPayload = mapLedgerEntryToDBLedgerEntry(entry);
      const { data, error } = await supabase
        .from('ledger_entries')
        .insert([dbPayload])
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: mapDBLedgerEntryToLedgerEntry(data as DBLedgerEntry), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to create ledger entry' };
    }
  },
};
