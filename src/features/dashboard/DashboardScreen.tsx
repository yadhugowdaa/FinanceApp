import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Platform,
} from 'react-native';
import {Colors, Typography, Spacing, BorderRadius, LiquidGlass} from '../../ui';
import {useDashboardLogic} from './useDashboardLogic';
import Icon from 'react-native-vector-icons/Feather';


const DashboardScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {
    userName,
    totalIncome,
    totalExpenses,
    recentTransactions,
    refreshing,
    onRefresh,
  } = useDashboardLogic();

  return (
    <View style={styles.container}>
      {/* Pure black background */}
      <View style={[StyleSheet.absoluteFill, {backgroundColor: '#000000'}]} />

      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 20 : 60}}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={Colors.primary} 
          />
        }>
        
        {/* Header Region - Top Left Profile */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.profileIcon} onPress={() => navigation.navigate('Profile')}>
            <Icon name="user" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {/* Main Account Summary Card */}
          <LiquidGlass borderRadius={32} style={styles.heroCardContainer}>
            <View style={styles.heroCardContent}>
              
              {/* Top Row: Account Dropdown */}
              <View style={styles.heroHeader}>
                <View style={{flex: 1}} />
                <TouchableOpacity style={styles.accountSelector}>
                  <Text style={styles.accountSelectorText}>All accounts</Text>
                  <Icon name="chevron-down" size={16} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Bottom Row: Spends & Income */}
              <View style={styles.balanceSplit}>
                <View style={[styles.balanceCol, {alignItems: 'flex-start'}]}>
                  <Text style={styles.balanceLabel}>
                    <Icon name="arrow-up-right" size={14} color={Colors.textSecondary} /> Spends
                  </Text>
                  <Text style={[styles.balanceAmount, {color: Colors.textPrimary}]}>
                    ₹{totalExpenses.toLocaleString('en-IN', {maximumFractionDigits: 0})}
                  </Text>
                </View>
                
                <View style={styles.balanceDivider} />
                
                <View style={[styles.balanceCol, {alignItems: 'flex-end'}]}>
                  <Text style={styles.balanceLabel}>
                    <Icon name="arrow-down-left" size={14} color={Colors.primary} /> Income
                  </Text>
                  <Text style={[styles.balanceAmount, {color: Colors.primary}]}>
                    ₹{totalIncome.toLocaleString('en-IN', {maximumFractionDigits: 0})}
                  </Text>
                </View>
              </View>
              
            </View>
          </LiquidGlass>

          {/* Quick Access Card */}
          <LiquidGlass borderRadius={28} style={styles.quickAccessContainer}>
             <View style={styles.quickAccessGrid}>
                {['Autopay', 'Loan', 'Transfers', 'More'].map((action, idx) => (
                  <TouchableOpacity key={idx} style={styles.quickAccessItem}>
                    <View style={styles.quickAccessCircle}>
                      <Icon 
                         name={idx === 0 ? 'refresh-cw' : idx === 1 ? 'briefcase' : idx === 2 ? 'send' : 'grid'} 
                         size={20} 
                         color={Colors.textPrimary} 
                      />
                    </View>
                    <Text style={styles.quickAccessText}>{action}</Text>
                  </TouchableOpacity>
                ))}
             </View>
          </LiquidGlass>

          {/* Recent Transactions */}
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Transaction history</Text>
            {recentTransactions.length > 0 ? (
               recentTransactions.map((txn, idx) => (
                 <LiquidGlass key={txn.id || idx} style={styles.txnCard} borderRadius={20} tintOpacity={0.25}>
                   <View style={styles.txnLeft}>
                     <View style={[styles.txnIcon, { backgroundColor: txn.type === 'income' ? Colors.incomeBg : Colors.surface }]}>
                        <Icon name={txn.type === 'income' ? "arrow-down-left" : "arrow-up-right"} size={16} color={txn.type === 'income' ? Colors.income : Colors.textSecondary} />
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
                   <Text style={[styles.txnAmount, {color: txn.type === 'income' ? Colors.income : Colors.textPrimary}]}>
                     {txn.type === 'income' ? '+' : '-'}₹{txn.amount.toLocaleString('en-IN', {maximumFractionDigits: 0})}
                   </Text>
                 </LiquidGlass>
               ))
            ) : (
               <LiquidGlass style={styles.emptyCard} borderRadius={20}>
                  <Text style={styles.emptyText}>No recent activity</Text>
               </LiquidGlass>
            )}
            
            {recentTransactions.length > 0 && (
              <TouchableOpacity style={styles.viewAllButton} onPress={() => navigation.navigate('Transactions')}>
                <Text style={styles.viewAllText}>View All</Text>
                <Icon name="arrow-right" size={14} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', 
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    zIndex: 10,
    flexDirection: 'row',
  },
  profileIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(50, 50, 50, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  body: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 110, // Room for floating tab bar
    gap: Spacing.xl,
  },
  heroCardContainer: {},
  heroCardContent: {
    padding: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: Spacing.xl,
  },
  accountSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.round,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  accountSelectorText: {
    color: Colors.textPrimary,
    fontSize: Typography.caption,
    fontWeight: '600',
  },
  balanceSplit: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceCol: {
    flex: 1,
  },
  balanceLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.bodySmall,
    marginBottom: Spacing.xs,
    fontWeight: '500',
  },
  balanceAmount: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -1,
  },
  balanceDivider: {
    width: StyleSheet.hairlineWidth,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.15)', 
    marginHorizontal: Spacing.md,
  },
  quickAccessContainer: {
    padding: Spacing.lg,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickAccessItem: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  quickAccessCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  quickAccessText: {
    color: Colors.textPrimary,
    fontSize: Typography.caption,
    fontWeight: '500',
  },
  recentSection: {
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: Typography.body,
    fontWeight: '600',
    marginBottom: Spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  txnCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  txnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  txnIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txnMerchant: {
    color: Colors.textPrimary,
    fontSize: Typography.body,
    fontWeight: '600',
  },
  txnDate: {
    color: Colors.textSecondary,
    fontSize: Typography.caption,
    marginTop: 2,
  },
  txnAmount: {
    fontSize: Typography.body,
    fontWeight: '700',
  },
  emptyCard: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textTertiary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  viewAllText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: Typography.bodySmall,
  },
});

export default DashboardScreen;
