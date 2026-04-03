/**
 * PacingEngine — Pure deterministic math engine.
 *
 * Formula:
 *  dailyAllowance = (monthlyIncome - fixedExpenses - totalSpentThisMonth) / daysLeftInMonth
 *
 * The surplus/deficit from each day rolls over automatically because
 * totalSpentThisMonth is a running aggregate.
 */

export interface PacingResult {
  dailyAllowance: number;
  totalSpentThisMonth: number;
  totalSpentToday: number;
  remainingBudget: number;
  daysRemaining: number;
  monthlyIncome: number;
  fixedExpenses: number;
  spendableIncome: number; // income - fixed expenses
  percentSpent: number; // 0-100
  status: 'on_track' | 'warning' | 'over_budget';
  statusMessage: string;
}

/**
 * Get the number of days remaining in the current month (including today).
 */
export function getDaysRemainingInMonth(date: Date = new Date()): number {
  const year = date.getFullYear();
  const month = date.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const currentDay = date.getDate();
  return Math.max(lastDay - currentDay + 1, 1); // At least 1 to avoid division by zero
}

/**
 * Get the date key in YYYYMMDD format for database storage.
 */
export function getDateKey(date: Date = new Date()): number {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return year * 10000 + month * 100 + day;
}

/**
 * Get the start of the current month as a timestamp.
 */
export function getMonthStartTimestamp(date: Date = new Date()): number {
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

/**
 * Get start of today as a timestamp.
 */
export function getTodayStartTimestamp(date: Date = new Date()): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

/**
 * Core pacing calculation — pure function with no side effects.
 */
export function calculatePacing(params: {
  monthlyIncome: number;
  fixedExpenses: number;
  totalSpentThisMonth: number;
  totalSpentToday: number;
  date?: Date;
}): PacingResult {
  const {
    monthlyIncome,
    fixedExpenses,
    totalSpentThisMonth,
    totalSpentToday,
    date = new Date(),
  } = params;

  const spendableIncome = monthlyIncome - fixedExpenses;
  const remainingBudget = spendableIncome - totalSpentThisMonth;
  const daysRemaining = getDaysRemainingInMonth(date);
  const dailyAllowance = Math.max(remainingBudget / daysRemaining, 0);

  const percentSpent =
    spendableIncome > 0
      ? Math.min((totalSpentThisMonth / spendableIncome) * 100, 100)
      : 0;

  // Determine status
  let status: PacingResult['status'];
  let statusMessage: string;

  if (remainingBudget <= 0) {
    status = 'over_budget';
    statusMessage = 'You have exceeded your monthly budget';
  } else if (percentSpent > 80) {
    status = 'warning';
    statusMessage = `Only ₹${remainingBudget.toFixed(0)} left for ${daysRemaining} days`;
  } else {
    status = 'on_track';
    statusMessage = `₹${dailyAllowance.toFixed(0)} safe to spend today`;
  }

  return {
    dailyAllowance,
    totalSpentThisMonth,
    totalSpentToday,
    remainingBudget,
    daysRemaining,
    monthlyIncome,
    fixedExpenses,
    spendableIncome,
    percentSpent,
    status,
    statusMessage,
  };
}

/**
 * Simulate a what-if scenario: "If I reduce category X by Y%,
 * how much do I save?"
 */
export function simulateWhatIf(params: {
  categoryTotal: number;
  reductionPercent: number;
  monthlyIncome: number;
  fixedExpenses: number;
  totalSpentThisMonth: number;
}): {
  savedAmount: number;
  newDailyAllowance: number;
  newRemainingBudget: number;
} {
  const {
    categoryTotal,
    reductionPercent,
    monthlyIncome,
    fixedExpenses,
    totalSpentThisMonth,
  } = params;

  const savedAmount = categoryTotal * (reductionPercent / 100);
  const adjustedSpent = totalSpentThisMonth - savedAmount;
  const spendableIncome = monthlyIncome - fixedExpenses;
  const newRemainingBudget = spendableIncome - adjustedSpent;
  const daysRemaining = getDaysRemainingInMonth();
  const newDailyAllowance = Math.max(newRemainingBudget / daysRemaining, 0);

  return {
    savedAmount,
    newDailyAllowance,
    newRemainingBudget,
  };
}
