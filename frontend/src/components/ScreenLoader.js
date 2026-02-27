import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import LottieView from 'lottie-react-native';
import { palette } from '../theme/colors';

const LOTTIE_URI = 'https://assets10.lottiefiles.com/packages/lf20_usmfx6bp.json';

export function ScreenLoader({ visible, text = 'Please wait...' }) {
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
            <ActivityIndicator style={styles.fallback} size="large" color={palette.primary} />
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
    backgroundColor: 'rgba(17, 24, 39, 0.35)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 26,
    paddingVertical: 20,
    minWidth: 180,
    alignItems: 'center'
  },
  lottieWrap: {
    width: 78,
    height: 78,
    alignItems: 'center',
    justifyContent: 'center'
  },
  lottie: {
    width: 78,
    height: 78
  },
  fallback: {
    position: 'absolute'
  },
  text: {
    marginTop: 4,
    color: palette.textMain,
    fontWeight: '600'
  }
});
