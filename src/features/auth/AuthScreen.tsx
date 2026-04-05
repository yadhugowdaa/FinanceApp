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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Button, Colors, Typography, Spacing, BorderRadius} from '../../ui';
import {useAppStore} from '../../store/useAppStore';
import {database, usersCollection} from '../../database';
import {seedDefaultAccount} from '../../database/seeds';

const OTP_LENGTH = 4;

const AuthScreen: React.FC = () => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(''));
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const otpRefs = useRef<Array<TextInput | null>>([]);

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

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOtp = async () => {
    if (phoneNumber.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    setError('');

    // Simulate network call for OTP
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate random 4-digit OTP
    const newOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(newOtp);
    setCountdown(30);
    setLoading(false);
    setStep('otp');

    // Auto-fill OTP after a short delay (simulating notification interception)
    setTimeout(() => {
      const otpDigits = newOtp.split('');
      setOtp(otpDigits);
      otpDigits.forEach((digit, index) => {
        if (otpRefs.current[index]) {
          // Trigger visual feedback
        }
      });
    }, 2000);
  };

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const enteredOtp = otp.join('');
    if (enteredOtp !== generatedOtp) {
      setError('Invalid OTP. Please try again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check if user exists in local DB
      const existingUsers = await usersCollection.query().fetch();
      const existingUser = existingUsers.find(
        u => u.phoneNumber === phoneNumber,
      );

      if (existingUser) {
        setAuth(existingUser.id, phoneNumber);
        setOnboarded(existingUser.isOnboarded);
      } else {
        // Create new user
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

        // Seed default cash account for this user outside the user write batch
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
          <Text style={styles.appName}>💰 FinPace</Text>
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
          {step === 'phone' ? (
            <>
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
                title="Send OTP"
                onPress={handleSendOtp}
                loading={loading}
                fullWidth
                size="lg"
                disabled={phoneNumber.length < 10}
              />

              <Text style={styles.disclaimer}>
                A verification code will appear as a notification
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.formTitle}>Verify OTP</Text>
              <Text style={styles.formSubtitle}>
                Code sent to +91 {phoneNumber}
              </Text>

              {/* Show the OTP for demo purposes */}
              <View style={styles.otpHint}>
                <Text style={styles.otpHintText}>
                  🔔 Demo OTP: {generatedOtp}
                </Text>
              </View>

              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={ref => {
                      otpRefs.current[index] = ref;
                    }}
                    style={[
                      styles.otpInput,
                      digit ? styles.otpInputFilled : null,
                    ]}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={value => handleOtpChange(value, index)}
                    onKeyPress={({nativeEvent}) => {
                      if (
                        nativeEvent.key === 'Backspace' &&
                        !digit &&
                        index > 0
                      ) {
                        otpRefs.current[index - 1]?.focus();
                      }
                    }}
                  />
                ))}
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Button
                title="Verify & Continue"
                onPress={handleVerifyOtp}
                loading={loading}
                fullWidth
                size="lg"
                disabled={otp.some(d => !d)}
              />

              {countdown > 0 ? (
                <Text style={styles.resendText}>
                  Resend in {countdown}s
                </Text>
              ) : (
                <Button
                  title="Resend OTP"
                  onPress={handleSendOtp}
                  variant="ghost"
                  size="sm"
                />
              )}
            </>
          )}
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
  appName: {
    fontSize: Typography.h1,
    fontWeight: '800',
    color: Colors.textOnPrimary,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: Typography.body,
    color: Colors.textOnPrimary,
    opacity: 0.85,
    marginTop: Spacing.sm,
  },
  formContainer: {
    flex: 1,
    marginTop: -30,
  },
  formCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.xl,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
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
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  countryCode: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  countryCodeText: {
    fontSize: Typography.body,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: Typography.body,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    letterSpacing: 1,
  },
  otpHint: {
    backgroundColor: Colors.warningBg,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  otpHintText: {
    fontSize: Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  otpInput: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    textAlign: 'center',
    fontSize: Typography.h3,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  otpInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight + '15',
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
  resendText: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});

export default AuthScreen;
