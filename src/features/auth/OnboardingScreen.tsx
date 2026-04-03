import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Button, Colors, Typography, Spacing, BorderRadius} from '../../ui';
import {useAppStore} from '../../store/useAppStore';
import {usersCollection} from '../../database';

const OnboardingScreen: React.FC = () => {
  const [displayName, setDisplayName] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [fixedExpenses, setFixedExpenses] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {userId, setOnboarded} = useAppStore();

  const handleComplete = async () => {
    if (!displayName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!monthlyIncome || parseFloat(monthlyIncome) <= 0) {
      setError('Please enter a valid monthly income');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (userId) {
        const user = await usersCollection.find(userId);
        await user.completeOnboarding(
          displayName.trim(),
          parseFloat(monthlyIncome),
          parseFloat(fixedExpenses) || 0,
        );
        setOnboarded(true);
      }
    } catch (err) {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        style={styles.header}>
        <Text style={styles.emoji}>🎯</Text>
        <Text style={styles.title}>Let's set up your profile</Text>
        <Text style={styles.subtitle}>
          We need a few details to calculate your daily spending pace
        </Text>
      </LinearGradient>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Your Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Yadhu"
            placeholderTextColor={Colors.textTertiary}
            value={displayName}
            onChangeText={setDisplayName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Monthly Income</Text>
          <View style={styles.amountInput}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountField}
              placeholder="50,000"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              value={monthlyIncome}
              onChangeText={text =>
                setMonthlyIncome(text.replace(/[^0-9.]/g, ''))
              }
            />
          </View>
          <Text style={styles.helperText}>
            Your total monthly income before deductions
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Fixed Monthly Expenses</Text>
          <View style={styles.amountInput}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountField}
              placeholder="15,000"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              value={fixedExpenses}
              onChangeText={text =>
                setFixedExpenses(text.replace(/[^0-9.]/g, ''))
              }
            />
          </View>
          <Text style={styles.helperText}>
            Rent, EMIs, subscriptions — things that don't change
          </Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          title="Start Tracking →"
          onPress={handleComplete}
          loading={loading}
          fullWidth
          size="lg"
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 70,
    paddingBottom: 40,
    paddingHorizontal: Spacing.xxl,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 48,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.h2,
    fontWeight: '700',
    color: Colors.textOnPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.bodySmall,
    color: Colors.textOnPrimary,
    opacity: 0.85,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: Typography.lineHeightBody,
  },
  form: {
    flex: 1,
    backgroundColor: Colors.surface,
    marginTop: -20,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xxl,
  },
  inputGroup: {
    marginBottom: Spacing.xxl,
  },
  label: {
    fontSize: Typography.bodySmall,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: Typography.body,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  currencySymbol: {
    fontSize: Typography.h3,
    fontWeight: '700',
    color: Colors.primary,
    paddingLeft: Spacing.lg,
  },
  amountField: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.h3,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  helperText: {
    fontSize: Typography.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
    paddingLeft: Spacing.xs,
  },
  errorText: {
    fontSize: Typography.caption,
    color: Colors.danger,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
});

export default OnboardingScreen;
