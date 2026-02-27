import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '../theme/colors';

const social = [
  { id: 'apple', icon: 'logo-apple' },
  { id: 'google', icon: 'logo-google' },
  { id: 'twitter', icon: 'logo-twitter' }
];

export function SocialRow() {
  return (
    <View style={styles.container}>
      {social.map((item) => (
        <Pressable key={item.id} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
          <Ionicons name={item.icon} size={20} color={palette.textMain} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginTop: 18
  },
  item: {
    height: 46,
    width: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  pressed: {
    backgroundColor: '#EEF2FF'
  }
});
