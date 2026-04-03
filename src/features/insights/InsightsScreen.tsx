import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import Slider from '@react-native-community/slider';
import LinearGradient from 'react-native-linear-gradient';
import {Card, Colors, Typography, Spacing, BorderRadius, EmptyState} from '../../ui';
import {useAppStore} from '../../store/useAppStore';
import {
  getMonthlySpentByCategory,
  getTotalSpentThisMonth,
} from '../../services/TransactionService';
import {simulateWhatIf, getMonthStartTimestamp} from '../../services/PacingEngine';
import {usersCollection, categoriesCollection} from '../../database';
import type Category from '../../database/models/Category';

interface CategorySlider {
  category: Category;
  total: number;
  reduction: number; // 0-100
}

const InsightsScreen: React.FC = () => {
  const {userId} = useAppStore();
  const [sliders, setSliders] = useState<CategorySlider[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [fixedExpenses, setFixedExpenses] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalSaved, setTotalSaved] = useState(0);
  const [newDailyAllowance, setNewDailyAllowance] = useState(0);
  const [topCategory, setTopCategory] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!userId) {return;}

    try {
      const user = await usersCollection.find(userId);
      setMonthlyIncome(user.monthlyIncome);
      setFixedExpenses(user.fixedExpenses);

      const monthStart = getMonthStartTimestamp();
      const spent = await getTotalSpentThisMonth(userId, monthStart);
      setTotalSpent(spent);

      const catTotals = await getMonthlySpentByCategory(userId, monthStart);
      const allCategories = await categoriesCollection.query().fetch();

      const sliderData: CategorySlider[] = [];
      let maxTotal = 0;
      let maxCat = '';

      for (const [catId, amount] of catTotals) {
        const cat = allCategories.find(c => c.id === catId);
        if (cat && amount > 0) {
          sliderData.push({category: cat, total: amount, reduction: 0});
          if (amount > maxTotal) {
            maxTotal = amount;
            maxCat = cat.name;
          }
        }
      }

      sliderData.sort((a, b) => b.total - a.total);
      setSliders(sliderData);
      setTopCategory(maxCat || null);
    } catch (err) {
      console.error('Insights load error:', err);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Recalculate what-if whenever sliders change
  useEffect(() => {
    let saved = 0;

    for (const s of sliders) {
      if (s.reduction > 0) {
        const result = simulateWhatIf({
          categoryTotal: s.total,
          reductionPercent: s.reduction,
          monthlyIncome,
          fixedExpenses,
          totalSpentThisMonth: totalSpent,
        });
        saved += result.savedAmount;
      }
    }

    setTotalSaved(saved);

    // Calculate new daily allowance with total savings
    const spendable = monthlyIncome - fixedExpenses;
    const remaining = spendable - totalSpent + saved;
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysLeft = Math.max(lastDay - today.getDate() + 1, 1);
    setNewDailyAllowance(Math.max(remaining / daysLeft, 0));
  }, [sliders, monthlyIncome, fixedExpenses, totalSpent]);

  const updateSlider = (index: number, value: number) => {
    setSliders(prev => {
      const updated = [...prev];
      updated[index] = {...updated[index], reduction: Math.round(value)};
      return updated;
    });
  };

  if (sliders.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <View style={styles.header}>
          <Text style={styles.title}>Insights</Text>
        </View>
        <EmptyState
          icon="🔮"
          title="No Data Yet"
          description="Start adding transactions to unlock powerful spending insights and the What-If Simulator."
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.header}>
        <Text style={styles.title}>Insights</Text>
        <Text style={styles.subtitle}>
          Discover patterns & simulate savings
        </Text>
      </View>

      {/* Quick stats */}
      <View style={styles.statsRow}>
        <Card elevated style={styles.statCard}>
          <Text style={styles.statEmoji}>🏆</Text>
          <Text style={styles.statLabel}>Top Category</Text>
          <Text style={styles.statValue}>{topCategory}</Text>
        </Card>
        <Card elevated style={styles.statCard}>
          <Text style={styles.statEmoji}>📊</Text>
          <Text style={styles.statLabel}>Categories</Text>
          <Text style={styles.statValue}>{sliders.length} active</Text>
        </Card>
      </View>

      {/* What-If Simulator */}
      <Card elevated title="🔮 What-If Simulator" style={styles.simulatorCard}>
        <Text style={styles.simulatorDesc}>
          Drag the sliders to see how reducing spending in each category would
          affect your daily allowance.
        </Text>

        {/* Savings preview */}
        <LinearGradient
          colors={[Colors.gradientIncome, Colors.gradientIncomeEnd]}
          style={styles.savingsBox}>
          <Text style={styles.savingsLabel}>Projected Savings</Text>
          <Text style={styles.savingsAmount}>
            ₹{totalSaved.toLocaleString('en-IN', {maximumFractionDigits: 0})}
          </Text>
          <Text style={styles.savingsDaily}>
            New daily allowance: ₹
            {newDailyAllowance.toLocaleString('en-IN', {maximumFractionDigits: 0})}
          </Text>
        </LinearGradient>

        {/* Category sliders */}
        {sliders.map((s, idx) => (
          <View key={s.category.id} style={styles.sliderItem}>
            <View style={styles.sliderHeader}>
              <View style={styles.sliderLeft}>
                <View
                  style={[
                    styles.catDot,
                    {backgroundColor: s.category.color},
                  ]}
                />
                <Text style={styles.sliderCatName}>{s.category.name}</Text>
              </View>
              <Text style={styles.sliderSpent}>
                ₹{s.total.toLocaleString('en-IN', {maximumFractionDigits: 0})}
              </Text>
            </View>

            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={100}
              step={5}
              value={s.reduction}
              onValueChange={val => updateSlider(idx, val)}
              minimumTrackTintColor={s.category.color}
              maximumTrackTintColor={Colors.borderLight}
              thumbTintColor={s.category.color}
            />

            <View style={styles.sliderFooter}>
              <Text style={styles.sliderPercent}>
                Reduce by {s.reduction}%
              </Text>
              {s.reduction > 0 && (
                <Text style={styles.sliderSave}>
                  Save ₹
                  {((s.total * s.reduction) / 100).toLocaleString('en-IN', {
                    maximumFractionDigits: 0,
                  })}
                </Text>
              )}
            </View>
          </View>
        ))}
      </Card>

      {/* Category breakdown */}
      <Card elevated title="Spending Breakdown" style={styles.breakdownCard}>
        {sliders.map(s => {
          const percentage =
            totalSpent > 0 ? (s.total / totalSpent) * 100 : 0;
          return (
            <View key={s.category.id} style={styles.breakdownItem}>
              <View style={styles.breakdownTop}>
                <View style={styles.breakdownLeft}>
                  <View
                    style={[
                      styles.catDot,
                      {backgroundColor: s.category.color},
                    ]}
                  />
                  <Text style={styles.breakdownName}>{s.category.name}</Text>
                </View>
                <Text style={styles.breakdownAmount}>
                  ₹{s.total.toLocaleString('en-IN', {maximumFractionDigits: 0})} ({percentage.toFixed(0)}%)
                </Text>
              </View>
              <View style={styles.breakdownBar}>
                <View
                  style={[
                    styles.breakdownFill,
                    {
                      width: `${percentage}%`,
                      backgroundColor: s.category.color,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </Card>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.h2,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: Spacing.xxs,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 28,
    marginBottom: Spacing.sm,
  },
  statLabel: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
  },
  statValue: {
    fontSize: Typography.body,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.xxs,
  },
  simulatorCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  simulatorDesc: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeightBody,
    marginBottom: Spacing.xl,
  },
  savingsBox: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  savingsLabel: {
    fontSize: Typography.caption,
    color: Colors.textOnPrimary,
    opacity: 0.9,
  },
  savingsAmount: {
    fontSize: Typography.h1,
    fontWeight: '800',
    color: Colors.textOnPrimary,
    marginTop: Spacing.xs,
    letterSpacing: -1,
  },
  savingsDaily: {
    fontSize: Typography.bodySmall,
    color: Colors.textOnPrimary,
    opacity: 0.9,
    marginTop: Spacing.sm,
  },
  sliderItem: {
    marginBottom: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingBottom: Spacing.lg,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sliderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  catDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  sliderCatName: {
    fontSize: Typography.bodySmall,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  sliderSpent: {
    fontSize: Typography.bodySmall,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderPercent: {
    fontSize: Typography.caption,
    color: Colors.textTertiary,
  },
  sliderSave: {
    fontSize: Typography.caption,
    fontWeight: '600',
    color: Colors.income,
  },
  breakdownCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  breakdownItem: {
    marginBottom: Spacing.lg,
  },
  breakdownTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  breakdownName: {
    fontSize: Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  breakdownAmount: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  breakdownBar: {
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.round,
    overflow: 'hidden',
  },
  breakdownFill: {
    height: '100%',
    borderRadius: BorderRadius.round,
  },
  bottomSpacer: {
    height: 100,
  },
});

export default InsightsScreen;
