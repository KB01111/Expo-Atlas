// Enhanced AnimatedView with comprehensive animation support
import React from 'react';
import { ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../../contexts/ThemeContext';
import { AppTheme } from '../../types';
import { DURATIONS, SPRING_CONFIGS } from '../../utils/animations';

export type AnimationPreset = 
  | 'fadeIn'
  | 'fadeOut'
  | 'slideUp'
  | 'slideDown'
  | 'slideLeft'
  | 'slideRight'
  | 'scaleIn'
  | 'scaleOut'
  | 'bounce'
  | 'pulse'
  | 'shake'
  | 'rubberBand'
  | 'flip'
  | 'zoom'
  | 'rotate';

export type InteractionEffect = 
  | 'scale'
  | 'opacity'
  | 'lift'
  | 'glow'
  | 'ripple';

interface AnimatedViewEnhancedProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  preset?: AnimationPreset;
  delay?: number;
  duration?: number;
  loop?: boolean;
  autoPlay?: boolean;
  staggerIndex?: number;
  staggerDelay?: number;
  
  // Interaction effects
  enableTap?: boolean;
  enablePan?: boolean;
  tapEffect?: InteractionEffect;
  hoverEffect?: InteractionEffect;
  
  // Gesture callbacks
  onTap?: () => void;
  onPanStart?: () => void;
  onPanEnd?: () => void;
  onAnimationComplete?: () => void;
  
  // Layout
  onLayout?: (event: any) => void;
  
  // Advanced
  springConfig?: typeof SPRING_CONFIGS.gentle;
  customAnimation?: any;
}

export const AnimatedViewEnhanced: React.FC<AnimatedViewEnhancedProps> = ({
  children,
  style,
  preset = 'fadeIn',
  delay = 0,
  duration = DURATIONS.normal,
  loop = false,
  autoPlay = true,
  staggerIndex = 0,
  staggerDelay = 100,
  enableTap = false,
  enablePan = false,
  tapEffect = 'scale',
  hoverEffect = 'scale',
  onTap,
  onPanStart,
  onPanEnd,
  onAnimationComplete,
  onLayout,
  springConfig = SPRING_CONFIGS.gentle,
  customAnimation,
}) => {
  const { theme } = useTheme();
  
  // Animation values
  const progress = useSharedValue(autoPlay ? 0 : 1);
  const gestureScale = useSharedValue(1);
  const gestureOpacity = useSharedValue(1);
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  const isPressed = useSharedValue(false);
  
  // Calculate total delay including stagger
  const totalDelay = delay + (staggerIndex * staggerDelay);
  
  // Start animation
  React.useEffect(() => {
    if (autoPlay) {
      const animation = loop
        ? withRepeat(
            withDelay(totalDelay, withTiming(1, { duration })),
            -1,
            true
          )
        : withDelay(totalDelay, withTiming(1, { duration }));
      
      progress.value = animation;
      
      if (onAnimationComplete && !loop) {
        setTimeout(() => {
          onAnimationComplete();
        }, totalDelay + duration);
      }
    }
  }, [autoPlay, totalDelay, duration, loop]);
  
  // Tap gesture
  const tapGesture = Gesture.Tap()
    .enabled(enableTap)
    .onStart(() => {
      isPressed.value = true;
      switch (tapEffect) {
        case 'scale':
          gestureScale.value = withTiming(0.95, { duration: 150 });
          break;
        case 'opacity':
          gestureOpacity.value = withTiming(0.7, { duration: 150 });
          break;
      }
    })
    .onEnd(() => {
      isPressed.value = false;
      gestureScale.value = withSpring(1, springConfig);
      gestureOpacity.value = withSpring(1, springConfig);
      onTap && runOnJS(onTap)();
    });
  
  // Pan gesture
  const panGesture = Gesture.Pan()
    .enabled(enablePan)
    .onStart(() => {
      onPanStart && runOnJS(onPanStart)();
    })
    .onUpdate((event) => {
      panX.value = event.translationX;
      panY.value = event.translationY;
    })
    .onEnd(() => {
      panX.value = withSpring(0, springConfig);
      panY.value = withSpring(0, springConfig);
      onPanEnd && runOnJS(onPanEnd)();
    });
  
  // Compose gestures
  const composedGesture = Gesture.Simultaneous(tapGesture, panGesture);
  
  // Animation styles based on preset
  const getPresetStyle = () => {
    switch (preset) {
      case 'fadeIn':
        return {
          opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolate.CLAMP),
        };
      
      case 'fadeOut':
        return {
          opacity: interpolate(progress.value, [0, 1], [1, 0], Extrapolate.CLAMP),
        };
      
      case 'slideUp':
        return {
          opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolate.CLAMP),
          transform: [{
            translateY: interpolate(progress.value, [0, 1], [50, 0], Extrapolate.CLAMP),
          }],
        };
      
      case 'slideDown':
        return {
          opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolate.CLAMP),
          transform: [{
            translateY: interpolate(progress.value, [0, 1], [-50, 0], Extrapolate.CLAMP),
          }],
        };
      
      case 'slideLeft':
        return {
          opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolate.CLAMP),
          transform: [{
            translateX: interpolate(progress.value, [0, 1], [50, 0], Extrapolate.CLAMP),
          }],
        };
      
      case 'slideRight':
        return {
          opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolate.CLAMP),
          transform: [{
            translateX: interpolate(progress.value, [0, 1], [-50, 0], Extrapolate.CLAMP),
          }],
        };
      
      case 'scaleIn':
        return {
          opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolate.CLAMP),
          transform: [{
            scale: interpolate(progress.value, [0, 1], [0.8, 1], Extrapolate.CLAMP),
          }],
        };
      
      case 'scaleOut':
        return {
          opacity: interpolate(progress.value, [0, 1], [1, 0], Extrapolate.CLAMP),
          transform: [{
            scale: interpolate(progress.value, [0, 1], [1, 0.8], Extrapolate.CLAMP),
          }],
        };
      
      case 'bounce':
        return {
          opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolate.CLAMP),
          transform: [{
            scale: withSpring(
              interpolate(progress.value, [0, 1], [0.3, 1], Extrapolate.CLAMP),
              SPRING_CONFIGS.bouncy
            ),
          }],
        };
      
      case 'pulse':
        return {
          transform: [{
            scale: interpolate(
              progress.value,
              [0, 0.5, 1],
              [1, 1.05, 1],
              Extrapolate.CLAMP
            ),
          }],
        };
      
      case 'shake':
        return {
          transform: [{
            translateX: interpolate(
              progress.value,
              [0, 0.2, 0.4, 0.6, 0.8, 1],
              [0, -10, 10, -10, 10, 0],
              Extrapolate.CLAMP
            ),
          }],
        };
      
      case 'rotate':
        return {
          transform: [{
            rotate: `${interpolate(progress.value, [0, 1], [0, 360], Extrapolate.CLAMP)}deg`,
          }],
        };
      
      case 'flip':
        return {
          opacity: interpolate(progress.value, [0, 0.5, 1], [0, 0, 1], Extrapolate.CLAMP),
          transform: [{
            rotateY: `${interpolate(progress.value, [0, 1], [90, 0], Extrapolate.CLAMP)}deg`,
          }],
        };
      
      default:
        return customAnimation || {};
    }
  };
  
  // Combine all animated styles
  const animatedStyle = useAnimatedStyle(() => {
    const baseStyle = getPresetStyle();
    
    // Apply gesture effects
    const gestureTransforms = [];
    
    if (enablePan) {
      gestureTransforms.push(
        { translateX: panX.value },
        { translateY: panY.value }
      );
    }
    
    if (enableTap) {
      gestureTransforms.push({ scale: gestureScale.value });
    }
    
    return {
      ...baseStyle,
      opacity: (baseStyle.opacity || 1) * gestureOpacity.value,
      transform: [
        ...(baseStyle.transform || []),
        ...gestureTransforms,
      ],
    };
  });
  
  const animatedView = (
    <Animated.View style={[style, animatedStyle]} onLayout={onLayout}>
      {children}
    </Animated.View>
  );
  
  // Wrap with gesture detector if gestures are enabled
  if (enableTap || enablePan) {
    return (
      <GestureDetector gesture={composedGesture}>
        {animatedView}
      </GestureDetector>
    );
  }
  
  return animatedView;
};

export default AnimatedViewEnhanced;