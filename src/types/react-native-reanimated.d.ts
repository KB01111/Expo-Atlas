declare module 'react-native-reanimated' {
  export * from 'react-native-reanimated/lib/typescript/index';
  
  // Additional exports that might be missing
  export const useSharedValue: any;
  export const useAnimatedStyle: any;
  export const withSpring: any;
  export const withTiming: any;
  export const withSequence: any;
  export const withDelay: any;
  export const withRepeat: any;
  export const runOnJS: any;
  export const interpolate: any;
  export const Extrapolation: any;
  export const Easing: any;
  
  // Animated components
  export const View: any;
}