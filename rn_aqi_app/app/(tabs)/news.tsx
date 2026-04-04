import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image, Linking, SafeAreaView, ActivityIndicator, RefreshControl, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { newsService } from '../../src/services/NewsService';
import { NewsArticle } from '../../src/models/NewsArticle';

export default function NewsScreen() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();

  // Dynamic grid column configuration
  const numColumns = width > 1024 ? 4 : width > 768 ? 3 : 2;

  const loadNews = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    const data = await newsService.fetchEnvironmentalNews();
    setNews(data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadNews();
    
    // Auto-refresh every 10 minutes
    const intervalId = setInterval(() => {
      loadNews(true);
    }, 10 * 60 * 1000);
    
    return () => clearInterval(intervalId);
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
          key={numColumns} // Forces re-render when columns change
          data={news}
          numColumns={numColumns}
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
              <View style={styles.imageContainer}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.cardImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.cardImage, { justifyContent: 'center', alignItems: 'center' }]}>
                    <MaterialCommunityIcons name="image-off" size={32} color="#ccc" />
                  </View>
                )}
              </View>
              <View style={styles.cardContent}>
                <View>
                  <View style={styles.sourceRow}>
                    <Text style={styles.sourceText} numberOfLines={1}>{item.source}</Text>
                    <Text style={styles.dateText}>{new Date(item.publishedAt).toLocaleDateString()}</Text>
                  </View>
                  <Text style={styles.articleTitle} numberOfLines={3}>{item.title}</Text>
                </View>
                <View style={styles.cardFooter}>
                  <Text style={styles.readMore}>Read Full Story</Text>
                  <MaterialCommunityIcons name="chevron-right" size={16} color="#00B0FF" />
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
    padding: 8,
  },
  newsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 8,
    flex: 1,
    aspectRatio: 1, // Ensures a perfect square
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    height: '45%',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#eee',
  },
  cardContent: {
    padding: 12,
    flex: 1,
    justifyContent: 'space-between',
  },
  sourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sourceText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#00B0FF',
    textTransform: 'uppercase',
    flex: 1,
  },
  dateText: {
    fontSize: 10,
    color: '#999',
    marginLeft: 4,
  },
  articleTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  readMore: {
    fontSize: 12,
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
