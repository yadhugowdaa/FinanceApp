import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import {Colors, Typography, Spacing, BorderRadius, Shadows, EmptyState} from '../../ui';
import {useAppStore} from '../../store/useAppStore';
import {transactionsCollection, categoriesCollection} from '../../database';
import {Q} from '@nozbe/watermelondb';
import {searchTransactions, deleteTransaction} from '../../services/TransactionService';
import type Transaction from '../../database/models/Transaction';
import type Category from '../../database/models/Category';

type FilterType = 'all' | 'expense' | 'income';

const TransactionsScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {userId, currencySymbol} = useAppStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Map<string, Category>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  const loadCategories = useCallback(async () => {
    const cats = await categoriesCollection.query().fetch();
    const map = new Map<string, Category>();
    cats.forEach(c => map.set(c.id, c));
    setCategories(map);
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Subscribe reactively
  useEffect(() => {
    if (!userId) {return;}

    const queryConditions = [
      Q.where('user_id', userId),
      Q.sortBy('date', Q.desc),
    ];

    if (filterType !== 'all') {
      queryConditions.push(Q.where('type', filterType));
    }

    const subscription = transactionsCollection
      .query(...queryConditions)
      .observe()
      .subscribe(txns => {
        setTransactions(txns);
      });

    return () => subscription.unsubscribe();
  }, [userId, filterType]);

  // Handle search
  useEffect(() => {
    if (!searchQuery.trim() || !userId) {return;}

    const timeout = setTimeout(async () => {
      const results = await searchTransactions(userId, searchQuery);
      setTransactions(results);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery, userId]);

  const handleDelete = async (id: string) => {
    try {
      await deleteTransaction(id);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const renderTransaction = ({item}: {item: Transaction}) => {
    const cat = categories.get(item.categoryId);

    return (
      <TouchableOpacity
        style={styles.txnCard}
        activeOpacity={0.7}
        onLongPress={() => handleDelete(item.id)}>
        <View style={styles.txnLeft}>
          <View
            style={[
              styles.txnCatIcon,
              {backgroundColor: (cat?.color ?? Colors.shimmer) + '20'},
            ]}>
            <Text style={styles.txnCatEmoji}>
              {item.type === 'income' ? '💰' : '💸'}
            </Text>
          </View>
          <View style={styles.txnDetails}>
            <Text style={styles.txnMerchant} numberOfLines={1}>
              {item.merchant}
            </Text>
            <Text style={styles.txnCategory}>
              {cat?.name ?? 'Uncategorized'} • {item.source}
            </Text>
            <Text style={styles.txnDate}>
              {new Date(item.date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>
        <View style={styles.txnRight}>
          <Text
            style={[
              styles.txnAmount,
              {color: item.type === 'income' ? Colors.income : Colors.expense},
            ]}>
            {item.type === 'income' ? '+' : '-'}{currencySymbol}
            {item.amount.toLocaleString('en-IN', {maximumFractionDigits: 0})}
          </Text>
          {item.notes ? (
            <Text style={styles.txnNotes} numberOfLines={1}>
              {item.notes}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const filters: {label: string; value: FilterType}[] = [
    {label: 'All', value: 'all'},
    {label: 'Expenses', value: 'expense'},
    {label: 'Income', value: 'income'},
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search transactions..."
          placeholderTextColor={Colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {filters.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[
              styles.filterChip,
              filterType === f.value && styles.filterChipActive,
            ]}
            onPress={() => {
              setFilterType(f.value);
              setSearchQuery('');
            }}>
            <Text
              style={[
                styles.filterText,
                filterType === f.value && styles.filterTextActive,
              ]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={transactions}
        keyExtractor={item => item.id}
        renderItem={renderTransaction}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="📝"
            title="No Transactions"
            description="Your financial activity will appear here. Add your first transaction to get started!"
          />
        }
      />
    </View>
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
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  searchInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: Typography.bodySmall,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: Colors.textOnPrimary,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  txnCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  txnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  txnCatIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txnCatEmoji: {
    fontSize: 20,
  },
  txnDetails: {
    flex: 1,
  },
  txnMerchant: {
    fontSize: Typography.bodySmall,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  txnCategory: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xxs,
  },
  txnDate: {
    fontSize: Typography.tiny,
    color: Colors.textTertiary,
    marginTop: Spacing.xxs,
  },
  txnRight: {
    alignItems: 'flex-end',
  },
  txnAmount: {
    fontSize: Typography.body,
    fontWeight: '700',
  },
  txnNotes: {
    fontSize: Typography.tiny,
    color: Colors.textTertiary,
    marginTop: Spacing.xxs,
    maxWidth: 100,
  },
});

export default TransactionsScreen;
