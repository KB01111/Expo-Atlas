import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { createSharedStyles } from '../../styles/shared';
import { Card, StatusBadge, AnimatedView } from '../../components/ui';
import { supabaseService } from '../../services/supabase';
import { User, AppTheme } from '../../types';

const createStyles = (theme: AppTheme) => StyleSheet.create({
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
  },
  statContent: {
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  usersList: {
    gap: 16,
    paddingBottom: 100,
  },
  userHeader: {
    marginBottom: 12,
  },
  userContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  userDate: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  statItemValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  statItemLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

const UsersScreen: React.FC = () => {
  const { theme } = useTheme();
  const sharedStyles = createSharedStyles(theme);
  const styles = createStyles(theme);
  const [users, setUsers] = useState<User[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    try {
      const data = await supabaseService.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const getRoleColor = () => {
    return theme.colors.primary; // All users have same role for now
  };

  const getInitials = (user: User) => {
    if (user.full_name) {
      const names = user.full_name.split(' ');
      return names.map(name => name[0]).join('').toUpperCase().slice(0, 2);
    }
    return user.email.slice(0, 2).toUpperCase();
  };

  const renderUser = ({ item, index }: { item: any; index: number }) => (
    <AnimatedView animation="slideUp" delay={index * 50}>
      <Card variant="elevated" size="md" pressable>
        <View style={styles.userHeader}>
          <View style={styles.userContent}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitials(item)}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {item.full_name || 'Unnamed User'}
              </Text>
              <Text style={styles.userEmail}>
                {item.email}
              </Text>
              <Text style={styles.userDate}>
                Created {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
            <StatusBadge status="active" variant="subtle" />
          </View>
        </View>
        
        <View style={styles.userStats}>
          <View style={styles.statItem}>
            <Ionicons name="shield-checkmark" size={16} color={theme.colors.success} />
            <Text style={[styles.statItemValue, { color: theme.colors.success }]}>
              User
            </Text>
            <Text style={styles.statItemLabel}>Role</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="calendar" size={16} color={theme.colors.info} />
            <Text style={[styles.statItemValue, { color: theme.colors.info }]}>
              {Math.floor((Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24))}d
            </Text>
            <Text style={styles.statItemLabel}>Days</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="person" size={16} color={theme.colors.secondary} />
            <Text style={[styles.statItemValue, { color: theme.colors.secondary }]}>
              {item.full_name ? 'Named' : 'Guest'}
            </Text>
            <Text style={styles.statItemLabel}>Status</Text>
          </View>
        </View>
      </Card>
    </AnimatedView>
  );

  if (loading) {
    return (
      <View style={[sharedStyles.container, sharedStyles.center]}>
        <Text style={[sharedStyles.body, { textAlign: 'center', color: theme.colors.text }]}>
          Loading users...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={sharedStyles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <LinearGradient
        colors={theme.gradients.primary}
        style={sharedStyles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={sharedStyles.headerTitle}>Users</Text>
        <Text style={sharedStyles.headerSubtitle}>Manage user access & roles</Text>
      </LinearGradient>

      <View style={sharedStyles.contentSpaced}>
        {/* User Statistics */}
        <View style={styles.statsGrid}>
          <AnimatedView animation="slideUp" delay={100}>
            <Card variant="elevated" size="md" style={styles.statCard}>
              <View style={styles.statContent}>
                <Ionicons name="people" size={24} color={theme.colors.primary} />
                <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                  {users.length}
                </Text>
                <Text style={styles.statLabel}>Total Users</Text>
              </View>
            </Card>
          </AnimatedView>

          <AnimatedView animation="slideUp" delay={200}>
            <Card variant="elevated" size="md" style={styles.statCard}>
              <View style={styles.statContent}>
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
                <Text style={[styles.statValue, { color: theme.colors.success }]}>
                  {users.filter(u => u.full_name).length}
                </Text>
                <Text style={styles.statLabel}>With Names</Text>
              </View>
            </Card>
          </AnimatedView>

          <AnimatedView animation="slideUp" delay={300}>
            <Card variant="elevated" size="md" style={styles.statCard}>
              <View style={styles.statContent}>
                <Ionicons name="time" size={24} color={theme.colors.warning} />
                <Text style={[styles.statValue, { color: theme.colors.warning }]}>
                  1
                </Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
            </Card>
          </AnimatedView>
        </View>

        {/* Users List */}
        {users.length > 0 ? (
          <FlatList
            data={users}
            renderItem={renderUser}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.usersList}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <AnimatedView animation="fadeIn" delay={400}>
            <View style={styles.emptyState}>
              <Ionicons name="people" size={64} color={theme.colors.textSecondary} />
              <Text style={styles.emptyTitle}>No users found</Text>
              <Text style={styles.emptySubtitle}>
                Users will appear here when they sign up
              </Text>
            </View>
          </AnimatedView>
        )}

        <TouchableOpacity style={sharedStyles.fab}>
          <Ionicons name="person-add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};


export default UsersScreen;