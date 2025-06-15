import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { Card } from './Card';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: any) => void;
}

interface ErrorFallbackProps {
  error?: Error | null;
  errorInfo?: any;
  onRetry: () => void;
  title?: string;
  description?: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || ErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

// Default Error Fallback Component
export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  onRetry,
  title = "Something went wrong",
  description,
}) => {
  const getErrorMessage = (): string => {
    if (description) return description;
    if (error?.message) return error.message;
    return "An unexpected error occurred. Please try again.";
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    content: {
      alignItems: 'center',
      maxWidth: 320,
    },
    icon: {
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 8,
      color: '#DC2626', // Red-600
    },
    message: {
      fontSize: 16,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 24,
      color: '#64748B', // Slate-500
    },
    buttonContainer: {
      width: '100%',
      gap: 12,
    },
    debugInfo: {
      marginTop: 16,
      padding: 12,
      backgroundColor: '#F8FAFC', // Slate-50
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#E2E8F0', // Slate-200
    },
    debugText: {
      fontSize: 12,
      fontFamily: 'monospace',
      color: '#475569', // Slate-600
    },
  });

  return (
    <View style={styles.container}>
      <Card variant="elevated" style={styles.content}>
        <Ionicons 
          name="warning-outline" 
          size={48} 
          color="#DC2626"
          style={styles.icon}
          accessibilityElementsHidden={true}
        />
        
        <Text 
          style={styles.title}
          accessibilityRole="header"
          accessibilityLevel={1}
        >
          {title}
        </Text>
        
        <Text style={styles.message}>
          {getErrorMessage()}
        </Text>
        
        <View style={styles.buttonContainer}>
          <Button
            title="Try Again"
            onPress={onRetry}
            variant="primary"
            size="md"
            fullWidth
            icon={<Ionicons name="refresh" size={16} color="#FFFFFF" />}
            accessibilityLabel="Retry the failed action"
            accessibilityHint="Attempts to reload and recover from the error"
          />
          
          <Button
            title="Go Back"
            onPress={() => {
              // This could be enhanced to actually navigate back
              // For now, just retry
              onRetry();
            }}
            variant="outline"
            size="md"
            fullWidth
            accessibilityLabel="Go back to previous screen"
          />
        </View>
        
        {__DEV__ && error && (
          <View style={styles.debugInfo}>
            <Text style={styles.debugText}>
              {error.name}: {error.message}
            </Text>
            {error.stack && (
              <Text style={[styles.debugText, { marginTop: 8 }]}>
                {error.stack.split('\n').slice(0, 3).join('\n')}
              </Text>
            )}
          </View>
        )}
      </Card>
    </View>
  );
};

// Hook for using error boundary imperatively
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
};