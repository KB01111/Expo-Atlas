import { StyleSheet, Platform, Dimensions } from 'react-native';
import { AppTheme } from '../types';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth >= 768;
const isSmallScreen = screenWidth < 375;

export const createSharedStyles = (theme: AppTheme) => StyleSheet.create({
  // Enhanced container styles with iOS optimizations
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  
  safeContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
  },

  screenContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: isTablet ? 32 : isSmallScreen ? 16 : 24,
  },

  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.xl,
  },

  // Modern card styles with improved spacing and borders
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
  },

  cardLarge: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xxl,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.lg,
  },

  cardSubtle: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },

  cardElevated: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.xl,
  },

  // Header styles with modern spacing
  header: {
    paddingTop: 60,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },

  headerTitle: {
    ...theme.typography.displaySmall,
    color: '#FFFFFF',
    marginBottom: theme.spacing.sm,
  },

  headerSubtitle: {
    ...theme.typography.bodyLarge,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },

  // Content area with improved spacing
  content: {
    flex: 1,
    padding: theme.layout.screenPadding,
    paddingTop: theme.spacing.md,
  },

  contentSmall: {
    flex: 1,
    padding: theme.layout.screenPaddingSmall,
    paddingTop: theme.spacing.md,
  },

  // Typography styles using theme system
  displayLarge: {
    ...theme.typography.displayLarge,
    color: theme.colors.text,
  },

  displayMedium: {
    ...theme.typography.displayMedium,
    color: theme.colors.text,
  },

  displaySmall: {
    ...theme.typography.displaySmall,
    color: theme.colors.text,
  },

  headlineLarge: {
    ...theme.typography.headlineLarge,
    color: theme.colors.text,
  },

  headlineMedium: {
    ...theme.typography.headlineMedium,
    color: theme.colors.text,
  },

  headlineSmall: {
    ...theme.typography.headlineSmall,
    color: theme.colors.text,
  },

  titleLarge: {
    ...theme.typography.titleLarge,
    color: theme.colors.text,
  },

  titleMedium: {
    ...theme.typography.titleMedium,
    color: theme.colors.text,
  },

  titleSmall: {
    ...theme.typography.titleSmall,
    color: theme.colors.text,
  },

  bodyLarge: {
    ...theme.typography.bodyLarge,
    color: theme.colors.text,
  },

  bodyMedium: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
  },

  bodySmall: {
    ...theme.typography.bodySmall,
    color: theme.colors.text,
  },

  labelLarge: {
    ...theme.typography.labelLarge,
    color: theme.colors.textSecondary,
  },

  labelMedium: {
    ...theme.typography.labelMedium,
    color: theme.colors.textSecondary,
  },

  labelSmall: {
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
  },

  // Layout components using theme system
  listItem: {
    padding: theme.layout.listItemPadding,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },

  section: {
    marginBottom: theme.layout.sectionSpacing,
  },

  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.layout.itemSpacing,
  },

  column: {
    flexDirection: 'column' as const,
    gap: theme.layout.itemSpacing,
  },

  contentPadded: {
    flex: 1,
    padding: theme.spacing.xl,
  },

  contentSpaced: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
  },

  // Modern button styles with better proportions
  buttonPrimary: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xl,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    ...theme.shadows.md,
  },

  buttonSecondary: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.xl,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    ...theme.shadows.md,
  },

  buttonOutline: {
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xl,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    minHeight: 52,
  },

  buttonGhost: {
    backgroundColor: 'transparent',
    borderRadius: theme.borderRadius.xl,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  buttonTextOutline: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  buttonTextGhost: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Text styles
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },

  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },

  body: {
    fontSize: 16,
    fontWeight: '400',
    color: theme.colors.text,
    lineHeight: 24,
  },

  caption: {
    fontSize: 14,
    fontWeight: '400',
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },

  label: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Layout utilities
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Spacing utilities
  marginXS: { margin: theme.spacing.xs },
  marginSM: { margin: theme.spacing.sm },
  marginMD: { margin: theme.spacing.md },
  marginLG: { margin: theme.spacing.lg },
  marginXL: { margin: theme.spacing.xl },

  paddingXS: { padding: theme.spacing.xs },
  paddingSM: { padding: theme.spacing.sm },
  paddingMD: { padding: theme.spacing.md },
  paddingLG: { padding: theme.spacing.lg },
  paddingXL: { padding: theme.spacing.xl },

  // Gap utilities
  gapXS: { gap: theme.spacing.xs },
  gapSM: { gap: theme.spacing.sm },
  gapMD: { gap: theme.spacing.md },
  gapLG: { gap: theme.spacing.lg },
  gapXL: { gap: theme.spacing.xl },

  // Metric card styles
  metricCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    minWidth: '45%',
    ...theme.shadows.sm,
  },

  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },

  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Status indicators
  statusActive: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },

  statusInactive: {
    backgroundColor: theme.colors.textSecondary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },

  statusError: {
    backgroundColor: theme.colors.error,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },

  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: theme.spacing.lg,
    right: theme.spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
  },

  // Avatar
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${theme.colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary,
  },

  // Search container
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
});

// Animation presets
export const animations = {
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  slideUp: {
    from: { transform: [{ translateY: 20 }], opacity: 0 },
    to: { transform: [{ translateY: 0 }], opacity: 1 },
  },
  scale: {
    from: { transform: [{ scale: 0.9 }], opacity: 0 },
    to: { transform: [{ scale: 1 }], opacity: 1 },
  },
  bounce: {
    from: { transform: [{ scale: 0.8 }] },
    to: { transform: [{ scale: 1 }] },
  },
};

// Color utilities
export const getStatusColor = (status: string, theme: AppTheme) => {
  switch (status.toLowerCase()) {
    case 'active':
    case 'completed':
    case 'success':
      return theme.colors.success;
    case 'inactive':
    case 'pending':
    case 'warning':
      return theme.colors.warning;
    case 'error':
    case 'failed':
      return theme.colors.error;
    case 'running':
    case 'in_progress':
      return theme.colors.info;
    default:
      return theme.colors.textSecondary;
  }
};

export const getStatusTextColor = (status: string) => '#FFFFFF';