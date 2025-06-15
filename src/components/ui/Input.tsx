import React, { useState, useRef } from 'react';
import { 
  TextInput, 
  View, 
  Text, 
  TouchableOpacity, 
  ViewStyle, 
  TextStyle, 
  TextInputProps,
  Animated,
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { MotiView } from '../animations';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  placeholder?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  variant?: 'default' | 'outlined' | 'filled' | 'underlined' | 'glass' | 'neon';
  size?: 'sm' | 'md' | 'lg';
  borderRadius?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  style?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  multiline?: boolean;
  numberOfLines?: number;
  showCharacterCount?: boolean;
  maxLength?: number;
  animatedLabel?: boolean;
  glowEffect?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  error,
  helperText,
  required = false,
  disabled = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  variant = 'outlined',
  size = 'md',
  borderRadius = 'lg',
  style,
  inputStyle,
  labelStyle,
  multiline = false,
  numberOfLines = 1,
  showCharacterCount = false,
  maxLength,
  animatedLabel = true,
  glowEffect = false,
  value,
  onChangeText,
  onFocus,
  onBlur,
  ...textInputProps
}) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [localValue, setLocalValue] = useState(value || '');
  const labelAnimation = useRef(new Animated.Value(value ? 1 : 0)).current;

  const hasValue = localValue.length > 0;
  const hasError = !!error;
  const showFloatingLabel = animatedLabel && variant !== 'underlined';

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (showFloatingLabel && !hasValue) {
      Animated.timing(labelAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (showFloatingLabel && !hasValue) {
      Animated.timing(labelAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
    onBlur?.(e);
  };

  const handleChangeText = (text: string) => {
    setLocalValue(text);
    onChangeText?.(text);
    
    if (showFloatingLabel) {
      const shouldFloat = text.length > 0;
      Animated.timing(labelAnimation, {
        toValue: shouldFloat ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  };

  const getSizeStyles = () => {
    const sizes = {
      sm: {
        height: 40,
        paddingHorizontal: theme.spacing.md,
        fontSize: 14,
        iconSize: 18,
      },
      md: {
        height: 48,
        paddingHorizontal: theme.spacing.lg,
        fontSize: 16,
        iconSize: 20,
      },
      lg: {
        height: 56,
        paddingHorizontal: theme.spacing.xl,
        fontSize: 18,
        iconSize: 22,
      },
    };
    return sizes[size];
  };

  const getVariantStyles = () => {
    const sizeStyles = getSizeStyles();
    const borderRadiusValue = theme.borderRadius[borderRadius];
    
    const baseStyle = {
      borderRadius: borderRadiusValue,
      minHeight: multiline ? sizeStyles.height * numberOfLines : sizeStyles.height,
      paddingHorizontal: sizeStyles.paddingHorizontal,
      paddingVertical: multiline ? theme.spacing.md : 0,
    };

    switch (variant) {
      case 'default':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: hasError ? theme.colors.error : 
                       isFocused ? theme.colors.primary : theme.colors.border,
          ...theme.shadows.xs,
        };

      case 'outlined':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: hasError ? theme.colors.error : 
                       isFocused ? theme.colors.primary : theme.colors.border,
          ...(glowEffect && isFocused && theme.shadows.colored),
        };

      case 'filled':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.backgroundSecondary,
          borderWidth: 0,
          borderBottomWidth: 2,
          borderBottomColor: hasError ? theme.colors.error : 
                            isFocused ? theme.colors.primary : theme.colors.border,
          borderRadius: Platform.OS === 'ios' ? borderRadiusValue : 0,
          borderTopLeftRadius: borderRadiusValue,
          borderTopRightRadius: borderRadiusValue,
        };

      case 'underlined':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 0,
          borderBottomWidth: 2,
          borderBottomColor: hasError ? theme.colors.error : 
                            isFocused ? theme.colors.primary : theme.colors.border,
          borderRadius: 0,
          paddingHorizontal: 0,
        };

      case 'glass':
        return {
          ...baseStyle,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          borderColor: hasError ? theme.colors.error : 
                       isFocused ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)',
          ...theme.shadows.sm,
        };

      case 'neon':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.background,
          borderWidth: 2,
          borderColor: hasError ? theme.colors.error : 
                       isFocused ? theme.colors.accent : theme.colors.border,
          ...(isFocused && theme.shadows.colored),
        };

      default:
        return baseStyle;
    }
  };

  const getTextStyles = (): TextStyle => {
    const sizeStyles = getSizeStyles();
    return {
      fontSize: sizeStyles.fontSize,
      color: disabled ? theme.colors.textDisabled : theme.colors.text,
      flex: 1,
      textAlignVertical: multiline ? 'top' : 'center',
      paddingTop: multiline ? theme.spacing.sm : 0,
    };
  };

  const renderLabel = () => {
    if (!label) return null;

    if (showFloatingLabel) {
      return (
        <Animated.Text
          style={[
            {
              position: 'absolute',
              left: getSizeStyles().paddingHorizontal,
              color: hasError ? theme.colors.error : 
                     isFocused ? theme.colors.primary : theme.colors.textSecondary,
              fontSize: labelAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [getSizeStyles().fontSize, 12],
              }),
              top: labelAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [getSizeStyles().height / 2 - getSizeStyles().fontSize / 2, -8],
              }),
              backgroundColor: variant === 'outlined' ? theme.colors.background : 'transparent',
              paddingHorizontal: variant === 'outlined' ? 4 : 0,
              fontWeight: '500',
            },
            labelStyle,
          ]}
        >
          {label}{required && ' *'}
        </Animated.Text>
      );
    }

    return (
      <Text style={[
        {
          fontSize: 14,
          fontWeight: '500',
          color: hasError ? theme.colors.error : theme.colors.text,
          marginBottom: theme.spacing.xs,
        },
        labelStyle,
      ]}>
        {label}{required && ' *'}
      </Text>
    );
  };

  const renderIcon = (iconName: keyof typeof Ionicons.glyphMap, position: 'left' | 'right', onPress?: () => void) => {
    const IconComponent = onPress ? TouchableOpacity : View;
    
    return (
      <IconComponent onPress={onPress} style={{ padding: theme.spacing.xs }}>
        <Ionicons
          name={iconName}
          size={getSizeStyles().iconSize}
          color={hasError ? theme.colors.error : 
                 isFocused ? theme.colors.primary : theme.colors.textSecondary}
        />
      </IconComponent>
    );
  };

  const renderHelperText = () => {
    if (!helperText && !error && !showCharacterCount) return null;

    return (
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: theme.spacing.xs,
      }}>
        <Text style={{
          fontSize: 12,
          color: hasError ? theme.colors.error : theme.colors.textSecondary,
          flex: 1,
        }}>
          {error || helperText}
        </Text>
        {showCharacterCount && maxLength && (
          <Text style={{
            fontSize: 12,
            color: theme.colors.textSecondary,
          }}>
            {localValue.length}/{maxLength}
          </Text>
        )}
      </View>
    );
  };

  const containerStyle = getVariantStyles();
  const textStyle = getTextStyles();

  return (
    <MotiView style={style}>
      {!showFloatingLabel && renderLabel()}
      
      <View style={containerStyle}>
        {showFloatingLabel && renderLabel()}
        
        <View style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          flex: 1,
        }}>
          {leftIcon && renderIcon(leftIcon, 'left')}
          
          <TextInput
            style={[textStyle, inputStyle]}
            placeholder={showFloatingLabel ? '' : placeholder}
            placeholderTextColor={theme.colors.textTertiary}
            value={localValue}
            onChangeText={handleChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            editable={!disabled}
            multiline={multiline}
            numberOfLines={multiline ? numberOfLines : 1}
            maxLength={maxLength}
            {...textInputProps}
          />
          
          {rightIcon && renderIcon(rightIcon, 'right', onRightIconPress)}
        </View>
      </View>
      
      {renderHelperText()}
    </MotiView>
  );
};

export default Input;