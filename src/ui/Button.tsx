import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Colors, Typography, Spacing, BorderRadius} from './theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  style,
  textStyle,
}) => {
  const isDisabled = disabled || loading;

  const sizeStyles = {
    sm: styles.sizeSm,
    md: styles.sizeMd,
    lg: styles.sizeLg,
  }[size];

  const textSizeStyles = {
    sm: styles.textSm,
    md: styles.textMd,
    lg: styles.textLg,
  }[size];

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        disabled={isDisabled}
        style={[fullWidth && styles.fullWidth, style]}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={[
            styles.base,
            sizeStyles,
            isDisabled && styles.disabled,
            fullWidth && styles.fullWidth,
          ]}>
          {loading ? (
            <ActivityIndicator color={Colors.textOnPrimary} size="small" />
          ) : (
            <>
              {icon}
              <Text
                style={[styles.textPrimary, textSizeStyles, textStyle]}>
                {title}
              </Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const variantStyles = {
    secondary: styles.secondary,
    outline: styles.outline,
    ghost: styles.ghost,
  }[variant];

  const variantTextStyles = {
    secondary: styles.textSecondary,
    outline: styles.textOutline,
    ghost: styles.textGhost,
  }[variant];

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        sizeStyles,
        variantStyles,
        isDisabled && styles.disabled,
        fullWidth && styles.fullWidth,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={Colors.primary} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[variantTextStyles, textSizeStyles, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  sizeSm: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  sizeMd: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  sizeLg: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
  },
  secondary: {
    backgroundColor: Colors.primaryLight + '20',
  },
  outline: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.35,
  },
  fullWidth: {
    width: '100%',
  },
  textPrimary: {
    color: Colors.textOnPrimary,
    fontWeight: '600',
  },
  textSecondary: {
    color: Colors.primary,
    fontWeight: '600',
  },
  textOutline: {
    color: Colors.primary,
    fontWeight: '600',
  },
  textGhost: {
    color: Colors.primary,
    fontWeight: '500',
  },
  textSm: {
    fontSize: Typography.bodySmall,
  },
  textMd: {
    fontSize: Typography.body,
  },
  textLg: {
    fontSize: Typography.h4,
  },
});
