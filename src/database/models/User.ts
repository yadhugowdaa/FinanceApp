import {Model} from '@nozbe/watermelondb';
import {field, text, readonly, date, writer} from '@nozbe/watermelondb/decorators';

export default class User extends Model {
  static table = 'users';

  @text('phone_number') phoneNumber!: string;
  @text('display_name') displayName!: string;
  @field('monthly_income') monthlyIncome!: number;
  @field('fixed_expenses') fixedExpenses!: number;
  @text('currency') currency!: string;
  @field('is_onboarded') isOnboarded!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @writer async updateIncome(income: number) {
    await this.update(user => {
      user.monthlyIncome = income;
    });
  }

  @writer async updateFixedExpenses(expenses: number) {
    await this.update(user => {
      user.fixedExpenses = expenses;
    });
  }

  @writer async completeOnboarding(
    name: string,
    income: number,
    expenses: number,
  ) {
    await this.update(user => {
      user.displayName = name;
      user.monthlyIncome = income;
      user.fixedExpenses = expenses;
      user.isOnboarded = true;
    });
  }
}
