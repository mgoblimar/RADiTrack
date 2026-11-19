/**
 * Utility mathematical helper functions for analytics and metrics.
 *
 * Deliberately NOT a "use server" module: every export of such a module becomes
 * a public endpoint, and these helpers have no sign-in check.
 */

// Calculates the median of an array of numbers
export async function calculatedMedian(numbers: number[]): Promise<number> {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
}
