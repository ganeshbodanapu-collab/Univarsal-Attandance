import type { AttendanceSettings } from '../../types';

export const defaultSettings: AttendanceSettings = {
  foodPresentRate: 1.0,
  foodHalfDayRate: 0.5,
  foodAbsentRate: 0.0,
  foodLeaveRate: 0.0,
  wagePresentMultiplier: 1.0,
  wageHalfDayMultiplier: 0.5,
  wageAbsentMultiplier: 0.0,
  commissionPresentMultiplier: 1.0,
  commissionHalfDayMultiplier: 0.5,
  commissionAbsentMultiplier: 0.0,
  allowDailyRecovery: true,
  allowMonthlyRecovery: true,
  allowPercentageRecovery: true,
  allowManualRecovery: true,
};

export function calculateFood(
  status: 'present' | 'halfDay' | 'absent' | 'leave' | 'holiday' | string,
  settings: AttendanceSettings = defaultSettings
): number {
  switch (status) {
    case 'present':
      return settings.foodPresentRate;
    case 'halfDay':
      return settings.foodHalfDayRate;
    case 'leave':
      return settings.foodLeaveRate;
    default:
      return settings.foodAbsentRate;
  }
}
