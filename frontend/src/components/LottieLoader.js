import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

function LoaderVisual({ size = 86 }) {
  const ringSize = Math.max(56, size);
  const coreSize = Math.round(ringSize * 0.62);
  const dotSize = Math.round(ringSize * 0.1);

  return (
    <View style={[styles.visualWrap, { width: ringSize + 22, height: ringSize + 22 }]}>
      <View style={[styles.outerRing, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]} />
      <View style={[styles.innerCore, { width: coreSize, height: coreSize, borderRadius: coreSize / 2 }]}>
        <ActivityIndicator size="large" color="#0F766E" />
      </View>
      <View style={[styles.dot, { width: dotSize, height: dotSize, borderRadius: dotSize / 2, top: 6, left: ringSize / 2 + 3 }]} />
      <View style={[styles.dotSoft, { width: dotSize, height: dotSize, borderRadius: dotSize / 2, bottom: 7, right: ringSize / 2 + 2 }]} />
    </View>
  );
}

export function LottieLoader({ visible, text = 'Loading...', size = 86, inline = false, cardStyle, textStyle }) {
  if (inline) {
    return (
      <View style={[styles.inlineCard, cardStyle]}>
        <LoaderVisual size={size} />
        {!!text ? <Text style={[styles.text, textStyle]}>{text}</Text> : null}
      </View>
    );
  }

  if (!visible) return null;

  return (
    <View style={styles.pageOverlay}>
      <View style={styles.backdrop}>
        <View style={[styles.card, cardStyle]}>
          <LoaderVisual size={size} />
          {!!text ? <Text style={[styles.text, textStyle]}>{text}</Text> : null}
          <Text style={styles.subText}>This will finish in a moment</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pageOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24
  },
  card: {
    width: '100%',
    maxWidth: 290,
    borderRadius: 22,
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 14
  },
  inlineCard: {
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  visualWrap: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  outerRing: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#99F6E4',
    backgroundColor: '#ECFEFF'
  },
  innerCore: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CFFAFE'
  },
  dot: {
    position: 'absolute',
    backgroundColor: '#14B8A6'
  },
  dotSoft: {
    position: 'absolute',
    backgroundColor: '#67E8F9'
  },
  text: {
    marginTop: 8,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center'
  },
  subText: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center'
  }
});
