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

export type TransactionType = 'expense' | 'income';
export type TransactionSource = 'manual' | 'sms' | 'notification' | 'ocr';

export default class Transaction extends Model {
  static table = 'transactions';

  static associations = {
    categories: {type: 'belongs_to' as const, key: 'category_id'},
    users: {type: 'belongs_to' as const, key: 'user_id'},
  };

  @field('amount') amount!: number;
  @text('merchant') merchant!: string;
  @text('notes') notes!: string | null;
  @date('date') date!: Date;
  @text('type') type!: TransactionType;
  @text('source') source!: TransactionSource;
  @text('category_id') categoryId!: string;
  @text('user_id') userId!: string;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('categories', 'category_id') category!: Category;
  @relation('users', 'user_id') user!: User;

  @writer async updateTransaction(updates: {
    amount?: number;
    merchant?: string;
    notes?: string;
    date?: Date;
    type?: TransactionType;
    categoryId?: string;
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
    });
  }

  @writer async markDeleted() {
    await super.markAsDeleted();
  }
}
