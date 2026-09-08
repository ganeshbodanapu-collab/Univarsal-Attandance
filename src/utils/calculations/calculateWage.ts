import type { AttendanceSettings } from '../../types';
import { defaultSettings } from './calculateFood';

export function calculateDailyWage(
  status: 'present' | 'halfDay' | 'absent' | 'leave' | 'holiday' | string,
  dailyWage: number,
  settings: AttendanceSettings = defaultSettings
): number {
  switch (status) {
    case 'present':
      return dailyWage * settings.wagePresentMultiplier;
    case 'halfDay':
      return dailyWage * settings.wageHalfDayMultiplier;
    default:
      return dailyWage * settings.wageAbsentMultiplier;
  }
}
