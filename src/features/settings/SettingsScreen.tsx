import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Modal,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import {Colors, Typography, Spacing, BorderRadius, LiquidGlass} from '../../ui';
import Icon from 'react-native-vector-icons/Feather';
import RNShare from 'react-native-share';
import {generatePDF} from 'react-native-html-to-pdf';
import RNFS from 'react-native-fs';
import {useAppStore} from '../../store/useAppStore';
import {exportTransactionsCSV} from '../../services/TransactionService';
import {database, accountsCollection} from '../../database';
import {Account} from '../../database/models';
import {BANKS, getBankByCode, BankInfo} from '../../data/banks';

const CURRENCIES = [
  {symbol: '\u20b9', label: 'INR', name: 'Indian Rupee'},
  {symbol: '$', label: 'USD', name: 'US Dollar'},
  {symbol: '\u20ac', label: 'EUR', name: 'Euro'},
  {symbol: '\u00a3', label: 'GBP', name: 'British Pound'},
  {symbol: '\u00a5', label: 'JPY', name: 'Japanese Yen'},
];

const SettingsScreen: React.FC = () => {
  const {phoneNumber, clearAuth, userId, currencySymbol, setCurrencySymbol} = useAppStore();
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);

  // Bank Accounts state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [addAccountModalVisible, setAddAccountModalVisible] = useState(false);
  const [selectedBank, setSelectedBank] = useState<BankInfo | null>(null);
  const [accountNumberInput, setAccountNumberInput] = useState('');

  React.useEffect(() => {
    if (!userId) return;
    const subscription = accountsCollection
      .query()
      .observe()
      .subscribe(setAccounts);

    return () => subscription.unsubscribe();
  }, [userId]);

  const handleAddAccount = async () => {
    if (!selectedBank || !userId) return;

    try {
      await database.write(async () => {
        await accountsCollection.create(record => {
          record.name = selectedBank.name;
          record.bankCode = selectedBank.code;
          record.accountNumber = accountNumberInput;
          record.color = selectedBank.color;
          record.icon = selectedBank.icon;
          record.userId = userId;
          record.isDefault = false; // keep default as first one created usually
        });
      });
      setAddAccountModalVisible(false);
      setSelectedBank(null);
      setAccountNumberInput('');
    } catch (err) {
      Alert.alert('Error', 'Failed to add account.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => clearAuth(),
      },
    ]);
  };

  const handleExportCSV = async () => {
    if (!userId) { Alert.alert('Error', 'Please log in first.'); return; }
    setExporting('csv');
    try {
      const csv = await exportTransactionsCSV(userId);
      const fileName = `FinPace_Transactions_${new Date().toISOString().slice(0, 10)}.csv`;
      const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;

      await RNFS.writeFile(filePath, csv, 'utf8');

      await RNShare.open({
        title: 'Export Transactions (CSV)',
        url: `file://${filePath}`,
        type: 'text/csv',
        failOnCancel: false,
      });
    } catch (err: any) {
      console.error('CSV export error:', err);
      if (!err?.message?.includes('cancel')) {
        Alert.alert('Export Failed', 'Could not export CSV.');
      }
    } finally {
      setExporting(null);
    }
  };

  const handleExportPDF = async () => {
    if (!userId) { Alert.alert('Error', 'Please log in first.'); return; }
    setExporting('pdf');
    try {
      const csv = await exportTransactionsCSV(userId);
      const lines = csv.split('\n');
      const headers = lines[0].split(',');
      const rows = lines.slice(1).map(line => {
        // Simple CSV parse (handles quoted fields)
        const cols: string[] = [];
        let current = '';
        let inQuotes = false;
        for (const ch of line) {
          if (ch === '"') { inQuotes = !inQuotes; }
          else if (ch === ',' && !inQuotes) { cols.push(current); current = ''; }
          else { current += ch; }
        }
        cols.push(current);
        return cols;
      });

      const tableRows = rows.map(r =>
        `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`
      ).join('');

      const html = `
        <html>
        <head>
          <style>
            body { font-family: -apple-system, sans-serif; padding: 20px; color: #222; }
            h1 { font-size: 22px; margin-bottom: 4px; }
            h3 { font-size: 13px; color: #888; font-weight: 400; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { background: #1a1a1a; color: #fff; padding: 8px 6px; text-align: left; }
            td { padding: 7px 6px; border-bottom: 1px solid #eee; }
            tr:nth-child(even) { background: #f9f9f9; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #aaa; }
          </style>
        </head>
        <body>
          <h1>FinPace Transaction Report</h1>
          <h3>Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</h3>
          <table>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
            ${tableRows}
          </table>
          <div class="footer">Generated by FinPace &mdash; Personal Finance Companion</div>
        </body>
        </html>
      `;

      const pdf = await generatePDF({
        html,
        fileName: `FinPace_Report_${new Date().toISOString().slice(0, 10)}`,
        width: 612,
        height: 792,
      });

      if (pdf.filePath) {
        await RNShare.open({
          title: 'Export Transactions (PDF)',
          url: `file://${pdf.filePath}`,
          type: 'application/pdf',
          failOnCancel: false,
        });
      }
    } catch (err: any) {
      console.error('PDF export error:', err);
      Alert.alert('Export Failed', 'Could not generate PDF.');
    } finally {
      setExporting(null);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your transactions. This action cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.write(async () => {
                await database.unsafeResetDatabase();
              });
              Alert.alert('Done', 'All data has been cleared.');
            } catch (err) {
              console.error('Clear data error:', err);
            }
          },
        },
      ],
    );
  };

  const currentCurrency = CURRENCIES.find(c => c.symbol === currencySymbol) || CURRENCIES[0];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* Account Section */}
        <LiquidGlass borderRadius={20} useBlur={true} style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Icon name="user" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Account</Text>
          </View>

          <TouchableOpacity style={styles.settingItem} activeOpacity={0.7}>
            <View style={styles.settingLeft}>
              <Icon name="phone" size={18} color={Colors.textSecondary} />
              <Text style={styles.settingLabel}>Phone Number</Text>
            </View>
            <Text style={styles.settingValue}>{phoneNumber ?? '\u2014'}</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingItem}
            activeOpacity={0.7}
            onPress={() => setCurrencyModalVisible(true)}>
            <View style={styles.settingLeft}>
              <Icon name="dollar-sign" size={18} color={Colors.textSecondary} />
              <Text style={styles.settingLabel}>Currency</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>
                {currentCurrency.symbol} {currentCurrency.label}
              </Text>
              <Icon name="chevron-right" size={16} color={Colors.textTertiary} />
            </View>
          </TouchableOpacity>
        </LiquidGlass>

        {/* Bank Accounts Section */}
        <LiquidGlass borderRadius={20} useBlur={true} style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Icon name="credit-card" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Bank Accounts</Text>
          </View>

          {accounts.map((acc, index) => (
            <React.Fragment key={acc.id}>
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <View style={[styles.bankIconBg, {backgroundColor: acc.color}]}>
                    <Icon name={acc.icon} size={14} color="#FFF" />
                  </View>
                  <Text style={styles.settingLabel}>{acc.name}</Text>
                </View>
                <Text style={styles.settingValue}>
                  {acc.accountNumber ? `••${acc.accountNumber}` : 'Local'}
                </Text>
              </View>
              {index < accounts.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingItem}
            activeOpacity={0.7}
            onPress={() => {
              setSelectedBank(null);
              setAccountNumberInput('');
              setAddAccountModalVisible(true);
            }}>
            <View style={styles.settingLeft}>
              <View style={styles.addBankIconBg}>
                <Icon name="plus" size={14} color={Colors.primary} />
              </View>
              <Text style={styles.addBankLabel}>Add Account</Text>
            </View>
            <Icon name="chevron-right" size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
        </LiquidGlass>

        {/* Data Section */}
        <LiquidGlass borderRadius={20} useBlur={true} style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Icon name="database" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Data</Text>
          </View>

           <TouchableOpacity
            style={styles.settingItem}
            activeOpacity={0.7}
            onPress={handleExportCSV}
            disabled={exporting !== null}>
            <View style={styles.settingLeft}>
              <Icon name="file-text" size={18} color={Colors.textSecondary} />
              <Text style={styles.settingLabel}>Export as CSV</Text>
            </View>
            {exporting === 'csv' ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Icon name="chevron-right" size={16} color={Colors.textTertiary} />
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingItem}
            activeOpacity={0.7}
            onPress={handleExportPDF}
            disabled={exporting !== null}>
            <View style={styles.settingLeft}>
              <Icon name="file" size={18} color={Colors.textSecondary} />
              <Text style={styles.settingLabel}>Export as PDF</Text>
            </View>
            {exporting === 'pdf' ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Icon name="chevron-right" size={16} color={Colors.textTertiary} />
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingItem}
            activeOpacity={0.7}
            onPress={handleClearData}>
            <View style={styles.settingLeft}>
              <Icon name="trash-2" size={18} color={Colors.danger} />
              <Text style={[styles.settingLabel, {color: Colors.danger}]}>
                Clear All Data
              </Text>
            </View>
            <Icon name="chevron-right" size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
        </LiquidGlass>

        {/* About Section */}
        <LiquidGlass borderRadius={20} useBlur={true} style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Icon name="info" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>About</Text>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name="smartphone" size={18} color={Colors.textSecondary} />
              <Text style={styles.settingLabel}>App Version</Text>
            </View>
            <Text style={styles.settingValue}>1.0.0</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name="code" size={18} color={Colors.textSecondary} />
              <Text style={styles.settingLabel}>Built with</Text>
            </View>
            <Text style={styles.settingValue}>React Native + WatermelonDB</Text>
          </View>
        </LiquidGlass>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="log-out" size={18} color={Colors.danger} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Currency Picker Modal */}
      <Modal
        visible={currencyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCurrencyModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCurrencyModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Currency</Text>
            {CURRENCIES.map(c => (
              <TouchableOpacity
                key={c.label}
                style={[
                  styles.currencyOption,
                  currencySymbol === c.symbol && styles.currencyOptionActive,
                ]}
                onPress={() => {
                  setCurrencySymbol(c.symbol);
                  setCurrencyModalVisible(false);
                }}>
                <Text style={styles.currencySymbol}>{c.symbol}</Text>
                <View style={styles.currencyInfo}>
                  <Text style={styles.currencyLabel}>{c.label}</Text>
                  <Text style={styles.currencyName}>{c.name}</Text>
                </View>
                {currencySymbol === c.symbol && (
                  <Icon name="check" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add Account Modal */}
      <Modal
        visible={addAccountModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddAccountModalVisible(false)}>
        <View style={styles.modalOverlayFull}>
          <View style={styles.modalContentFull}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => {
                if (selectedBank) {
                  setSelectedBank(null);
                } else {
                  setAddAccountModalVisible(false);
                }
              }}>
                <Icon name={selectedBank ? "arrow-left" : "x"} size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitleText}>
                {selectedBank ? 'Account Details' : 'Select Bank'}
              </Text>
              <View style={{width: 24}} />
            </View>

            {!selectedBank ? (
               <ScrollView style={styles.bankList}>
                 {BANKS.filter(b => b.code !== 'cash' && !accounts.some(a => a.bankCode === b.code)).map(bank => (
                   <TouchableOpacity
                     key={bank.code}
                     style={styles.bankOption}
                     onPress={() => setSelectedBank(bank)}>
                     <View style={[styles.bankListIcon, {backgroundColor: bank.color}]}>
                        <Icon name={bank.icon} size={18} color="#FFF" />
                     </View>
                     <Text style={styles.bankOptionText}>{bank.name}</Text>
                     <Icon name="chevron-right" size={18} color={Colors.textTertiary} />
                   </TouchableOpacity>
                 ))}
               </ScrollView>
            ) : (
              <View style={styles.bankDetailsForm}>
                <View style={[styles.bankDetailsIcon, {backgroundColor: selectedBank.color}]}>
                  <Icon name={selectedBank.icon} size={32} color="#FFF" />
                </View>
                <Text style={styles.bankDetailsTitle}>{selectedBank.name}</Text>
                
                <Text style={styles.inputLabel}>Last 4 digits of Account No. (Optional)</Text>
                <TextInput
                  style={styles.accountNumberInput}
                  placeholder="e.g. 1234"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="number-pad"
                  maxLength={4}
                  value={accountNumberInput}
                  onChangeText={text => setAccountNumberInput(text.replace(/[^0-9]/g, ''))}
                />

                <TouchableOpacity 
                  style={styles.saveBankBtn}
                  onPress={handleAddAccount}>
                  <Text style={styles.saveBankBtnText}>Add Account</Text>
                </TouchableOpacity>
              </View>
            )}

          </View>
        </View>
      </Modal>

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
  sectionCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.bodySmall,
    fontWeight: '700',
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  settingLabel: {
    fontSize: Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  settingValue: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  logoutButton: {
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: 'rgba(255,59,48,0.08)',
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.15)',
  },
  logoutText: {
    fontSize: Typography.body,
    fontWeight: '600',
    color: Colors.danger,
  },
  bottomSpacer: {
    height: 100,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    padding: Spacing.xl,
    width: '85%',
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
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  currencyOptionActive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
    width: 36,
    textAlign: 'center',
  },
  currencyInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  currencyLabel: {
    fontSize: Typography.bodySmall,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  currencyName: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
  },
  modalOverlayFull: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'flex-start',
  },
  modalContentFull: {
    flex: 1,
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  modalTitleText: {
    fontSize: Typography.body,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  bankList: {
    flex: 1,
  },
  bankOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  bankListIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  bankOptionText: {
    flex: 1,
    fontSize: Typography.body,
    color: Colors.textPrimary,
  },
  bankDetailsForm: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  bankDetailsIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  bankDetailsTitle: {
    fontSize: Typography.h2,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xxl,
  },
  inputLabel: {
    alignSelf: 'flex-start',
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  accountNumberInput: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    color: Colors.textPrimary,
    fontSize: Typography.body,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: Spacing.xxl,
    textAlign: 'center',
    letterSpacing: 4,
  },
  saveBankBtn: {
    backgroundColor: Colors.primary,
    width: '100%',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  saveBankBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: Typography.body,
  },
  bankIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBankIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 183, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBankLabel: {
    fontSize: Typography.bodySmall,
    color: Colors.primary,
    fontWeight: '600',
  },
});

export default SettingsScreen;
