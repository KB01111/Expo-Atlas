import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

const mockUsers = [
  {
    id: '1',
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    createdAt: '2024-01-01T00:00:00Z',
    lastActive: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    email: 'user@example.com',
    firstName: 'Regular',
    lastName: 'User',
    role: 'user',
    createdAt: '2024-01-05T00:00:00Z',
    lastActive: '2024-01-14T15:45:00Z',
  },
];

const UsersScreen: React.FC = () => {
  const { theme } = useTheme();

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return theme.colors.error;
      case 'user':
        return theme.colors.primary;
      case 'viewer':
        return theme.colors.textSecondary;
      default:
        return theme.colors.textSecondary;
    }
  };

  const renderUser = ({ item }: { item: any }) => (
    <TouchableOpacity style={[styles.userCard, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.userHeader}>
        <View style={styles.avatar}>
          <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
            {item.firstName?.[0]}{item.lastName?.[0]}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: theme.colors.text }]}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>
            {item.email}
          </Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
          <Text style={styles.roleText}>{item.role}</Text>
        </View>
      </View>

      <View style={styles.userFooter}>
        <Text style={[styles.lastActive, { color: theme.colors.textSecondary }]}>
          Last active: {new Date(item.lastActive).toLocaleDateString()}
        </Text>
        <TouchableOpacity>
          <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Users</Text>
        <Text style={styles.headerSubtitle}>Manage user access & roles</Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {mockUsers.length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Total Users
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.statValue, { color: theme.colors.success }]}>
              {mockUsers.filter(u => u.role === 'admin').length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Admins
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.statValue, { color: theme.colors.warning }]}>
              1
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Pending
            </Text>
          </View>
        </View>

        <FlatList
          data={mockUsers}
          renderItem={renderUser}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.usersList}
          showsVerticalScrollIndicator={false}
        />

        <TouchableOpacity style={[styles.fab, { backgroundColor: theme.colors.primary }]}>
          <Ionicons name="person-add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
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
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  usersList: {
    gap: 12,
    paddingBottom: 80,
  },
  userCard: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  userFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastActive: {
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});

export default UsersScreen;