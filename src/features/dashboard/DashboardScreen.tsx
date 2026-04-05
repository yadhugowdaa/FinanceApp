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
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Colors, Typography, Spacing, BorderRadius, LiquidGlass} from '../../ui';
import {useDashboardLogic} from './useDashboardLogic';
import Icon from 'react-native-vector-icons/Feather';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {getCategoryDoodle} from '../../utils/CategoryImages';

const DashboardScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {
    userName,
    totalIncome,
    totalExpenses,
    balance,
    categoryBreakdown,
    recentTransactions,
    refreshing,
    onRefresh,
  } = useDashboardLogic();

  const spendRatio = totalIncome > 0 ? Math.min(totalExpenses / totalIncome, 1) : 0;
  const spendPercent = Math.round(spendRatio * 100);

  return (
    <View style={styles.container}>

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
        <Animated.View
          entering={FadeInDown.duration(500).springify()}
          style={styles.header}>
          <TouchableOpacity style={styles.profileIcon} onPress={() => navigation.navigate('Profile')}>
            <Icon name="user" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.body}>
          {/* Main Account Summary Card — LiquidGlass */}
          <Animated.View entering={FadeInDown.delay(100).duration(600).springify()}>
            <LiquidGlass borderRadius={32} style={styles.heroCardContainer} useBlur={true}>
              <View style={styles.heroCardContent}>
                
                {/* Top Row: Balance + Account Dropdown */}
                <View style={styles.heroHeader}>
                  <View>
                    <Text style={styles.balanceLabel}>Balance</Text>
                    <Text style={[styles.balanceAmount, {color: balance >= 0 ? '#00E676' : '#FF3C3C'}]}>
                      {'\u20B9'}{Math.abs(balance).toLocaleString('en-IN', {maximumFractionDigits: 0})}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.accountSelector}>
                    <Text style={styles.accountSelectorText}>All accounts</Text>
                    <Icon name="chevron-down" size={16} color={Colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                {/* Spending Progress Bar */}
                <View>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>{spendPercent}% spent</Text>
                    <Text style={styles.progressLabel}>
                      {'\u20B9'}{totalExpenses.toLocaleString('en-IN', {maximumFractionDigits: 0})} of {'\u20B9'}{totalIncome.toLocaleString('en-IN', {maximumFractionDigits: 0})}
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${spendPercent}%`,
                          backgroundColor: spendPercent > 80 ? '#FF3C3C' : spendPercent > 50 ? '#FFB020' : '#00E676',
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Bottom Row: Spends & Income */}
                <View style={styles.balanceSplit}>
                  <View style={[styles.balanceCol, {alignItems: 'flex-start'}]}>
                    <Text style={styles.statLabel}>
                      <Icon name="arrow-up-right" size={12} color="#FF3C3C" /> Spends
                    </Text>
                    <Text style={[styles.statAmount, {color: '#FF3C3C'}]}>
                      {'\u20B9'}{totalExpenses.toLocaleString('en-IN', {maximumFractionDigits: 0})}
                    </Text>
                  </View>
                  
                  <View style={styles.balanceDivider} />
                  
                  <View style={[styles.balanceCol, {alignItems: 'flex-end'}]}>
                    <Text style={styles.statLabel}>
                      <Icon name="arrow-down-left" size={12} color="#00E676" /> Income
                    </Text>
                    <Text style={[styles.statAmount, {color: '#00E676'}]}>
                      {'\u20B9'}{totalIncome.toLocaleString('en-IN', {maximumFractionDigits: 0})}
                    </Text>
                  </View>
                </View>
                
              </View>
            </LiquidGlass>
          </Animated.View>

          {/* Quick Access Card — Glossy Yellow */}
          <Animated.View entering={FadeInDown.delay(200).duration(600).springify()}>
            <LinearGradient
              colors={['#FFB700', '#E5A400', '#CC9200']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.quickAccessGradient}>
              <View style={styles.quickAccessGrid}>
                {['Autopay', 'Loan', 'Transfers', 'More'].map((action, idx) => (
                  <TouchableOpacity key={idx} style={styles.quickAccessItem}>
                    <View style={styles.quickAccessCircle}>
                      <Icon 
                        name={idx === 0 ? 'refresh-cw' : idx === 1 ? 'briefcase' : idx === 2 ? 'send' : 'grid'} 
                        size={20} 
                        color="#1A1400" 
                      />
                    </View>
                    <Text style={styles.quickAccessText}>{action}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Transaction History */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(600).springify()}
            style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Transaction history</Text>
            {recentTransactions.length > 0 ? (
              recentTransactions.map((txn, idx) => (
                <Animated.View
                  key={txn.id || idx}
                  entering={FadeInDown.delay(350 + idx * 80).duration(500).springify()}>
                  <View style={[
                    styles.txnCard, 
                    {
                      backgroundColor: txn.categoryColor,
                      zIndex: recentTransactions.length - idx,
                      transform: [{rotate: idx % 2 === 0 ? '-2deg' : '2deg'}],
                    }
                  ]}>
                    <View style={styles.txnCardInner}>
                      <View style={styles.txnLeft}>
                      <View style={styles.txnIcon}>
                        <Icon
                          name={txn.type === 'income' ? 'arrow-down-left' : 'arrow-up-right'}
                          size={18}
                          color="#000000"
                        />
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
                    
                    {/* The Doodle - dynamically rendered based on category */}
                    {/* Uncomment this block when you add your own transparent images!
                    <View style={styles.doodleContainer}>
                      <Image 
                        source={getCategoryDoodle(txn.categoryName)} 
                        style={styles.doodleImage} 
                      />
                    </View>
                    */}

                    <Text style={styles.txnAmount}>
                      {txn.type === 'income' ? '+' : '-'}
                      {'\u20B9'}{txn.amount.toLocaleString('en-IN', {maximumFractionDigits: 0})}
                    </Text>
                    </View>
                  </View>
                </Animated.View>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No recent activity</Text>
              </View>
            )}
          </Animated.View>
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
    marginBottom: Spacing.md,
  },
  profileIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  body: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 120,
  },
  heroCardContainer: {
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  heroCardContent: {
    gap: Spacing.lg,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.round,
  },
  accountSelectorText: {
    color: Colors.textPrimary,
    fontSize: Typography.bodySmall,
    fontWeight: '500',
  },
  balanceSplit: {
    flexDirection: 'row',
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
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
  },
  balanceDivider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: Spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  statAmount: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  catSection: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: Spacing.sm,
  },
  catBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  catBarFill: {
    height: 8,
    borderRadius: 4,
  },
  catName: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    width: 70,
    textAlign: 'right',
  },
  catAmount: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    width: 60,
    textAlign: 'right',
  },
  quickAccessGradient: {
    borderRadius: 28,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
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
    backgroundColor: 'rgba(0,0,0,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAccessText: {
    color: '#1A1400',
    fontSize: Typography.caption,
    fontWeight: '600',
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: 24,
    marginBottom: -16, // Stack them on top of each other!
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#000000',
    overflow: 'hidden',
  },
  txnCardInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    zIndex: 2,
  },
  txnIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#000',
  },
  txnMerchant: {
    color: '#000000',
    fontSize: Typography.body,
    fontWeight: '700',
  },
  txnDate: {
    color: 'rgba(0,0,0,0.6)',
    fontSize: Typography.caption,
    fontWeight: '600',
    marginTop: 2,
  },
  txnAmount: {
    color: '#000000',
    fontSize: Typography.body,
    fontWeight: '800',
    zIndex: 2,
  },
  doodleContainer: {
    position: 'absolute',
    right: 30,
    top: -15,
    bottom: -15,
    width: 90,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  doodleImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  emptyCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    backgroundColor: Colors.txnCardBg,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.txnCardBorder,
  },
  emptyText: {
    color: Colors.textTertiary,
  },
});

export default DashboardScreen;
