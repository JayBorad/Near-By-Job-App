import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { palette } from '../theme/colors';

export function PrimaryButton({ title, loading = false, onPress }) {
  return (
    <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={onPress} disabled={loading}>
      {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.title}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: 8,
    height: 54,
    borderRadius: 14,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 8px 18px rgba(0, 0, 0, 0.12)',
    elevation: 4
  },
  pressed: {
    backgroundColor: palette.primaryDark
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16
  }
});
