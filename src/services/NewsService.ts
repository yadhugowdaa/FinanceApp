import * as rssParser from 'react-native-rss-parser';

export interface FinanceNewsArticle {
  id: string;
  title: string;
  description: string;
  pubDate: string;
  link: string;
  source: string;
}

const RSS_FEEDS = [
  { url: 'https://finance.yahoo.com/news/rss', source: 'Yahoo Finance' },
  { url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms', source: 'Economic Times' },
  { url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664', source: 'CNBC Finance' },
  { url: 'https://www.livemint.com/rss/markets', source: 'LiveMint' },
  { url: 'https://www.moneycontrol.com/rss/MCtopnews.xml', source: 'Moneycontrol' },
  { url: 'https://www.business-standard.com/rss/markets-106.rss', source: 'Business Standard' }
];

/**
 * Fetches and parses the latest financial news from multiple RSS feeds.
 */
export const fetchFinanceNews = async (): Promise<FinanceNewsArticle[]> => {
  try {
    const fetchPromises = RSS_FEEDS.map(async (feed) => {
      try {
        const response = await fetch(feed.url);
        if (!response.ok) return [];
        
        const responseData = await response.text();
        const rss = await rssParser.parse(responseData);

        return rss.items.map((item: any) => ({
          id: item.id || item.links[0]?.url || Math.random().toString(),
          title: item.title,
          description: item.description?.replace(/<[^>]*>?/gm, '').trim() || '', // Strip HTML
          pubDate: item.published || new Date().toISOString(),
          link: item.links[0]?.url || item.id || '',
          source: feed.source,
        }));
      } catch (err) {
        console.warn(`Failed to fetch ${feed.source}:`, err);
        return []; // fail gracefully for individual feeds
      }
    });

    const resultsSlice = await Promise.all(fetchPromises);
    // Flatten arrays and sort by publish date, newest first
    const aggregatedNews = resultsSlice.flat().sort((a, b) => {
      return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
    });

    return aggregatedNews;
  } catch (err: any) {
    console.error('fetchFinanceNews error:', err);
    throw new Error('Failed to fetch finance news.');
  }
};
