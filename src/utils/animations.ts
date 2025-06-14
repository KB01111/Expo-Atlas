// Animation utilities and presets for consistent animations across the app
import { 
  withTiming, 
  withSpring, 
  withDelay, 
  withSequence, 
  withRepeat,
  Easing,
  interpolate,
  Extrapolate,
  runOnJS
} from 'react-native-reanimated';

// Animation durations
export const DURATIONS = {
  fast: 150,
  normal: 300,
  slow: 500,
  slower: 800,
  slowest: 1200,
} as const;

// Spring configurations
export const SPRING_CONFIGS = {
  gentle: {
    damping: 20,
    stiffness: 90,
    mass: 1,
  },
  wobbly: {
    damping: 8,
    stiffness: 180,
    mass: 1,
  },
  stiff: {
    damping: 26,
    stiffness: 400,
    mass: 1,
  },
  bouncy: {
    damping: 12,
    stiffness: 200,
    mass: 1,
  },
} as const;

// Easing curves
export const EASINGS = {
  easeInOut: Easing.inOut(Easing.ease),
  easeOut: Easing.out(Easing.ease),
  easeIn: Easing.in(Easing.ease),
  linear: Easing.linear,
  bezier: Easing.bezier(0.25, 0.1, 0.25, 1),
  elastic: Easing.elastic(1.5),
  bounce: Easing.bounce,
  back: Easing.back(1.7),
} as const;

// Common animation presets
export const ANIMATION_PRESETS = {
  // Fade animations
  fadeIn: (duration = DURATIONS.normal) => withTiming(1, { 
    duration, 
    easing: EASINGS.easeOut 
  }),
  
  fadeOut: (duration = DURATIONS.normal) => withTiming(0, { 
    duration, 
    easing: EASINGS.easeIn 
  }),

  // Scale animations
  scaleIn: (duration = DURATIONS.normal) => withSpring(1, SPRING_CONFIGS.gentle),
  
  scaleOut: (duration = DURATIONS.normal) => withSpring(0, SPRING_CONFIGS.gentle),
  
  pulse: (scale = 1.05, duration = DURATIONS.fast) => 
    withSequence(
      withTiming(scale, { duration: duration / 2, easing: EASINGS.easeOut }),
      withTiming(1, { duration: duration / 2, easing: EASINGS.easeIn })
    ),

  // Slide animations
  slideInUp: (duration = DURATIONS.normal) => withTiming(0, {
    duration,
    easing: EASINGS.easeOut,
  }),
  
  slideInDown: (duration = DURATIONS.normal) => withTiming(0, {
    duration,
    easing: EASINGS.easeOut,
  }),
  
  slideInLeft: (duration = DURATIONS.normal) => withTiming(0, {
    duration,
    easing: EASINGS.easeOut,
  }),
  
  slideInRight: (duration = DURATIONS.normal) => withTiming(0, {
    duration,
    easing: EASINGS.easeOut,
  }),

  // Rotation animations
  rotate360: (duration = DURATIONS.slow) => 
    withRepeat(
      withTiming(360, { duration, easing: EASINGS.linear }),
      -1,
      false
    ),

  // Bounce animation
  bounce: (scale = 1.1) => 
    withSequence(
      withSpring(scale, SPRING_CONFIGS.bouncy),
      withSpring(1, SPRING_CONFIGS.gentle)
    ),

  // Shake animation
  shake: (intensity = 10, duration = DURATIONS.fast) =>
    withSequence(
      withTiming(intensity, { duration: duration / 8 }),
      withTiming(-intensity, { duration: duration / 4 }),
      withTiming(intensity, { duration: duration / 4 }),
      withTiming(-intensity, { duration: duration / 4 }),
      withTiming(0, { duration: duration / 8 })
    ),

  // Attention-seeking animations
  rubberBand: (duration = DURATIONS.normal) =>
    withSequence(
      withTiming(1.25, { duration: duration * 0.3, easing: EASINGS.easeOut }),
      withTiming(0.75, { duration: duration * 0.1 }),
      withTiming(1.15, { duration: duration * 0.1 }),
      withTiming(0.95, { duration: duration * 0.1 }),
      withTiming(1, { duration: duration * 0.4, easing: EASINGS.easeOut })
    ),

  // Stagger animations helper
  stagger: (delay = 100) => (index: number) => withDelay(index * delay, ANIMATION_PRESETS.fadeIn()),
} as const;

// Layout animation presets
export const LAYOUT_PRESETS = {
  spring: SPRING_CONFIGS.gentle,
  bouncy: SPRING_CONFIGS.bouncy,
  stiff: SPRING_CONFIGS.stiff,
} as const;

// Gesture animation helpers
export const GESTURE_CONFIGS = {
  panGesture: {
    enableTrackpadTwoFingerGesture: true,
    minPointers: 1,
    maxPointers: 1,
  },
  pinchGesture: {
    enableTrackpadTwoFingerGesture: true,
  },
  tapGesture: {
    numberOfTaps: 1,
  },
  doubleTap: {
    numberOfTaps: 2,
  },
} as const;

// Animation utilities
export const createInterpolation = (
  inputRange: number[],
  outputRange: number[],
  extrapolate: 'clamp' | 'extend' | 'identity' = 'clamp'
) => (value: number) => interpolate(value, inputRange, outputRange, extrapolate);

// Common interpolations
export const INTERPOLATIONS = {
  opacity: createInterpolation([0, 1], [0, 1]),
  scale: createInterpolation([0, 1], [0.8, 1]),
  translateY: createInterpolation([0, 1], [50, 0]),
  translateX: createInterpolation([0, 1], [50, 0]),
  rotate: createInterpolation([0, 1], [0, 360]),
} as const;

// Animation sequencing helpers
export const createStaggeredAnimation = (
  animations: number[],
  delay = 100
) => {
  return animations.map((animation, index) => 
    withDelay(index * delay, animation)
  );
};

export const createSequentialAnimation = (
  animations: number[]
) => {
  if (animations.length === 0) return 0;
  if (animations.length === 1) {
    return animations[0];
  }
  
  let sequence = animations[0];
  for (let i = 1; i < animations.length; i++) {
    sequence = withSequence(sequence, animations[i]);
  }
  return sequence;
};

// Performance optimization helpers
export const createCachedAnimation = <T extends Record<string, any>>(
  animationFactory: (config: T) => number
) => {
  const cache = new Map<string, number>();
  
  return (config: T) => {
    const key = JSON.stringify(config);
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const animation = animationFactory(config);
    cache.set(key, animation);
    return animation;
  };
};

export default {
  DURATIONS,
  SPRING_CONFIGS,
  EASINGS,
  ANIMATION_PRESETS,
  LAYOUT_PRESETS,
  GESTURE_CONFIGS,
  INTERPOLATIONS,
  createInterpolation,
  createStaggeredAnimation,
  createSequentialAnimation,
  createCachedAnimation,
};