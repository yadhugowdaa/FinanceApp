import {Model} from '@nozbe/watermelondb';
import {
  field,
  text,
  readonly,
  date,
  writer,
} from '@nozbe/watermelondb/decorators';

export default class Account extends Model {
  static table = 'accounts';

  static associations = {
    users: {type: 'belongs_to' as const, key: 'user_id'},
  };

  @text('name') name!: string;
  @text('bank_code') bankCode!: string;
  @text('account_number') accountNumber!: string; // last 4 digits or empty
  @text('color') color!: string;
  @text('icon') icon!: string;
  @text('user_id') userId!: string;
  @field('is_default') isDefault!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @writer async updateAccount(updates: {
    name?: string;
    accountNumber?: string;
  }) {
    await this.update(record => {
      if (updates.name !== undefined) {
        record.name = updates.name;
      }
      if (updates.accountNumber !== undefined) {
        record.accountNumber = updates.accountNumber;
      }
    });
  }

  @writer async deleteAccount() {
    await super.markAsDeleted();
  }
}
