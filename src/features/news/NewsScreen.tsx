import React, {useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import Animated, {FadeInDown} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Feather';

import {fetchFinanceNews, FinanceNewsArticle} from '../../services/NewsService';
import {Colors, Typography, Spacing, BorderRadius, LiquidGlass} from '../../ui';

const NewsCard = ({
  item,
  index,
}: {
  item: FinanceNewsArticle;
  index: number;
}) => {
  const handlePress = () => {
    if (item.link) {
      Linking.openURL(item.link).catch(err =>
        console.error('Failed to open URL', err),
      );
    }
  };

  const publishDate = new Date(item.pubDate);
  const formattedDate = publishDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <Animated.View entering={FadeInDown.delay(100 + index * 50).duration(400).springify()}>
      <TouchableOpacity activeOpacity={0.8} onPress={handlePress}>
        <LiquidGlass borderRadius={BorderRadius.md} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.sourceTag}>
              <Text style={styles.sourceText}>{item.source}</Text>
            </View>
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>
          
          <Text style={styles.titleText}>{item.title}</Text>
          
          {item.description ? (
            <Text style={styles.snippetText} numberOfLines={3}>
              {item.description}
            </Text>
          ) : null}
          
          <View style={styles.footerRow}>
            <Text style={styles.readMoreText}>Read Article</Text>
            <Icon name="chevron-right" size={16} color={Colors.primary} />
          </View>
        </LiquidGlass>
      </TouchableOpacity>
    </Animated.View>
  );
};

const NewsScreen: React.FC = () => {
  // Use TanStack Query to fetch and aggressively cache news for 15 mins
  const {data, isLoading, isFetching, isError, error, refetch} = useQuery({
    queryKey: ['financeNews'],
    queryFn: fetchFinanceNews,
    staleTime: 1000 * 60 * 15, 
    refetchInterval: 1000 * 60 * 15,
  });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading && !isFetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Fetching Top Stories...</Text>
      </View>
    );
  }

  // Display error state if fetching completely fails and no cache exists
  if (isError && !data) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-triangle" size={48} color="#FF3C3C" />
        <Text style={styles.errorTitle}>Unable to load news</Text>
        <Text style={styles.errorBody}>{(error as Error).message}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={handleRefresh}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Heavy sticky glass header */}
      <View style={styles.header}>
        <LiquidGlass style={styles.headerGlass} useBlur={true} borderRadius={0}>
          <Text style={styles.screenTitle}>Market News</Text>
          <Text style={styles.screenSubtitle}>Latest updates powered by Yahoo Finance</Text>
        </LiquidGlass>
      </View>

      <FlatList
        data={data || []}
        keyExtractor={item => item.id}
        renderItem={({item, index}) => <NewsCard item={item} index={index} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.body,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  errorTitle: {
    fontSize: Typography.h3,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  errorBody: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  retryBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary + '20',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.round,
  },
  retryText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: Typography.body,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 10 : 50,
    zIndex: 10,
    backgroundColor: Colors.background,
  },
  headerGlass: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  screenTitle: {
    fontSize: Typography.h1,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: 100, // accommodate bottom tab bar
    gap: Spacing.lg,
  },
  card: {
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sourceTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sourceText: {
    fontSize: Typography.tiny,
    color: Colors.textPrimary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dateText: {
    fontSize: Typography.caption,
    color: Colors.textTertiary,
  },
  titleText: {
    fontSize: Typography.h3,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 24,
    marginBottom: Spacing.xs,
  },
  snippetText: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  readMoreText: {
    fontSize: Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
});

export default NewsScreen;
