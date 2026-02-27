import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '../theme/colors';

export function FormInput({
  label,
  placeholder,
  icon,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  value,
  onChangeText,
  onBlur,
  error,
  rightIcon,
  onRightPress
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.fieldWrap, error && styles.fieldError]}>
        <Ionicons name={icon} size={18} color={palette.textSecondary} style={styles.icon} />
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          autoCapitalize={autoCapitalize}
        />
        {rightIcon ? (
          <Pressable onPress={onRightPress} hitSlop={8}>
            <Ionicons name={rightIcon} size={20} color={palette.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14
  },
  label: {
    fontSize: 13,
    color: palette.textSecondary,
    marginBottom: 6,
    fontWeight: '600'
  },
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 52
  },
  fieldError: {
    borderColor: palette.danger
  },
  icon: {
    marginRight: 8
  },
  input: {
    flex: 1,
    color: palette.textMain,
    fontSize: 15
  },
  errorText: {
    marginTop: 6,
    color: palette.danger,
    fontSize: 12,
    fontWeight: '600'
  }
});
