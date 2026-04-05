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
import {Colors, Typography, Spacing, BorderRadius, EmptyState, LiquidGlass} from '../../ui';
import Icon from 'react-native-vector-icons/Feather';
import Svg, {Path, Defs, LinearGradient as SvgLinearGradient, Stop} from 'react-native-svg';
import Animated, {FadeInDown} from 'react-native-reanimated';
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

const DominoVisualizer = ({ monthlySavings, color, currencySymbol }: { monthlySavings: number, color: string, currencySymbol: string }) => {
  if (monthlySavings <= 0) return null;

  const r = 0.01 / 12;
  const n = 120; // 10 years
  const futureValue = monthlySavings * ((Math.pow(1 + r, n) - 1) / r);

  const svgWidth = 300; 
  const svgHeight = 60;
  const pathData = `M 0,${svgHeight} C ${svgWidth * 0.4},${svgHeight} ${svgWidth * 0.7},${svgHeight * 0.5} ${svgWidth},10 L ${svgWidth},${svgHeight} Z`;
  const strokePath = `M 0,${svgHeight} C ${svgWidth * 0.4},${svgHeight} ${svgWidth * 0.7},${svgHeight * 0.5} ${svgWidth},10`;

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.dominoContainer}>
      <View style={styles.dominoTextWrap}>
        <Text style={styles.dominoTitle}>The Domino Effect</Text>
        <Text style={styles.dominoSubtitle}>Invested at 1% for 10 years</Text>
        <Text style={[styles.dominoValue, { color }]}>
          {currencySymbol}{futureValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </Text>
      </View>
      <View style={styles.dominoChart}>
         <Svg width="100%" height={svgHeight} preserveAspectRatio="none" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
            <Defs>
              <SvgLinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color} stopOpacity="0.4" />
                <Stop offset="1" stopColor={color} stopOpacity="0.0" />
              </SvgLinearGradient>
            </Defs>
            <Path d={pathData} fill="url(#grad)" />
            <Path d={strokePath} fill="none" stroke={color} strokeWidth="2" />
         </Svg>
      </View>
    </Animated.View>
  );
};

const InsightsScreen: React.FC = () => {
  const {userId, activeAccountId, currencySymbol} = useAppStore();
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
      const spent = await getTotalSpentThisMonth(userId, monthStart, activeAccountId);
      setTotalSpent(spent);

      const catTotals = await getMonthlySpentByCategory(userId, monthStart, activeAccountId);
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
    } catch (err: any) {
      if (err?.message?.includes('not found')) {
        useAppStore.getState().clearAuth();
      }
      console.error('Insights load error:', err);
    }
  }, [userId, activeAccountId]);

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
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <View style={styles.header}>
          <Text style={styles.title}>Insights</Text>
        </View>
        <EmptyState
          icon="activity"
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
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      <View style={styles.header}>
        <Text style={styles.title}>Insights</Text>
        <Text style={styles.subtitle}>
          Discover patterns & simulate savings
        </Text>
      </View>

      {/* Quick stats */}
      <View style={styles.statsRow}>
        <LiquidGlass borderRadius={20} useBlur={true} style={styles.statCard}>
          <Icon name="award" color={Colors.primary} size={24} style={styles.statIcon} />
          <Text style={styles.statLabel}>Top Category</Text>
          <Text style={styles.statValue}>{topCategory}</Text>
        </LiquidGlass>
        <LiquidGlass borderRadius={20} useBlur={true} style={styles.statCard}>
          <Icon name="pie-chart" color={Colors.primary} size={24} style={styles.statIcon} />
          <Text style={styles.statLabel}>Categories</Text>
          <Text style={styles.statValue}>{sliders.length} active</Text>
        </LiquidGlass>
      </View>

      {/* What-If Simulator */}
      <LiquidGlass borderRadius={24} useBlur={true} style={styles.simulatorCard}>
        <View style={styles.cardHeader}>
          <Icon name="sliders" size={20} color={Colors.primary} />
          <Text style={styles.cardTitle}>What-If Simulator</Text>
        </View>
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
            {currencySymbol}{totalSaved.toLocaleString('en-IN', {maximumFractionDigits: 0})}
          </Text>
          <Text style={styles.savingsDaily}>
            New daily allowance: {currencySymbol}
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
                {currencySymbol}{s.total.toLocaleString('en-IN', {maximumFractionDigits: 0})}
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
                  Save {currencySymbol}
                  {((s.total * s.reduction) / 100).toLocaleString('en-IN', {
                    maximumFractionDigits: 0,
                  })}
                </Text>
              )}
            </View>

            {/* DOMINO EFFECT */}
            <DominoVisualizer 
               monthlySavings={(s.total * s.reduction) / 100} 
               color={s.category.color}
               currencySymbol={currencySymbol}
            />
          </View>
        ))}
      </LiquidGlass>

      {/* Category breakdown */}
      <LiquidGlass borderRadius={24} useBlur={true} style={styles.breakdownCard}>
        <View style={styles.cardHeader}>
          <Icon name="bar-chart-2" size={20} color={Colors.primary} />
          <Text style={styles.cardTitle}>Spending Breakdown</Text>
        </View>
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
                  {currencySymbol}{s.total.toLocaleString('en-IN', {maximumFractionDigits: 0})} ({percentage.toFixed(0)}%)
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
      </LiquidGlass>

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
    padding: Spacing.lg,
  },
  statIcon: {
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
    padding: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    fontSize: Typography.body,
    fontWeight: '700',
    color: Colors.textPrimary,
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
    padding: Spacing.xl,
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
  dominoContainer: {
    marginTop: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  dominoTextWrap: {
    padding: Spacing.md,
    paddingBottom: 0,
    zIndex: 2,
  },
  dominoTitle: {
    fontSize: Typography.bodySmall,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  dominoSubtitle: {
    fontSize: Typography.tiny,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  dominoValue: {
    fontSize: Typography.h3,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  dominoChart: {
    width: '100%',
    height: 60,
    marginTop: -20,
    zIndex: 1,
  },
});

export default InsightsScreen;
