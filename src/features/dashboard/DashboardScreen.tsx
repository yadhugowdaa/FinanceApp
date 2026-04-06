import React, {useState, useMemo, useEffect} from 'react';
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
  TextInput,
  Modal,
  ScrollView as RNScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Colors, Typography, Spacing, BorderRadius, LiquidGlass} from '../../ui';
import {useDashboardLogic} from './useDashboardLogic';
import Icon from 'react-native-vector-icons/Feather';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {getCategoryDoodle} from '../../utils/CategoryImages';
import {useAppStore} from '../../store/useAppStore';
import {accountsCollection} from '../../database';
import {Account} from '../../database/models';
import BottomSheet from '@gorhom/bottom-sheet';

const DashboardScreen: React.FC<{navigation: any}> = ({navigation}) => {
  // === ALL HOOKS FIRST ===
  const {currencySymbol, activeAccountId, setActiveAccountId} = useAppStore();
  const {
    userName,
    totalIncome,
    totalExpenses,
    balance,
    categoryBreakdown,
    recentTransactions,
    refreshing,
    onRefresh,
  } = useDashboardLogic(activeAccountId);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'new_old' | 'old_new' | 'category' | 'high_low' | 'low_high'>('new_old');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [accountSelectorVisible, setAccountSelectorVisible] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    const fetchAccounts = async () => {
      const allAccounts = await accountsCollection.query().fetch();
      setAccounts(allAccounts);
    };
    fetchAccounts();

    const subscription = accountsCollection.query().observe().subscribe(setAccounts);
    return () => subscription.unsubscribe();
  }, []);

  const uniqueCategories = useMemo(() => {
    const map = new Map<string, string>();
    recentTransactions.forEach(t => {
      if (!map.has(t.categoryName)) {
        map.set(t.categoryName, t.categoryColor);
      }
    });
    return Array.from(map.entries()).map(([name, color]) => ({name, color}));
  }, [recentTransactions]);

  const filteredTransactions = useMemo(() => {
    let list = [...recentTransactions];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => t.merchant.toLowerCase().includes(q) || t.categoryName.toLowerCase().includes(q));
    }

    if (typeFilter !== 'all') {
      list = list.filter(t => t.type === typeFilter);
    }

    if (categoryFilter !== 'all') {
      list = list.filter(t => t.categoryName === categoryFilter);
    }

    switch (sortBy) {
      case 'new_old':
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case 'old_new':
        list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case 'category':
        list.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
        break;
      case 'high_low':
        list.sort((a, b) => b.amount - a.amount);
        break;
      case 'low_high':
        list.sort((a, b) => a.amount - b.amount);
        break;
    }

    return list;
  }, [recentTransactions, searchQuery, sortBy, typeFilter, categoryFilter]);

  // === DERIVED VALUES (no hooks) ===
  const spendRatio = totalIncome > 0 ? Math.min(totalExpenses / totalIncome, 1) : 0;
  const spendPercent = Math.round(spendRatio * 100);
  const hasActiveFilters = sortBy !== 'new_old' || typeFilter !== 'all' || categoryFilter !== 'all';

  const SORT_OPTIONS = [
    {key: 'new_old' as const, label: 'New to Old', icon: 'clock'},
    {key: 'old_new' as const, label: 'Old to New', icon: 'rotate-ccw'},
    {key: 'category' as const, label: 'Category', icon: 'tag'},
    {key: 'high_low' as const, label: 'High to Low', icon: 'trending-down'},
    {key: 'low_high' as const, label: 'Low to High', icon: 'trending-up'},
  ];

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
        
        {/* Header Region - Search Bar + Filter */}
        <Animated.View
          entering={FadeInDown.duration(500).springify()}
          style={styles.header}>
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <Icon name="search" size={18} color={Colors.textTertiary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search transactions..."
                placeholderTextColor={Colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Icon name="x" size={16} color={Colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
              onPress={() => setFilterModalVisible(true)}>
              <Icon name="sliders" size={18} color={hasActiveFilters ? '#000' : Colors.textPrimary} />
            </TouchableOpacity>
          </View>
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
                      {currencySymbol}{Math.abs(balance).toLocaleString('en-IN', {maximumFractionDigits: 0})}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.accountSelector}
                    onPress={() => setAccountSelectorVisible(true)}>
                    <Text style={styles.accountSelectorText}>
                      {activeAccountId ? accounts.find(a => a.id === activeAccountId)?.name || 'Account' : 'All accounts'}
                    </Text>
                    <Icon name="chevron-down" size={16} color={Colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                {/* Spending Progress Bar */}
                <View>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>{spendPercent}% spent</Text>
                    <Text style={styles.progressLabel}>
                      {currencySymbol}{totalExpenses.toLocaleString('en-IN', {maximumFractionDigits: 0})} of {currencySymbol}{totalIncome.toLocaleString('en-IN', {maximumFractionDigits: 0})}
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
                      {currencySymbol}{totalExpenses.toLocaleString('en-IN', {maximumFractionDigits: 0})}
                    </Text>
                  </View>
                  
                  <View style={styles.balanceDivider} />
                  
                  <View style={[styles.balanceCol, {alignItems: 'flex-end'}]}>
                    <Text style={styles.statLabel}>
                      <Icon name="arrow-down-left" size={12} color="#00E676" /> Income
                    </Text>
                    <Text style={[styles.statAmount, {color: '#00E676'}]}>
                      {currencySymbol}{totalIncome.toLocaleString('en-IN', {maximumFractionDigits: 0})}
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
              <View style={[styles.quickAccessGrid, {justifyContent: 'space-between', paddingHorizontal: 20}]}>
                <TouchableOpacity 
                  style={styles.quickAccessItem}
                  onPress={() => navigation.navigate('Recurring')}>
                  <View style={styles.quickAccessCircle}>
                    <Icon name="refresh-cw" size={20} color="#1A1400" />
                  </View>
                  <Text style={styles.quickAccessText}>Recurring</Text>
                </TouchableOpacity>

                <View style={{justifyContent: 'center', alignItems: 'center', flex: 1}}>
                  <Image 
                    source={require('../../assets/images/finpacelogowithoutbg.png')} 
                    style={{width: 60, height: 60, resizeMode: 'contain'}} 
                  />
                </View>

                <TouchableOpacity 
                  style={styles.quickAccessItem}
                  onPress={() => navigation.navigate('Loans')}>
                  <View style={styles.quickAccessCircle}>
                    <Icon name="briefcase" size={20} color="#1A1400" />
                  </View>
                  <Text style={styles.quickAccessText}>Loan</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Transaction History */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(600).springify()}
            style={styles.recentSection}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Transaction history</Text>
              {(searchQuery.length > 0 || hasActiveFilters) && (
                <Text style={styles.resultCount}>{filteredTransactions.length} results</Text>
              )}
            </View>
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((txn, idx) => (
                <Animated.View
                  key={txn.id || idx}
                  entering={FadeInDown.delay(350 + idx * 80).duration(500).springify()}>
                  <View style={[
                    styles.txnCard, 
                    {
                      backgroundColor: txn.categoryColor,
                      zIndex: filteredTransactions.length - idx,
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
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                          {txn.source === 'recurring' && (
                            <View style={{backgroundColor: 'rgba(0,0,0,0.1)', padding: 2, borderRadius: 4}}>
                              <Icon name="refresh-cw" size={10} color="#000" />
                            </View>
                          )}
                          <Text style={styles.txnMerchant}>{txn.merchant}</Text>
                        </View>
                        <Text style={styles.txnDate}>
                          {new Date(txn.date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.txnAmount}>
                      {txn.type === 'income' ? '+' : '-'}
                      {currencySymbol}{txn.amount.toLocaleString('en-IN', {maximumFractionDigits: 0})}
                    </Text>
                    </View>
                  </View>
                </Animated.View>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No transactions match your search' : 'No recent activity'}
                </Text>
              </View>
            )}
          </Animated.View>
        </View>
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setFilterModalVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />

            {/* Reset button */}
            {hasActiveFilters && (
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setSortBy('new_old');
                  setTypeFilter('all');
                  setCategoryFilter('all');
                }}>
                <Text style={styles.resetText}>Reset All</Text>
              </TouchableOpacity>
            )}

            <RNScrollView showsVerticalScrollIndicator={false} style={{maxHeight: 500}}>

              {/* Sort By */}
              <Text style={styles.modalSectionTitle}>Sort By</Text>
              {SORT_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.sortOption, sortBy === opt.key && styles.sortOptionActive]}
                  onPress={() => setSortBy(opt.key)}>
                  <View style={styles.sortOptionLeft}>
                    <Icon name={opt.icon} size={18} color={sortBy === opt.key ? Colors.primary : Colors.textSecondary} />
                    <Text style={[styles.sortOptionText, sortBy === opt.key && styles.sortOptionTextActive]}>
                      {opt.label}
                    </Text>
                  </View>
                  {sortBy === opt.key && <Icon name="check" size={18} color={Colors.primary} />}
                </TouchableOpacity>
              ))}

              {/* Type Filter */}
              <Text style={[styles.modalSectionTitle, {marginTop: Spacing.lg}]}>Type</Text>
              {['all', 'income', 'expense'].map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.sortOption, typeFilter === t && styles.sortOptionActive]}
                  onPress={() => setTypeFilter(t as any)}>
                  <View style={styles.sortOptionLeft}>
                    <Icon
                      name={t === 'all' ? 'layers' : t === 'income' ? 'arrow-down-left' : 'arrow-up-right'}
                      size={18}
                      color={typeFilter === t ? Colors.primary : Colors.textSecondary}
                    />
                    <Text style={[styles.sortOptionText, typeFilter === t && styles.sortOptionTextActive]}>
                      {t === 'all' ? 'All' : t === 'income' ? 'Income' : 'Spends'}
                    </Text>
                  </View>
                  {typeFilter === t && <Icon name="check" size={18} color={Colors.primary} />}
                </TouchableOpacity>
              ))}

              {/* Category Filter */}
              <Text style={[styles.modalSectionTitle, {marginTop: Spacing.lg}]}>Category</Text>
              <TouchableOpacity
                style={[styles.sortOption, categoryFilter === 'all' && styles.sortOptionActive]}
                onPress={() => setCategoryFilter('all')}>
                <View style={styles.sortOptionLeft}>
                  <Icon name="grid" size={18} color={categoryFilter === 'all' ? Colors.primary : Colors.textSecondary} />
                  <Text style={[styles.sortOptionText, categoryFilter === 'all' && styles.sortOptionTextActive]}>
                    All Categories
                  </Text>
                </View>
                {categoryFilter === 'all' && <Icon name="check" size={18} color={Colors.primary} />}
              </TouchableOpacity>
              {uniqueCategories.map(cat => (
                <TouchableOpacity
                  key={cat.name}
                  style={[styles.sortOption, categoryFilter === cat.name && styles.sortOptionActive]}
                  onPress={() => setCategoryFilter(cat.name)}>
                  <View style={styles.sortOptionLeft}>
                    <View style={[styles.catDot, {backgroundColor: cat.color}]} />
                    <Text style={[styles.sortOptionText, categoryFilter === cat.name && styles.sortOptionTextActive]}>
                      {cat.name}
                    </Text>
                  </View>
                  {categoryFilter === cat.name && <Icon name="check" size={18} color={Colors.primary} />}
                </TouchableOpacity>
              ))}

            </RNScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Account Selector Modal */}
      <Modal
        visible={accountSelectorVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountSelectorVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAccountSelectorVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Account</Text>

            <TouchableOpacity
              style={[styles.sortOption, !activeAccountId && styles.sortOptionActive]}
              onPress={() => {
                setActiveAccountId(undefined);
                setAccountSelectorVisible(false);
              }}>
              <View style={styles.sortOptionLeft}>
                <Icon name="layers" size={18} color={!activeAccountId ? Colors.primary : Colors.textSecondary} />
                <Text style={[styles.sortOptionText, !activeAccountId && styles.sortOptionTextActive]}>
                  All Accounts
                </Text>
              </View>
              {!activeAccountId && <Icon name="check" size={18} color={Colors.primary} />}
            </TouchableOpacity>

            {accounts.map(acc => (
              <TouchableOpacity
                key={acc.id}
                style={[styles.sortOption, activeAccountId === acc.id && styles.sortOptionActive]}
                onPress={() => {
                  setActiveAccountId(acc.id);
                  setAccountSelectorVisible(false);
                }}>
                <View style={styles.sortOptionLeft}>
                  <View style={[styles.catDot, {backgroundColor: acc.color, marginRight: Spacing.xs}]} />
                  <Text style={[styles.sortOptionText, activeAccountId === acc.id && styles.sortOptionTextActive]}>
                    {acc.name}
                    {acc.accountNumber ? ` (••${acc.accountNumber})` : ''}
                  </Text>
                </View>
                {activeAccountId === acc.id && <Icon name="check" size={18} color={Colors.primary} />}
              </TouchableOpacity>
            ))}

          </View>
        </TouchableOpacity>
      </Modal>

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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    height: 46,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography.bodySmall,
    padding: 0,
    fontWeight: '500',
  },
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
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
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: Typography.body,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  resultCount: {
    color: Colors.primary,
    fontSize: Typography.caption,
    fontWeight: '600',
  },
  txnCard: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 24,
    marginBottom: -16,
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
  // Filter modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.xl,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: {
    fontSize: Typography.body,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  sortOptionActive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  sortOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  sortOptionText: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  sortOptionTextActive: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  resetButton: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.md,
  },
  resetText: {
    color: Colors.primary,
    fontSize: Typography.caption,
    fontWeight: '600',
  },
  modalSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  catDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
});

export default DashboardScreen;
