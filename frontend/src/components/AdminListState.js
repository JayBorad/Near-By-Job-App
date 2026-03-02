import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import LottieView from 'lottie-react-native';

export function AdminListState({
  mode = 'loading',
  title,
  subtitle,
  colors,
  emptySource,
  style
}) {
  const pulse = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    if (mode !== 'loading') return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 720, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.55, duration: 720, useNativeDriver: true })
      ])
    );
    loop.start();

    return () => {
      loop.stop();
    };
  }, [mode, pulse]);

  const themed = useMemo(
    () =>
      StyleSheet.create({
        card: {
          borderRadius: 18,
          padding: 4
        },
        skeletonCard: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 14,
          backgroundColor: colors.surface,
          padding: 12,
          marginBottom: 10
        },
        skeletonTopRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between'
        },
        skeletonHeader: {
          width: '54%',
          height: 14,
          borderRadius: 8,
          backgroundColor: colors.primarySoft
        },
        skeletonBadge: {
          width: 82,
          height: 26,
          borderRadius: 9,
          backgroundColor: colors.primarySoft
        },
        skeletonLine: {
          marginTop: 10,
          width: '100%',
          height: 11,
          borderRadius: 6,
          backgroundColor: colors.primarySoft
        },
        skeletonLineShort: {
          width: '70%'
        },
        title: {
          marginTop: 14,
          textAlign: 'center',
          color: colors.textMain,
          fontSize: 15,
          fontWeight: '800'
        },
        subtitle: {
          marginTop: 6,
          textAlign: 'center',
          color: colors.textSecondary,
          fontSize: 12,
          lineHeight: 18
        },
        emptyWrap: {
          alignItems: 'center',
          justifyContent: 'center'
        },
        emptyAnim: {
          width: 176,
          height: 176
        }
      }),
    [colors]
  );

  if (mode === 'empty') {
    return (
      <View style={[themed.card, themed.emptyWrap, style]}>
        {emptySource ? (
          <LottieView autoPlay loop source={emptySource} style={themed.emptyAnim} renderMode="AUTOMATIC" />
        ) : null}
        {!!title ? <Text style={themed.title}>{title}</Text> : null}
        {!!subtitle ? <Text style={themed.subtitle}>{subtitle}</Text> : null}
      </View>
    );
  }

  return (
    <View style={[themed.card, style]}>
      {Array.from({ length: 4 }).map((_, idx) => (
        <Animated.View key={`skeleton-${idx}`} style={[themed.skeletonCard, { opacity: pulse }]}>
          <View style={themed.skeletonTopRow}>
            <View style={themed.skeletonHeader} />
            <View style={themed.skeletonBadge} />
          </View>
          <View style={themed.skeletonLine} />
          <View style={[themed.skeletonLine, themed.skeletonLineShort]} />
          <View style={themed.skeletonLine} />
          <View style={[themed.skeletonLine, themed.skeletonLineShort]} />
        </Animated.View>
      ))}
      {!!title ? <Text style={themed.title}>{title}</Text> : null}
      {!!subtitle ? <Text style={themed.subtitle}>{subtitle}</Text> : null}
      <View style={{ height: 2 }} />
    </View>
  );
}
