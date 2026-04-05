import {database, categoriesCollection} from './index';

export interface DefaultCategory {
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // Expense categories (Debits)
  {name: 'Food', icon: 'restaurant', color: '#FFCFD9', type: 'expense'}, // Pastel Pink
  {name: 'Transport', icon: 'directions-car', color: '#AECDF8', type: 'expense'}, // Soft Blue
  {name: 'Housing & Utilities', icon: 'home', color: '#D8CAFF', type: 'expense'}, // Lavender
  {name: 'Shopping', icon: 'shopping-bag', color: '#D8F2A8', type: 'expense'}, // Lime Green
  {name: 'Entertainment', icon: 'movie', color: '#FFD27F', type: 'expense'}, // Mustard
  {name: 'Health', icon: 'local-hospital', color: '#C3E8E3', type: 'expense'}, // Soft Cyan
  {name: 'Investments', icon: 'trending-up', color: '#D6CEC3', type: 'expense'}, // Warm Gray
  {name: 'Other', icon: 'more-horiz', color: '#D6CEC3', type: 'expense'}, // Warm Gray

  // Income categories (Credits)
  {name: 'Salary', icon: 'account-balance', color: '#D8F2A8', type: 'income'}, // Lime Green
  {name: 'Investments', icon: 'trending-up', color: '#C3E8E3', type: 'income'}, // Soft Cyan
  {name: 'Gifts & Refunds', icon: 'card-giftcard', color: '#FFCFD9', type: 'income'}, // Pastel Pink
  {name: 'Other Income', icon: 'attach-money', color: '#FFD27F', type: 'income'}, // Mustard
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
