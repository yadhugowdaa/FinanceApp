import React, {useState, useRef, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import {ScrollView} from 'react-native-gesture-handler';
import BottomSheet, {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {Button, Colors, Typography, Spacing, BorderRadius, LiquidGlass} from '../../ui';
import Icon from 'react-native-vector-icons/Feather';
import {useAppStore} from '../../store/useAppStore';
import {categoriesCollection} from '../../database';
import {createTransaction} from '../../services/TransactionService';
import {parseTransactionText} from '../../services/ParserService';
import {recognizeTextFromImage} from '../../services/MLKitService';
import type Category from '../../database/models/Category';
import type Account from '../../database/models/Account';
import type {TransactionSource} from '../../database/models/Transaction';
import {accountsCollection} from '../../database';

type InputMode = 'manual' | 'ocr';

interface AddTransactionSheetProps {
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  onClose?: () => void;
}

const AddTransactionSheet: React.FC<AddTransactionSheetProps> = ({
  bottomSheetRef,
  onClose,
}) => {
  const {userId} = useAppStore();
  const [inputMode, setInputMode] = useState<InputMode>('manual');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [loading, setLoading] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [ocrProcessing, setOcrProcessing] = useState(false);

  const snapPoints = ['95%'];

  const handleScanReceipt = async () => {
    try {
      // Request camera permission on Android
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'FinPace needs camera access to scan receipts',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'Camera permission is required to scan receipts.');
          return;
        }
      }

      // Close sheet before opening camera to prevent Activity lifecycle crash
      bottomSheetRef.current?.close();

      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1600,
      });

      if (result.didCancel || !result.assets?.[0]?.uri) {
        // User cancelled camera — reopen the sheet
        setTimeout(() => bottomSheetRef.current?.snapToIndex(0), 300);
        return;
      }

      // Reopen sheet to show processing state
      setTimeout(() => bottomSheetRef.current?.snapToIndex(0), 300);
      setOcrProcessing(true);
      const imagePath = result.assets[0].uri;

      // Run on-device ML Kit text recognition
      const ocrResult = await recognizeTextFromImage(imagePath);

      // Use the already-parsed transaction from MLKitService
      const parsed = ocrResult.parsedTransaction;
      if (parsed.amount > 0) {
        setAmount(parsed.amount.toString());
      }
      if (parsed.merchant) {
        setMerchant(parsed.merchant);
      }
      if (parsed.extractedItems) {
        setNotes(parsed.extractedItems);
      }
      setType(parsed.type);
      setConfidence(parsed.confidence);

      if (!ocrResult.rawText) {
        Alert.alert('No Text Found', 'Could not recognize any text in the image. Try taking a clearer photo.');
      }
    } catch (err: any) {
      Alert.alert('OCR Error', err?.message || 'Failed to process receipt');
      // Reopen sheet even on error
      setTimeout(() => bottomSheetRef.current?.snapToIndex(0), 300);
    } finally {
      setOcrProcessing(false);
    }
  };

  const handleGalleryPick = async () => {
    try {
      bottomSheetRef.current?.close();

      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1600,
      });

      if (result.didCancel || !result.assets?.[0]?.uri) {
        setTimeout(() => bottomSheetRef.current?.snapToIndex(0), 300);
        return;
      }

      setTimeout(() => bottomSheetRef.current?.snapToIndex(0), 300);
      setOcrProcessing(true);
      const imagePath = result.assets[0].uri;

      // Run on-device ML Kit text recognition
      const ocrResult = await recognizeTextFromImage(imagePath);

      // Use the already-parsed transaction from MLKitService
      const parsed = ocrResult.parsedTransaction;
      if (parsed.amount > 0) {
        setAmount(parsed.amount.toString());
      }
      if (parsed.merchant) {
        setMerchant(parsed.merchant);
      }
      if (parsed.extractedItems) {
        setNotes(parsed.extractedItems);
      }
      setType(parsed.type);
      setConfidence(parsed.confidence);

      if (!ocrResult.rawText) {
        Alert.alert('No Text Found', 'Could not recognize any text in the image.');
      }
    } catch (err: any) {
      Alert.alert('OCR Error', err?.message || 'Failed to process receipt');
      setTimeout(() => bottomSheetRef.current?.snapToIndex(0), 300);
    } finally {
      setOcrProcessing(false);
    }
  };

  useEffect(() => {
    const categoriesSub = categoriesCollection
      .query()
      .observe()
      .subscribe(cats => {
        setCategories(cats);
        if (cats.length > 0) {
          setSelectedCategoryId(prev => prev ? prev : cats[0].id);
        }
      });

    const accountsSub = accountsCollection
      .query()
      .observe()
      .subscribe(accs => {
        setAccounts(accs);
        if (accs.length > 0) {
          setSelectedAccountId(prev => prev ? prev : (accs.find(a => a.isDefault)?.id || accs[0].id));
        }
      });

    return () => {
      categoriesSub.unsubscribe();
      accountsSub.unsubscribe();
    };
  }, []);

  const resetForm = () => {
    setAmount('');
    setMerchant('');
    setNotes('');
    setType('expense');
    setPasteText('');
    setConfidence(null);
    setSelectedCategoryId(categories[0]?.id ?? '');
  };

  const handlePasteAndParse = () => {
    if (!pasteText.trim()) {return;}

    const parsed = parseTransactionText(pasteText);
    if (parsed.amount > 0) {
      setAmount(parsed.amount.toString());
    }
    if (parsed.merchant) {
      setMerchant(parsed.merchant);
    }
    setType(parsed.type);
    setConfidence(parsed.confidence);
  };

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (!merchant.trim()) {
      Alert.alert('Error', 'Please enter a merchant name');
      return;
    }
    if (!selectedCategoryId) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    if (!userId) {return;}

    setLoading(true);

    try {
      const source: TransactionSource =
        inputMode === 'ocr' ? 'ocr' : 'manual';

      await createTransaction({
        amount: parseFloat(amount),
        merchant: merchant.trim(),
        notes: notes.trim() || undefined,
        date: new Date(),
        type,
        source,
        categoryId: selectedCategoryId,
        userId,
        accountId: selectedAccountId || undefined,
      });

      resetForm();
      bottomSheetRef.current?.close();
    } catch (err) {
      Alert.alert('Error', 'Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(c => c.type === type);

  const modes: {label: string; value: InputMode; icon: string}[] = [
    {label: 'Manual', value: 'manual', icon: 'edit-3'},
    {label: 'Scan Receipt', value: 'ocr', icon: 'camera'},
  ];

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handleIndicator}
      onChange={(idx) => {
        if (idx === -1) {
          onClose?.();
        }
      }}>
      <BottomSheetScrollView
        contentContainerStyle={styles.sheetContent}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.sheetTitle}>Add Transaction</Text>

        {/* Input mode tabs */}
        <View style={styles.modeRow}>
          {modes.map(m => (
            <TouchableOpacity
              key={m.value}
              style={[
                styles.modeTab,
                inputMode === m.value && styles.modeTabActive,
              ]}
              onPress={() => setInputMode(m.value)}>
              <Icon name={m.icon} size={20} color={inputMode === m.value ? Colors.primary : Colors.textSecondary} />
              <Text
                style={[
                  styles.modeLabel,
                  inputMode === m.value && styles.modeLabelActive,
                ]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* OCR mode */}
        {inputMode === 'ocr' && (
          <View style={styles.ocrSection}>
            {ocrProcessing ? (
               <View style={styles.ocrProcessingBox}>
                 <ActivityIndicator size="large" color={Colors.primary} />
                 <Text style={[styles.ocrText, {marginTop: Spacing.md}]}>Processing receipt...</Text>
                 <Text style={styles.ocrSubtext}>Running on-device ML Kit OCR</Text>
               </View>
            ) : (
              <View style={styles.ocrButtonGroup}>
              <TouchableOpacity
                  style={[styles.ocrButton, { flex: 1, marginRight: Spacing.sm }]}
                  onPress={handleScanReceipt}
                  activeOpacity={0.8}>
                  <Icon name="camera" size={32} color={Colors.textPrimary} />
                  <Text style={styles.ocrText}>Camera</Text>
                  <Text style={styles.ocrSubtext}>Take a photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.ocrButton, { flex: 1, marginLeft: Spacing.sm }]}
                  onPress={handleGalleryPick}
                  activeOpacity={0.8}>
                  <Icon name="image" size={32} color={Colors.textPrimary} />
                  <Text style={styles.ocrText}>Gallery</Text>
                  <Text style={styles.ocrSubtext}>Pick screenshot</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Type toggle */}
        <View style={styles.typeToggle}>
          <TouchableOpacity
            style={[
              styles.typeOption,
              type === 'expense' && styles.typeExpenseActive,
            ]}
            onPress={() => setType('expense')}>
            <Icon name="arrow-up-right" size={14} color={type === 'expense' ? '#FF3C3C' : Colors.textSecondary} />
            <Text
              style={[
                styles.typeText,
                type === 'expense' && styles.typeTextActive,
              ]}>
              Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeOption,
              type === 'income' && styles.typeIncomeActive,
            ]}
            onPress={() => setType('income')}>
            <Icon name="arrow-down-left" size={14} color={type === 'income' ? '#00E676' : Colors.textSecondary} />
            <Text
              style={[
                styles.typeText,
                type === 'income' && styles.typeTextActive,
              ]}>
              Income
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Amount</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currencyBig}>₹</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              value={amount}
              onChangeText={text => setAmount(text.replace(/[^0-9.]/g, ''))}
            />
          </View>
        </View>

        {/* Merchant */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Merchant / Description</Text>
          <TextInput
            style={styles.textField}
            placeholder="e.g. Swiggy, Amazon, Rent"
            placeholderTextColor={Colors.textTertiary}
            value={merchant}
            onChangeText={setMerchant}
          />
        </View>

        {/* Category */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Category *</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled={true}
            contentContainerStyle={styles.catScrollContent}>
            {filteredCategories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                activeOpacity={0.7}
                style={[
                  styles.catChip,
                  selectedCategoryId === cat.id && styles.catChipSelected,
                ]}
                onPress={() => setSelectedCategoryId(cat.id)}>
                <Text style={[
                  styles.catChipText,
                  selectedCategoryId === cat.id && styles.catChipTextSelected,
                ]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Account */}
        <View style={[styles.fieldGroup, {zIndex: 10}]}>
          <Text style={styles.fieldLabel}>Account</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled={true}
            contentContainerStyle={styles.catScrollContent}>
            {accounts.map(acc => (
              <TouchableOpacity
                key={acc.id}
                activeOpacity={0.7}
                style={[
                  styles.catChip,
                  selectedAccountId === acc.id && styles.catChipSelected,
                ]}
                onPress={() => setSelectedAccountId(acc.id)}>
                <View style={[
                  styles.catDot, 
                  {backgroundColor: acc.color, marginRight: Spacing.xs}
                ]} />
                <Text style={[
                  styles.catChipText,
                  selectedAccountId === acc.id && styles.catChipTextSelected,
                ]}>{acc.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Notes */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Notes (optional)</Text>
          <TextInput
            style={[styles.textField, {minHeight: 80, textAlignVertical: 'top'}]}
            placeholder="Add a note..."
            placeholderTextColor={Colors.textTertiary}
            value={notes}
            onChangeText={setNotes}
            multiline={true}
            numberOfLines={4}
          />
        </View>

        {/* Save button */}
        <TouchableOpacity onPress={handleSave} activeOpacity={0.8} disabled={loading}>
          <LiquidGlass borderRadius={16} style={styles.saveBtn} useBlur={true}>
            {loading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={styles.saveBtnText}>Save Transaction</Text>
            )}
          </LiquidGlass>
        </TouchableOpacity>
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
  },
  handleIndicator: {
    backgroundColor: Colors.border,
    width: 40,
  },
  sheetContent: {
    padding: Spacing.xxl,
    paddingBottom: 120,
  },
  sheetTitle: {
    fontSize: Typography.h2,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xl,
    letterSpacing: -0.5,
  },
  modeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  modeTab: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  modeTabActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight + '15',
  },
  modeLabel: {
    fontSize: Typography.tiny,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 4,
  },
  modeLabelActive: {
    color: Colors.primary,
  },
  pasteSection: {
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  pasteInput: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    fontSize: Typography.bodySmall,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  confidenceBadge: {
    backgroundColor: Colors.successBg,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  confidenceText: {
    fontSize: Typography.caption,
    fontWeight: '600',
    color: Colors.success,
  },
  ocrSection: {
    marginBottom: Spacing.xl,
  },
  ocrButton: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    minHeight: 140,
  },
  ocrButtonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ocrProcessingBox: {
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  ocrText: {
    fontSize: Typography.body,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  ocrSubtext: {
    fontSize: Typography.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.xxs,
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  typeOption: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  typeExpenseActive: {
    backgroundColor: Colors.expenseBg,
  },
  typeIncomeActive: {
    backgroundColor: Colors.incomeBg,
  },
  typeText: {
    fontSize: Typography.bodySmall,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  typeTextActive: {
    color: Colors.textPrimary,
  },
  fieldGroup: {
    marginBottom: Spacing.xl,
  },
  fieldLabel: {
    fontSize: Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyBig: {
    fontSize: Typography.h1,
    fontWeight: '700',
    color: Colors.primary,
    marginRight: Spacing.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: Typography.h1,
    fontWeight: '700',
    color: Colors.textPrimary,
    padding: 0,
  },
  textField: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: Typography.body,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catScrollContent: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  catChipSelected: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  catChipText: {
    fontSize: Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  catChipTextSelected: {
    color: Colors.primary,
  },
  saveBtn: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: Typography.body,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
});

export default AddTransactionSheet;
