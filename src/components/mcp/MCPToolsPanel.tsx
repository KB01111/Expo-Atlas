import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { AppTheme } from '../../types';
import { MCPServer, MCPTool, MCPConnection, MCPAuthentication } from '../../types/openai';
import { composioMCPService } from '../../services/composioMCP';
import { mcpProtocolService } from '../../services/mcpProtocol';

// Use consistent types from openai.ts
import { Card, Button, Modal } from '../ui';

interface MCPToolsPanelProps {
  agentId?: string;
  onToolsChange?: (tools: MCPTool[]) => void;
  readonly?: boolean;
}

interface CustomServerConfig {
  name: string;
  endpoint: string;
  transportType: 'sse' | 'stdio' | 'websocket';
  authentication: MCPAuthentication;
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  serverCard: {
    marginBottom: 12,
  },
  serverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  serverIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  serverInfo: {
    flex: 1,
  },
  serverName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  serverDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  serverStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  toolsList: {
    marginTop: 8,
  },
  toolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    marginBottom: 8,
  },
  toolInfo: {
    flex: 1,
    marginRight: 12,
  },
  toolName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  toolDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  toolMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  connectButton: {
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  modalContent: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 16,
  },
  discoveryList: {
    maxHeight: 400,
  },
  serverDiscoveryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  capabilitiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  capabilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: theme.colors.secondary + '20',
    borderRadius: 12,
  },
  capabilityText: {
    fontSize: 11,
    color: theme.colors.secondary,
    fontWeight: '500',
  },
});

const MCPToolsPanel: React.FC<MCPToolsPanelProps> = ({
  agentId,
  onToolsChange,
  readonly = false,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [connectedServers, setConnectedServers] = useState<MCPServer[]>([]);
  const [availableServers, setAvailableServers] = useState<MCPServer[]>([]);
  const [agentConnections, setAgentConnections] = useState<MCPConnection[]>([]);
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [showCustomServer, setShowCustomServer] = useState(false);
  const [customServerConfig, setCustomServerConfig] = useState<CustomServerConfig>({
    name: '',
    endpoint: '',
    transportType: 'sse',
    authentication: { type: 'none' }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConnectedServers();
    if (agentId) {
      loadAgentConnections();
    }
  }, [agentId]);

  const loadConnectedServers = async () => {
    try {
      // Load both MCP protocol servers and Composio servers
      const mcpServers = mcpProtocolService.getConnectedServers();
      const composioServers = composioMCPService.getConnectedServers();
      
      // Convert to unified format
      const unifiedServers: MCPServer[] = [
        ...mcpServers,
        ...composioServers
      ];
      
      setConnectedServers(unifiedServers);
    } catch (error) {
      console.error('Error loading connected servers:', error);
    }
  };

  const loadAgentConnections = async () => {
    if (!agentId) return;

    try {
      const connections = await composioMCPService.getAgentTools(agentId);
      // This would typically load from Supabase
      setAgentConnections([]);
    } catch (error) {
      console.error('Error loading agent connections:', error);
    }
  };

  const discoverServers = async () => {
    setLoading(true);
    try {
      // Discover both MCP protocol servers and Composio servers
      const [mcpServers, composioServers] = await Promise.all([
        mcpProtocolService.discoverServers(),
        composioMCPService.discoverServers()
      ]);
      
      // Convert to unified format
      const unifiedServers: MCPServer[] = [
        ...mcpServers,
        ...composioServers
      ];
      
      setAvailableServers(unifiedServers);
      setShowDiscovery(true);
    } catch (error) {
      console.error('Error discovering servers:', error);
      Alert.alert('Error', 'Failed to discover MCP servers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const connectToServer = async (serverId: string) => {
    try {
      setLoading(true);
      
      // Find server in available servers
      const availableServer = availableServers.find(s => s.id === serverId);
      if (!availableServer) {
        throw new Error('Server not found in available servers');
      }

      let server: MCPServer;
      
      // Connect based on provider
      if (availableServer.metadata.provider === 'composio') {
        server = await composioMCPService.connectToServer(serverId);
      } else {
        // Connect using MCP protocol
        server = await mcpProtocolService.connectToServer(
          serverId,
          availableServer.endpoint,
          availableServer.transport_type,
          availableServer.authentication
        );
      }
      
      setConnectedServers(prev => [...prev, server]);
      await loadConnectedServers();
      
      Alert.alert(
        'Server Connected',
        `Successfully connected to ${server.name}. ${server.tools.length} tools are now available.`
      );
    } catch (error) {
      console.error('Error connecting to server:', error);
      Alert.alert('Connection Failed', 'Failed to connect to the MCP server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const connectCustomServer = async () => {
    if (!customServerConfig.name || !customServerConfig.endpoint) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      // Test connection first
      const canConnect = await mcpProtocolService.testConnection(
        customServerConfig.endpoint,
        customServerConfig.transportType,
        customServerConfig.authentication
      );

      if (!canConnect) {
        Alert.alert('Connection Failed', 'Could not connect to the server. Please check your configuration.');
        return;
      }

      // Connect to server
      const serverId = `custom_${Date.now()}`;
      const server = await mcpProtocolService.connectToServer(
        serverId,
        customServerConfig.endpoint,
        customServerConfig.transportType,
        customServerConfig.authentication
      );

      setConnectedServers(prev => [...prev, server]);
      setShowCustomServer(false);
      setCustomServerConfig({
        name: '',
        endpoint: '',
        transportType: 'sse',
        authentication: { type: 'none' }
      });

      Alert.alert(
        'Server Connected',
        `Successfully connected to ${server.name}. ${server.tools.length} tools are now available.`
      );
    } catch (error) {
      console.error('Error connecting custom server:', error);
      Alert.alert('Connection Failed', 'Failed to connect to the custom MCP server.');
    } finally {
      setLoading(false);
    }
  };

  const toggleToolForAgent = async (toolId: string, serverId: string, enabled: boolean) => {
    if (!agentId || readonly) return;

    try {
      // Create or update MCP connection for this agent
      const connection: MCPConnection = {
        server_id: serverId,
        agent_id: agentId,
        enabled,
        configuration: {},
        authentication: { type: 'none' },
        created_at: new Date().toISOString(),
        last_used: new Date().toISOString()
      };

      await composioMCPService.connectToolsToAgent(agentId, [connection]);
      
      // Update local state and notify parent
      await loadAgentConnections();
      if (onToolsChange) {
        const tools = await composioMCPService.getAgentTools(agentId);
        onToolsChange(tools);
      }
    } catch (error) {
      console.error('Error toggling tool:', error);
      Alert.alert('Error', 'Failed to update tool configuration.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return theme.colors.success;
      case 'disconnected':
        return theme.colors.textSecondary;
      case 'error':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const isToolEnabledForAgent = (toolId: string, serverId: string): boolean => {
    return agentConnections.some(
      conn => conn.server_id === serverId && conn.enabled
    );
  };

  const renderServer = ({ item: server }: { item: MCPServer }) => (
    <Card variant="outlined" style={styles.serverCard}>
      <View style={styles.serverHeader}>
        <View style={styles.serverIcon}>
          <Ionicons 
            name={server.metadata.provider === 'composio' ? 'git-network' : 'server'} 
            size={20} 
            color={theme.colors.primary} 
          />
        </View>
        <View style={styles.serverInfo}>
          <Text style={styles.serverName}>{server.name}</Text>
          <Text style={styles.serverDescription}>{server.description}</Text>
          <View style={styles.serverStatus}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(server.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(server.status) }]}>
              {server.status.toUpperCase()}
            </Text>
            <Text style={[styles.metaText, { marginLeft: 12 }]}>
              {server.tools.length} tools
            </Text>
          </View>
        </View>
      </View>

      {server.tools.length > 0 && (
        <View style={styles.toolsList}>
          {server.tools.map(tool => (
            <View key={tool.id} style={styles.toolItem}>
              <View style={styles.toolInfo}>
                <Text style={styles.toolName}>{tool.name}</Text>
                <Text style={styles.toolDescription}>{tool.description}</Text>
                <View style={styles.toolMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="flash" size={12} color={theme.colors.warning} />
                    <Text style={styles.metaText}>${tool.usage_cost.toFixed(4)}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="time" size={12} color={theme.colors.info} />
                    <Text style={styles.metaText}>
                      {tool.rate_limits.requests_per_minute}/min
                    </Text>
                  </View>
                </View>
              </View>
              
              {agentId && !readonly && (
                <Switch
                  value={isToolEnabledForAgent(tool.id, server.id)}
                  onValueChange={(enabled) => toggleToolForAgent(tool.id, server.id, enabled)}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
                  thumbColor={isToolEnabledForAgent(tool.id, server.id) ? theme.colors.primary : theme.colors.surface}
                />
              )}
            </View>
          ))}
        </View>
      )}
    </Card>
  );

  const renderDiscoveryServer = ({ item: server }: { item: MCPServer }) => (
    <View style={styles.serverDiscoveryItem}>
      <View style={styles.serverIcon}>
        <Ionicons 
          name={server.metadata.provider === 'composio' ? 'git-network' : 'server'} 
          size={20} 
          color={theme.colors.primary} 
        />
      </View>
      <View style={styles.serverInfo}>
        <Text style={styles.serverName}>{server.name}</Text>
        <Text style={styles.serverDescription}>{server.description}</Text>
        <View style={styles.capabilitiesList}>
          {server.capabilities.map(capability => (
            <View key={capability} style={styles.capabilityBadge}>
              <Text style={styles.capabilityText}>{capability}</Text>
            </View>
          ))}
        </View>
      </View>
      <Button
        title="Connect"
        variant="outline"
        size="xs"
        onPress={() => {
          setShowDiscovery(false);
          connectToServer(server.id);
        }}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>MCP Tools</Text>
          <Text style={styles.subtitle}>
            {connectedServers.length} servers connected • {
              connectedServers.reduce((sum, server) => sum + server.tools.length, 0)
            } tools available
          </Text>
        </View>
        {!readonly && (
          <Button
            title="Discover"
            variant="outline"
            size="sm"
            icon="search"
            onPress={discoverServers}
            loading={loading}
          />
        )}
      </View>

      {connectedServers.length > 0 ? (
        <FlatList
          data={connectedServers}
          renderItem={renderServer}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="server" size={48} color={theme.colors.textSecondary} />
          <Text style={styles.emptyTitle}>No MCP Servers Connected</Text>
          <Text style={styles.emptySubtitle}>
            Discover and connect to MCP servers to access external tools and capabilities
          </Text>
          {!readonly && (
            <Button
              title="Discover Servers"
              variant="primary"
              size="sm"
              icon="search"
              onPress={discoverServers}
              loading={loading}
              style={{ marginTop: 16 }}
            />
          )}
        </View>
      )}

      <Modal
        visible={showDiscovery}
        onClose={() => setShowDiscovery(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Discover MCP Servers</Text>
          <FlatList
            data={availableServers}
            renderItem={renderDiscoveryServer}
            keyExtractor={item => item.id}
            style={styles.discoveryList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>
    </View>
  );
};

export default MCPToolsPanel;