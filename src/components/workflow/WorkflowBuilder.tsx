import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { createSharedStyles } from '../../styles/shared';
import { Button, Card } from '../ui';
import { WorkflowNode, WorkflowEdge } from '../../types';

const { width, height } = Dimensions.get('window');

interface WorkflowBuilderProps {
  onSave: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void;
  initialNodes?: WorkflowNode[];
  initialEdges?: WorkflowEdge[];
}

const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({
  onSave,
  initialNodes = [],
  initialEdges = []
}) => {
  const { theme } = useTheme();
  const sharedStyles = createSharedStyles(theme);
  
  const [nodes, setNodes] = useState<WorkflowNode[]>(initialNodes);
  const [edges, setEdges] = useState<WorkflowEdge[]>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const nodeTypes = [
    { type: 'start', label: 'Start', icon: 'play-circle', color: theme.colors.success },
    { type: 'agent', label: 'Agent', icon: 'person', color: theme.colors.primary },
    { type: 'condition', label: 'Condition', icon: 'git-branch', color: theme.colors.warning },
    { type: 'action', label: 'Action', icon: 'flash', color: theme.colors.secondary },
    { type: 'end', label: 'End', icon: 'stop-circle', color: theme.colors.error },
  ];

  const addNode = (type: string) => {
    const newNode: WorkflowNode = {
      id: `node_${Date.now()}`,
      type,
      position: { x: 100, y: 100 },
      data: {
        label: nodeTypes.find(nt => nt.type === type)?.label || type,
        config: {}
      }
    };
    setNodes(prev => [...prev, newNode]);
  };

  const deleteNode = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
  };

  const createConnection = (sourceId: string, targetId: string) => {
    const existingEdge = edges.find(e => e.source === sourceId && e.target === targetId);
    if (existingEdge) return;

    const newEdge: WorkflowEdge = {
      id: `edge_${Date.now()}`,
      source: sourceId,
      target: targetId,
      type: 'default'
    };
    setEdges(prev => [...prev, newEdge]);
  };

  const handleSave = () => {
    if (nodes.length === 0) {
      Alert.alert('Error', 'Please add at least one node to the workflow');
      return;
    }
    onSave(nodes, edges);
  };

  const renderNode = (node: WorkflowNode) => {
    const nodeType = nodeTypes.find(nt => nt.type === node.type);
    const isSelected = selectedNode === node.id;

    return (
      <TouchableOpacity
        key={node.id}
        style={[
          styles.node,
          {
            backgroundColor: nodeType?.color || theme.colors.primary,
            left: node.position.x,
            top: node.position.y,
            borderColor: isSelected ? theme.colors.accent : 'transparent',
            borderWidth: isSelected ? 2 : 0,
          }
        ]}
        onPress={() => setSelectedNode(node.id)}
        onLongPress={() => deleteNode(node.id)}
      >
        <Ionicons
          name={nodeType?.icon as any || 'square'}
          size={20}
          color="#FFFFFF"
        />
        <Text style={styles.nodeText}>
          {node.data.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={sharedStyles.container}>
      {/* Toolbar */}
      <View style={[styles.toolbar, { backgroundColor: theme.colors.surface }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.toolbarContent}>
            {nodeTypes.map((nodeType) => (
              <TouchableOpacity
                key={nodeType.type}
                style={[styles.toolbarItem, { backgroundColor: nodeType.color }]}
                onPress={() => addNode(nodeType.type)}
              >
                <Ionicons name={nodeType.icon as any} size={20} color="#FFFFFF" />
                <Text style={styles.toolbarText}>{nodeType.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Canvas */}
      <View style={[styles.canvas, { backgroundColor: theme.colors.background }]}>
        <ScrollView
          style={styles.canvasScroll}
          contentContainerStyle={styles.canvasContent}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          {/* Render edges */}
          {edges.map((edge) => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;

            return (
              <View
                key={edge.id}
                style={[
                  styles.edge,
                  {
                    left: sourceNode.position.x + 40,
                    top: sourceNode.position.y + 20,
                    width: Math.abs(targetNode.position.x - sourceNode.position.x),
                    height: 2,
                    backgroundColor: theme.colors.textSecondary,
                  }
                ]}
              />
            );
          })}

          {/* Render nodes */}
          {nodes.map(renderNode)}

          {/* Helper text when empty */}
          {nodes.length === 0 && (
            <View style={[styles.emptyState, sharedStyles.center]}>
              <Ionicons name="git-network" size={64} color={theme.colors.textSecondary} />
              <Text style={[sharedStyles.subtitle, { textAlign: 'center', marginTop: 16 }]}>
                Start building your workflow
              </Text>
              <Text style={[sharedStyles.body, { textAlign: 'center', marginTop: 8 }]}>
                Drag components from the toolbar above
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Actions */}
      <View style={[styles.actions, { backgroundColor: theme.colors.surface }]}>
        <Button
          title="Clear All"
          onPress={() => {
            setNodes([]);
            setEdges([]);
            setSelectedNode(null);
          }}
          variant="outline"
          style={{ flex: 1 }}
        />
        <Button
          title="Save Workflow"
          onPress={handleSave}
          style={{ flex: 1 }}
          disabled={nodes.length === 0}
        />
      </View>

      {/* Node Inspector */}
      {selectedNode && (
        <View style={[styles.inspector, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.inspectorHeader}>
            <Text style={sharedStyles.subtitle}>Node Settings</Text>
            <TouchableOpacity onPress={() => setSelectedNode(null)}>
              <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={sharedStyles.body}>
            Selected: {nodes.find(n => n.id === selectedNode)?.data.label}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  toolbar: {
    height: 80,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  toolbarContent: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  toolbarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  toolbarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  canvas: {
    flex: 1,
    position: 'relative',
  },
  canvasScroll: {
    flex: 1,
  },
  canvasContent: {
    width: width * 2,
    height: height * 2,
    position: 'relative',
  },
  node: {
    position: 'absolute',
    width: 80,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  nodeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  edge: {
    position: 'absolute',
  },
  emptyState: {
    position: 'absolute',
    top: '40%',
    left: '40%',
    transform: [{ translateX: -100 }, { translateY: -50 }],
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  inspector: {
    position: 'absolute',
    right: 16,
    top: 100,
    width: 200,
    padding: 16,
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  inspectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
});

export default WorkflowBuilder;