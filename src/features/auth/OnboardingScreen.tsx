import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Button, Colors, Typography, Spacing, BorderRadius} from '../../ui';
import {useAppStore} from '../../store/useAppStore';
import {usersCollection} from '../../database';

const OnboardingScreen: React.FC = () => {
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {userId, setOnboarded} = useAppStore();

  const handleComplete = async () => {
    if (!displayName.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (userId) {
        const user = await usersCollection.find(userId);
        await user.completeOnboarding(
          displayName.trim(),
          0, // monthlyIncome — can be set later in settings
          0, // fixedExpenses — can be set later in settings
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
        <Image
          source={require('../../assets/images/finpacelogowithoutbg.png')}
          style={styles.headerLogo}
        />
        <Text style={styles.title}>What should we call you?</Text>
        <Text style={styles.subtitle}>
          Just your name and you're all set
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
            onChangeText={text => {
              setDisplayName(text);
              setError('');
            }}
            autoFocus
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          title="Let's Go →"
          onPress={handleComplete}
          loading={loading}
          fullWidth
          size="lg"
          disabled={!displayName.trim()}
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
  headerLogo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.h2,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.bodySmall,
    color: Colors.textPrimary,
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
  errorText: {
    fontSize: Typography.caption,
    color: Colors.danger,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
});

export default OnboardingScreen;
