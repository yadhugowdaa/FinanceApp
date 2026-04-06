import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Button, Colors, Typography, Spacing, BorderRadius} from '../../ui';
import {useAppStore} from '../../store/useAppStore';
import {database, usersCollection} from '../../database';
import {seedDefaultAccount} from '../../database/seeds';

const AuthScreen: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const {setAuth, setOnboarded} = useAppStore();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleSubmit = async () => {
    if (phoneNumber.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check if user already exists in local DB
      const existingUsers = await usersCollection.query().fetch();
      const existingUser = existingUsers.find(
        u => u.phoneNumber === phoneNumber,
      );

      if (existingUser) {
        // Returning user — skip onboarding, go straight to dashboard
        setAuth(existingUser.id, phoneNumber);
        setOnboarded(true);
      } else {
        // Brand new user — create record, then send to onboarding for name
        let newUserId = '';
        await database.write(async () => {
          const newUser = await usersCollection.create((user: any) => {
            user.phoneNumber = phoneNumber;
            user.currency = '₹';
            user.isOnboarded = false;
            user.monthlyIncome = 0;
            user.fixedExpenses = 0;
          });
          newUserId = newUser.id;
        });

        // Seed default cash account for this user
        await seedDefaultAccount(newUserId);

        setAuth(newUserId, phoneNumber);
        setOnboarded(false);
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        style={styles.headerGradient}>
        <Animated.View
          style={[
            styles.headerContent,
            {opacity: fadeAnim, transform: [{translateY: slideAnim}]},
          ]}>
          <Image
            source={require('../../assets/images/finpacelogowithoutbg.png')}
            style={styles.headerLogo}
          />
          <Text style={styles.tagline}>
            Your intelligent spending companion
          </Text>
        </Animated.View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.formContainer}>
        <Animated.View
          style={[styles.formCard, {opacity: fadeAnim}]}>
          <Text style={styles.formTitle}>Welcome</Text>
          <Text style={styles.formSubtitle}>
            Enter your phone number to get started
          </Text>

          <View style={styles.phoneInputContainer}>
            <View style={styles.countryCode}>
              <Text style={styles.countryCodeText}>+91</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder="Phone number"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="phone-pad"
              maxLength={10}
              value={phoneNumber}
              onChangeText={text => {
                setPhoneNumber(text.replace(/[^0-9]/g, ''));
                setError('');
              }}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button
            title="Continue"
            onPress={handleSubmit}
            loading={loading}
            fullWidth
            size="lg"
            disabled={phoneNumber.length < 10}
          />

          <Text style={styles.disclaimer}>
            We'll set up your profile in seconds
          </Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerGradient: {
    paddingTop: 80,
    paddingBottom: 60,
    paddingHorizontal: Spacing.xxl,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerLogo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    marginBottom: Spacing.md,
  },
  tagline: {
    fontSize: Typography.bodySmall,
    color: Colors.textPrimary,
    opacity: 0.85,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  formContainer: {
    flex: 1,
  },
  formCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    marginTop: -20,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xxl,
  },
  formTitle: {
    fontSize: Typography.h2,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  formSubtitle: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxl,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  countryCode: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  countryCodeText: {
    fontSize: Typography.body,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: Typography.body,
    color: Colors.textPrimary,
  },
  errorText: {
    fontSize: Typography.caption,
    color: Colors.danger,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  disclaimer: {
    fontSize: Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});

export default AuthScreen;
