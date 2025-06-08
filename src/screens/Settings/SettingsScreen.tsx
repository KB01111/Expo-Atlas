import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { createSharedStyles } from '../../styles/shared';
import { supabaseService } from '../../services/supabase';
import { UserSettings } from '../../types';

const SettingsScreen: React.FC = () => {
  const { theme, themeMode, setThemeMode, isDark } = useTheme();
  const { userId, signOut } = useAuth();
  const sharedStyles = createSharedStyles(theme);
  
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    try {
      const userSettings = await supabaseService.getUserSettings(userId);
      setSettings(userSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof UserSettings, value: any) => {
    if (!userId) return;
    
    try {
      const updatedSettings = await supabaseService.updateUserSettings(userId, {
        [key]: value
      });
      if (updatedSettings) {
        setSettings(updatedSettings);
      }
    } catch (error) {
      console.error('Error updating setting:', error);
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const renderThemeOption = (mode: 'light' | 'dark' | 'system', label: string, icon: string) => (
    <TouchableOpacity
      style={[
        styles.themeOption,
        { backgroundColor: theme.colors.surface },
        themeMode === mode && { borderColor: theme.colors.primary, borderWidth: 2 }
      ]}
      onPress={() => setThemeMode(mode)}
    >
      <Ionicons 
        name={icon as any} 
        size={24} 
        color={themeMode === mode ? theme.colors.primary : theme.colors.textSecondary} 
      />
      <Text style={[
        styles.themeLabel,
        { color: themeMode === mode ? theme.colors.primary : theme.colors.text }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderSettingItem = (
    title: string,
    subtitle: string,
    icon: string,
    action: React.ReactNode
  ) => (
    <View style={[styles.settingItem, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon as any} size={24} color={theme.colors.primary} />
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
            {title}
          </Text>
          <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
            {subtitle}
          </Text>
        </View>
      </View>
      {action}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={theme.gradients.primary}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>App preferences & configuration</Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Appearance
          </Text>
          <View style={styles.themeContainer}>
            {renderThemeOption('light', 'Light', 'sunny')}
            {renderThemeOption('dark', 'Dark', 'moon')}
            {renderThemeOption('system', 'System', 'phone-portrait')}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Notifications
          </Text>
          {renderSettingItem(
            'Push Notifications',
            'Receive alerts for important events',
            'notifications',
            <Switch 
              value={settings?.notifications_enabled ?? true}
              onValueChange={(value) => updateSetting('notifications_enabled', value)}
            />
          )}
          {renderSettingItem(
            'Email Notifications',
            'Get email updates for system events',
            'mail',
            <Switch 
              value={settings?.email_notifications ?? false}
              onValueChange={(value) => updateSetting('email_notifications', value)}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Data & Sync
          </Text>
          {renderSettingItem(
            'Auto Sync',
            'Automatically sync data in background',
            'sync',
            <Switch 
              value={settings?.auto_sync ?? true}
              onValueChange={(value) => updateSetting('auto_sync', value)}
            />
          )}
          {renderSettingItem(
            'Offline Mode',
            'Cache data for offline access',
            'cloud-offline',
            <Switch 
              value={settings?.offline_mode ?? true}
              onValueChange={(value) => updateSetting('offline_mode', value)}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Security
          </Text>
          {renderSettingItem(
            'Biometric Lock',
            'Use fingerprint or face ID',
            'finger-print',
            <TouchableOpacity>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
          {renderSettingItem(
            'API Keys',
            'Manage API key access',
            'key',
            <TouchableOpacity>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            About
          </Text>
          {renderSettingItem(
            'Version',
            '1.0.0 (Build 1)',
            'information-circle',
            <Text style={[styles.versionText, { color: theme.colors.textSecondary }]}>
              Latest
            </Text>
          )}
          {renderSettingItem(
            'Support',
            'Get help and contact support',
            'help-circle',
            <TouchableOpacity>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          style={[styles.signOutButton, { backgroundColor: theme.colors.error }]}
          onPress={signOut}
        >
          <Ionicons name="log-out" size={20} color="#FFFFFF" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  themeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  themeOption: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
  },
  versionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
  },
  signOutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettingsScreen;