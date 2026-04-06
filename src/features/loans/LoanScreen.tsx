import React, {useState, useEffect, useCallback, useMemo} from 'react';
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
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Feather';
import Svg, {Rect, Line, Text as SvgText} from 'react-native-svg';
import {Colors, Typography, Spacing, BorderRadius} from '../../ui';
import {useAppStore} from '../../store/useAppStore';
import {database, loansCollection, loanPaymentsCollection, transactionsCollection, accountsCollection, categoriesCollection} from '../../database';
import {Q} from '@nozbe/watermelondb';
import type Loan from '../../database/models/Loan';
import type {InterestType} from '../../database/models/Loan';
import type LoanPayment from '../../database/models/LoanPayment';
import type Account from '../../database/models/Account';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── Financial Math Helpers ───────────────────────────────
function calcEMI(principal: number, annualRate: number, tenureMonths: number): number {
  if (annualRate === 0) return principal / tenureMonths;
  const r = annualRate / 100 / 12;
  const n = tenureMonths;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function calcTotalPayableCompound(principal: number, annualRate: number, tenureMonths: number): number {
  return calcEMI(principal, annualRate, tenureMonths) * tenureMonths;
}

function calcTotalPayableSimple(principal: number, annualRate: number, tenureMonths: number): number {
  return principal + (principal * annualRate * tenureMonths) / (100 * 12);
}

function calcTotalPayable(principal: number, annualRate: number, tenureMonths: number, type: InterestType): number {
  return type === 'compound'
    ? calcTotalPayableCompound(principal, annualRate, tenureMonths)
    : calcTotalPayableSimple(principal, annualRate, tenureMonths);
}

function calcTotalInterest(principal: number, annualRate: number, tenureMonths: number, type: InterestType): number {
  return calcTotalPayable(principal, annualRate, tenureMonths, type) - principal;
}

// ─── Types ────────────────────────────────────────────────
interface LoanWithPayments {
  loan: Loan;
  payments: LoanPayment[];
  totalPaid: number;
  totalPayable: number;
  totalInterest: number;
  emi: number;
  remaining: number;
  progress: number;
  principalPaid: number;
  interestPaid: number;
}

// ─── Mini Bar Chart Component ─────────────────────────────
const PaymentChart: React.FC<{payments: LoanPayment[]; currencySymbol: string}> = ({payments, currencySymbol}) => {
  if (payments.length === 0) return null;

  // Group payments by month
  const grouped = new Map<string, number>();
  payments.forEach(p => {
    const d = new Date(p.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    grouped.set(key, (grouped.get(key) || 0) + p.amount);
  });

  const entries = Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const maxVal = Math.max(...entries.map(e => e[1]), 1);
  const chartW = SCREEN_WIDTH - Spacing.lg * 4 - 40;
  const chartH = 100;
  const barW = Math.min(Math.max(chartW / entries.length - 6, 12), 36);

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Payment Timeline</Text>
      <Svg width={chartW} height={chartH + 20}>
        {entries.map((entry, i) => {
          const [label, val] = entry;
          const barH = (val / maxVal) * (chartH - 10);
          const x = i * (barW + 6) + 4;
          const y = chartH - barH;
          const shortLabel = label.split('-')[1];
          return (
            <React.Fragment key={label}>
              <Rect x={x} y={y} width={barW} height={barH} rx={4} fill={Colors.primary} opacity={0.85} />
              <SvgText x={x + barW / 2} y={chartH + 14} fontSize={9} fill={Colors.textTertiary} textAnchor="middle">
                {shortLabel}
              </SvgText>
            </React.Fragment>
          );
        })}
        <Line x1={0} y1={chartH} x2={chartW} y2={chartH} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      </Svg>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────
const LoanScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {userId, currencySymbol} = useAppStore();
  const [loans, setLoans] = useState<LoanWithPayments[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState<string | null>(null);

  // Add Loan form state
  const [loanName, setLoanName] = useState('');
  const [loanPrincipal, setLoanPrincipal] = useState('');
  const [loanRate, setLoanRate] = useState('');
  const [loanTenure, setLoanTenure] = useState('');
  const [loanInterestType, setLoanInterestType] = useState<InterestType>('compound');
  const [loanLenderBank, setLoanLenderBank] = useState('');

  // Add Payment form state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('');

  // Fetch accounts
  useEffect(() => {
    const sub = accountsCollection.query().observe().subscribe(setAccounts);
    return () => sub.unsubscribe();
  }, []);

  const fetchLoans = useCallback(async () => {
    try {
      const allLoans = await loansCollection.query(Q.where('status', 'active')).fetch();
      const withPayments: LoanWithPayments[] = await Promise.all(
        allLoans.map(async loan => {
          const payments = await loanPaymentsCollection
            .query(Q.where('loan_id', loan.id), Q.sortBy('date', Q.desc))
            .fetch();
            
          const totalPayable = calcTotalPayable(
            loan.principalAmount, loan.interestRate, loan.tenureMonths, loan.interestType as InterestType,
          );
          const totalInterestStatic = calcTotalInterest(
            loan.principalAmount, loan.interestRate, loan.tenureMonths, loan.interestType as InterestType,
          );
          const emi = loan.interestType === 'compound'
            ? calcEMI(loan.principalAmount, loan.interestRate, loan.tenureMonths)
            : totalPayable / loan.tenureMonths;

          let totalPaid = 0;
          let principalPaid = 0;
          let interestPaid = 0;

          if (loan.interestType === 'simple') {
            totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
            if (totalPayable > 0) {
              principalPaid = totalPaid * (loan.principalAmount / totalPayable);
              interestPaid = totalPaid * (totalInterestStatic / totalPayable);
            }
          } else {
            // Compound (Daily Amortization)
            let currentPrincipal = loan.principalAmount;
            let accruedInterestUnpaid = 0;
            let lastDate = new Date(loan.startDate).setHours(0,0,0,0);
            const dailyRate = loan.interestRate / 100 / 365;

            // sort ascending for simulation
            const sortedPayments = [...payments].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            sortedPayments.forEach(p => {
                const pDate = new Date(p.date).setHours(0,0,0,0);
                const daysPassed = Math.max(0, Math.floor((pDate - lastDate) / (1000 * 60 * 60 * 24)));
                accruedInterestUnpaid += currentPrincipal * dailyRate * daysPassed;

                let paymentLeft = p.amount;
                totalPaid += paymentLeft;

                const intPortion = Math.min(paymentLeft, accruedInterestUnpaid);
                interestPaid += intPortion;
                accruedInterestUnpaid -= intPortion;
                paymentLeft -= intPortion;

                const prinPortion = Math.min(paymentLeft, currentPrincipal);
                principalPaid += prinPortion;
                currentPrincipal = Math.max(0, currentPrincipal - paymentLeft);

                lastDate = pDate;
            });
          }

          const remaining = Math.max(totalPayable - totalPaid, 0);
          const progress = totalPayable > 0 ? Math.min(totalPaid / totalPayable, 1) : 0;
          return {
            loan, payments, totalPaid, totalPayable, 
            totalInterest: totalInterestStatic, emi, remaining, progress, 
            principalPaid, interestPaid
          };
        }),
      );
      setLoans(withPayments);
    } catch (err) {
      console.error('Failed to fetch loans:', err);
    }
  }, []);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  // ── Aggregates ──
  const aggregates = useMemo(() => {
    const totalOutstanding = loans.reduce((s, l) => s + l.remaining, 0);
    const totalInterestAll = loans.reduce((s, l) => s + l.totalInterest, 0);
    const totalPaidAll = loans.reduce((s, l) => s + l.totalPaid, 0);
    return {totalOutstanding, totalInterestAll, totalPaidAll};
  }, [loans]);

  // ── Find or create a "Loan" category for transaction sync ──
  const getLoanCategoryId = async (): Promise<string> => {
    const cats = await categoriesCollection.query(Q.where('name', 'Loan')).fetch();
    if (cats.length > 0) return cats[0].id;
    // Need to create inside a write block
    let catId = '';
    await database.write(async () => {
      const newCat = await categoriesCollection.create(c => {
        c.name = 'Loan';
        c.icon = 'briefcase';
        c.color = '#FF6B6B';
        c.type = 'expense';
        c.isDefault = false;
      });
      catId = newCat.id;
    });
    return catId;
  };

  // ── Actions ──
  const handleAddLoan = async () => {
    const principal = Number(loanPrincipal);
    const rate = Number(loanRate);
    const tenure = Number(loanTenure);
    if (!loanName.trim() || isNaN(principal) || principal <= 0) {
      Alert.alert('Invalid', 'Enter a valid loan name and principal.');
      return;
    }
    if (isNaN(rate) || rate < 0) { Alert.alert('Invalid', 'Enter a valid interest rate.'); return; }
    if (isNaN(tenure) || tenure <= 0) { Alert.alert('Invalid', 'Enter a valid tenure.'); return; }

    try {
      await database.write(async () => {
        await loansCollection.create(l => {
          l.name = loanName.trim();
          l.principalAmount = principal;
          l.interestRate = rate;
          l.interestType = loanInterestType;
          l.tenureMonths = tenure;
          l.startDate = new Date();
          l.lenderBank = loanLenderBank.trim() || null;
          l.status = 'active';
          l.userId = userId || 'mock_user_123';
        });
      });
      setShowAddLoan(false);
      setLoanName(''); setLoanPrincipal(''); setLoanRate(''); setLoanTenure('');
      setLoanInterestType('compound'); setLoanLenderBank('');
      fetchLoans();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to add loan.');
    }
  };

  const handleAddPayment = async () => {
    const amount = Number(paymentAmount);
    if (isNaN(amount) || amount <= 0 || !showAddPayment) {
      Alert.alert('Invalid', 'Enter a valid payment amount.');
      return;
    }
    try {
      // Get or create Loan category BEFORE the main write block
      const loanCategoryId = await getLoanCategoryId();
      const currentLoan = loans.find(l => l.loan.id === showAddPayment);

      await database.write(async () => {
        // 1. Create the loan payment record
        await loanPaymentsCollection.create(p => {
          p.loanId = showAddPayment;
          p.amount = amount;
          p.date = new Date();
          p.notes = paymentNotes.trim() || null;
          p.accountId = paymentAccountId || null;
          p.userId = userId || 'mock_user_123';
        });

        // 2. Sync → create a matching expense transaction
        await transactionsCollection.create(txn => {
          txn.amount = amount;
          txn.merchant = currentLoan?.loan.name || 'Loan Payment';
          txn.notes = `Loan EMI Payment${currentLoan?.loan.lenderBank ? ` — ${currentLoan.loan.lenderBank}` : ''}`;
          txn.date = new Date();
          txn.type = 'expense';
          txn.source = 'manual';
          txn.categoryId = loanCategoryId;
          txn.userId = userId || 'mock_user_123';
          if (paymentAccountId) txn.accountId = paymentAccountId;
        });
      });

      setShowAddPayment(null);
      setPaymentAmount(''); setPaymentNotes(''); setPaymentAccountId('');
      fetchLoans();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to add payment.');
    }
  };

  const handleDeleteLoan = (loanId: string, name: string) => {
    Alert.alert('Delete Loan', `Remove "${name}" and all its payments?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await database.write(async () => {
              const loan = await loansCollection.find(loanId);
              const payments = await loanPaymentsCollection.query(Q.where('loan_id', loanId)).fetch();
              const batch: any[] = payments.map(p => p.prepareMarkAsDeleted());
              batch.push(loan.prepareMarkAsDeleted());
              await database.batch(...batch);
            });
            fetchLoans();
          } catch (e: any) { Alert.alert('Error', e?.message || 'Failed to delete.'); }
        },
      },
    ]);
  };

  const fmt = (n: number) => currencySymbol + n.toLocaleString('en-IN', {maximumFractionDigits: 0});

  // ── Render Loan Card ──
  const renderLoanCard = ({item, index}: {item: LoanWithPayments; index: number}) => {
    const {loan, totalPaid, totalPayable, totalInterest, emi, remaining, progress, principalPaid, interestPaid} = item;
    const progressPercent = Math.round(progress * 100);
    const isExpanded = expandedLoan === loan.id;
    const monthsRemaining = emi > 0 ? Math.ceil(remaining / emi) : 0;

    return (
      <Animated.View entering={FadeInDown.delay(100 + index * 80).duration(500).springify()}>
        <View style={styles.loanCard}>
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <View style={styles.loanIcon}>
                <Icon name="briefcase" size={18} color={Colors.primary} />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.loanName}>{loan.name}</Text>
                <Text style={styles.loanMeta}>
                  {loan.interestRate}% {loan.interestType === 'compound' ? 'Compound' : 'Simple'} · {loan.tenureMonths}mo
                </Text>
              </View>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteLoan(loan.id, loan.name)}>
                <Icon name="trash-2" size={16} color="#FF3C3C" />
              </TouchableOpacity>
            </View>
            {loan.lenderBank ? (
              <View style={styles.bankTag}>
                <Icon name="home" size={12} color={Colors.primary} />
                <Text style={styles.bankTagText}>{loan.lenderBank}</Text>
              </View>
            ) : null}
          </View>

          {/* Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>{progressPercent}% paid</Text>
              <Text style={styles.progressLabel}>{fmt(totalPaid)} of {fmt(totalPayable)}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, {
                width: `${progressPercent}%`,
                backgroundColor: progressPercent > 80 ? '#00E676' : progressPercent > 40 ? '#FFB020' : Colors.primary,
              }]} />
            </View>
          </View>

          {/* Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Principal</Text>
              <Text style={styles.metricValue}>{fmt(loan.principalAmount)}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Total Interest</Text>
              <Text style={[styles.metricValue, {color: '#FF6B6B'}]}>{fmt(totalInterest)}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Monthly EMI</Text>
              <Text style={[styles.metricValue, {color: '#FFB020'}]}>{fmt(emi)}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Remaining</Text>
              <Text style={[styles.metricValue, {color: '#00E676'}]}>{fmt(remaining)}</Text>
            </View>
          </View>

          {/* Analytics Toggle */}
          <TouchableOpacity
            style={styles.analyticsToggle}
            activeOpacity={0.7}
            onPress={() => setExpandedLoan(isExpanded ? null : loan.id)}>
            <Icon name={isExpanded ? 'chevron-up' : 'bar-chart-2'} size={16} color={Colors.textSecondary} />
            <Text style={styles.analyticsToggleText}>{isExpanded ? 'Hide Analytics' : 'View Analytics'}</Text>
          </TouchableOpacity>

          {/* Expanded Analytics Section */}
          {isExpanded && (
            <View style={styles.analyticsSection}>
              {/* Payment Chart */}
              <PaymentChart payments={item.payments} currencySymbol={currencySymbol} />

              {/* Principal vs Interest Breakdown */}
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownItem}>
                  <View style={[styles.breakdownDot, {backgroundColor: Colors.primary}]} />
                  <View>
                    <Text style={styles.breakdownLabel}>Principal Paid</Text>
                    <Text style={styles.breakdownValue}>{fmt(principalPaid)}</Text>
                  </View>
                </View>
                <View style={styles.breakdownItem}>
                  <View style={[styles.breakdownDot, {backgroundColor: '#FF6B6B'}]} />
                  <View>
                    <Text style={styles.breakdownLabel}>Interest Paid</Text>
                    <Text style={styles.breakdownValue}>{fmt(interestPaid)}</Text>
                  </View>
                </View>
              </View>

              {/* Estimated Payoff */}
              <View style={styles.payoffCard}>
                <Icon name="calendar" size={16} color={Colors.primary} />
                <View style={{flex: 1}}>
                  <Text style={styles.payoffLabel}>Estimated Payoff</Text>
                  <Text style={styles.payoffValue}>
                    ~{monthsRemaining} month{monthsRemaining !== 1 ? 's' : ''} remaining at current EMI
                  </Text>
                </View>
              </View>

              {/* Full Payment History */}
              {item.payments.length > 0 && (
                <View style={styles.paymentHistory}>
                  <Text style={styles.paymentHistoryTitle}>All Payments ({item.payments.length})</Text>
                  {item.payments.map(p => (
                    <View key={p.id} style={styles.paymentRow}>
                      <View>
                        <Text style={styles.paymentDate}>
                          {new Date(p.date).toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'})}
                        </Text>
                        {p.notes ? <Text style={styles.paymentNoteText}>{p.notes}</Text> : null}
                      </View>
                      <Text style={styles.paymentAmt}>{fmt(p.amount)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Add Payment Button */}
          <TouchableOpacity style={styles.addPaymentBtn} activeOpacity={0.8} onPress={() => {
            setShowAddPayment(loan.id);
            if (accounts.length > 0) setPaymentAccountId(accounts[0].id);
          }}>
            <Icon name="plus-circle" size={18} color="#000" />
            <Text style={styles.addPaymentText}>Add Payment</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.screenTitle}>Loan Tracker</Text>
            <Text style={styles.screenSubtitle}>Manage your loans & payments</Text>
          </View>
        </View>

        {loans.length > 0 && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Outstanding</Text>
              <Text style={[styles.summaryValue, {color: '#FF6B6B'}]}>{fmt(aggregates.totalOutstanding)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Paid</Text>
              <Text style={[styles.summaryValue, {color: '#00E676'}]}>{fmt(aggregates.totalPaidAll)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Interest</Text>
              <Text style={[styles.summaryValue, {color: '#FFB020'}]}>{fmt(aggregates.totalInterestAll)}</Text>
            </View>
          </View>
        )}
      </View>

      {loans.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="inbox" size={56} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No Loans Added</Text>
          <Text style={styles.emptyBody}>Tap the button below to track your first loan.</Text>
        </View>
      ) : (
        <FlatList
          data={loans}
          keyExtractor={item => item.loan.id}
          renderItem={renderLoanCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => setShowAddLoan(true)}>
        <Icon name="plus" size={26} color="#000" />
      </TouchableOpacity>

      {/* ── Add Loan Modal ── */}
      <Modal visible={showAddLoan} transparent animationType="slide" onRequestClose={() => setShowAddLoan(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAddLoan(false)}>
            <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Add New Loan</Text>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <TextInput style={styles.input} placeholder="Loan Name (e.g. Home Loan)"
                  placeholderTextColor={Colors.textTertiary} value={loanName} onChangeText={setLoanName} />
                <TextInput style={styles.input} placeholder="Lender Bank (e.g. SBI, HDFC)"
                  placeholderTextColor={Colors.textTertiary} value={loanLenderBank} onChangeText={setLoanLenderBank} />
                <TextInput style={styles.input} placeholder="Principal Amount"
                  placeholderTextColor={Colors.textTertiary} keyboardType="numeric" value={loanPrincipal} onChangeText={setLoanPrincipal} />
                <TextInput style={styles.input} placeholder="Annual Interest Rate (%)"
                  placeholderTextColor={Colors.textTertiary} keyboardType="numeric" value={loanRate} onChangeText={setLoanRate} />
                <TextInput style={styles.input} placeholder="Tenure (months)"
                  placeholderTextColor={Colors.textTertiary} keyboardType="numeric" value={loanTenure} onChangeText={setLoanTenure} />

                <Text style={styles.sectionLabel}>Interest Type</Text>
                <View style={styles.typePicker}>
                  {(['compound', 'simple'] as InterestType[]).map(t => (
                    <TouchableOpacity key={t}
                      style={[styles.typeOption, loanInterestType === t && styles.typeOptionActive]}
                      onPress={() => setLoanInterestType(t)}>
                      <Text style={[styles.typeText, loanInterestType === t && styles.typeTextActive]}>
                        {t === 'compound' ? 'Compound (EMI)' : 'Simple'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.submitBtn} onPress={handleAddLoan} activeOpacity={0.85}>
                  <Icon name="check" size={20} color="#000" />
                  <Text style={styles.submitText}>Add Loan</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Add Payment Modal ── */}
      <Modal visible={!!showAddPayment} transparent animationType="slide" onRequestClose={() => setShowAddPayment(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAddPayment(null)}>
            <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Log Payment</Text>

              <TextInput style={styles.input} placeholder="Payment Amount"
                placeholderTextColor={Colors.textTertiary} keyboardType="numeric" value={paymentAmount}
                onChangeText={setPaymentAmount} autoFocus />
              <TextInput style={styles.input} placeholder="Notes (optional)"
                placeholderTextColor={Colors.textTertiary} value={paymentNotes} onChangeText={setPaymentNotes} />

              <Text style={styles.sectionLabel}>Pay From Account</Text>
              {accounts.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                  {accounts.map(acc => (
                    <TouchableOpacity key={acc.id}
                      style={[styles.chip, paymentAccountId === acc.id && styles.chipActive]}
                      onPress={() => setPaymentAccountId(acc.id)}>
                      <View style={[styles.chipDot, {backgroundColor: acc.color}]} />
                      <Text style={styles.chipText}>{acc.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <Text style={{color: Colors.textTertiary, fontSize: Typography.bodySmall, marginBottom: Spacing.xl}}>
                  No bank accounts linked. You can record the payment without an account, or add one in settings.
                </Text>
              )}

              <TouchableOpacity style={styles.submitBtn} onPress={handleAddPayment} activeOpacity={0.85}>
                <Icon name="check" size={20} color="#000" />
                <Text style={styles.submitText}>Record Payment</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 10 : 50,
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg,
    backgroundColor: Colors.background, zIndex: 10,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center',
  },
  screenTitle: { fontSize: Typography.h1, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  screenSubtitle: { fontSize: Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  summaryRow: { flexDirection: 'row', gap: Spacing.sm },
  summaryCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  summaryLabel: { fontSize: 10, color: Colors.textTertiary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  summaryValue: { fontSize: Typography.body, fontWeight: '700', color: Colors.textPrimary },
  listContent: { padding: Spacing.lg, paddingBottom: 120, gap: Spacing.lg },
  loanCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  cardHeader: { marginBottom: Spacing.md },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  loanIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255, 183, 0, 0.12)', justifyContent: 'center', alignItems: 'center',
  },
  loanName: { fontSize: Typography.h3, fontWeight: '700', color: Colors.textPrimary },
  loanMeta: { fontSize: Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  bankTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,183,0,0.08)', paddingHorizontal: Spacing.sm, paddingVertical: 3,
    borderRadius: BorderRadius.round, alignSelf: 'flex-start', marginTop: Spacing.sm,
  },
  bankTagText: { fontSize: Typography.tiny, color: Colors.primary, fontWeight: '600' },
  deleteBtn: { padding: Spacing.sm, borderRadius: BorderRadius.round, backgroundColor: 'rgba(255, 60, 60, 0.08)' },
  progressSection: { marginBottom: Spacing.lg },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: Typography.caption, color: Colors.textSecondary, fontWeight: '500' },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  metricItem: {
    width: '47%', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: BorderRadius.sm,
    padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },
  metricLabel: { fontSize: 10, color: Colors.textTertiary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  metricValue: { fontSize: Typography.body, fontWeight: '700', color: Colors.textPrimary },
  // ── Analytics ──
  analyticsToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: Spacing.md,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)', marginBottom: Spacing.md,
  },
  analyticsToggleText: { fontSize: Typography.caption, color: Colors.textSecondary, fontWeight: '600' },
  analyticsSection: { marginBottom: Spacing.md },
  chartContainer: { marginBottom: Spacing.lg },
  chartTitle: { fontSize: Typography.caption, color: Colors.textSecondary, fontWeight: '600', marginBottom: Spacing.md },
  breakdownRow: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.lg },
  breakdownItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  breakdownDot: { width: 10, height: 10, borderRadius: 5 },
  breakdownLabel: { fontSize: 10, color: Colors.textTertiary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  breakdownValue: { fontSize: Typography.body, fontWeight: '700', color: Colors.textPrimary },
  payoffCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: 'rgba(255,183,0,0.06)', borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.lg,
  },
  payoffLabel: { fontSize: 10, color: Colors.textTertiary, fontWeight: '600', textTransform: 'uppercase' },
  payoffValue: { fontSize: Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  paymentHistory: {
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: BorderRadius.sm,
    padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)', marginBottom: Spacing.md,
  },
  paymentHistoryTitle: { fontSize: Typography.caption, color: Colors.textSecondary, fontWeight: '600', marginBottom: Spacing.sm },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  paymentDate: { fontSize: Typography.caption, color: Colors.textTertiary },
  paymentNoteText: { fontSize: Typography.tiny, color: Colors.textTertiary, marginTop: 1 },
  paymentAmt: { fontSize: Typography.caption, color: '#00E676', fontWeight: '600' },
  addPaymentBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, backgroundColor: Colors.primary, paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
  },
  addPaymentText: { fontSize: Typography.body, fontWeight: '700', color: '#000' },
  fab: {
    position: 'absolute', bottom: 100, right: Spacing.lg, width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
    elevation: 8, shadowColor: Colors.primary, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.4, shadowRadius: 12,
  },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  emptyTitle: { fontSize: Typography.h2, fontWeight: '700', color: Colors.textPrimary },
  emptyBody: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: Spacing.xl * 2 },
  // ── Modals ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xl,
    width: '100%',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontSize: Typography.h2, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.xl },
  input: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.md, padding: Spacing.lg, color: Colors.textPrimary, fontSize: Typography.body, marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: Typography.bodySmall, color: Colors.textSecondary, fontWeight: '600',
    marginBottom: Spacing.md, marginTop: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  typePicker: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: BorderRadius.md, padding: 4, marginBottom: Spacing.xl },
  typeOption: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: BorderRadius.sm },
  typeOptionActive: { backgroundColor: Colors.primary },
  typeText: { fontSize: Typography.bodySmall, fontWeight: '500', color: Colors.textSecondary },
  typeTextActive: { color: '#000', fontWeight: '700' },
  chipScroll: { marginBottom: Spacing.xl },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: BorderRadius.round,
    marginRight: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  chipActive: { backgroundColor: 'rgba(255, 183, 0, 0.1)', borderColor: Colors.primary },
  chipDot: { width: 10, height: 10, borderRadius: 5 },
  chipText: { fontSize: Typography.bodySmall, color: Colors.textSecondary, fontWeight: '600' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, backgroundColor: Colors.primary, paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md, marginTop: Spacing.md,
  },
  submitText: { fontSize: Typography.body, fontWeight: '700', color: '#000' },
});

export default LoanScreen;
