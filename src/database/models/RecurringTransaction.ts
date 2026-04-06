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

export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly';
export type RecurringStatus = 'active' | 'paused';

export default class RecurringTransaction extends Model {
  static table = 'recurring_transactions';

  static associations = {
    categories: {type: 'belongs_to' as const, key: 'category_id'},
    users: {type: 'belongs_to' as const, key: 'user_id'},
    accounts: {type: 'belongs_to' as const, key: 'account_id'},
  };

  @field('amount') amount!: number;
  @text('merchant') merchant!: string;
  @text('type') type!: 'expense' | 'income';
  @text('frequency') frequency!: RecurringFrequency;
  @text('status') status!: RecurringStatus;
  
  @date('next_date') nextDate!: Date;
  @date('end_date') endDate!: Date | null;

  @text('category_id') categoryId!: string;
  @text('user_id') userId!: string;
  @text('account_id') accountId!: string;

  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('categories', 'category_id') category!: Category;
  @relation('users', 'user_id') user!: User;
  @relation('accounts', 'account_id') account!: Account;

  @writer async updateNextDate(newDate: Date) {
    await this.update(rec => {
      rec.nextDate = newDate;
    });
  }

  @writer async setStatus(newStatus: RecurringStatus) {
    await this.update(rec => {
      rec.status = newStatus;
    });
  }

  @writer async markDeleted() {
    await super.markAsDeleted();
  }
}
