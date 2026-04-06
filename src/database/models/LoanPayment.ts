import {Model} from '@nozbe/watermelondb';
import {
  field,
  text,
  readonly,
  date,
  relation,
  writer,
} from '@nozbe/watermelondb/decorators';
import type Loan from './Loan';

export default class LoanPayment extends Model {
  static table = 'loan_payments';

  static associations = {
    loans: {type: 'belongs_to' as const, key: 'loan_id'},
    accounts: {type: 'belongs_to' as const, key: 'account_id'},
  };

  @text('loan_id') loanId!: string;
  @field('amount') amount!: number;
  @date('date') date!: Date;
  @text('notes') notes!: string | null;
  @text('account_id') accountId!: string | null;
  @text('user_id') userId!: string;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('loans', 'loan_id') loan!: Loan;

  @writer async markDeleted() {
    await super.markAsDeleted();
  }
}
