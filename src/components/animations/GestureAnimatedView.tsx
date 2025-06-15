// Gesture-enabled animated view with common interaction patterns
import React, { useCallback } from 'react';
import { ViewStyle, StyleProp } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { SPRING_CONFIGS, DURATIONS } from '../../utils/animations';

interface GestureAnimatedViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  
  // Gesture configurations
  enablePan?: boolean;
  enablePinch?: boolean;
  enableTap?: boolean;
  enableDoubleTap?: boolean;
  enableLongPress?: boolean;
  
  // Animation configurations
  scaleOnTap?: boolean;
  scaleAmount?: number;
  hapticFeedback?: boolean;
  
  // Callbacks
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onPanStart?: () => void;
  onPanEnd?: () => void;
  onPinchStart?: () => void;
  onPinchEnd?: () => void;
  
  // Constraints
  maxScale?: number;
  minScale?: number;
  boundaryPadding?: number;
  returnToOrigin?: boolean;
  
  // Advanced features
  simultaneousGestures?: boolean;
  rippleEffect?: boolean;
  magneticEffect?: boolean;
}

export const GestureAnimatedView: React.FC<GestureAnimatedViewProps> = ({
  children,
  style,
  enablePan = false,
  enablePinch = false,
  enableTap = true,
  enableDoubleTap = false,
  enableLongPress = false,
  scaleOnTap = true,
  scaleAmount = 0.95,
  hapticFeedback = true,
  onTap,
  onDoubleTap,
  onLongPress,
  onPanStart,
  onPanEnd,
  onPinchStart,
  onPinchEnd,
  maxScale = 3,
  minScale = 0.5,
  boundaryPadding = 50,
  returnToOrigin = true,
  simultaneousGestures = false,
  rippleEffect = false,
  magneticEffect = false,
}) => {
  // Shared values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const isPressed = useSharedValue(false);
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);

  // Gesture contexts
  const panContext = useSharedValue({ x: 0, y: 0 });
  const pinchContext = useSharedValue({ scale: 1 });

  // Haptic feedback
  const triggerHaptic = useCallback(() => {
    if (hapticFeedback) {
      // runOnJS(() => {
      //   // Add haptic feedback here
      //   // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // })();
    }
  }, [hapticFeedback]);

  // Ripple effect
  const triggerRipple = useCallback(() => {
    if (rippleEffect) {
      rippleScale.value = 0;
      rippleOpacity.value = 0.3;
      
      rippleScale.value = withTiming(1, { duration: 300 });
      rippleOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [rippleEffect]);

  // Pan gesture
  const panGesture = Gesture.Pan()
    .enabled(enablePan)
    .onStart(() => {
      panContext.value = { x: translateX.value, y: translateY.value };
      onPanStart && runOnJS(onPanStart)();
    })
    .onUpdate((event: any) => {
      translateX.value = panContext.value.x + event.translationX;
      translateY.value = panContext.value.y + event.translationY;
    })
    .onEnd(() => {
      if (returnToOrigin) {
        translateX.value = withSpring(0, SPRING_CONFIGS.gentle);
        translateY.value = withSpring(0, SPRING_CONFIGS.gentle);
      }
      onPanEnd && runOnJS(onPanEnd)();
    });

  // Pinch gesture
  const pinchGesture = Gesture.Pinch()
    .enabled(enablePinch)
    .onStart(() => {
      pinchContext.value = { scale: scale.value };
      onPinchStart && runOnJS(onPinchStart)();
    })
    .onUpdate((event: any) => {
      const newScale = pinchContext.value.scale * event.scale;
      scale.value = Math.min(Math.max(newScale, minScale), maxScale);
    })
    .onEnd(() => {
      if (returnToOrigin) {
        scale.value = withSpring(1, SPRING_CONFIGS.gentle);
      }
      onPinchEnd && runOnJS(onPinchEnd)();
    });

  // Tap gesture
  const tapGesture = Gesture.Tap()
    .enabled(enableTap)
    .onStart(() => {
      if (scaleOnTap) {
        isPressed.value = true;
        scale.value = withTiming(scaleAmount, { duration: 150 });
      }
      runOnJS(triggerHaptic)();
      runOnJS(triggerRipple)();
    })
    .onEnd(() => {
      if (scaleOnTap) {
        isPressed.value = false;
        scale.value = withSpring(1, SPRING_CONFIGS.gentle);
      }
      onTap && runOnJS(onTap)();
    })
    .onTouchesUp(() => {
      if (scaleOnTap && isPressed.value) {
        isPressed.value = false;
        scale.value = withSpring(1, SPRING_CONFIGS.gentle);
      }
    });

  // Double tap gesture
  const doubleTapGesture = Gesture.Tap()
    .enabled(enableDoubleTap)
    .numberOfTaps(2)
    .onEnd(() => {
      scale.value = withSequence(
        withTiming(1.2, { duration: 150 }),
        withSpring(1, SPRING_CONFIGS.bouncy)
      );
      onDoubleTap && runOnJS(onDoubleTap)();
      runOnJS(triggerHaptic)();
    });

  // Long press gesture
  const longPressGesture = Gesture.LongPress()
    .enabled(enableLongPress)
    .minDuration(500)
    .onStart(() => {
      scale.value = withSpring(1.05, SPRING_CONFIGS.gentle);
      runOnJS(triggerHaptic)();
    })
    .onEnd(() => {
      scale.value = withSpring(1, SPRING_CONFIGS.gentle);
      onLongPress && runOnJS(onLongPress)();
    })
    .onTouchesUp(() => {
      scale.value = withSpring(1, SPRING_CONFIGS.gentle);
    });

  // Compose gestures
  let composedGesture;
  
  if (simultaneousGestures) {
    composedGesture = Gesture.Simultaneous(
      panGesture,
      pinchGesture,
      tapGesture,
      doubleTapGesture,
      longPressGesture
    );
  } else {
    composedGesture = Gesture.Exclusive(
      doubleTapGesture,
      longPressGesture,
      Gesture.Simultaneous(panGesture, pinchGesture),
      tapGesture
    );
  }

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    opacity: rippleOpacity.value,
    transform: [{ scale: rippleScale.value }],
    pointerEvents: 'none',
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[style, animatedStyle]}>
        {children}
        {rippleEffect && <Animated.View style={rippleStyle} />}
      </Animated.View>
    </GestureDetector>
  );
};

export default GestureAnimatedView;