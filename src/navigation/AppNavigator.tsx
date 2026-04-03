import React, {useRef, useCallback, useState} from 'react';
import {StyleSheet, TouchableOpacity, View, Text} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import BottomSheet from '@gorhom/bottom-sheet';
import {Colors, Spacing, BorderRadius, Shadows} from '../ui';
import {useAppStore} from '../store/useAppStore';

// Screens
import AuthScreen from '../features/auth/AuthScreen';
import OnboardingScreen from '../features/auth/OnboardingScreen';
import DashboardScreen from '../features/dashboard/DashboardScreen';
import TransactionsScreen from '../features/transactions/TransactionsScreen';
import InsightsScreen from '../features/insights/InsightsScreen';
import SettingsScreen from '../features/settings/SettingsScreen';
import AddTransactionSheet from '../features/transactions/AddTransactionSheet';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, string> = {
  Home: '🏠',
  Transactions: '📊',
  Insights: '🔮',
  Settings: '⚙️',
};

function MainTabs() {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [sheetKey, setSheetKey] = useState(0);

  // Force-remount the BottomSheet when it becomes stale (e.g. after camera)
  const openSheet = useCallback(() => {
    // Try to open the sheet; if the ref is stale, remount it
    if (bottomSheetRef.current) {
      bottomSheetRef.current.snapToIndex(0);
    } else {
      // Remount the sheet by changing its key, then open on next tick
      setSheetKey(prev => prev + 1);
      setTimeout(() => {
        bottomSheetRef.current?.snapToIndex(0);
      }, 100);
    }
  }, []);

  return (
    <>
      <Tab.Navigator
        screenOptions={({route}) => ({
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textTertiary,
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarIcon: () => (
            <Text style={styles.tabIcon}>{TAB_ICONS[route.name] ?? '📌'}</Text>
          ),
        })}>
        <Tab.Screen name="Home" component={DashboardScreen} />
        <Tab.Screen name="Transactions" component={TransactionsScreen} />
        <Tab.Screen
          name="Add"
          component={EmptyScreen}
          options={{
            tabBarButton: () => (
              <TouchableOpacity
                style={styles.addButton}
                onPress={openSheet}
                activeOpacity={0.85}>
                <View style={styles.addButtonInner}>
                  <Text style={styles.addButtonText}>+</Text>
                </View>
              </TouchableOpacity>
            ),
          }}
        />
        <Tab.Screen name="Insights" component={InsightsScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>

      <AddTransactionSheet key={sheetKey} bottomSheetRef={bottomSheetRef} />
    </>
  );
}

// Placeholder for the Add tab (actual UI is the bottom sheet)
function EmptyScreen() {
  return null;
}

export default function AppNavigator() {
  const {isAuthenticated, isOnboarded} = useAppStore();

  return (
    <GestureHandlerRootView style={styles.root}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{headerShown: false}}>
          {!isAuthenticated ? (
            <Stack.Screen name="Auth" component={AuthScreen} />
          ) : !isOnboarded ? (
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          ) : (
            <Stack.Screen name="Main" component={MainTabs} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 0,
    height: 75,
    paddingBottom: 10,
    paddingTop: 8,
    ...Shadows.md,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  tabIcon: {
    fontSize: 22,
  },
  addButton: {
    top: -15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.lg,
  },
  addButtonText: {
    fontSize: 28,
    fontWeight: '600',
    color: Colors.textOnPrimary,
    marginTop: -2,
  },
});
