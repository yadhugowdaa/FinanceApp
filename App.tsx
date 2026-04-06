import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ActivityIndicator} from 'react-native';
import {DatabaseProvider} from '@nozbe/watermelondb/react';
import {database} from './src/database';
import {seedDefaultCategories} from './src/database/seeds';
import {processRecurringTransactions} from './src/services/RecurringService';
import AppNavigator from './src/navigation/AppNavigator';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {Colors, Typography} from './src/ui';

const queryClient = new QueryClient();

function App(): React.JSX.Element {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      try {
        // Seed default categories on first launch
        await seedDefaultCategories();
        
        // Spawn pending auto-pays
        await processRecurringTransactions();

        setIsReady(true);
      } catch (error) {
        console.error('Bootstrap error:', error);
        setIsReady(true); // Continue even if seeding fails
      }
    }
    bootstrap();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashIcon}>💰</Text>
        <Text style={styles.splashTitle}>FinPace</Text>
        <ActivityIndicator
          color={Colors.primary}
          size="large"
          style={styles.splashLoader}
        />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <DatabaseProvider database={database}>
        <AppNavigator />
      </DatabaseProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  splashTitle: {
    fontSize: Typography.h1,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -1,
  },
  splashLoader: {
    marginTop: 24,
  },
});

export default App;
