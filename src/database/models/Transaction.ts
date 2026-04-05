import {Model} from '@nozbe/watermelondb';
import {
  field,
  text,
  readonly,
  date,
  relation,
  writer,
} from '@nozbe/watermelondb/decorators';
import type Category from './Category';
import type User from './User';
import type Account from './Account';

export type TransactionType = 'expense' | 'income';
export type TransactionSource = 'manual' | 'sms' | 'notification' | 'ocr';

export default class Transaction extends Model {
  static table = 'transactions';

  static associations = {
    categories: {type: 'belongs_to' as const, key: 'category_id'},
    users: {type: 'belongs_to' as const, key: 'user_id'},
    accounts: {type: 'belongs_to' as const, key: 'account_id'},
  };

  @field('amount') amount!: number;
  @text('merchant') merchant!: string;
  @text('notes') notes!: string | null;
  @date('date') date!: Date;
  @text('type') type!: TransactionType;
  @text('source') source!: TransactionSource;
  @text('category_id') categoryId!: string;
  @text('user_id') userId!: string;
  @text('account_id') accountId!: string | null;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('categories', 'category_id') category!: Category;
  @relation('users', 'user_id') user!: User;
  @relation('accounts', 'account_id') account!: Account;

  @writer async updateTransaction(updates: {
    amount?: number;
    merchant?: string;
    notes?: string;
    date?: Date;
    type?: TransactionType;
    categoryId?: string;
    accountId?: string;
  }) {
    await this.update(txn => {
      if (updates.amount !== undefined) {
        txn.amount = updates.amount;
      }
      if (updates.merchant !== undefined) {
        txn.merchant = updates.merchant;
      }
      if (updates.notes !== undefined) {
        txn.notes = updates.notes;
      }
      if (updates.date !== undefined) {
        txn.date = updates.date;
      }
      if (updates.type !== undefined) {
        txn.type = updates.type;
      }
      if (updates.categoryId !== undefined) {
        txn.categoryId = updates.categoryId;
      }
      if (updates.accountId !== undefined) {
        txn.accountId = updates.accountId;
      }
    });
  }

  @writer async markDeleted() {
    await super.markAsDeleted();
  }
}
