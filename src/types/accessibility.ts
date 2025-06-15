// Accessibility Types and Interfaces
import { AccessibilityRole, AccessibilityState } from 'react-native';

export interface AccessibilityProps {
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  testID?: string;
  accessibilityLiveRegion?: 'none' | 'polite' | 'assertive';
  accessibilityLevel?: number;
}

export interface TouchTargetProps {
  minTouchTarget?: boolean;
  touchTargetSize?: number;
}

export interface FocusProps {
  autoFocus?: boolean;
  focusable?: boolean;
  accessible?: boolean;
}

export type AccessibleComponentProps = AccessibilityProps & TouchTargetProps & FocusProps;

export interface ReducedMotionPreferences {
  reduceMotion: boolean;
  prefersReducedMotion: boolean;
}

// Semantic role mappings
export const SemanticRoles = {
  BUTTON: 'button' as AccessibilityRole,
  HEADER: 'header' as AccessibilityRole,
  TEXT: 'text' as AccessibilityRole,
  IMAGE: 'image' as AccessibilityRole,
  LINK: 'link' as AccessibilityRole,
  SEARCH: 'search' as AccessibilityRole,
  TAB: 'tab' as AccessibilityRole,
  TABLIST: 'tablist' as AccessibilityRole,
  MENU: 'menu' as AccessibilityRole,
  MENUITEM: 'menuitem' as AccessibilityRole,
} as const;

// WCAG Guidelines Constants
export const WCAG_GUIDELINES = {
  MIN_TOUCH_TARGET: 44,
  MIN_CONTRAST_RATIO: 4.5,
  MIN_CONTRAST_RATIO_LARGE: 3.0,
  LARGE_TEXT_THRESHOLD: 18,
} as const;