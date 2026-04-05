/**
 * Design System — Single source of truth for all visual tokens.
 * No magic numbers anywhere in the app.
 */

export const Colors = {
  // Primary palette (User specifically requested Yellow accent)
  primary: '#FFB700',      // Selective yellow
  primaryLight: '#FFD000', // Jonquil
  primaryDark: '#B8860B',  // Dark goldenrod

  // Accent
  accent: '#FFD000',
  accentLight: '#FFE566',

  // Semantic
  income: '#FFB700',      // Yellow for income per new theme
  incomeBg: 'rgba(255, 183, 0, 0.1)',
  expense: '#FF5252',     // Soft red for expense 
  expenseBg: 'rgba(255, 82, 82, 0.1)',
  warning: '#FFD000',
  warningBg: 'rgba(255, 208, 0, 0.1)',
  danger: '#FF5252',
  dangerBg: 'rgba(255, 82, 82, 0.1)',
  success: '#FFB700',
  successBg: 'rgba(255, 183, 0, 0.1)',

  // Neutrals (The Liquid Glass Base)
  background: '#0F0F0F',     // Night
  surface: '#2A2929',        // Jet
  surfaceElevated: '#444342',// Black olive
  border: 'rgba(255, 255, 255, 0.1)',
  borderLight: 'rgba(255, 255, 255, 0.05)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textTertiary: '#707070',
  textOnPrimary: '#0F0F0F',  // Black text on yellow button
  textOnDark: '#FFFFFF',

  // Gradients (Frosted glass effects)
  gradientStart: 'rgba(42, 41, 41, 0.8)',
  gradientEnd: 'rgba(15, 15, 15, 0.9)',
  gradientIncome: '#FFB700',
  gradientIncomeEnd: '#FFD000',
  gradientExpense: '#FF5252',
  gradientExpenseEnd: '#FF8A80',

  // Apple Pure Liquid Glass Tokens
  glassBackground: 'rgba(50, 50, 50, 0.35)', // Adjusted for a slightly lighter milk-glass base 
  glassBorderTop: 'rgba(255, 255, 255, 0.4)', // Much brighter top light hit
  glassBorderLeft: 'rgba(255, 255, 255, 0.2)', // Brighter side light hit
  glassBorderRight: 'rgba(0, 0, 0, 0.3)', // Dark bottom-right shadow bevel
  glassBorderBottom: 'rgba(0, 0, 0, 0.6)', // Deep bottom shadow bevel
  glassHighlightStart: 'rgba(255, 255, 255, 0.15)', // Stronger surface glow
  glassHighlightEnd: 'rgba(0, 0, 0, 0.25)', // Fading into a dark shadow underneath

  // Dark overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
  shimmer: '#2A2929',

  // Background gradient
  bgGradientTop: '#1A1A2E',     // Dark navy — adds depth at top
  bgGradientBottom: '#000000',   // Pure black at bottom

  // Transaction card (lightweight, no glass)
  txnCardBg: 'rgba(255, 255, 255, 0.04)',
  txnCardBorder: 'rgba(255, 255, 255, 0.08)',
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
