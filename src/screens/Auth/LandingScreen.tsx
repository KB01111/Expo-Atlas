import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Animated,
  Platform,
  StatusBar,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from '../../components/ui';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useOAuth, useSignIn, useSignUp } from '@clerk/clerk-expo';
import { useTheme } from '../../contexts/ThemeContext';
import { AnimatedView } from '../../components/ui';

const { width, height } = Dimensions.get('window');

const LandingScreen: React.FC = () => {
  const { theme } = useTheme();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const floatingAnim = useRef(new Animated.Value(0)).current;
  
  // State
  const [loading, setLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<'signin' | 'signup'>('signin');

  useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Start floating animation loop
    const floatingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatingAnim, {
          toValue: -10,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatingAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    floatingAnimation.start();

    return () => floatingAnimation.stop();
  }, []);

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const { createdSessionId, setActive } = await startOAuthFlow();
      if (createdSessionId && setActive) {
        setActive({ session: createdSessionId });
      }
    } catch (err) {
      console.error('OAuth error', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthMethodToggle = () => {
    setAuthMethod(authMethod === 'signin' ? 'signup' : 'signin');
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.container}>
        {/* Animated Background */}
        <LinearGradient
          colors={['#667eea', '#764ba2', '#f093fb']}
          style={styles.backgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        {/* Floating Elements */}
        <Animated.View 
          style={[
            styles.floatingElement,
            styles.floatingElement1,
            { transform: [{ translateY: floatingAnim }] }
          ]}
        />
        <Animated.View 
          style={[
            styles.floatingElement,
            styles.floatingElement2,
            { transform: [{ translateY: floatingAnim }] }
          ]}
        />
        <Animated.View 
          style={[
            styles.floatingElement,
            styles.floatingElement3,
            { transform: [{ translateY: floatingAnim }] }
          ]}
        />

        {/* Main Content */}
        <SafeAreaView style={styles.content}>
          <Animated.View
            style={[
              styles.mainContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim }
                ]
              }
            ]}
          >
            {/* Header Section */}
            <View style={styles.headerSection}>
              <Animated.View style={[styles.logoContainer, { transform: [{ translateY: floatingAnim }] }]}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
                  style={styles.logoBackground}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="analytics" size={48} color="#FFFFFF" />
                </LinearGradient>
              </Animated.View>
              
              <Text style={styles.appTitle}>KB-Atlas</Text>
              <Text style={styles.appTagline}>
                Intelligent Agent Management
              </Text>
              <Text style={styles.appDescription}>
                Harness the power of AI with beautiful, intuitive interfaces designed for the future of automation
              </Text>
            </View>

            {/* Features Grid */}
            <View style={styles.featuresGrid}>
              <AnimatedView animation="slideUp" delay={300}>
                <View style={styles.featureCard}>
                  <Ionicons name="speedometer" size={24} color="#FFFFFF" />
                  <Text style={styles.featureTitle}>Real-time Analytics</Text>
                </View>
              </AnimatedView>
              
              <AnimatedView animation="slideUp" delay={400}>
                <View style={styles.featureCard}>
                  <Ionicons name="construct" size={24} color="#FFFFFF" />
                  <Text style={styles.featureTitle}>Workflow Builder</Text>
                </View>
              </AnimatedView>
              
              <AnimatedView animation="slideUp" delay={500}>
                <View style={styles.featureCard}>
                  <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
                  <Text style={styles.featureTitle}>Secure & Scalable</Text>
                </View>
              </AnimatedView>
              
              <AnimatedView animation="slideUp" delay={600}>
                <View style={styles.featureCard}>
                  <Ionicons name="trending-up" size={24} color="#FFFFFF" />
                  <Text style={styles.featureTitle}>Performance Insights</Text>
                </View>
              </AnimatedView>
            </View>

            {/* Auth Section */}
            <AnimatedView animation="slideUp" delay={700}>
              <View style={styles.authSection}>
                {Platform.OS === 'web' ? (
                  <View style={styles.authCard}>
                    <BlurView intensity={20} style={styles.blurContainer}>
                      <Text style={styles.authTitle}>
                        {authMethod === 'signin' ? 'Welcome Back' : 'Join KB-Atlas'}
                      </Text>
                      <Text style={styles.authSubtitle}>
                        {authMethod === 'signin' 
                          ? 'Sign in to continue your automation journey'
                          : 'Start your AI automation journey today'
                        }
                      </Text>
                      
                      <TouchableOpacity
                        style={[styles.authButton, loading && styles.authButtonLoading]}
                        onPress={handleGoogleAuth}
                        disabled={loading}
                      >
                        <LinearGradient
                          colors={['#FFFFFF', '#F8FAFC']}
                          style={styles.authButtonGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          {loading ? (
                            <Animated.View style={styles.loadingContainer}>
                              <Text style={styles.authButtonText}>Connecting...</Text>
                            </Animated.View>
                          ) : (
                            <View style={styles.authButtonContent}>
                              <Ionicons name="logo-google" size={20} color="#4285f4" />
                              <Text style={styles.authButtonText}>
                                Continue with Google
                              </Text>
                            </View>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.authToggle}
                        onPress={handleAuthMethodToggle}
                      >
                        <Text style={styles.authToggleText}>
                          {authMethod === 'signin' 
                            ? "Don't have an account? Sign up"
                            : "Already have an account? Sign in"
                          }
                        </Text>
                      </TouchableOpacity>
                    </BlurView>
                  </View>
                ) : (
                  <View style={styles.mobileAuthContainer}>
                    <TouchableOpacity
                      style={[styles.mobileAuthButton, loading && styles.authButtonLoading]}
                      onPress={handleGoogleAuth}
                      disabled={loading}
                    >
                      <LinearGradient
                        colors={['#FFFFFF', '#F8FAFC']}
                        style={styles.mobileAuthButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        {loading ? (
                          <Text style={styles.mobileAuthButtonText}>Connecting...</Text>
                        ) : (
                          <View style={styles.mobileAuthButtonContent}>
                            <Ionicons name="logo-google" size={24} color="#4285f4" />
                            <Text style={styles.mobileAuthButtonText}>
                              Continue with Google
                            </Text>
                          </View>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                    
                    <Text style={styles.mobileAuthFooter}>
                      Secure authentication powered by Google
                    </Text>
                  </View>
                )}
              </View>
            </AnimatedView>
          </Animated.View>
        </SafeAreaView>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  
  // Floating Background Elements
  floatingElement: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  floatingElement1: {
    width: 80,
    height: 80,
    top: '20%',
    left: '10%',
  },
  floatingElement2: {
    width: 120,
    height: 120,
    top: '60%',
    right: '15%',
  },
  floatingElement3: {
    width: 60,
    height: 60,
    top: '40%',
    right: '20%',
  },

  // Content Layout
  content: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0,
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },

  // Header Section
  headerSection: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 40 : 20,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoBackground: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  appTitle: {
    fontSize: Platform.OS === 'web' ? 48 : 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  appTagline: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    color: '#F1F5F9',
    textAlign: 'center',
    fontWeight: '600',
    opacity: 0.9,
    marginBottom: 12,
  },
  appDescription: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: '#E2E8F0',
    textAlign: 'center',
    lineHeight: Platform.OS === 'web' ? 24 : 20,
    opacity: 0.8,
    maxWidth: Platform.OS === 'web' ? 400 : 280,
  },

  // Features Grid
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 20,
  },
  featureCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    minWidth: Platform.OS === 'web' ? 140 : 120,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  featureTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },

  // Auth Section
  authSection: {
    paddingBottom: Platform.OS === 'web' ? 40 : 20,
  },
  
  // Web Auth Styles
  authCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 24,
  },
  blurContainer: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  authTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 16,
    color: '#E2E8F0',
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.9,
  },
  authButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  authButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  authButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  authButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  authButtonLoading: {
    opacity: 0.7,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authToggle: {
    paddingVertical: 8,
  },
  authToggleText: {
    color: '#E2E8F0',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },

  // Mobile Auth Styles
  mobileAuthContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  mobileAuthButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  mobileAuthButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  mobileAuthButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  mobileAuthButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  mobileAuthFooter: {
    color: '#E2E8F0',
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.7,
  },
});

export default LandingScreen;