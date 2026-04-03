import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import {Card, Colors, Typography, Spacing, BorderRadius} from '../../ui';
import {useAppStore} from '../../store/useAppStore';

const SettingsScreen: React.FC = () => {
  const {phoneNumber, clearAuth} = useAppStore();

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

  const settingsSections = [
    {
      title: 'Account',
      items: [
        {icon: '📱', label: 'Phone Number', value: phoneNumber ?? '—'},
        {icon: '💰', label: 'Currency', value: '₹ INR'},
      ],
    },
    {
      title: 'Preferences',
      items: [
        {icon: '🔔', label: 'Notification Access', value: 'Configure'},
        {icon: '📷', label: 'Camera Permission', value: 'For receipt scanning'},
        {icon: '🌙', label: 'Dark Mode', value: 'Coming soon'},
      ],
    },
    {
      title: 'Data',
      items: [
        {icon: '📤', label: 'Export Transactions', value: 'CSV'},
        {icon: '🗑️', label: 'Clear All Data', value: ''},
      ],
    },
    {
      title: 'About',
      items: [
        {icon: '📱', label: 'App Version', value: '1.0.0'},
        {icon: '🏗️', label: 'Built with', value: 'React Native + WatermelonDB'},
      ],
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      {settingsSections.map((section, sIdx) => (
        <Card
          key={sIdx}
          elevated
          title={section.title}
          style={styles.sectionCard}>
          {section.items.map((item, iIdx) => (
            <TouchableOpacity
              key={iIdx}
              style={[
                styles.settingItem,
                iIdx < section.items.length - 1 && styles.settingItemBorder,
              ]}
              activeOpacity={0.7}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>{item.icon}</Text>
                <Text style={styles.settingLabel}>{item.label}</Text>
              </View>
              <Text style={styles.settingValue}>{item.value}</Text>
            </TouchableOpacity>
          ))}
        </Card>
      ))}

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <View style={styles.bottomSpacer} />
    </ScrollView>
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
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  settingIcon: {
    fontSize: 20,
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
  logoutButton: {
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.dangerBg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logoutText: {
    fontSize: Typography.body,
    fontWeight: '600',
    color: Colors.danger,
  },
  bottomSpacer: {
    height: 100,
  },
});

export default SettingsScreen;
