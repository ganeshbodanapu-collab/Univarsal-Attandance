import type { AttendanceSettings } from '../../types';
import { defaultSettings } from './calculateFood';

export function calculateCommission(
  status: 'present' | 'halfDay' | 'absent' | 'leave' | 'holiday' | string,
  commissionRate: number,
  settings: AttendanceSettings = defaultSettings
): number {
  switch (status) {
    case 'present':
      return commissionRate * settings.commissionPresentMultiplier;
    case 'halfDay':
      return commissionRate * settings.commissionHalfDayMultiplier;
    default:
      return commissionRate * settings.commissionAbsentMultiplier;
  }
}
