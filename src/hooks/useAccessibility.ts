import { useEffect, useState, useCallback, useRef } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import type { ReducedMotionPreferences } from '../types/accessibility';

/**
 * Hook for managing reduced motion preferences
 */
export const useReducedMotion = (): boolean => {
  const [reduceMotion, setReduceMotion] = useState(false);
  
  useEffect(() => {
    // Check initial state
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    
    // Listen for changes
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );
    
    return () => subscription?.remove();
  }, []);
  
  return reduceMotion;
};

/**
 * Hook for managing screen reader state
 */
export const useScreenReader = () => {
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setIsScreenReaderEnabled);
    
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled
    );
    
    return () => subscription?.remove();
  }, []);
  
  return { isScreenReaderEnabled };
};

/**
 * Hook for focus management
 */
export const useFocusManagement = () => {
  const focusRef = useRef<any>(null);
  
  const focusElement = useCallback(() => {
    if (focusRef.current && Platform.OS !== 'web') {
      AccessibilityInfo.setAccessibilityFocus(focusRef.current);
    }
  }, []);
  
  const announceLiveRegion = useCallback((message: string) => {
    if (Platform.OS !== 'web') {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }, []);
  
  return { 
    focusRef, 
    focusElement, 
    announceLiveRegion 
  };
};

/**
 * Hook for comprehensive accessibility preferences
 */
export const useAccessibilityPreferences = () => {
  const [preferences, setPreferences] = useState({
    reduceMotion: false,
    screenReaderEnabled: false,
    highContrast: false,
    largeText: false,
  });
  
  useEffect(() => {
    const checkPreferences = async () => {
      const [reduceMotion, screenReader] = await Promise.all([
        AccessibilityInfo.isReduceMotionEnabled(),
        AccessibilityInfo.isScreenReaderEnabled(),
      ]);
      
      setPreferences({
        reduceMotion,
        screenReaderEnabled: screenReader,
        highContrast: false, // Not directly available, could be inferred
        largeText: false,    // Would need to be configured by user
      });
    };
    
    checkPreferences();
    
    // Set up listeners
    const reduceMotionSubscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => setPreferences(prev => ({ ...prev, reduceMotion: enabled }))
    );
    
    const screenReaderSubscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (enabled) => setPreferences(prev => ({ ...prev, screenReaderEnabled: enabled }))
    );
    
    return () => {
      reduceMotionSubscription?.remove();
      screenReaderSubscription?.remove();
    };
  }, []);
  
  return preferences;
};

/**
 * Hook for generating accessible test IDs
 */
export const useTestID = (baseId: string, suffix?: string) => {
  return useCallback((element?: string) => {
    const parts = [baseId];
    if (element) parts.push(element);
    if (suffix) parts.push(suffix);
    return parts.join('-').toLowerCase().replace(/\s+/g, '-');
  }, [baseId, suffix]);
};