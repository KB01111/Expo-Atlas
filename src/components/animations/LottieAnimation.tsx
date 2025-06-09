// Enhanced Lottie component with presets and controls
import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { View, ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';
import { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

export interface LottieAnimationRef {
  play: () => void;
  pause: () => void;
  reset: () => void;
  resume: () => void;
  stop: () => void;
}

interface LottieAnimationProps {
  source: any; // Lottie source (require() or URL)
  size?: number;
  width?: number;
  height?: number;
  autoPlay?: boolean;
  loop?: boolean;
  speed?: number;
  style?: ViewStyle;
  preset?: 'loading' | 'success' | 'error' | 'info' | 'heart' | 'star' | 'bounce' | 'pulse' | 'rotate';
  onAnimationFinish?: () => void;
  onAnimationStart?: () => void;
  trigger?: boolean; // External trigger to restart animation
  colorFilters?: Array<{
    keypath: string;
    color: string;
  }>;
}

// Built-in animation sources (placeholders - replace with actual Lottie files)
const PRESET_SOURCES = {
  loading: null, // Add your Lottie files here
  success: null,
  error: null,
  info: null,
  heart: null,
  star: null,
};

const LottieAnimation = forwardRef<LottieAnimationRef, LottieAnimationProps>(({
  source,
  size,
  width,
  height,
  autoPlay = true,
  loop = true,
  speed = 1,
  style,
  preset,
  onAnimationFinish,
  onAnimationStart,
  trigger,
  colorFilters,
}, ref) => {
  const animationRef = useRef<LottieView>(null);
  const containerOpacity = useSharedValue(1);
  const containerScale = useSharedValue(1);
  const containerRotation = useSharedValue(0);

  // Determine source
  const animationSource = preset && PRESET_SOURCES[preset as keyof typeof PRESET_SOURCES] 
    ? PRESET_SOURCES[preset as keyof typeof PRESET_SOURCES]
    : source;

  // Determine dimensions
  const finalWidth = width || size || 100;
  const finalHeight = height || size || 100;

  // Handle trigger prop
  useEffect(() => {
    if (trigger && animationRef.current) {
      animationRef.current.reset();
      animationRef.current.play();
    }
  }, [trigger]);

  // Apply preset animations to container
  useEffect(() => {
    if (preset) {
      switch (preset) {
        case 'bounce':
          containerScale.value = withRepeat(
            withSequence(
              withTiming(1.1, { duration: 300 }),
              withTiming(1, { duration: 300 })
            ),
            -1,
            true
          );
          break;
        
        case 'pulse':
          containerOpacity.value = withRepeat(
            withSequence(
              withTiming(0.5, { duration: 500 }),
              withTiming(1, { duration: 500 })
            ),
            -1,
            true
          );
          break;
        
        case 'rotate':
          containerRotation.value = withRepeat(
            withTiming(360, { duration: 2000 }),
            -1,
            false
          );
          break;
        
        default:
          // Reset animations for other presets
          containerScale.value = 1;
          containerOpacity.value = 1;
          containerRotation.value = 0;
          break;
      }
    }
  }, [preset]);

  // Imperative handle for external control
  useImperativeHandle(ref, () => ({
    play: () => animationRef.current?.play(),
    pause: () => animationRef.current?.pause(),
    reset: () => animationRef.current?.reset(),
    resume: () => animationRef.current?.resume(),
    stop: () => {
      animationRef.current?.pause();
      animationRef.current?.reset();
    },
  }));

  // Animated style for container effects
  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [
      { scale: containerScale.value },
      { rotate: `${containerRotation.value}deg` },
    ],
  }));

  return (
    <Animated.View style={[animatedContainerStyle, style]}>
      <LottieView
        ref={animationRef}
        source={animationSource}
        autoPlay={autoPlay}
        loop={loop}
        speed={speed}
        style={{
          width: finalWidth,
          height: finalHeight,
        }}
        onAnimationFinish={onAnimationFinish}
        colorFilters={colorFilters}
        resizeMode="contain"
      />
    </Animated.View>
  );
});

LottieAnimation.displayName = 'LottieAnimation';

export default LottieAnimation;