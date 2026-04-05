import React, {useState, useRef, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import BottomSheet, {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {Button, Colors, Typography, Spacing, BorderRadius} from '../../ui';
import {useAppStore} from '../../store/useAppStore';
import {categoriesCollection} from '../../database';
import {createTransaction} from '../../services/TransactionService';
import {parseTransactionText} from '../../services/ParserService';
import {recognizeTextFromImage} from '../../services/MLKitService';
import type Category from '../../database/models/Category';
import type {TransactionSource} from '../../database/models/Transaction';

type InputMode = 'manual' | 'paste' | 'ocr';

interface AddTransactionSheetProps {
  bottomSheetRef: React.RefObject<BottomSheet | null>;
}

const AddTransactionSheet: React.FC<AddTransactionSheetProps> = ({
  bottomSheetRef,
}) => {
  const {userId} = useAppStore();
  const [inputMode, setInputMode] = useState<InputMode>('manual');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [loading, setLoading] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrText, setOcrText] = useState('');

  const snapPoints = ['85%'];

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
      setOcrText(ocrResult.rawText);

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
      setOcrText(ocrResult.rawText);

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
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const cats = await categoriesCollection.query().fetch();
    setCategories(cats);
    if (cats.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(cats[0].id);
    }
  };

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
        inputMode === 'paste'
          ? 'sms'
          : inputMode === 'ocr'
            ? 'ocr'
            : 'manual';

      await createTransaction({
        amount: parseFloat(amount),
        merchant: merchant.trim(),
        notes: notes.trim() || undefined,
        date: new Date(),
        type,
        source,
        categoryId: selectedCategoryId,
        userId,
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
    {label: 'Manual', value: 'manual', icon: '✏️'},
    {label: 'Paste SMS', value: 'paste', icon: '📋'},
    {label: 'Scan Receipt', value: 'ocr', icon: '📷'},
  ];

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handleIndicator}>
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
              <Text style={styles.modeIcon}>{m.icon}</Text>
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

        {/* Paste SMS mode */}
        {inputMode === 'paste' && (
          <View style={styles.pasteSection}>
            <TextInput
              style={styles.pasteInput}
              placeholder="Paste your bank SMS or notification here..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={4}
              value={pasteText}
              onChangeText={setPasteText}
            />
            <Button
              title="Parse Message"
              onPress={handlePasteAndParse}
              variant="secondary"
              size="sm"
            />
            {confidence !== null && (
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>
                  Parser confidence: {(confidence * 100).toFixed(0)}%
                </Text>
              </View>
            )}
          </View>
        )}

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
                  <Text style={styles.ocrIcon}>📷</Text>
                  <Text style={styles.ocrText}>Camera</Text>
                  <Text style={styles.ocrSubtext}>Take a photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.ocrButton, { flex: 1, marginLeft: Spacing.sm }]}
                  onPress={handleGalleryPick}
                  activeOpacity={0.8}>
                  <Text style={styles.ocrIcon}>🖼️</Text>
                  <Text style={styles.ocrText}>Gallery</Text>
                  <Text style={styles.ocrSubtext}>Pick screenshot</Text>
                </TouchableOpacity>
              </View>
            )}
            {ocrText ? (
              <View style={styles.ocrResultBox}>
                <Text style={styles.ocrResultLabel}>Recognized Text:</Text>
                <Text style={styles.ocrResultText} numberOfLines={5}>{ocrText}</Text>
              </View>
            ) : null}
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
            <Text
              style={[
                styles.typeText,
                type === 'expense' && styles.typeTextActive,
              ]}>
              💸 Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeOption,
              type === 'income' && styles.typeIncomeActive,
            ]}
            onPress={() => setType('income')}>
            <Text
              style={[
                styles.typeText,
                type === 'income' && styles.typeTextActive,
              ]}>
              💰 Income
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
          <Text style={styles.fieldLabel}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.catScroll}>
            {filteredCategories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.catChip,
                  selectedCategoryId === cat.id && {
                    backgroundColor: cat.color + '30',
                    borderColor: cat.color,
                  },
                ]}
                onPress={() => setSelectedCategoryId(cat.id)}>
                <Text style={styles.catChipText}>{cat.name}</Text>
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
        <Button
          title="Save Transaction"
          onPress={handleSave}
          loading={loading}
          fullWidth
          size="lg"
        />
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
    paddingBottom: Spacing.huge,
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
  modeIcon: {
    fontSize: 20,
    marginBottom: Spacing.xxs,
  },
  modeLabel: {
    fontSize: Typography.tiny,
    fontWeight: '600',
    color: Colors.textSecondary,
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
  ocrIcon: {
    fontSize: 48,
    marginBottom: Spacing.sm,
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
  catScroll: {
    flexGrow: 0,
  },
  catChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
  },
  catChipText: {
    fontSize: Typography.caption,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  ocrResultBox: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ocrResultLabel: {
    fontSize: Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  ocrResultText: {
    fontSize: Typography.bodySmall,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
});

export default AddTransactionSheet;
