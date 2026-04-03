import {Model} from '@nozbe/watermelondb';
import {field, readonly, date, relation, writer} from '@nozbe/watermelondb/decorators';
import type User from './User';

export default class DailyPacingLog extends Model {
  static table = 'daily_pacing_logs';

  static associations = {
    users: {type: 'belongs_to' as const, key: 'user_id'},
  };

  @field('date') dateKey!: number; // YYYYMMDD format
  @field('total_spent_today') totalSpentToday!: number;
  @field('total_spent_this_month') totalSpentThisMonth!: number;
  @field('remaining_budget') remainingBudget!: number;
  @field('daily_pacing_amount') dailyPacingAmount!: number;
  @field('days_remaining') daysRemaining!: number;
  @field('user_id') userId!: string;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('users', 'user_id') user!: User;

  @writer async updatePacing(data: {
    totalSpentToday: number;
    totalSpentThisMonth: number;
    remainingBudget: number;
    dailyPacingAmount: number;
    daysRemaining: number;
  }) {
    await this.update(log => {
      log.totalSpentToday = data.totalSpentToday;
      log.totalSpentThisMonth = data.totalSpentThisMonth;
      log.remainingBudget = data.remainingBudget;
      log.dailyPacingAmount = data.dailyPacingAmount;
      log.daysRemaining = data.daysRemaining;
    });
  }
}
