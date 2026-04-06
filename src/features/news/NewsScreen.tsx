import React, {useCallback, useState, useMemo} from 'react';
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
  TextInput,
  ScrollView,
} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import Animated, {FadeInDown} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Feather';

import {fetchFinanceNews, FinanceNewsArticle} from '../../services/NewsService';
import {Colors, Typography, Spacing, BorderRadius} from '../../ui';

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

  const generateExpertPrompt = (url: string) => 
    `Act as an expert financial advisor. Provide a simple, jargon-free summary of the following article. URL: ${url}`;

  const handleAskGpt = () => {
    if (item.link) {
      const url = `https://chatgpt.com/?q=${encodeURIComponent(generateExpertPrompt(item.link))}`;
      Linking.openURL(url).catch(err =>
        console.error('Failed to open ChatGPT URL', err),
      );
    }
  };

  const handleAskClaude = () => {
    if (item.link) {
      const url = `https://claude.ai/new?q=${encodeURIComponent(generateExpertPrompt(item.link))}`;
      Linking.openURL(url).catch(err =>
        console.error('Failed to open Claude URL', err),
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
      <View style={styles.card}>
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
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} onPress={handlePress}>
            <Text style={styles.readMoreText}>Read Article</Text>
            <Icon name="chevron-right" size={16} color={Colors.primary} />
          </TouchableOpacity>

          <View style={styles.aiBtnGroup}>
            <TouchableOpacity style={[styles.actionBtn, styles.gptBtn]} activeOpacity={0.8} onPress={handleAskGpt}>
              <Icon name="message-circle" size={14} color="#FFF" />
              <Text style={styles.aiBtnText}>Ask GPT</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, styles.claudeBtn]} activeOpacity={0.8} onPress={handleAskClaude}>
              <Icon name="cpu" size={14} color="#FFF" />
              <Text style={styles.aiBtnText}>Ask Claude</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const NewsScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);

  // Use TanStack Query to fetch and aggressively cache news for 15 mins
  const {data, isLoading, isFetching, isError, error, refetch} = useQuery({
    queryKey: ['financeNews'],
    queryFn: fetchFinanceNews,
    staleTime: 1000 * 60 * 15, 
    refetchInterval: 1000 * 60 * 15,
  });

  const availableSources = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.map(item => item.source)));
  }, [data]);

  const filteredData = useMemo(() => {
    if (!data) return [];
    let result = data;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        item =>
          item.title.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q)
      );
    }
    
    if (selectedSources.length > 0) {
      result = result.filter(item => selectedSources.includes(item.source));
    }
    
    return result;
  }, [data, searchQuery, selectedSources]);

  const toggleSource = (source: string) => {
    setSelectedSources(prev =>
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

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
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerNormal}>
          <Text style={styles.screenTitle}>Market News</Text>
          <Text style={styles.screenSubtitle}>Latest financial updates</Text>
          
          {availableSources.length > 0 && (
            <View style={styles.filterContainer}>
              <View style={styles.searchBox}>
                <Icon name="search" size={16} color={Colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search articles..."
                  placeholderTextColor={Colors.textTertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Icon name="x-circle" size={16} color={Colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sourceScrollContent}
              >
                {availableSources.map(source => {
                  const isActive = selectedSources.includes(source);
                  return (
                    <TouchableOpacity
                      key={source}
                      activeOpacity={0.8}
                      style={[styles.sourceChip, isActive && styles.sourceChipActive]}
                      onPress={() => toggleSource(source)}
                    >
                      <Text style={[styles.sourceChipText, isActive && styles.sourceChipTextActive]}>
                        {source}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={(item, index) => `${item.id}-${index}`}
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
  headerNormal: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.xs,
    backgroundColor: Colors.background,
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
  filterContainer: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography.body,
    marginLeft: Spacing.sm,
  },
  sourceScrollContent: {
    gap: Spacing.sm,
    paddingBottom: Spacing.xs, 
  },
  sourceChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.round,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sourceChipActive: {
    backgroundColor: 'rgba(255, 183, 0, 0.1)',
    borderColor: Colors.primary,
  },
  sourceChipText: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  sourceChipTextActive: {
    color: Colors.primary,
    fontWeight: '600',
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
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
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
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  aiBtnGroup: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(255, 183, 0, 0.1)',
  },
  readMoreText: {
    fontSize: Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  gptBtn: {
    backgroundColor: '#10A37F',
  },
  claudeBtn: {
    backgroundColor: '#D97757', // Anthropic brand color leaning
  },
  aiBtnText: {
    fontSize: Typography.caption,
    color: '#FFF',
    fontWeight: '600',
  },
});

export default NewsScreen;
