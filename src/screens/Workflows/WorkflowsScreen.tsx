import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

const WorkflowsScreen: React.FC = () => {
  const { theme } = useTheme();

  const openLangGraphOAP = () => {
    Linking.openURL('https://langgraph-oap.example.com');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={theme.gradients.primary}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={styles.headerTitle}>Workflows</Text>
        <Text style={styles.headerSubtitle}>Automation workflows</Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name="git-network" size={48} color={theme.colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            Simplified Workflow Builder
          </Text>
          <Text style={[styles.cardDescription, { color: theme.colors.textSecondary }]}>
            Create basic automation workflows with drag-and-drop interface
          </Text>
          <TouchableOpacity style={[styles.button, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.buttonText}>Create Workflow</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name="desktop" size={48} color={theme.colors.secondary} />
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            Advanced Workflow Editor
          </Text>
          <Text style={[styles.cardDescription, { color: theme.colors.textSecondary }]}>
            Access the full LangGraph OAP for complex workflow development
          </Text>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.colors.secondary }]}
            onPress={openLangGraphOAP}
          >
            <Text style={styles.buttonText}>Open LangGraph OAP</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    gap: 16,
  },
  card: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WorkflowsScreen;