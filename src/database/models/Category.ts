import {Model, Q} from '@nozbe/watermelondb';
import {field, text, readonly, date, children} from '@nozbe/watermelondb/decorators';
import type Transaction from './Transaction';

export default class Category extends Model {
  static table = 'categories';

  static associations = {
    transactions: {type: 'has_many' as const, foreignKey: 'category_id'},
  };

  @text('name') name!: string;
  @text('icon') icon!: string;
  @text('color') color!: string;
  @text('type') type!: 'expense' | 'income';
  @field('budget_limit') budgetLimit!: number | null;
  @field('is_default') isDefault!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @children('transactions') transactions!: Transaction[];
}
