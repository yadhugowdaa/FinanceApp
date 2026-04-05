/**
 * TransactionService — Database operations for transactions.
 * All DB logic lives here, NEVER in .tsx files.
 */

import {Q} from '@nozbe/watermelondb';
import {
  database,
  transactionsCollection,
  categoriesCollection,
  accountsCollection,
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
  accountId?: string;
}


export async function createTransaction(
  input: CreateTransactionInput,
): Promise<void> {
  await database.write(async () => {
    await transactionsCollection.create((record: any) => {
      record.amount = input.amount;
      record.merchant = input.merchant;
      record.notes = input.notes ?? null;
      record.date = input.date;
      record.type = input.type;
      record.source = input.source;
      record.categoryId = input.categoryId;
      record.userId = input.userId;
      if (input.accountId) {
        record.accountId = input.accountId;
      }
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
  accountId?: string,
): Promise<Map<string, number>> {
  const conditions = [
    Q.where('user_id', userId),
    Q.where('type', 'expense'),
    Q.where('date', Q.gte(monthStart)),
  ];
  if (accountId) conditions.push(Q.where('account_id', accountId));

  const transactions = await transactionsCollection.query(...conditions).fetch();

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
  accountId?: string,
): Promise<number> {
  const conditions = [
    Q.where('user_id', userId),
    Q.where('type', 'expense'),
    Q.where('date', Q.gte(monthStart)),
  ];
  if (accountId) conditions.push(Q.where('account_id', accountId));

  const transactions = await transactionsCollection.query(...conditions).fetch();
  return transactions.reduce((sum, txn) => sum + txn.amount, 0);
}

export async function getTotalSpentToday(
  userId: string,
  todayStart: number,
  accountId?: string,
): Promise<number> {
  const conditions = [
    Q.where('user_id', userId),
    Q.where('type', 'expense'),
    Q.where('date', Q.gte(todayStart)),
  ];
  if (accountId) conditions.push(Q.where('account_id', accountId));

  const transactions = await transactionsCollection.query(...conditions).fetch();
  return transactions.reduce((sum, txn) => sum + txn.amount, 0);
}

export async function getTotalIncome(
  userId: string,
  monthStart: number,
  accountId?: string,
): Promise<number> {
  const conditions = [
    Q.where('user_id', userId),
    Q.where('type', 'income'),
    Q.where('date', Q.gte(monthStart)),
  ];
  if (accountId) conditions.push(Q.where('account_id', accountId));

  const transactions = await transactionsCollection.query(...conditions).fetch();
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

export async function exportTransactionsCSV(userId: string): Promise<string> {
  const transactions = await transactionsCollection
    .query(Q.where('user_id', userId), Q.sortBy('date', Q.desc))
    .fetch();

  const categories = await categoriesCollection.query().fetch();
  const catMap = new Map<string, string>();
  categories.forEach(c => catMap.set(c.id, c.name));

  const accounts = await accountsCollection.query().fetch();
  const accMap = new Map<string, string>();
  accounts.forEach(a => accMap.set(a.id, `${a.name}${a.accountNumber ? ` (${a.accountNumber})` : ''}`));

  const header = 'Date,Bank Account,Name,Category,Type,Amount,Notes';
  const rows = transactions.map(txn => {
    const date = new Date(txn.date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const account = `"${(txn.accountId && accMap.has(txn.accountId) ? accMap.get(txn.accountId) : 'Cash')}"`;
    const merchant = `"${(txn.merchant || '').replace(/"/g, '""')}"`;
    const category = catMap.get(txn.categoryId) || 'Uncategorized';
    const notes = `"${(txn.notes || '').replace(/"/g, '""')}"`;
    return `${date},${account},${merchant},${category},${txn.type},${txn.amount},${notes}`;
  });

  return [header, ...rows].join('\n');
}
