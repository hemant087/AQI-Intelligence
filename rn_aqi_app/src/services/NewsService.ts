import { Platform } from 'react-native';
import { NewsArticle } from '../models/NewsArticle';

const API_KEY = process.env.EXPO_PUBLIC_NEWS_API_KEY;
const BASE_URL = 'https://newsdata.io/api/1/news';

export class NewsService {
  async fetchEnvironmentalNews(): Promise<NewsArticle[]> {
    if (Platform.OS === 'web') {
      return this.getMockNews();
    }

    try {
      // Searching for Delhi Pollution / Environment in India
      const response = await fetch(`${BASE_URL}?apikey=${API_KEY}&q=delhi%20pollution%20OR%20air%20quality&country=in&language=en&category=environment`);
      const json = await response.json();

      if (json.status !== 'success') return this.getMockNews();

      return json.results.map((item: any) => ({
        id: item.article_id,
        title: item.title,
        description: item.description || item.content?.substring(0, 150) + '...',
        url: item.link,
        imageUrl: item.image_url,
        source: item.source_id,
        publishedAt: item.pubDate,
      }));
    } catch (e) {
      return this.getMockNews();
    }
  }

  private getMockNews(): NewsArticle[] {
    return [
      {
        id: '1',
        title: 'Delhi Air Quality: Severe Smog Engulfs NCR, Schools Switched to Online Mode',
        description: 'New Delhi is facing record-breaking pollution levels this week as stubble burning and low wind speeds trap toxic particles over the capital.',
        url: 'https://timesofindia.indiatimes.com',
        imageUrl: 'https://images.unsplash.com/photo-1543330091-27228394c7dc?q=80&w=600&auto=format&fit=crop',
        source: 'Times of India',
        publishedAt: '2026-03-20T08:00:00Z',
      },
      {
        id: '2',
        title: 'GRAP 4 Restrictions Implemented in Delhi NCR to Combat Pollution',
        description: 'The Commission for Air Quality Management (CAQM) has invoked the final stage of the Graded Response Action Plan (GRAP) across the region.',
        url: 'https://www.hindustantimes.com',
        imageUrl: 'https://images.unsplash.com/photo-1611273216448-3af65720a538?q=80&w=600&auto=format&fit=crop',
        source: 'Hindustan Times',
        publishedAt: '2026-03-19T14:30:00Z',
      },
      {
        id: '3',
        title: 'Electronic Waste Management: New Initiative Launched in Gurugram',
        description: 'The HPCB has launched a new drive to collect and safely dispose of e-waste from residential societies and corporate offices in Gurgaon.',
        url: 'https://indianexpress.com',
        imageUrl: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?q=80&w=600&auto=format&fit=crop',
        source: 'Indian Express',
        publishedAt: '2026-03-19T09:15:00Z',
      }
    ];
  }
}

export const newsService = new NewsService();
