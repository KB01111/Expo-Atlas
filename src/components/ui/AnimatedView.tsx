import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface AnimatedViewProps {
  children: React.ReactNode;
  animation?: 'fadeIn' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'scale' | 'bounce';
  duration?: number;
  delay?: number;
  style?: ViewStyle;
}

export const AnimatedView: React.FC<AnimatedViewProps> = ({
  children,
  animation = 'fadeIn',
  duration = 300,
  delay = 0,
  style,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const translateValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      switch (animation) {
        case 'fadeIn':
          Animated.timing(animatedValue, {
            toValue: 1,
            duration,
            delay,
            useNativeDriver: true,
          }).start();
          break;

        case 'slideUp':
          translateValue.setValue(20);
          animatedValue.setValue(0);
          Animated.parallel([
            Animated.timing(animatedValue, {
              toValue: 1,
              duration,
              delay,
              useNativeDriver: true,
            }),
            Animated.timing(translateValue, {
              toValue: 0,
              duration,
              delay,
              useNativeDriver: true,
            }),
          ]).start();
          break;

        case 'slideDown':
          translateValue.setValue(-20);
          animatedValue.setValue(0);
          Animated.parallel([
            Animated.timing(animatedValue, {
              toValue: 1,
              duration,
              delay,
              useNativeDriver: true,
            }),
            Animated.timing(translateValue, {
              toValue: 0,
              duration,
              delay,
              useNativeDriver: true,
            }),
          ]).start();
          break;

        case 'slideLeft':
          translateValue.setValue(20);
          animatedValue.setValue(0);
          Animated.parallel([
            Animated.timing(animatedValue, {
              toValue: 1,
              duration,
              delay,
              useNativeDriver: true,
            }),
            Animated.timing(translateValue, {
              toValue: 0,
              duration,
              delay,
              useNativeDriver: true,
            }),
          ]).start();
          break;

        case 'slideRight':
          translateValue.setValue(-20);
          animatedValue.setValue(0);
          Animated.parallel([
            Animated.timing(animatedValue, {
              toValue: 1,
              duration,
              delay,
              useNativeDriver: true,
            }),
            Animated.timing(translateValue, {
              toValue: 0,
              duration,
              delay,
              useNativeDriver: true,
            }),
          ]).start();
          break;

        case 'scale':
          scaleValue.setValue(0.8);
          animatedValue.setValue(0);
          Animated.parallel([
            Animated.timing(animatedValue, {
              toValue: 1,
              duration,
              delay,
              useNativeDriver: true,
            }),
            Animated.spring(scaleValue, {
              toValue: 1,
              friction: 4,
              tension: 100,
              delay,
              useNativeDriver: true,
            }),
          ]).start();
          break;

        case 'bounce':
          scaleValue.setValue(0.3);
          Animated.spring(scaleValue, {
            toValue: 1,
            friction: 3,
            tension: 100,
            delay,
            useNativeDriver: true,
          }).start();
          break;

        default:
          animatedValue.setValue(1);
      }
    };

    animate();
  }, [animation, duration, delay]);

  const getAnimatedStyle = (): any => {
    switch (animation) {
      case 'fadeIn':
        return {
          opacity: animatedValue,
        };

      case 'slideUp':
      case 'slideDown':
        return {
          opacity: animatedValue,
          transform: [{ translateY: translateValue }],
        };

      case 'slideLeft':
      case 'slideRight':
        return {
          opacity: animatedValue,
          transform: [{ translateX: translateValue }],
        };

      case 'scale':
        return {
          opacity: animatedValue,
          transform: [{ scale: scaleValue }],
        };

      case 'bounce':
        return {
          transform: [{ scale: scaleValue }],
        };

      default:
        return {};
    }
  };

  return (
    <Animated.View style={[getAnimatedStyle(), style]}>
      {children}
    </Animated.View>
  );
};