/**
 * TransactionService — Database operations for transactions.
 * All DB logic lives here, NEVER in .tsx files.
 */

import {Q} from '@nozbe/watermelondb';
import {
  database,
  transactionsCollection,
  categoriesCollection,
} from '../database';
import type {TransactionSource, TransactionType} from '../database/models/Transaction';

export interface CreateTransactionInput {
  amount: number;
  merchant: string;
  notes?: string;
  date: Date;
  type: TransactionType;
  source: TransactionSource;
  categoryId: string;
  userId: string;
}

export async function createTransaction(
  input: CreateTransactionInput,
): Promise<void> {
  await database.write(async () => {
    await transactionsCollection.create(record => {
      record.amount = input.amount;
      record.merchant = input.merchant;
      record.notes = input.notes ?? null;
      record.date = input.date;
      record.type = input.type;
      record.source = input.source;
      record.categoryId = input.categoryId;
      record.userId = input.userId;
    });
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  await database.write(async () => {
    const txn = await transactionsCollection.find(id);
    await txn.markAsDeleted();
  });
}

export function observeTransactions(userId: string) {
  return transactionsCollection
    .query(Q.where('user_id', userId), Q.sortBy('date', Q.desc))
    .observe();
}

export function observeTransactionsByMonth(userId: string, monthStart: number) {
  return transactionsCollection
    .query(
      Q.where('user_id', userId),
      Q.where('date', Q.gte(monthStart)),
      Q.sortBy('date', Q.desc),
    )
    .observe();
}

export async function getMonthlySpentByCategory(
  userId: string,
  monthStart: number,
): Promise<Map<string, number>> {
  const transactions = await transactionsCollection
    .query(
      Q.where('user_id', userId),
      Q.where('type', 'expense'),
      Q.where('date', Q.gte(monthStart)),
    )
    .fetch();

  const categoryTotals = new Map<string, number>();
  for (const txn of transactions) {
    const current = categoryTotals.get(txn.categoryId) ?? 0;
    categoryTotals.set(txn.categoryId, current + txn.amount);
  }

  return categoryTotals;
}

export async function getTotalSpentThisMonth(
  userId: string,
  monthStart: number,
): Promise<number> {
  const transactions = await transactionsCollection
    .query(
      Q.where('user_id', userId),
      Q.where('type', 'expense'),
      Q.where('date', Q.gte(monthStart)),
    )
    .fetch();

  return transactions.reduce((sum, txn) => sum + txn.amount, 0);
}

export async function getTotalSpentToday(
  userId: string,
  todayStart: number,
): Promise<number> {
  const transactions = await transactionsCollection
    .query(
      Q.where('user_id', userId),
      Q.where('type', 'expense'),
      Q.where('date', Q.gte(todayStart)),
    )
    .fetch();

  return transactions.reduce((sum, txn) => sum + txn.amount, 0);
}

export async function getTotalIncome(
  userId: string,
  monthStart: number,
): Promise<number> {
  const transactions = await transactionsCollection
    .query(
      Q.where('user_id', userId),
      Q.where('type', 'income'),
      Q.where('date', Q.gte(monthStart)),
    )
    .fetch();

  return transactions.reduce((sum, txn) => sum + txn.amount, 0);
}

export async function searchTransactions(userId: string, query: string) {
  const lowerQuery = query.toLowerCase();
  const all = await transactionsCollection
    .query(Q.where('user_id', userId), Q.sortBy('date', Q.desc))
    .fetch();

  return all.filter(
    txn =>
      txn.merchant.toLowerCase().includes(lowerQuery) ||
      (txn.notes && txn.notes.toLowerCase().includes(lowerQuery)),
  );
}
