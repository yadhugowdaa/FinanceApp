import {appSchema, tableSchema} from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 2,
  tables: [
    tableSchema({
      name: 'users',
      columns: [
        {name: 'phone_number', type: 'string'},
        {name: 'display_name', type: 'string', isOptional: true},
        {name: 'monthly_income', type: 'number', isOptional: true},
        {name: 'fixed_expenses', type: 'number', isOptional: true},
        {name: 'currency', type: 'string'},
        {name: 'is_onboarded', type: 'boolean'},
        {name: 'created_at', type: 'number'},
        {name: 'updated_at', type: 'number'},
      ],
    }),
    tableSchema({
      name: 'categories',
      columns: [
        {name: 'name', type: 'string'},
        {name: 'icon', type: 'string'},
        {name: 'color', type: 'string'},
        {name: 'type', type: 'string'},
        {name: 'budget_limit', type: 'number', isOptional: true},
        {name: 'is_default', type: 'boolean'},
        {name: 'created_at', type: 'number'},
        {name: 'updated_at', type: 'number'},
      ],
    }),
    tableSchema({
      name: 'accounts',
      columns: [
        {name: 'name', type: 'string'},
        {name: 'bank_code', type: 'string'},
        {name: 'account_number', type: 'string'}, // last 4 digits
        {name: 'color', type: 'string'},
        {name: 'icon', type: 'string'},
        {name: 'user_id', type: 'string', isIndexed: true},
        {name: 'is_default', type: 'boolean'},
        {name: 'created_at', type: 'number'},
        {name: 'updated_at', type: 'number'},
      ],
    }),
    tableSchema({
      name: 'transactions',
      columns: [
        {name: 'amount', type: 'number'},
        {name: 'merchant', type: 'string'},
        {name: 'notes', type: 'string', isOptional: true},
        {name: 'date', type: 'number'},
        {name: 'type', type: 'string'},
        {name: 'source', type: 'string'},
        {name: 'category_id', type: 'string', isIndexed: true},
        {name: 'user_id', type: 'string', isIndexed: true},
        {name: 'account_id', type: 'string', isOptional: true, isIndexed: true},
        {name: 'created_at', type: 'number'},
        {name: 'updated_at', type: 'number'},
      ],
    }),
    tableSchema({
      name: 'daily_pacing_logs',
      columns: [
        {name: 'date', type: 'number'},
        {name: 'total_spent_today', type: 'number'},
        {name: 'total_spent_this_month', type: 'number'},
        {name: 'remaining_budget', type: 'number'},
        {name: 'daily_pacing_amount', type: 'number'},
        {name: 'days_remaining', type: 'number'},
        {name: 'user_id', type: 'string', isIndexed: true},
        {name: 'created_at', type: 'number'},
        {name: 'updated_at', type: 'number'},
      ],
    }),
  ],
});
