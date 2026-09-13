import { supabase } from '../supabase';
import type { AttendanceSettings } from '../../types';

export interface DBAttendanceSettings {
  id?: number;
  food_present_rate: number;
  food_half_day_rate: number;
  food_absent_rate: number;
  food_leave_rate: number;
  wage_present_multiplier: number;
  wage_half_day_multiplier: number;
  wage_absent_multiplier: number;
  commission_present_multiplier: number;
  commission_half_day_multiplier: number;
  commission_absent_multiplier: number;
  allow_daily_recovery: boolean;
  allow_monthly_recovery: boolean;
  allow_percentage_recovery: boolean;
  allow_manual_recovery: boolean;
  updated_at?: string | null;
}

export const mapDBAttendanceSettingsToSettings = (
  dbSettings: DBAttendanceSettings
): AttendanceSettings => ({
  foodPresentRate: Number(dbSettings.food_present_rate) || 1,
  foodHalfDayRate: Number(dbSettings.food_half_day_rate) || 0.5,
  foodAbsentRate: Number(dbSettings.food_absent_rate) || 0,
  foodLeaveRate: Number(dbSettings.food_leave_rate) || 0,
  wagePresentMultiplier: Number(dbSettings.wage_present_multiplier) || 1.0,
  wageHalfDayMultiplier: Number(dbSettings.wage_half_day_multiplier) || 0.5,
  wageAbsentMultiplier: Number(dbSettings.wage_absent_multiplier) || 0,
  commissionPresentMultiplier: Number(dbSettings.commission_present_multiplier) || 1.0,
  commissionHalfDayMultiplier: Number(dbSettings.commission_half_day_multiplier) || 0.5,
  commissionAbsentMultiplier: Number(dbSettings.commission_absent_multiplier) || 0,
  allowDailyRecovery: Boolean(dbSettings.allow_daily_recovery),
  allowMonthlyRecovery: Boolean(dbSettings.allow_monthly_recovery),
  allowPercentageRecovery: Boolean(dbSettings.allow_percentage_recovery),
  allowManualRecovery: Boolean(dbSettings.allow_manual_recovery),
});

export const mapSettingsToDBAttendanceSettings = (
  settings: Partial<AttendanceSettings>
): Partial<DBAttendanceSettings> => {
  const dbSettings: Partial<DBAttendanceSettings> = { id: 1 };
  if (settings.foodPresentRate !== undefined) dbSettings.food_present_rate = settings.foodPresentRate;
  if (settings.foodHalfDayRate !== undefined) dbSettings.food_half_day_rate = settings.foodHalfDayRate;
  if (settings.foodAbsentRate !== undefined) dbSettings.food_absent_rate = settings.foodAbsentRate;
  if (settings.foodLeaveRate !== undefined) dbSettings.food_leave_rate = settings.foodLeaveRate;
  if (settings.wagePresentMultiplier !== undefined) dbSettings.wage_present_multiplier = settings.wagePresentMultiplier;
  if (settings.wageHalfDayMultiplier !== undefined) dbSettings.wage_half_day_multiplier = settings.wageHalfDayMultiplier;
  if (settings.wageAbsentMultiplier !== undefined) dbSettings.wage_absent_multiplier = settings.wageAbsentMultiplier;
  if (settings.commissionPresentMultiplier !== undefined) dbSettings.commission_present_multiplier = settings.commissionPresentMultiplier;
  if (settings.commissionHalfDayMultiplier !== undefined) dbSettings.commission_half_day_multiplier = settings.commissionHalfDayMultiplier;
  if (settings.commissionAbsentMultiplier !== undefined) dbSettings.commission_absent_multiplier = settings.commissionAbsentMultiplier;
  if (settings.allowDailyRecovery !== undefined) dbSettings.allow_daily_recovery = settings.allowDailyRecovery;
  if (settings.allowMonthlyRecovery !== undefined) dbSettings.allow_monthly_recovery = settings.allowMonthlyRecovery;
  if (settings.allowPercentageRecovery !== undefined) dbSettings.allow_percentage_recovery = settings.allowPercentageRecovery;
  if (settings.allowManualRecovery !== undefined) dbSettings.allow_manual_recovery = settings.allowManualRecovery;
  return dbSettings;
};

export const attendanceSettingsDataService = {
  /**
   * Get global attendance settings singleton (id = 1)
   */
  async getAttendanceSettings(): Promise<{
    data: AttendanceSettings | null;
    error: string | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('attendance_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: mapDBAttendanceSettingsToSettings(data as DBAttendanceSettings), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch attendance settings' };
    }
  },

  /**
   * Update or insert global attendance settings (id = 1)
   */
  async updateAttendanceSettings(
    newSettings: Partial<AttendanceSettings>
  ): Promise<{ data: AttendanceSettings | null; error: string | null }> {
    try {
      const dbPayload = mapSettingsToDBAttendanceSettings(newSettings);
      const { data, error } = await supabase
        .from('attendance_settings')
        .upsert(dbPayload, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: mapDBAttendanceSettingsToSettings(data as DBAttendanceSettings), error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to update attendance settings' };
    }
  },
};
