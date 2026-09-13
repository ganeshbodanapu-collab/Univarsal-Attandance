import type { AttendanceSettings } from '../../types';
import { defaultSettings } from './calculateFood';
import { multiplyMoney } from '../money';

export function calculateCommission(
  status: 'present' | 'halfDay' | 'absent' | 'leave' | 'holiday' | string,
  commissionRate: number,
  settings: AttendanceSettings = defaultSettings
): number {
  switch (status) {
    case 'present':
      return multiplyMoney(commissionRate, settings.commissionPresentMultiplier);
    case 'halfDay':
      return multiplyMoney(commissionRate, settings.commissionHalfDayMultiplier);
    default:
      return multiplyMoney(commissionRate, settings.commissionAbsentMultiplier);
  }
}

