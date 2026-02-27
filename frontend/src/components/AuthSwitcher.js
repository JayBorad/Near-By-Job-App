import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { palette } from '../theme/colors';

export function AuthSwitcher({ text, actionText, onPress }) {
  return (
    <View style={styles.row}>
      <Text style={styles.text}>{text}</Text>
      <Pressable onPress={onPress}>
        <Text style={styles.action}>{actionText}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18
  },
  text: {
    color: palette.textSecondary,
    fontSize: 14
  },
  action: {
    marginLeft: 4,
    color: palette.accent,
    fontWeight: '700',
    fontSize: 14
  }
});
