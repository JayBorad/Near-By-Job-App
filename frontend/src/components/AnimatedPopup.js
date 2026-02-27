import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '../theme/colors';

const TYPE_STYLES = {
  success: {
    icon: 'checkmark-circle',
    iconColor: '#16A34A',
    borderColor: '#86EFAC',
    backgroundColor: '#ECFDF3'
  },
  error: {
    icon: 'close-circle',
    iconColor: '#DC2626',
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2'
  },
  warning: {
    icon: 'warning',
    iconColor: '#D97706',
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB'
  },
  info: {
    icon: 'information-circle',
    iconColor: '#2563EB',
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF'
  }
};

export function AnimatedPopup({ visible, title, message, type = 'error', onClose, duration = 3000 }) {
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(-24)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(toastOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(toastTranslateY, { toValue: 0, duration: 220, useNativeDriver: true })
      ]).start();
      const timer = setTimeout(() => {
        if (onClose) onClose();
      }, duration);
      return () => clearTimeout(timer);
    }

    toastOpacity.setValue(0);
    toastTranslateY.setValue(-24);
  }, [visible, toastOpacity, toastTranslateY, onClose, duration]);

  if (!visible) return null;

  const variant = TYPE_STYLES[type] || TYPE_STYLES.info;

  return (
    <View pointerEvents="box-none" style={styles.container}>
      <Animated.View
        style={[
          styles.toast,
          {
            backgroundColor: variant.backgroundColor,
            borderColor: variant.borderColor,
            opacity: toastOpacity,
            transform: [{ translateY: toastTranslateY }]
          }
        ]}
      >
        <Ionicons name={variant.icon} size={20} color={variant.iconColor} />
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          {!!message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={16} color={palette.textSecondary} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 14
  },
  toast: {
    width: '100%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10
  },
  content: {
    flex: 1,
    marginLeft: 8,
    marginRight: 6
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A'
  },
  message: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: '#334155'
  },
  closeBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(148,163,184,0.18)',
    alignItems: 'center',
    justifyContent: 'center'
  }
});
