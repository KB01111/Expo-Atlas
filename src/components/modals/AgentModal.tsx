import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../../contexts/ThemeContext';
import { createSharedStyles } from '../../styles/shared';
import { Button } from '../ui';
import Modal from '../ui/Modal';
import { supabaseService } from '../../services/supabase';
import { Agent } from '../../types';

interface AgentModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (agent: Agent) => void;
  agent?: Agent | null;
}

const AgentModal: React.FC<AgentModalProps> = ({
  visible,
  onClose,
  onSave,
  agent
}) => {
  const { theme } = useTheme();
  const sharedStyles = createSharedStyles(theme);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    provider: 'openai',
    model: 'gpt-4',
    status: 'active' as 'active' | 'inactive' | 'error',
    configuration: {}
  });
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name || '',
        description: agent.description || '',
        provider: agent.provider || 'openai',
        model: agent.model || 'gpt-4',
        status: agent.status || 'active',
        configuration: agent.configuration || {}
      });
    } else {
      setFormData({
        name: '',
        description: '',
        provider: 'openai',
        model: 'gpt-4',
        status: 'active',
        configuration: {}
      });
    }
  }, [agent, visible]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Agent name is required');
      return;
    }

    setLoading(true);
    try {
      let result;
      if (agent) {
        result = await supabaseService.updateAgent(agent.id, formData);
      } else {
        // Add user_id for new agent creation
        const agentData = {
          ...formData,
          user_id: 'current_user' // TODO: Get from auth context
        };
        result = await supabaseService.createAgent(agentData);
      }

      if (result) {
        onSave(result);
        onClose();
      } else {
        Alert.alert('Error', 'Failed to save agent');
      }
    } catch (error) {
      console.error('Error saving agent:', error);
      Alert.alert('Error', 'Failed to save agent');
    } finally {
      setLoading(false);
    }
  };

  const providers = [
    { label: 'OpenAI', value: 'openai' },
    { label: 'Anthropic', value: 'anthropic' },
    { label: 'Google', value: 'google' },
    { label: 'Local', value: 'local' },
  ];

  const models = {
    openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    anthropic: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    google: ['gemini-pro', 'gemini-pro-vision'],
    local: ['llama-2', 'codellama', 'custom']
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={agent ? 'Edit Agent' : 'Create Agent'}
      size="large"
    >
      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        <View style={styles.field}>
          <Text style={[sharedStyles.label, styles.fieldLabel]}>
            Name *
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.colors.background, color: theme.colors.text }
            ]}
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="Enter agent name"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        <View style={styles.field}>
          <Text style={[sharedStyles.label, styles.fieldLabel]}>
            Description
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              { backgroundColor: theme.colors.background, color: theme.colors.text }
            ]}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Describe what this agent does"
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.field}>
          <Text style={[sharedStyles.label, styles.fieldLabel]}>
            Provider
          </Text>
          <View style={[
            styles.pickerContainer,
            { backgroundColor: theme.colors.background }
          ]}>
            <Picker
              selectedValue={formData.provider}
              onValueChange={(value: string) => setFormData({ 
                ...formData, 
                provider: value,
                model: models[value as keyof typeof models][0]
              })}
              style={{ color: theme.colors.text }}
            >
              {providers.map((provider) => (
                <Picker.Item
                  key={provider.value}
                  label={provider.label}
                  value={provider.value}
                />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[sharedStyles.label, styles.fieldLabel]}>
            Model
          </Text>
          <View style={[
            styles.pickerContainer,
            { backgroundColor: theme.colors.background }
          ]}>
            <Picker
              selectedValue={formData.model}
              onValueChange={(value: string) => setFormData({ ...formData, model: value })}
              style={{ color: theme.colors.text }}
            >
              {models[formData.provider as keyof typeof models]?.map((model) => (
                <Picker.Item
                  key={model}
                  label={model}
                  value={model}
                />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[sharedStyles.label, styles.fieldLabel]}>
            Status
          </Text>
          <View style={[
            styles.pickerContainer,
            { backgroundColor: theme.colors.background }
          ]}>
            <Picker
              selectedValue={formData.status}
              onValueChange={(value: string) => setFormData({ ...formData, status: value as 'active' | 'inactive' | 'error' })}
              style={{ color: theme.colors.text }}
            >
              <Picker.Item label="Active" value="active" />
              <Picker.Item label="Inactive" value="inactive" />
              <Picker.Item label="Error" value="error" />
            </Picker>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title="Cancel"
            onPress={onClose}
            variant="outline"
            style={{ flex: 1 }}
          />
          <Button
            title={agent ? 'Update' : 'Create'}
            onPress={handleSave}
            loading={loading}
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  form: {
    flex: 1,
  },
  field: {
    marginBottom: 20,
  },
  fieldLabel: {
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
});

export default AgentModal;