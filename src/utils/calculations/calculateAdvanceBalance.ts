import type { Advance, Recovery, AttendanceSettings } from '../../types';
import { calculateDailyWage } from './calculateWage';
import { roundMoney, subtractMoney, multiplyMoney } from '../money';

/**
 * Calculates the total outstanding advance balance for a worker.
 * Sum(advances.amount) - Sum(recoveries.amount)
 */
export function calculateAdvanceBalance(
  advances: Advance[],
  recoveries: Recovery[]
): number {
  const totalAdvance = roundMoney(advances.reduce((sum, adv) => sum + (adv.amount || 0), 0));
  const totalRecovery = roundMoney(recoveries.reduce((sum, rec) => sum + (rec.amount || 0), 0));
  const balance = subtractMoney(totalAdvance, totalRecovery);
  return Math.max(0, balance);
}

/**
 * Calculates the automatic recovery amount for a single day's attendance.
 */
export function calculateDailyRecovery(
  advance: Advance,
  attendanceStatus: 'present' | 'halfDay' | 'absent' | 'leave' | 'holiday' | string,
  dailyWage: number,
  settings: AttendanceSettings
): number {
  if (advance.status === 'closed') return 0;

  switch (advance.recoveryMethod) {
    case 'perDay': {
      // Receptors: present or halfDay (by default, recovers full amount even on halfDay)
      if (attendanceStatus === 'present' || attendanceStatus === 'halfDay') {
        return roundMoney(advance.dailyRecoveryAmount || 0);
      }
      return 0;
    }
    case 'percentage': {
      if (attendanceStatus === 'present' || attendanceStatus === 'halfDay') {
        const calculatedWage = calculateDailyWage(attendanceStatus, dailyWage, settings);
        const percentage = advance.recoveryPercentage || 0;
        return multiplyMoney(percentage / 100, calculatedWage);
      }
      return 0;
    }
    case 'fixedMonthly':
    case 'manual':
    default:
      return 0;
  }
}

