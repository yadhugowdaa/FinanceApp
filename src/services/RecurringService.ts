import {database, recurringTransactionsCollection, transactionsCollection} from '../database';
import {Q} from '@nozbe/watermelondb';

/**
 * Sweeps through all recurring transactions.
 * If the next_date is due (or past due), it auto-spawns standard transactions
 * into the ledger and advances the recurring schedule forward.
 */
export const processRecurringTransactions = async () => {
  try {
    const now = new Date();

    const rules = await recurringTransactionsCollection
      .query(
        Q.where('status', 'active'),
        Q.where('next_date', Q.lte(now.getTime()))
      )
      .fetch();

    if (rules.length === 0) return;

    await database.write(async () => {
      for (const rule of rules) {
        let currentDate = new Date(rule.nextDate);
        let spawnedCount = 0;

        // Advance through time, spawning transactions until catching up to current day
        while (currentDate.getTime() <= now.getTime() && spawnedCount < 100) {
          // 1. Create the Transaction
          await transactionsCollection.create(txn => {
            txn.amount = rule.amount;
            txn.merchant = rule.merchant;
            txn.type = rule.type as any || 'expense'; // Fallback for old records
            txn.source = 'recurring';
            txn.categoryId = rule.categoryId;
            txn.accountId = rule.accountId;
            txn.userId = rule.userId;
            txn.date = new Date(currentDate);
            txn.notes = `Auto-paid (${rule.frequency})`;
          });

          // 2. Advance the internal pointer
          if (rule.frequency === 'weekly') {
            currentDate.setDate(currentDate.getDate() + 7);
          } else if (rule.frequency === 'monthly') {
            currentDate.setMonth(currentDate.getMonth() + 1);
          } else if (rule.frequency === 'yearly') {
            currentDate.setFullYear(currentDate.getFullYear() + 1);
          }
          
          spawnedCount++;

          // 3. Mark rule as finished if it passed its end_date
          if (rule.endDate && currentDate.getTime() > rule.endDate.getTime()) {
            rule.status = 'paused';
            break;
          }
        }

        // Apply advanced timeline
        await rule.update(r => {
          r.nextDate = currentDate;
          if (r.status === 'paused') {
            // Already set via mutation but explicitly handled
          }
        });
      }
    });

  } catch (err) {
    console.error('Failed to process recurring transactions:', err);
  }
};
