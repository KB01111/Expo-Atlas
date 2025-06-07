import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useOAuth, useSignIn, useSignUp } from '@clerk/clerk-expo';
import { useTheme } from '../../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

const LandingScreen: React.FC = () => {
  const { theme } = useTheme();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();

  const handleGoogleAuth = async () => {
    try {
      const { createdSessionId, setActive } = await startOAuthFlow();
      if (createdSessionId) {
        setActive({ session: createdSessionId });
      }
    } catch (err) {
      console.error('OAuth error', err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={theme.gradients.hero}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          <View style={styles.heroSection}>
            <Text style={[styles.title, { color: '#FFFFFF' }]}>
              KB-Atlas Mobile
            </Text>
            <Text style={[styles.subtitle, { color: '#F1F5F9' }]}>
              Intelligent automation and analytics at your fingertips
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.primaryButton,
                { backgroundColor: '#FFFFFF' }
              ]}
              onPress={handleGoogleAuth}
            >
              <Text style={[styles.buttonText, { color: theme.colors.primary }]}>
                Get Started
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.secondaryButton,
                { borderColor: '#FFFFFF' }
              ]}
              onPress={handleGoogleAuth}
            >
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                Sign In
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.featuresList}>
            <Text style={[styles.featureText, { color: '#F1F5F9' }]}>
              • Real-time agent monitoring
            </Text>
            <Text style={[styles.featureText, { color: '#F1F5F9' }]}>
              • Workflow automation
            </Text>
            <Text style={[styles.featureText, { color: '#F1F5F9' }]}>
              • Financial analytics
            </Text>
            <Text style={[styles.featureText, { color: '#F1F5F9' }]}>
              • Live performance metrics
            </Text>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: height * 0.1,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 24,
  },
  buttonContainer: {
    gap: 16,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  secondaryButton: {
    borderWidth: 2,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  featuresList: {
    gap: 8,
  },
  featureText: {
    fontSize: 16,
    opacity: 0.8,
  },
});

export default LandingScreen;