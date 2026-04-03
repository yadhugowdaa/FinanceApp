import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {PieChart} from 'react-native-gifted-charts';
import {Card, Colors, Typography, Spacing, BorderRadius, Shadows} from '../../ui';
import {useAppStore} from '../../store/useAppStore';
import {
  calculatePacing,
  getMonthStartTimestamp,
  getTodayStartTimestamp,
} from '../../services/PacingEngine';
import {
  getTotalSpentThisMonth,
  getTotalSpentToday,
  getTotalIncome,
  getMonthlySpentByCategory,
} from '../../services/TransactionService';
import {usersCollection, categoriesCollection, transactionsCollection} from '../../database';
import {Q} from '@nozbe/watermelondb';
import type {PacingResult} from '../../services/PacingEngine';

const DashboardScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {userId} = useAppStore();
  const [pacing, setPacing] = useState<PacingResult | null>(null);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [categoryBreakdown, setCategoryBreakdown] = useState<
    Array<{name: string; value: number; color: string}>
  >([]);
  const [recentTransactions, setRecentTransactions] = useState<
    Array<{id: string; merchant: string; amount: number; type: string; date: Date}>
  >([]);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');

  const loadData = useCallback(async () => {
    if (!userId) {return;}

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

      // Calculate pacing
      const pacingResult = calculatePacing({
        monthlyIncome: user.monthlyIncome,
        fixedExpenses: user.fixedExpenses,
        totalSpentThisMonth: spentMonth,
        totalSpentToday: spentToday,
      });
      setPacing(pacingResult);

      // Category breakdown
      const catTotals = await getMonthlySpentByCategory(userId, monthStart);
      const allCategories = await categoriesCollection.query().fetch();
      const breakdown: Array<{name: string; value: number; color: string}> = [];

      for (const [catId, amount] of catTotals) {
        const cat = allCategories.find(c => c.id === catId);
        if (cat) {
          breakdown.push({name: cat.name, value: amount, color: cat.color});
        }
      }
      breakdown.sort((a, b) => b.value - a.value);
      setCategoryBreakdown(breakdown.slice(0, 6));

      // Recent transactions
      const recent = await transactionsCollection
        .query(
          Q.where('user_id', userId),
          Q.sortBy('date', Q.desc),
          Q.take(5),
        )
        .fetch();

      setRecentTransactions(
        recent.map(t => ({
          id: t.id,
          merchant: t.merchant,
          amount: t.amount,
          type: t.type,
          date: t.date,
        })),
      );
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Subscribe to transaction changes for reactive updates
  useEffect(() => {
    if (!userId) {return;}

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

  const statusColor =
    pacing?.status === 'on_track'
      ? Colors.success
      : pacing?.status === 'warning'
        ? Colors.warning
        : Colors.danger;

  const pieData =
    categoryBreakdown.length > 0
      ? categoryBreakdown.map(c => ({
          value: c.value,
          color: c.color,
          text: c.name,
        }))
      : [{value: 1, color: Colors.shimmer, text: 'No data'}];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Hero Card */}
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        style={styles.heroGradient}>
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.greeting}>Hey {userName} 👋</Text>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
        </View>

        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceAmount}>
            ₹{balance.toLocaleString('en-IN', {maximumFractionDigits: 0})}
          </Text>
        </View>

        <View style={styles.incomeExpenseRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricIcon}>↑</Text>
            <View>
              <Text style={styles.metricLabel}>Income</Text>
              <Text style={styles.metricValue}>
                ₹{totalIncome.toLocaleString('en-IN', {maximumFractionDigits: 0})}
              </Text>
            </View>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricBox}>
            <Text style={styles.metricIcon}>↓</Text>
            <View>
              <Text style={styles.metricLabel}>Expenses</Text>
              <Text style={styles.metricValue}>
                ₹{totalExpenses.toLocaleString('en-IN', {maximumFractionDigits: 0})}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        {/* Daily Pacing Card */}
        {pacing && (
          <Card elevated style={styles.pacingCard}>
            <View style={styles.pacingHeader}>
              <View>
                <Text style={styles.pacingTitle}>Daily Pace</Text>
                <Text style={styles.pacingSubtitle}>
                  {pacing.daysRemaining} days left this month
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {backgroundColor: statusColor + '20'},
                ]}>
                <Text style={[styles.statusText, {color: statusColor}]}>
                  {pacing.status === 'on_track'
                    ? '✓ On Track'
                    : pacing.status === 'warning'
                      ? '⚠ Caution'
                      : '✗ Over Budget'}
                </Text>
              </View>
            </View>

            <Text style={styles.pacingAmount}>
              ₹
              {pacing.dailyAllowance.toLocaleString('en-IN', {
                maximumFractionDigits: 0,
              })}
            </Text>
            <Text style={styles.pacingLabel}>safe to spend today</Text>

            {/* Progress bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <LinearGradient
                  colors={[statusColor, statusColor + '80']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={[
                    styles.progressFill,
                    {width: `${Math.min(pacing.percentSpent, 100)}%`},
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {pacing.percentSpent.toFixed(0)}% of budget used
              </Text>
            </View>
          </Card>
        )}

        {/* Spending Breakdown */}
        <Card elevated title="Spending by Category" style={styles.chartCard}>
          {categoryBreakdown.length > 0 ? (
            <View style={styles.chartContainer}>
              <PieChart
                data={pieData}
                donut
                radius={70}
                innerRadius={45}
                innerCircleColor={Colors.surface}
                centerLabelComponent={() => (
                  <View style={styles.chartCenter}>
                    <Text style={styles.chartCenterAmount}>
                      ₹
                      {categoryBreakdown
                        .reduce((s, c) => s + c.value, 0)
                        .toLocaleString('en-IN', {maximumFractionDigits: 0})}
                    </Text>
                    <Text style={styles.chartCenterLabel}>Total</Text>
                  </View>
                )}
              />
              <View style={styles.legendContainer}>
                {categoryBreakdown.map((cat, idx) => (
                  <View key={idx} style={styles.legendItem}>
                    <View
                      style={[styles.legendDot, {backgroundColor: cat.color}]}
                    />
                    <Text style={styles.legendName} numberOfLines={1}>
                      {cat.name}
                    </Text>
                    <Text style={styles.legendAmount}>
                      ₹{cat.value.toLocaleString('en-IN', {maximumFractionDigits: 0})}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyChartIcon}>📊</Text>
              <Text style={styles.emptyChartText}>
                Add transactions to see your spending breakdown
              </Text>
            </View>
          )}
        </Card>

        {/* Recent Transactions */}
        <Card elevated title="Recent Transactions" style={styles.recentCard}>
          {recentTransactions.length > 0 ? (
            recentTransactions.map(txn => (
              <TouchableOpacity
                key={txn.id}
                style={styles.txnItem}
                activeOpacity={0.7}>
                <View style={styles.txnLeft}>
                  <View
                    style={[
                      styles.txnIcon,
                      {
                        backgroundColor:
                          txn.type === 'income'
                            ? Colors.incomeBg
                            : Colors.expenseBg,
                      },
                    ]}>
                    <Text style={styles.txnIconText}>
                      {txn.type === 'income' ? '↑' : '↓'}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.txnMerchant}>{txn.merchant}</Text>
                    <Text style={styles.txnDate}>
                      {new Date(txn.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.txnAmount,
                    {
                      color:
                        txn.type === 'income' ? Colors.income : Colors.expense,
                    },
                  ]}>
                  {txn.type === 'income' ? '+' : '-'}₹
                  {txn.amount.toLocaleString('en-IN', {maximumFractionDigits: 0})}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyTxn}>
              <Text style={styles.emptyTxnText}>
                No transactions yet. Tap + to add one!
              </Text>
            </View>
          )}

          {recentTransactions.length > 0 && (
            <TouchableOpacity
              style={styles.viewAll}
              onPress={() => navigation.navigate('Transactions')}>
              <Text style={styles.viewAllText}>View All →</Text>
            </TouchableOpacity>
          )}
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  heroGradient: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: Spacing.xxl,
    borderBottomLeftRadius: BorderRadius.xxl,
    borderBottomRightRadius: BorderRadius.xxl,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  greeting: {
    fontSize: Typography.h3,
    fontWeight: '700',
    color: Colors.textOnPrimary,
  },
  dateText: {
    fontSize: Typography.caption,
    color: Colors.textOnPrimary,
    opacity: 0.8,
    marginTop: Spacing.xxs,
  },
  balanceSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  balanceLabel: {
    fontSize: Typography.bodySmall,
    color: Colors.textOnPrimary,
    opacity: 0.85,
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.textOnPrimary,
    letterSpacing: -1,
    marginTop: Spacing.xs,
  },
  incomeExpenseRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  metricBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  metricIcon: {
    fontSize: 18,
    color: Colors.textOnPrimary,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: Typography.caption,
    color: Colors.textOnPrimary,
    opacity: 0.8,
  },
  metricValue: {
    fontSize: Typography.body,
    fontWeight: '700',
    color: Colors.textOnPrimary,
  },
  metricDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: Spacing.md,
  },
  body: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: 100,
  },
  pacingCard: {
    marginTop: -15,
  },
  pacingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  pacingTitle: {
    fontSize: Typography.h4,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  pacingSubtitle: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xxs,
  },
  statusBadge: {
    borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  statusText: {
    fontSize: Typography.caption,
    fontWeight: '600',
  },
  pacingAmount: {
    fontSize: Typography.h1,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  pacingLabel: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  progressContainer: {
    gap: Spacing.sm,
  },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.round,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.round,
  },
  progressText: {
    fontSize: Typography.caption,
    color: Colors.textTertiary,
  },
  chartCard: {},
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  chartCenter: {
    alignItems: 'center',
  },
  chartCenterAmount: {
    fontSize: Typography.bodySmall,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  chartCenterLabel: {
    fontSize: Typography.tiny,
    color: Colors.textTertiary,
  },
  legendContainer: {
    flex: 1,
    gap: Spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendName: {
    flex: 1,
    fontSize: Typography.caption,
    color: Colors.textSecondary,
  },
  legendAmount: {
    fontSize: Typography.caption,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  emptyChart: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyChartIcon: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  emptyChartText: {
    fontSize: Typography.bodySmall,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  recentCard: {},
  txnItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  txnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  txnIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txnIconText: {
    fontSize: 18,
    fontWeight: '700',
  },
  txnMerchant: {
    fontSize: Typography.bodySmall,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  txnDate: {
    fontSize: Typography.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.xxs,
  },
  txnAmount: {
    fontSize: Typography.body,
    fontWeight: '700',
  },
  emptyTxn: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyTxnText: {
    fontSize: Typography.bodySmall,
    color: Colors.textTertiary,
  },
  viewAll: {
    alignItems: 'center',
    paddingTop: Spacing.md,
  },
  viewAllText: {
    fontSize: Typography.bodySmall,
    fontWeight: '600',
    color: Colors.primary,
  },
});

export default DashboardScreen;
