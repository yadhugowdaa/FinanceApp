import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Platform,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Feather';
import {Colors, Typography, Spacing, BorderRadius} from '../../ui';
import {useAppStore} from '../../store/useAppStore';
import {
  categoriesCollection,
  accountsCollection,
  recurringTransactionsCollection,
  database,
} from '../../database';
import type Category from '../../database/models/Category';
import {processRecurringTransactions} from '../../services/RecurringService';
import type Account from '../../database/models/Account';
import type RecurringTransaction from '../../database/models/RecurringTransaction';
import type {RecurringFrequency} from '../../database/models/RecurringTransaction';

const RecurringScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {userId, currencySymbol} = useAppStore();
  const [rules, setRules] = useState<RecurringTransaction[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Add Rule Form State
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [ruleType, setRuleType] = useState<'expense' | 'income'>('expense');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRules = useCallback(async () => {
    try {
      const allRules = await recurringTransactionsCollection.query().fetch();
      setRules(allRules);
    } catch (e) {
      console.log('Failed fetching recurring logic', e);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  useEffect(() => {
    if (!showAddModal) return;
    const fetchSelectableOptions = async () => {
      const dbCategories = await categoriesCollection.query().fetch();
      const filteredCategories = dbCategories.filter(c => c.type === ruleType);
      setCategories(filteredCategories);
      if (filteredCategories.length > 0) setSelectedCategoryId(filteredCategories[0].id);

      const dbAccounts = await accountsCollection.query().fetch();
      setAccounts(dbAccounts);
      if (dbAccounts.length > 0) setSelectedAccountId(dbAccounts[0].id);
    };
    fetchSelectableOptions();
  }, [showAddModal, ruleType]);

  const handleCreate = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive number.');
      return;
    }
    if (!merchant.trim()) {
      Alert.alert('Missing Name', 'Please specify who this is paid to/from.');
      return;
    }
    if (!selectedCategoryId || !selectedAccountId) {
      Alert.alert('Missing Details', 'Please select a Category and an Account.');
      return;
    }

    setLoading(true);
    try {
      await database.write(async () => {
        const nextDate = new Date(); // set rule to trigger today

        await recurringTransactionsCollection.create(rule => {
          rule.amount = Number(amount);
          rule.merchant = merchant.trim();
          rule.type = ruleType;
          rule.frequency = frequency;
          rule.categoryId = selectedCategoryId;
          rule.accountId = selectedAccountId;
          rule.userId = userId || 'mock_user_123';
          rule.status = 'active';
          rule.nextDate = nextDate;
          rule.endDate = null;
        });
      });
      // process it immediately so it appears on the dashboard!
      await processRecurringTransactions();
      
      fetchRules();
      setShowAddModal(false);
      setAmount('');
      setMerchant('');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create recurring rule.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (rule: RecurringTransaction) => {
    try {
      const newStatus = rule.status === 'active' ? 'paused' : 'active';
      await rule.setStatus(newStatus);
      fetchRules();
    } catch (err) {
      Alert.alert('Error', 'Could not update status');
    }
  };

  const handleDelete = (rule: RecurringTransaction) => {
    Alert.alert('Delete Rule', `Are you sure you want to stop this auto-pay?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await rule.markDeleted();
            fetchRules();
          } catch (e) {
            Alert.alert('Error', 'Failed to delete');
          }
        },
      },
    ]);
  };

  const renderRuleCard = ({item, index}: {item: RecurringTransaction; index: number}) => {
    const isIncome = item.type === 'income';
    const amountColor = isIncome ? '#00E676' : '#FF3C3C';
    const iconName = isIncome ? 'arrow-down-left' : 'arrow-up-right';

    return (
      <Animated.View entering={FadeInDown.delay(100 + index * 50).duration(500).springify()}>
        <View style={[styles.card, item.status === 'paused' && {opacity: 0.5}]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <View style={[styles.iconCircle, {backgroundColor: isIncome ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 60, 60, 0.1)'}]}>
                <Icon name={iconName} size={18} color={amountColor} />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.merchant}>{item.merchant}</Text>
                <Text style={styles.frequencyBadge}>
                  {item.frequency} • Next: {new Date(item.nextDate).toLocaleDateString('en-IN', {day: 'numeric', month: 'short'})}
                </Text>
              </View>
              <Text style={[styles.amount, {color: amountColor}]}>
                {isIncome ? '+' : '-'}{currencySymbol}{item.amount.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleToggleStatus(item)}>
              <Icon name={item.status === 'active' ? 'pause' : 'play'} size={16} color={Colors.textSecondary} />
              <Text style={styles.actionText}>{item.status === 'active' ? 'Pause' : 'Resume'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
              <Icon name="trash-2" size={16} color="#FF3C3C" />
              <Text style={[styles.actionText, {color: '#FF3C3C'}]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.screenTitle}>Auto Pay</Text>
            <Text style={styles.screenSubtitle}>Manage recurring transactions</Text>
          </View>
        </View>
      </View>

      {rules.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="refresh-cw" size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No Auto Pays</Text>
          <Text style={styles.emptyBody}>Set up recurring expenses or incomes, and we will automatically log them for you.</Text>
        </View>
      ) : (
        <FlatList
          data={rules}
          keyExtractor={item => item.id}
          renderItem={renderRuleCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => setShowAddModal(true)}>
        <Icon name="plus" size={26} color="#000" />
      </TouchableOpacity>

      {/* Add Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAddModal(false)}>
            <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>New Auto Pay</Text>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.typePicker}>
                  <TouchableOpacity
                    style={[styles.typeOption, ruleType === 'expense' && {backgroundColor: '#FF3C3C'}]}
                    onPress={() => setRuleType('expense')}>
                    <Text style={[styles.typeText, ruleType === 'expense' && {color: '#fff', fontWeight: '700'}]}>Expense</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeOption, ruleType === 'income' && {backgroundColor: '#00E676'}]}
                    onPress={() => setRuleType('income')}>
                    <Text style={[styles.typeText, ruleType === 'income' && {color: '#fff', fontWeight: '700'}]}>Income</Text>
                  </TouchableOpacity>
                </View>

                <TextInput style={styles.input} placeholder="Amount" placeholderTextColor={Colors.textTertiary}
                  keyboardType="numeric" value={amount} onChangeText={setAmount} />
                <TextInput style={styles.input} placeholder={ruleType === 'expense' ? 'Paid to (Merchant)' : 'Received from'}
                  placeholderTextColor={Colors.textTertiary} value={merchant} onChangeText={setMerchant} />

                <Text style={styles.sectionLabel}>Frequency</Text>
                <View style={styles.frequencyPicker}>
                  {(['weekly', 'monthly', 'yearly'] as RecurringFrequency[]).map(f => (
                    <TouchableOpacity key={f}
                      style={[styles.frequencyOption, frequency === f && styles.frequencyOptionActive]}
                      onPress={() => setFrequency(f)}>
                      <Text style={[styles.frequencyText, frequency === f && styles.frequencyTextActive]}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionLabel}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                  {categories.map(cat => (
                    <TouchableOpacity key={cat.id}
                      style={[styles.chip, selectedCategoryId === cat.id && styles.chipActive]}
                      onPress={() => setSelectedCategoryId(cat.id)}>
                      <Text style={styles.chipText}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.sectionLabel}>{ruleType === 'expense' ? 'Charge From' : 'Deposit To'}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                  {accounts.map(acc => (
                    <TouchableOpacity key={acc.id}
                      style={[styles.chip, selectedAccountId === acc.id && styles.chipActive]}
                      onPress={() => setSelectedAccountId(acc.id)}>
                      <Text style={styles.chipText}>{acc.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity style={[styles.submitBtn, loading && {opacity: 0.7}]} onPress={handleCreate} disabled={loading} activeOpacity={0.85}>
                  {!loading && <Icon name="check" size={20} color="#000" />}
                  <Text style={styles.submitText}>{loading ? 'Saving...' : 'Set Auto Pay'}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 10 : 50,
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
    backgroundColor: Colors.background, zIndex: 10,
  },
  headerRow: {flexDirection: 'row', alignItems: 'center', gap: Spacing.md},
  backBtn: {width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center'},
  screenTitle: {fontSize: Typography.h1, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5},
  screenSubtitle: {fontSize: Typography.caption, color: Colors.textSecondary, marginTop: 2},
  
  listContent: {padding: Spacing.lg, paddingBottom: 120, gap: Spacing.lg},
  card: {backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden'},
  cardHeader: {padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.02)'},
  cardTitleRow: {flexDirection: 'row', alignItems: 'center', gap: Spacing.md},
  iconCircle: {width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center'},
  merchant: {fontSize: Typography.h3, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2},
  frequencyBadge: {fontSize: Typography.tiny, color: Colors.textTertiary, textTransform: 'uppercase', fontWeight: '600', letterSpacing: 0.5},
  amount: {fontSize: Typography.h3, fontWeight: '700'},
  cardActions: {flexDirection: 'row', padding: Spacing.sm},
  actionBtn: {flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.sm},
  actionText: {fontSize: Typography.bodySmall, fontWeight: '600', color: Colors.textSecondary},
  
  emptyState: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl},
  emptyTitle: {fontSize: Typography.h2, fontWeight: '700', color: Colors.textPrimary, marginTop: Spacing.lg, marginBottom: Spacing.xs},
  emptyBody: {fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: Spacing.xl},
  
  fab: {
    position: 'absolute', right: Spacing.xl, bottom: 40,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.primary, shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  
  // Modals
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end'},
  modalSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '90%', paddingTop: Spacing.lg, paddingHorizontal: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xl, width: '100%',
  },
  modalHandle: {width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: Spacing.lg},
  modalTitle: {fontSize: Typography.h2, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.lg},
  
  typePicker: {flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: BorderRadius.md, padding: 4, marginBottom: Spacing.lg},
  typeOption: {flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: BorderRadius.sm},
  typeText: {fontSize: Typography.body, fontWeight: '600', color: Colors.textSecondary},
  
  input: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.md, padding: Spacing.lg, color: Colors.textPrimary, fontSize: Typography.body, marginBottom: Spacing.lg,
  },
  sectionLabel: {fontSize: Typography.tiny, color: Colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm},
  frequencyPicker: {flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: BorderRadius.md, padding: 4, marginBottom: Spacing.lg},
  frequencyOption: {flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: BorderRadius.sm},
  frequencyOptionActive: {backgroundColor: 'rgba(255,255,255,0.1)'},
  frequencyText: {fontSize: Typography.bodySmall, fontWeight: '500', color: Colors.textSecondary},
  frequencyTextActive: {color: Colors.textPrimary, fontWeight: '700'},
  
  chipScroll: {marginBottom: Spacing.lg, flexGrow: 0},
  chip: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.round, marginRight: Spacing.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  chipActive: {backgroundColor: 'rgba(255, 183, 0, 0.1)', borderColor: Colors.primary},
  chipText: {fontSize: Typography.bodySmall, color: Colors.textSecondary, fontWeight: '600'},
  
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: BorderRadius.round, paddingVertical: Spacing.lg, marginTop: Spacing.md,
  },
  submitText: {color: '#000', fontSize: Typography.body, fontWeight: '700'},
});

export default RecurringScreen;
