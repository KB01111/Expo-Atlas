import { StyleSheet } from 'react-native';
import { AppTheme } from '../types';

export const createSharedStyles = (theme: AppTheme) => StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  
  safeContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // Card styles
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.md,
  },

  cardLarge: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    ...theme.shadows.lg,
  },

  cardSubtle: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    ...theme.shadows.sm,
  },

  // Header styles
  header: {
    paddingTop: 60,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },

  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: theme.spacing.xs,
    letterSpacing: -0.5,
  },

  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },

  // Content area
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },

  contentPadded: {
    flex: 1,
    padding: theme.spacing.lg,
  },

  // Button styles
  buttonPrimary: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.md,
  },

  buttonSecondary: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.md,
  },

  buttonOutline: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  buttonTextOutline: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  column: {
    flexDirection: 'column',
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