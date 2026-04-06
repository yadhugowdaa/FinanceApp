import {Model} from '@nozbe/watermelondb';
import {
  field,
  text,
  readonly,
  date,
  relation,
  writer,
  children,
} from '@nozbe/watermelondb/decorators';
import type User from './User';

export type InterestType = 'simple' | 'compound';
export type LoanStatus = 'active' | 'closed';

export default class Loan extends Model {
  static table = 'loans';

  static associations = {
    users: {type: 'belongs_to' as const, key: 'user_id'},
    loan_payments: {type: 'has_many' as const, foreignKey: 'loan_id'},
  };

  @text('name') name!: string;
  @field('principal_amount') principalAmount!: number;
  @field('interest_rate') interestRate!: number;
  @text('interest_type') interestType!: InterestType;
  @field('tenure_months') tenureMonths!: number;
  @date('start_date') startDate!: Date;
  @text('lender_bank') lenderBank!: string | null;
  @text('status') status!: LoanStatus;
  @text('user_id') userId!: string;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('users', 'user_id') user!: User;
  @children('loan_payments') payments!: any;

  @writer async updateLoan(updates: Partial<{
    name: string;
    principalAmount: number;
    interestRate: number;
    interestType: InterestType;
    tenureMonths: number;
    status: LoanStatus;
  }>) {
    await this.update(loan => {
      if (updates.name !== undefined) loan.name = updates.name;
      if (updates.principalAmount !== undefined) loan.principalAmount = updates.principalAmount;
      if (updates.interestRate !== undefined) loan.interestRate = updates.interestRate;
      if (updates.interestType !== undefined) loan.interestType = updates.interestType;
      if (updates.tenureMonths !== undefined) loan.tenureMonths = updates.tenureMonths;
      if (updates.status !== undefined) loan.status = updates.status;
    });
  }

  @writer async markDeleted() {
    await super.markAsDeleted();
  }
}
