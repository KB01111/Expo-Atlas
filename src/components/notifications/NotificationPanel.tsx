import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { createSharedStyles } from '../../styles/shared';
import { AnimatedView } from '../ui';
import { supabaseService } from '../../services/supabase';
import { Notification } from '../../types';

interface NotificationPanelProps {
  userId: string;
  onNotificationPress?: (notification: Notification) => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  userId,
  onNotificationPress
}) => {
  const { theme } = useTheme();
  const sharedStyles = createSharedStyles(theme);
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async () => {
    try {
      const data = await supabaseService.getNotifications(userId);
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [userId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.read) {
      await supabaseService.markNotificationRead(notification.id);
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
    }
    onNotificationPress?.(notification);
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'agent_completed':
        return 'checkmark-circle';
      case 'agent_failed':
        return 'alert-circle';
      case 'new_execution':
        return 'play-circle';
      case 'system':
        return 'settings';
      default:
        return 'notifications';
    }
  };

  const getColorForType = (type: string) => {
    switch (type) {
      case 'agent_completed':
        return theme.colors.success;
      case 'agent_failed':
        return theme.colors.error;
      case 'new_execution':
        return theme.colors.primary;
      case 'system':
        return theme.colors.warning;
      default:
        return theme.colors.textSecondary;
    }
  };

  const renderNotification = ({ item, index }: { item: Notification; index: number }) => (
    <AnimatedView animation="slideUp" delay={index * 100}>
      <TouchableOpacity
        style={[
          styles.notificationItem,
          {
            backgroundColor: item.read ? theme.colors.surface : theme.colors.background,
            borderLeftColor: getColorForType(item.type),
          }
        ]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={styles.notificationIcon}>
          <Ionicons
            name={getIconForType(item.type) as any}
            size={24}
            color={getColorForType(item.type)}
          />
        </View>
        
        <View style={styles.notificationContent}>
          <Text style={[
            sharedStyles.subtitle,
            { opacity: item.read ? 0.7 : 1 }
          ]}>
            {item.title}
          </Text>
          <Text style={[
            sharedStyles.body,
            { opacity: item.read ? 0.6 : 0.8 }
          ]}>
            {item.message}
          </Text>
          <Text style={[
            sharedStyles.caption,
            { marginTop: 4 }
          ]}>
            {new Date(item.created_at).toLocaleDateString()} at{' '}
            {new Date(item.created_at).toLocaleTimeString()}
          </Text>
        </View>

        {!item.read && (
          <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />
        )}
      </TouchableOpacity>
    </AnimatedView>
  );

  if (loading) {
    return (
      <View style={[sharedStyles.container, sharedStyles.center]}>
        <Text style={sharedStyles.body}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={sharedStyles.container}>
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={[sharedStyles.center, { paddingVertical: 40 }]}>
            <Ionicons name="notifications-off" size={48} color={theme.colors.textSecondary} />
            <Text style={[sharedStyles.body, { marginTop: 16, textAlign: 'center' }]}>
              No notifications yet
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    padding: 16,
    gap: 12,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    alignItems: 'flex-start',
    gap: 12,
  },
  notificationIcon: {
    marginTop: 2,
  },
  notificationContent: {
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
  },
});

export default NotificationPanel;