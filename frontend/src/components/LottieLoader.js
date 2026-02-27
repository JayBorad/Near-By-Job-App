import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import LottieView from 'lottie-react-native';

const LOTTIE_URI = 'https://assets10.lottiefiles.com/packages/lf20_usmfx6bp.json';

export function LottieLoader({ visible, text = 'Loading...' }) {
  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.lottieWrap}>
            <LottieView
              autoPlay
              loop
              source={{ uri: LOTTIE_URI }}
              style={styles.lottie}
              renderMode="AUTOMATIC"
            />
            <ActivityIndicator style={styles.fallback} size="large" color="#0F766E" />
          </View>
          <Text style={styles.text}>{text}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24
  },
  card: {
    width: '100%',
    maxWidth: 260,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center'
  },
  lottieWrap: {
    width: 86,
    height: 86,
    alignItems: 'center',
    justifyContent: 'center'
  },
  lottie: {
    width: 86,
    height: 86
  },
  fallback: {
    position: 'absolute'
  },
  text: {
    marginTop: 4,
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700'
  }
});
