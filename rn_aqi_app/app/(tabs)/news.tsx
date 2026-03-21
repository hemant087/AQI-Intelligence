import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image, Linking, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { newsService } from '../../src/services/NewsService';
import { NewsArticle } from '../../src/models/NewsArticle';

export default function NewsScreen() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNews = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    const data = await newsService.fetchEnvironmentalNews();
    setNews(data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadNews();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadNews(true);
  };

  const openArticle = (url: string) => {
    Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>NCR Environment</Text>
        <Text style={styles.subtitle}>Verified News & Alerts</Text>
      </View>

      {loading && news.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#00B0FF" />
        </View>
      ) : (
        <FlatList
          data={news}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.newsCard} 
              activeOpacity={0.9}
              onPress={() => openArticle(item.url)}
            >
              {item.imageUrl && (
                <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
              )}
              <View style={styles.cardContent}>
                <View style={styles.sourceRow}>
                  <Text style={styles.sourceText}>{item.source}</Text>
                  <Text style={styles.dateText}>{new Date(item.publishedAt).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.articleTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.articleDesc} numberOfLines={3}>{item.description}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.readMore}>Read Full Story</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#00B0FF" />
                </View>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.center}>
              <MaterialCommunityIcons name="newspaper-variant-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No news at the moment</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  newsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#eee',
  },
  cardContent: {
    padding: 16,
  },
  sourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sourceText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#00B0FF',
    textTransform: 'uppercase',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  articleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    lineHeight: 24,
    marginBottom: 8,
  },
  articleDesc: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  readMore: {
    fontSize: 14,
    color: '#00B0FF',
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    marginTop: 10,
    color: '#999',
    fontSize: 16,
  },
});
