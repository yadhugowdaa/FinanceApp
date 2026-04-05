import {useEffect, useState, useCallback} from 'react';
import {useAppStore} from '../../store/useAppStore';
import {
  calculatePacing,
  getMonthStartTimestamp,
  getTodayStartTimestamp,
  type PacingResult,
} from '../../services/PacingEngine';
import {
  getTotalSpentThisMonth,
  getTotalSpentToday,
  getTotalIncome,
  getMonthlySpentByCategory,
} from '../../services/TransactionService';
import {usersCollection, categoriesCollection, transactionsCollection} from '../../database';
import {Q} from '@nozbe/watermelondb';

export type CategoryBreakdownItem = {
  name: string;
  value: number;
  color: string;
};

export type RecentTransactionItem = {
  id: string;
  merchant: string;
  amount: number;
  type: string;
  date: Date;
  categoryName: string;
  categoryColor: string;
};

export function useDashboardLogic() {
  const {userId} = useAppStore();
  const [pacing, setPacing] = useState<PacingResult | null>(null);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdownItem[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransactionItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');

  const loadData = useCallback(async () => {
    if (!userId) return;

    try {
      const user = await usersCollection.find(userId);
      setUserName(user.displayName || 'there');

      const monthStart = getMonthStartTimestamp();
      const todayStart = getTodayStartTimestamp();

      const [spentMonth, spentToday, income] = await Promise.all([
        getTotalSpentThisMonth(userId, monthStart),
        getTotalSpentToday(userId, todayStart),
        getTotalIncome(userId, monthStart),
      ]);

      setTotalIncome(income + user.monthlyIncome);
      setTotalExpenses(spentMonth + user.fixedExpenses);

      const pacingResult = calculatePacing({
        monthlyIncome: user.monthlyIncome,
        fixedExpenses: user.fixedExpenses,
        totalSpentThisMonth: spentMonth,
        totalSpentToday: spentToday,
      });
      setPacing(pacingResult);

      const catTotals = await getMonthlySpentByCategory(userId, monthStart);
      const allCategories = await categoriesCollection.query().fetch();
      const breakdown: CategoryBreakdownItem[] = [];

      for (const [catId, amount] of catTotals) {
        const cat = allCategories.find(c => c.id === catId);
        if (cat) {
          breakdown.push({name: cat.name, value: amount, color: cat.color});
        }
      }
      breakdown.sort((a, b) => b.value - a.value);
      setCategoryBreakdown(breakdown.slice(0, 6));

      const recent = await transactionsCollection
        .query(Q.where('user_id', userId), Q.sortBy('date', Q.desc))
        .fetch();

      const catMap = new Map(allCategories.map(c => [c.id, c]));

      setRecentTransactions(
        recent.map(t => {
          const cat = catMap.get(t.categoryId); // use t.categoryId instead of category_id if that's the relation key
          return {
            id: t.id,
            merchant: t.merchant,
            amount: t.amount,
            type: t.type,
            date: t.date,
            categoryName: cat?.name || 'Other',
            categoryColor: cat?.color || '#D6CEC3',
          };
        }),
      );
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!userId) return;

    const subscription = transactionsCollection
      .query(Q.where('user_id', userId))
      .observe()
      .subscribe(() => {
        loadData();
      });

    return () => subscription.unsubscribe();
  }, [userId, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const balance = totalIncome - totalExpenses;

  return {
    userId,
    userName,
    pacing,
    totalIncome,
    totalExpenses,
    balance,
    categoryBreakdown,
    recentTransactions,
    refreshing,
    onRefresh,
    loadData,
  };
}
