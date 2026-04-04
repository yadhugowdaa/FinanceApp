import React, {useRef, useCallback, useState, useEffect} from 'react';
import {StyleSheet, TouchableOpacity, View, Platform} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator, BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import BottomSheet from '@gorhom/bottom-sheet';
import Icon from 'react-native-vector-icons/Feather';
import Svg, {Path as SvgPath} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';

import {Colors, LiquidGlass} from '../ui';
import {useAppStore} from '../store/useAppStore';

// Screens
import AuthScreen from '../features/auth/AuthScreen';
import OnboardingScreen from '../features/auth/OnboardingScreen';
import DashboardScreen from '../features/dashboard/DashboardScreen';
import InsightsScreen from '../features/insights/InsightsScreen';
import SettingsScreen from '../features/settings/SettingsScreen';
import AddTransactionSheet from '../features/transactions/AddTransactionSheet';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, string> = {
  Home: 'home',
  News: 'globe',
  Add: 'plus',
  Insights: 'pie-chart',
  Profile: 'user',
};

// ── Layout constants ──
const CIRCLE_SIZE = 52;
const BAR_HEIGHT = 70;
const NOTCH_WIDTH = 80;        // Width of the U-shape indent (wider than circle for gap)
const NOTCH_DEPTH = 28;        // How deep the U curves (creates gap below circle)
const ICON_LIFT = 38;           // How far selected icon rises (centers it in circle)
const JUMP_HEIGHT = 60;         // How high the circle jumps during transition
const BOTTOM_PADDING = Platform.OS === 'ios' ? 20 : 10;

// ── Build SVG path for bar with U-notch ──
function buildBarPath(w: number, h: number, notchCX: number): string {
  const nr = NOTCH_WIDTH / 2;
  const nd = NOTCH_DEPTH;
  const nl = Math.max(notchCX - nr, 0);
  const nrx = Math.min(notchCX + nr, w);

  return [
    `M 0,0`,
    `L ${nl},0`,
    // Smooth curve into the notch (left side)
    `C ${nl + nr * 0.45},0 ${notchCX - nr * 0.8},${nd} ${notchCX},${nd}`,
    // Smooth curve out of the notch (right side)
    `C ${notchCX + nr * 0.8},${nd} ${nrx - nr * 0.45},0 ${nrx},0`,
    `L ${w},0`,
    `L ${w},${h}`,
    `L 0,${h}`,
    `Z`,
  ].join(' ');
}

// Placeholder screen
function EmptyScreen() {
  return <View style={{flex: 1, backgroundColor: Colors.background}} />;
}

// ── Tab Icon with spring lift ──
function TabIcon({
  iconName,
  isFocused,
}: {
  iconName: string;
  isFocused: boolean;
}) {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    translateY.value = withSpring(isFocused ? -ICON_LIFT : 0, {
      damping: 12,
      stiffness: 180,
      mass: 0.6,
    });
    scale.value = withSpring(isFocused ? 1.15 : 1, {
      damping: 12,
      stiffness: 180,
      mass: 0.6,
    });
  }, [isFocused, translateY, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      {translateY: translateY.value},
      {scale: scale.value},
    ],
  }));

  return (
    <Animated.View style={[styles.iconWrapper, animStyle]}>
      <Icon
        name={iconName}
        size={isFocused ? 24 : 22}
        color={isFocused ? '#000000' : 'rgba(255,255,255,0.45)'}
      />
    </Animated.View>
  );
}

// ── Animated Tab Bar ──
interface AnimatedTabBarProps extends BottomTabBarProps {
  openSheet: () => void;
}

function AnimatedTabBar({state, navigation, openSheet}: AnimatedTabBarProps) {
  const [barWidth, setBarWidth] = useState(0);
  const numTabs = state.routes.length;
  const tabWidth = barWidth / numTabs;

  // Animated values for the yellow circle
  const circleX = useSharedValue(0);
  const circleY = useSharedValue(0);

  // Notch position (state-based — updates instantly, hidden by the jump animation)
  const [notchCX, setNotchCX] = useState(0);

  // Previous index to detect direction for the arc
  const prevIndexRef = useRef(state.index);

  // ── On tab change: trigger jump animation ──
  useEffect(() => {
    if (barWidth <= 0) return;

    const newX = state.index * tabWidth + (tabWidth - CIRCLE_SIZE) / 2;
    const newNotchCX = state.index * tabWidth + tabWidth / 2;

    if (prevIndexRef.current === state.index) {
      // First render — snap instantly
      circleX.value = newX;
      setNotchCX(newNotchCX);
    } else {
      // ── JUMP animation ──
      // 1. Circle jumps UP
      // 2. While airborne, slides horizontally to new tab
      // 3. Falls DOWN onto new position with bounce

      // Y: jump up → wait → fall with bounce
      circleY.value = withSequence(
        withTiming(-JUMP_HEIGHT, {
          duration: 220,
          easing: Easing.out(Easing.cubic),
        }),
        withDelay(
          80,
          withSpring(0, {
            damping: 8,
            stiffness: 200,
            mass: 0.6,
          }),
        ),
      );

      // X: smooth horizontal slide
      circleX.value = withTiming(newX, {
        duration: 380,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });

      // Notch: update instantly (circle is in the air, user doesn't see snap)
      // Small delay so notch moves while circle is at peak
      setTimeout(() => setNotchCX(newNotchCX), 120);

      prevIndexRef.current = state.index;
    }
  }, [state.index, tabWidth, barWidth, circleX, circleY]);

  // Circle animated style (translateX + translateY for jump)
  const circleStyle = useAnimatedStyle(() => ({
    transform: [
      {translateX: circleX.value},
      {translateY: circleY.value},
    ],
  }));

  const handleLayout = useCallback((e: any) => {
    const w = e.nativeEvent.layout.width;
    setBarWidth(w);
    // Set initial notch position
    const initialCX = state.index * (w / numTabs) + (w / numTabs) / 2;
    setNotchCX(initialCX);
    // Set initial circle position
    circleX.value = state.index * (w / numTabs) + ((w / numTabs) - CIRCLE_SIZE) / 2;
  }, [state.index, numTabs, circleX]);

  // Circle vertical position: centered on the lifted icon
  // Icon normal center = BAR_HEIGHT/2 = 35. Lifted = 35 - ICON_LIFT = -3
  // Circle center should match → circleTop = -3 - CIRCLE_SIZE/2 = -29
  const circleTop = BAR_HEIGHT / 2 - ICON_LIFT - CIRCLE_SIZE / 2;

  // SVG bar path with notch
  const barPath = barWidth > 0
    ? buildBarPath(barWidth, BAR_HEIGHT + BOTTOM_PADDING, notchCX)
    : '';

  return (
    <View style={styles.tabBarContainer} onLayout={handleLayout}>
      {/* ── Bar background with U-notch ── */}
      {barWidth > 0 && (
        <Svg
          width={barWidth}
          height={BAR_HEIGHT + BOTTOM_PADDING}
          style={StyleSheet.absoluteFill}>
          <SvgPath
            d={barPath}
            fill="rgba(28, 28, 30, 0.85)"
          />
          {/* Subtle top border line (follows the notch shape) */}
          <SvgPath
            d={barPath}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={0.5}
          />
        </Svg>
      )}

      {/* ── Animated yellow circle ── */}
      {barWidth > 0 && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: circleTop,
              left: 0,
              width: CIRCLE_SIZE,
              height: CIRCLE_SIZE,
              zIndex: 3,
            },
            circleStyle,
          ]}>
          <View style={styles.circleInner} />
        </Animated.View>
      )}

      {/* ── Tab icons row ── */}
      <View style={styles.tabRow}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const iconName = TAB_ICONS[route.name] || 'circle';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }

            if (route.name === 'Add') {
              openSheet();
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityRole="button"
              accessibilityState={isFocused ? {selected: true} : {}}
              activeOpacity={0.7}
              style={styles.tabButton}>
              <TabIcon iconName={iconName} isFocused={isFocused} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Main Tabs ──
function MainTabs() {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [sheetKey, setSheetKey] = useState(0);

  const openSheet = useCallback(() => {
    if (bottomSheetRef.current) {
      bottomSheetRef.current.snapToIndex(0);
    } else {
      setSheetKey(prev => prev + 1);
      setTimeout(() => {
        bottomSheetRef.current?.snapToIndex(0);
      }, 100);
    }
  }, []);

  return (
    <>
      <Tab.Navigator
        tabBar={props => <AnimatedTabBar {...props} openSheet={openSheet} />}
        screenOptions={{headerShown: false}}>
        <Tab.Screen name="Home" component={DashboardScreen} />
        <Tab.Screen name="News" component={EmptyScreen} />
        <Tab.Screen name="Add" component={EmptyScreen} />
        <Tab.Screen name="Insights" component={InsightsScreen} />
        <Tab.Screen name="Profile" component={SettingsScreen} />
      </Tab.Navigator>

      <AddTransactionSheet key={sheetKey} bottomSheetRef={bottomSheetRef} />
    </>
  );
}

// ── Root Navigator ──
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
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: BAR_HEIGHT + BOTTOM_PADDING,
  },
  circleInner: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: Colors.primary,
    elevation: 10,
    shadowColor: Colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  tabRow: {
    flexDirection: 'row',
    height: BAR_HEIGHT,
    alignItems: 'center',
    zIndex: 5,
    paddingBottom: 0,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: BAR_HEIGHT,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
});
