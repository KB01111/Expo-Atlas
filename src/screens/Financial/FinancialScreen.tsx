import React from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

const mockTransactions = [
  {
    id: '1',
    amount: -125.50,
    description: 'Office Supplies',
    category: 'Business Expenses',
    date: '2024-01-15',
    basCategory: 'Deductible',
    confidence: 92.5,
    reviewed: false,
  },
  {
    id: '2',
    amount: -89.99,
    description: 'Software License',
    category: 'IT Services',
    date: '2024-01-14',
    basCategory: 'Deductible',
    confidence: 98.1,
    reviewed: true,
  },
];

const FinancialScreen: React.FC = () => {
  const { theme } = useTheme();

  const renderTransaction = ({ item }: { item: any }) => (
    <TouchableOpacity style={[styles.transactionCard, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionInfo}>
          <Text style={[styles.transactionDescription, { color: theme.colors.text }]}>
            {item.description}
          </Text>
          <Text style={[styles.transactionCategory, { color: theme.colors.textSecondary }]}>
            {item.category}
          </Text>
        </View>
        <Text style={[
          styles.transactionAmount,
          { color: item.amount < 0 ? theme.colors.error : theme.colors.success }
        ]}>
          ${Math.abs(item.amount).toFixed(2)}
        </Text>
      </View>

      <View style={styles.transactionFooter}>
        <View style={styles.basInfo}>
          <Text style={[styles.basCategory, { color: theme.colors.secondary }]}>
            BAS: {item.basCategory}
          </Text>
          <View style={styles.confidenceContainer}>
            <Text style={[styles.confidenceText, { color: theme.colors.textSecondary }]}>
              {item.confidence.toFixed(1)}% confidence
            </Text>
            <View style={[
              styles.confidenceDot,
              { backgroundColor: item.confidence > 90 ? theme.colors.success : theme.colors.warning }
            ]} />
          </View>
        </View>
        {!item.reviewed && (
          <TouchableOpacity style={[styles.reviewButton, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.reviewButtonText}>Review</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={theme.gradients.primary}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={styles.headerTitle}>Financial</Text>
        <Text style={styles.headerSubtitle}>BAS automation & tracking</Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="calendar" size={24} color={theme.colors.primary} />
            <View style={styles.summaryInfo}>
              <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>
                This Month
              </Text>
              <Text style={[styles.summaryAmount, { color: theme.colors.success }]}>
                $2,345.67
              </Text>
            </View>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="document-text" size={24} color={theme.colors.secondary} />
            <View style={styles.summaryInfo}>
              <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>
                Pending Review
              </Text>
              <Text style={[styles.summaryCount, { color: theme.colors.warning }]}>
                12 items
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.sectionHeader, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Recent Transactions
          </Text>
          <TouchableOpacity>
            <Ionicons name="filter" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={mockTransactions}
          renderItem={renderTransaction}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.transactionsList}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#F1F5F9',
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '600',
  },
  summaryCount: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  transactionsList: {
    gap: 12,
  },
  transactionCard: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  transactionCategory: {
    fontSize: 14,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: '600',
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  basInfo: {
    flex: 1,
  },
  basCategory: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confidenceText: {
    fontSize: 12,
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  reviewButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  reviewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default FinancialScreen;