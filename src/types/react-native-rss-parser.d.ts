declare module 'react-native-rss-parser' {
  export interface RSSFeed {
    title: string;
    description: string;
    items: RSSEntry[];
  }

  export interface RSSEntry {
    title: string;
    description: string;
    published?: string;
    id: string;
    content?: string;
    links: {url: string}[];
  }

  export function parse(text: string): Promise<RSSFeed>;
}
