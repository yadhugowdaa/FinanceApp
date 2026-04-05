import {Database} from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import {schema} from './schema';
import {User, Category, Transaction, DailyPacingLog, Account} from './models';

const adapter = new SQLiteAdapter({
  schema,
  jsi: true,
  onSetUpError: error => {
    console.error('WatermelonDB setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [User, Category, Transaction, DailyPacingLog, Account],
});

export const usersCollection = database.get<User>('users');
export const categoriesCollection = database.get<Category>('categories');
export const transactionsCollection = database.get<Transaction>('transactions');
export const dailyPacingLogsCollection = database.get<DailyPacingLog>('daily_pacing_logs');
export const accountsCollection = database.get<Account>('accounts');
