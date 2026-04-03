import {database, categoriesCollection} from './index';

export interface DefaultCategory {
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // Expense categories
  {name: 'Food & Dining', icon: 'restaurant', color: '#FF6B6B', type: 'expense'},
  {name: 'Transport', icon: 'directions-car', color: '#4ECDC4', type: 'expense'},
  {name: 'Shopping', icon: 'shopping-bag', color: '#45B7D1', type: 'expense'},
  {name: 'Entertainment', icon: 'movie', color: '#96CEB4', type: 'expense'},
  {name: 'Bills & Utilities', icon: 'receipt', color: '#FFEAA7', type: 'expense'},
  {name: 'Health', icon: 'local-hospital', color: '#DDA0DD', type: 'expense'},
  {name: 'Education', icon: 'school', color: '#98D8C8', type: 'expense'},
  {name: 'Groceries', icon: 'shopping-cart', color: '#F7DC6F', type: 'expense'},
  {name: 'Rent', icon: 'home', color: '#BB8FCE', type: 'expense'},
  {name: 'Coffee', icon: 'local-cafe', color: '#D2B48C', type: 'expense'},
  {name: 'Subscriptions', icon: 'subscriptions', color: '#87CEEB', type: 'expense'},
  {name: 'Other', icon: 'more-horiz', color: '#BDC3C7', type: 'expense'},
  // Income categories
  {name: 'Salary', icon: 'account-balance', color: '#2ECC71', type: 'income'},
  {name: 'Freelance', icon: 'work', color: '#27AE60', type: 'income'},
  {name: 'Investment', icon: 'trending-up', color: '#1ABC9C', type: 'income'},
  {name: 'Gift', icon: 'card-giftcard', color: '#E74C3C', type: 'income'},
  {name: 'Other Income', icon: 'attach-money', color: '#3498DB', type: 'income'},
];

export async function seedDefaultCategories(): Promise<void> {
  const existing = await categoriesCollection.query().fetchCount();
  if (existing > 0) {
    return; // Already seeded
  }

  await database.write(async () => {
    const batch = DEFAULT_CATEGORIES.map(cat =>
      categoriesCollection.prepareCreate(record => {
        record.name = cat.name;
        record.icon = cat.icon;
        record.color = cat.color;
        record.type = cat.type;
        record.isDefault = true;
        record.budgetLimit = null as unknown as number;
      }),
    );
    await database.batch(...batch);
  });
}
