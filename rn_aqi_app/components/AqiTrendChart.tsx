import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { HistoricalDataPoint } from '../src/services/OpenAqHistoricalService';

interface AqiTrendChartProps {
  data: HistoricalDataPoint[];
  color: string;
}

export const AqiTrendChart: React.FC<AqiTrendChartProps> = ({ data, color }) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No historical data available for this station.</Text>
      </View>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 20); // At least 20 for scale
  const chartHeight = 120;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>24H TREND (PM2.5)</Text>
      <View style={[styles.chartContainer, { height: chartHeight }]}>
        {data.map((point, index) => {
          const barHeight = (point.value / maxValue) * chartHeight;
          const isLast = index === data.length - 1;
          
          return (
            <View key={index} style={styles.barWrapper}>
              <View 
                style={[
                  styles.bar, 
                  { 
                    height: Math.max(barHeight, 4), 
                    backgroundColor: isLast ? color : '#DDD' 
                  }
                ]} 
              />
            </View>
          );
        })}
      </View>
      <View style={styles.labelRow}>
        <Text style={styles.timeLabel}>24h ago</Text>
        <Text style={styles.timeLabel}>Now</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  title: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 15,
    textTransform: 'uppercase',
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: '100%',
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 1,
  },
  bar: {
    width: '80%',
    borderRadius: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  timeLabel: {
    fontSize: 10,
    color: '#999',
  },
  emptyContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    marginBottom: 20,
  },
  emptyText: {
    color: '#999',
    fontSize: 12,
  }
});
