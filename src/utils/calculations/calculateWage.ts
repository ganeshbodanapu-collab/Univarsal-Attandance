import type { AttendanceSettings } from '../../types';
import { defaultSettings } from './calculateFood';
import { multiplyMoney } from '../money';

export function calculateDailyWage(
  status: 'present' | 'halfDay' | 'absent' | 'leave' | 'holiday' | string,
  dailyWage: number,
  settings: AttendanceSettings = defaultSettings
): number {
  switch (status) {
    case 'present':
      return multiplyMoney(dailyWage, settings.wagePresentMultiplier);
    case 'halfDay':
      return multiplyMoney(dailyWage, settings.wageHalfDayMultiplier);
    default:
      return multiplyMoney(dailyWage, settings.wageAbsentMultiplier);
  }
}

