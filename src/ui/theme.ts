/**
 * Design System — Single source of truth for all visual tokens.
 * No magic numbers anywhere in the app.
 */

export const Colors = {
  // Primary palette
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  primaryDark: '#5A4BD1',

  // Accent
  accent: '#00CEC9',
  accentLight: '#81ECEC',

  // Semantic
  income: '#00B894',
  incomeBg: '#E8FBF5',
  expense: '#E17055',
  expenseBg: '#FDEDEA',
  warning: '#FDCB6E',
  warningBg: '#FEF9E7',
  danger: '#D63031',
  dangerBg: '#FDEDEE',
  success: '#00B894',
  successBg: '#E8FBF5',

  // Neutrals
  background: '#F8F9FD',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  border: '#E8ECF4',
  borderLight: '#F2F4F8',

  // Text
  textPrimary: '#1E272E',
  textSecondary: '#636E72',
  textTertiary: '#B2BEC3',
  textOnPrimary: '#FFFFFF',
  textOnDark: '#FFFFFF',

  // Gradients
  gradientStart: '#6C5CE7',
  gradientEnd: '#A29BFE',
  gradientIncome: '#00B894',
  gradientIncomeEnd: '#55EFC4',
  gradientExpense: '#E17055',
  gradientExpenseEnd: '#FAB1A0',

  // Dark overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  shimmer: '#E8ECF4',
} as const;

export const Typography = {
  // Font families
  fontRegular: 'System',
  fontMedium: 'System',
  fontBold: 'System',
  fontSemiBold: 'System',

  // Size scale
  h1: 32,
  h2: 24,
  h3: 20,
  h4: 18,
  body: 16,
  bodySmall: 14,
  caption: 12,
  tiny: 10,

  // Line heights
  lineHeightH1: 40,
  lineHeightH2: 32,
  lineHeightBody: 24,
  lineHeightCaption: 18,
} as const;

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
  massive: 64,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;
