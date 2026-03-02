import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import LottieView from 'lottie-react-native';

const DEFAULT_LOTTIE_URI = 'https://assets2.lottiefiles.com/packages/lf20_lnk9yxp7.json';

export function LottieLoader({
  visible,
  text = 'Loading...',
  size = 86,
  inline = false,
  sourceUri = DEFAULT_LOTTIE_URI,
  showFallback = true,
  cardStyle,
  textStyle
}) {
  if (inline) {
    return (
      <View style={[styles.inlineCard, cardStyle]}>
        <View style={[styles.lottieWrap, { width: size, height: size }]}>
          <LottieView
            autoPlay
            loop
            source={{ uri: sourceUri }}
            style={{ width: size, height: size }}
            renderMode="AUTOMATIC"
          />
          {showFallback ? <ActivityIndicator style={styles.fallback} size="large" color="#0F766E" /> : null}
        </View>
        {!!text ? <Text style={[styles.text, textStyle]}>{text}</Text> : null}
      </View>
    );
  }

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.backdrop}>
        <View style={[styles.card, cardStyle]}>
          <View style={styles.lottieWrap}>
            <LottieView
              autoPlay
              loop
              source={{ uri: sourceUri }}
              style={styles.lottie}
              renderMode="AUTOMATIC"
            />
            {showFallback ? <ActivityIndicator style={styles.fallback} size="large" color="#0F766E" /> : null}
          </View>
          {!!text ? <Text style={[styles.text, textStyle]}>{text}</Text> : null}
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
  inlineCard: {
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center'
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
