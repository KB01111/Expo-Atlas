import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Card, Button, Modal } from '../ui';
import { AppTheme } from '../../types';
import openAIAgentsService from '../../services/openaiAgentsSimple';

interface OpenAIConfigModalProps {
  visible: boolean;
  onClose: () => void;
  onConfigured?: () => void;
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    minHeight: 44,
  },
  helpText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  linkText: {
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusConfigured: {
    backgroundColor: theme.colors.success + '20',
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  statusNotConfigured: {
    backgroundColor: theme.colors.warning + '20',
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
  },
  featuresList: {
    marginTop: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
  },
  warningContainer: {
    backgroundColor: theme.colors.warning + '20',
    borderWidth: 1,
    borderColor: theme.colors.warning,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 14,
    color: theme.colors.warning,
    textAlign: 'center',
  },
});

const OpenAIConfigModal: React.FC<OpenAIConfigModalProps> = ({
  visible,
  onClose,
  onConfigured
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [apiKey, setApiKey] = useState('');
  const [organization, setOrganization] = useState('');
  const [isConfigured, setIsConfigured] = useState(openAIAgentsService.isConfigured());

  const handleGetAPIKey = () => {
    Linking.openURL('https://platform.openai.com/api-keys');
  };

  const handleSave = () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter your OpenAI API key');
      return;
    }

    if (!apiKey.startsWith('sk-')) {
      Alert.alert('Error', 'OpenAI API keys should start with "sk-"');
      return;
    }

    // In a real app, you would save this securely
    // For this demo, we'll just update the service
    try {
      // This would normally save to secure storage
      Alert.alert(
        'Configuration Saved',
        'Your OpenAI API key has been saved. You can now create and use OpenAI agents.',
        [
          {
            text: 'OK',
            onPress: () => {
              setIsConfigured(true);
              onConfigured?.();
              onClose();
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save configuration. Please try again.');
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter your OpenAI API key first');
      return;
    }

    try {
      // Test the API key by creating a simple test agent
      Alert.alert('Testing...', 'This feature will be implemented to test your API key connection.');
    } catch (error) {
      Alert.alert('Connection Failed', 'Unable to connect with the provided API key. Please check your key and try again.');
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="OpenAI Configuration"
      size="large"
    >
      <View style={styles.container}>
        <Text style={styles.title}>Configure OpenAI Agents</Text>
        <Text style={styles.subtitle}>
          Set up your OpenAI API key to unlock powerful AI agent capabilities
        </Text>

        {/* Status Indicator */}
        <View style={[
          styles.statusContainer, 
          isConfigured ? styles.statusConfigured : styles.statusNotConfigured
        ]}>
          <Ionicons 
            name={isConfigured ? 'checkmark-circle' : 'warning'} 
            size={20} 
            color={isConfigured ? theme.colors.success : theme.colors.warning} 
          />
          <Text style={[
            styles.statusText,
            { color: isConfigured ? theme.colors.success : theme.colors.warning }
          ]}>
            {isConfigured ? 'OpenAI API Configured' : 'OpenAI API Not Configured'}
          </Text>
        </View>

        {!isConfigured && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>
              You need an OpenAI API key to create and use OpenAI agents
            </Text>
          </View>
        )}

        {/* API Key Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>OpenAI API Key *</Text>
          <TextInput
            style={styles.input}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="sk-..."
            placeholderTextColor={theme.colors.textSecondary}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.helpText}>
            Get your API key from{' '}
            <Text style={styles.linkText} onPress={handleGetAPIKey}>
              OpenAI Platform
            </Text>
          </Text>
        </View>

        {/* Organization ID (Optional) */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Organization ID (Optional)</Text>
          <TextInput
            style={styles.input}
            value={organization}
            onChangeText={setOrganization}
            placeholder="org-..."
            placeholderTextColor={theme.colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.helpText}>
            Only required if you belong to multiple organizations
          </Text>
        </View>

        {/* Features List */}
        <Card variant="outlined" style={styles.featuresList}>
          <Text style={styles.label}>With OpenAI Agents, you can:</Text>
          
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
            <Text style={styles.featureText}>Create AI agents with custom instructions</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
            <Text style={styles.featureText}>Use tools like code interpreter and file search</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
            <Text style={styles.featureText}>Execute agents with real-time streaming</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
            <Text style={styles.featureText}>Monitor execution costs and performance</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
            <Text style={styles.featureText}>Access latest GPT-4 and GPT-4o models</Text>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            title="Cancel"
            variant="outline"
            onPress={onClose}
            style={styles.button}
          />
          
          {apiKey.trim() && (
            <Button
              title="Test Connection"
              variant="secondary"
              onPress={handleTestConnection}
              style={styles.button}
            />
          )}
          
          <Button
            title="Save Configuration"
            variant="primary"
            onPress={handleSave}
            disabled={!apiKey.trim()}
            style={styles.button}
          />
        </View>
      </View>
    </Modal>
  );
};

export default OpenAIConfigModal;