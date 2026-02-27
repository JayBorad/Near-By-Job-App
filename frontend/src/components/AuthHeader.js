import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '../theme/colors';

export function AuthHeader({ title, subtitle, icon }) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 550,
        useNativeDriver: true
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 550,
        useNativeDriver: true
      })
    ]).start();
  }, [fade, slide]);

  return (
    <Animated.View style={[styles.wrapper, { opacity: fade, transform: [{ translateY: slide }] }]}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={24} color={palette.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 24,
    alignItems: 'center'
  },
  iconCircle: {
    height: 52,
    width: 52,
    borderRadius: 26,
    backgroundColor: '#DFF4F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: palette.textMain,
    letterSpacing: 0.2,
    textAlign: 'center'
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: palette.textSecondary,
    textAlign: 'center'
  }
});
