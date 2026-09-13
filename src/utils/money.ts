/**
 * Financial Currency & Precision Utility
 * 
 * Provides safe, 2-decimal place IEEE-754 floating-point rounding
 * and arithmetic helpers for client-side financial calculations.
 */

/**
 * Normalizes any value (number, string, null, undefined) to a valid finite number.
 * Returns 0 for NaN, null, undefined, or Infinity.
 */
export const normalizeMoney = (value: number | string | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (!Number.isFinite(num) || Number.isNaN(num)) {
    return 0;
  }
  return num;
};

/**
 * Rounds a monetary number to 2 decimal places using standard half-up rounding.
 * Safely handles invalid numbers and precision artifacts.
 */
export const roundMoney = (value: number | string | null | undefined): number => {
  const num = normalizeMoney(value);
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

/**
 * Adds two monetary amounts with 2-decimal precision.
 */
export const addMoney = (a: number | string | null | undefined, b: number | string | null | undefined): number => {
  const normA = normalizeMoney(a);
  const normB = normalizeMoney(b);
  return roundMoney(normA + normB);
};

/**
 * Subtracts monetary amount b from a with 2-decimal precision.
 */
export const subtractMoney = (a: number | string | null | undefined, b: number | string | null | undefined): number => {
  const normA = normalizeMoney(a);
  const normB = normalizeMoney(b);
  return roundMoney(normA - normB);
};

/**
 * Multiplies a monetary amount by a factor (e.g., wage * multiplier) with 2-decimal precision.
 */
export const multiplyMoney = (a: number | string | null | undefined, b: number | string | null | undefined): number => {
  const normA = normalizeMoney(a);
  const normB = normalizeMoney(b);
  return roundMoney(normA * normB);
};

/**
 * Divides a monetary amount by a divisor with 2-decimal precision.
 */
export const divideMoney = (a: number | string | null | undefined, divisor: number | string | null | undefined): number => {
  const normA = normalizeMoney(a);
  const normDiv = normalizeMoney(divisor);
  if (normDiv === 0) return 0;
  return roundMoney(normA / normDiv);
};
