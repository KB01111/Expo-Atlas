// Enhanced MotiView with presets and Framer-like API
import React from 'react';
import { MotiView as OriginalMotiView } from 'moti';
import { ViewStyle } from 'react-native';
import type { MotiProps } from 'moti';
import { DURATIONS, SPRING_CONFIGS, EASINGS } from '../../utils/animations';

// Animation preset types
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
  | 'flipIn'
  | 'flipOut'
  | 'zoomIn'
  | 'zoomOut';

export type HoverEffect = 'scale' | 'opacity' | 'lift' | 'glow';
export type TapEffect = 'scale' | 'opacity' | 'bounce' | 'pulse';

interface MotiViewProps extends Omit<MotiProps, 'animate'> {
  children?: React.ReactNode;
  preset?: AnimationPreset;
  duration?: number;
  delay?: number;
  staggerDelay?: number;
  staggerIndex?: number;
  hover?: HoverEffect | HoverEffect[];
  tap?: TapEffect | TapEffect[];
  loop?: boolean;
  autoplay?: boolean;
  style?: ViewStyle;
  animate?: MotiProps['animate'] | boolean;
  onLayout?: (event: any) => void;
}

// Animation presets
const getPresetAnimation = (preset: AnimationPreset, duration: number = DURATIONS.normal) => {
  switch (preset) {
    case 'fadeIn':
      return {
        from: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { type: 'timing', duration, easing: EASINGS.easeOut },
      };
    
    case 'fadeOut':
      return {
        from: { opacity: 1 },
        animate: { opacity: 0 },
        transition: { type: 'timing', duration, easing: EASINGS.easeIn },
      };
    
    case 'slideUp':
      return {
        from: { opacity: 0, translateY: 50 },
        animate: { opacity: 1, translateY: 0 },
        transition: { type: 'spring', ...SPRING_CONFIGS.gentle },
      };
    
    case 'slideDown':
      return {
        from: { opacity: 0, translateY: -50 },
        animate: { opacity: 1, translateY: 0 },
        transition: { type: 'spring', ...SPRING_CONFIGS.gentle },
      };
    
    case 'slideLeft':
      return {
        from: { opacity: 0, translateX: 50 },
        animate: { opacity: 1, translateX: 0 },
        transition: { type: 'spring', ...SPRING_CONFIGS.gentle },
      };
    
    case 'slideRight':
      return {
        from: { opacity: 0, translateX: -50 },
        animate: { opacity: 1, translateX: 0 },
        transition: { type: 'spring', ...SPRING_CONFIGS.gentle },
      };
    
    case 'scaleIn':
      return {
        from: { opacity: 0, scale: 0.8 },
        animate: { opacity: 1, scale: 1 },
        transition: { type: 'spring', ...SPRING_CONFIGS.gentle },
      };
    
    case 'scaleOut':
      return {
        from: { opacity: 1, scale: 1 },
        animate: { opacity: 0, scale: 0.8 },
        transition: { type: 'spring', ...SPRING_CONFIGS.gentle },
      };
    
    case 'bounce':
      return {
        from: { scale: 0 },
        animate: { scale: 1 },
        transition: { type: 'spring', ...SPRING_CONFIGS.bouncy },
      };
    
    case 'pulse':
      return {
        from: { scale: 1 },
        animate: { scale: [1, 1.05, 1] },
        transition: { 
          type: 'timing', 
          duration: duration * 2,
          loop: true,
          repeatReverse: false,
        },
      };
    
    case 'shake':
      return {
        from: { translateX: 0 },
        animate: { translateX: [0, -10, 10, -10, 10, 0] },
        transition: { type: 'timing', duration },
      };
    
    case 'rubberBand':
      return {
        from: { scale: 1 },
        animate: { scale: [1, 1.25, 0.75, 1.15, 0.95, 1] },
        transition: { type: 'timing', duration },
      };
    
    case 'flipIn':
      return {
        from: { opacity: 0, rotateY: '90deg' },
        animate: { opacity: 1, rotateY: '0deg' },
        transition: { type: 'spring', ...SPRING_CONFIGS.gentle },
      };
    
    case 'flipOut':
      return {
        from: { opacity: 1, rotateY: '0deg' },
        animate: { opacity: 0, rotateY: '90deg' },
        transition: { type: 'spring', ...SPRING_CONFIGS.gentle },
      };
    
    case 'zoomIn':
      return {
        from: { opacity: 0, scale: 0.3 },
        animate: { opacity: 1, scale: 1 },
        transition: { type: 'spring', ...SPRING_CONFIGS.gentle },
      };
    
    case 'zoomOut':
      return {
        from: { opacity: 1, scale: 1 },
        animate: { opacity: 0, scale: 0.3 },
        transition: { type: 'spring', ...SPRING_CONFIGS.gentle },
      };
    
    default:
      return {};
  }
};

// Hover effects
const getHoverEffect = (effect: HoverEffect) => {
  switch (effect) {
    case 'scale':
      return { scale: 1.05 };
    case 'opacity':
      return { opacity: 0.8 };
    case 'lift':
      return { scale: 1.02, translateY: -2 };
    case 'glow':
      return { scale: 1.01, opacity: 0.9 };
    default:
      return {};
  }
};

// Tap effects
const getTapEffect = (effect: TapEffect) => {
  switch (effect) {
    case 'scale':
      return { scale: 0.95 };
    case 'opacity':
      return { opacity: 0.7 };
    case 'bounce':
      return { scale: 1.1 };
    case 'pulse':
      return { scale: 1.05 };
    default:
      return {};
  }
};

export const MotiView: React.FC<MotiViewProps> = ({
  children,
  preset,
  duration = DURATIONS.normal,
  delay = 0,
  staggerDelay = 0,
  staggerIndex = 0,
  hover,
  tap,
  loop = false,
  autoplay = true,
  style,
  animate,
  onLayout,
  ...props
}) => {
  // Calculate stagger delay
  const totalDelay = delay + (staggerIndex * staggerDelay);

  // Get preset animation
  const presetAnimation = preset ? getPresetAnimation(preset, duration) : {};

  // Handle custom animate prop
  let animateProps: any = {};
  
  if (animate === false) {
    animateProps = presetAnimation.from || {};
  } else if (animate === true || animate === undefined) {
    animateProps = presetAnimation.animate || {};
  } else if (typeof animate === 'object') {
    animateProps = animate;
  }

  // Handle hover effects
  const hoverProps: any = {};
  if (hover) {
    const hoverEffects = Array.isArray(hover) ? hover : [hover];
    hoverEffects.forEach(effect => {
      Object.assign(hoverProps, getHoverEffect(effect));
    });
  }

  // Handle tap effects
  const tapProps: any = {};
  if (tap) {
    const tapEffects = Array.isArray(tap) ? tap : [tap];
    tapEffects.forEach(effect => {
      Object.assign(tapProps, getTapEffect(effect));
    });
  }

  // Combine transition props
  const transitionProps = {
    ...presetAnimation.transition,
    delay: totalDelay,
    loop: loop,
  };

  return (
    <OriginalMotiView
      from={presetAnimation.from}
      animate={animateProps}
      transition={transitionProps}
      whileHover={Object.keys(hoverProps).length > 0 ? hoverProps : undefined}
      whileTap={Object.keys(tapProps).length > 0 ? tapProps : undefined}
      style={style}
      onLayout={onLayout}
      {...props}
    >
      {children}
    </OriginalMotiView>
  );
};

export default MotiView;