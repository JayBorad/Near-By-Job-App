import React, { useEffect, useState } from 'react';
import { Image, Linking, Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const ENABLE_NATIVE_GOOGLE_MAPS = process.env.EXPO_PUBLIC_ENABLE_NATIVE_GOOGLE_MAPS === 'true';
let googleMapsPreviewLoaderPromise = null;
let NativePreviewMapView = null;
let NativePreviewMarker = null;
let NATIVE_PREVIEW_GOOGLE_PROVIDER = null;

if (Platform.OS !== 'web' && ENABLE_NATIVE_GOOGLE_MAPS) {
  try {
    const NativeMaps = require('react-native-maps');
    NativePreviewMapView = NativeMaps.default;
    NativePreviewMarker = NativeMaps.Marker;
    NATIVE_PREVIEW_GOOGLE_PROVIDER = NativeMaps.PROVIDER_GOOGLE;
  } catch (_error) {
    NativePreviewMapView = null;
    NativePreviewMarker = null;
    NATIVE_PREVIEW_GOOGLE_PROVIDER = null;
  }
}

const toNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const canUseGoogleMapPreview = () =>
  Platform.OS === 'web' &&
  Boolean(GOOGLE_MAPS_API_KEY) &&
  typeof window !== 'undefined' &&
  typeof document !== 'undefined';

const canUseNativeGoogleMapPreview = () =>
  Platform.OS !== 'web' && Boolean(GOOGLE_MAPS_API_KEY) && Boolean(NativePreviewMapView);

const loadGoogleMapsPreviewApi = () => {
  if (!canUseGoogleMapPreview()) return Promise.resolve(null);
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (googleMapsPreviewLoaderPromise) return googleMapsPreviewLoaderPromise;

  googleMapsPreviewLoaderPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-jobrixa-google-maps="true"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.google?.maps || null), { once: true });
      existingScript.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`;
    script.async = true;
    script.defer = true;
    script.dataset.jobrixaGoogleMaps = 'true';
    script.onload = () => resolve(window.google?.maps || null);
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return googleMapsPreviewLoaderPromise;
};

function GoogleJobMapPreview({ latitude, longitude, height, styles, onUnavailable }) {
  const hostRef = React.useRef(null);

  useEffect(() => {
    let cancelled = false;
    if (!canUseGoogleMapPreview()) return undefined;

    loadGoogleMapsPreviewApi()
      .then((maps) => {
        if (cancelled || !maps || !hostRef.current) return;
        const center = { lat: Number(latitude), lng: Number(longitude) };
        const map = new maps.Map(hostRef.current, {
          center,
          zoom: 14,
          clickableIcons: true,
          zoomControl: true,
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: false,
          keyboardShortcuts: false
        });
        new maps.Marker({ position: center, map });
      })
      .catch(() => {
        if (!cancelled && onUnavailable) onUnavailable();
      });

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  if (!canUseGoogleMapPreview()) return null;

  return (
    <View style={[styles.jobMapImage, { height }]}>
      {React.createElement('div', {
        ref: hostRef,
        style: { width: '100%', height: '100%' }
      })}
    </View>
  );
}

function NativeJobMapPreview({ latitude, longitude, height, styles }) {
  if (!canUseNativeGoogleMapPreview()) return null;

  const latitudeDelta = 0.03;
  const region = {
    latitude: Number(latitude),
    longitude: Number(longitude),
    latitudeDelta,
    longitudeDelta: latitudeDelta
  };

  return (
    <View style={[styles.jobMapImage, { height }]}>
      <NativePreviewMapView
        provider={NATIVE_PREVIEW_GOOGLE_PROVIDER}
        style={styles.createMapNativeFull}
        initialRegion={region}
        zoomControlEnabled
        toolbarEnabled={false}
        scrollEnabled={false}
      >
        <NativePreviewMarker coordinate={{ latitude: Number(latitude), longitude: Number(longitude) }} />
      </NativePreviewMapView>
    </View>
  );
}

const getJobCoordinates = (job) => ({
  latitude: toNumberOrNull(job?.latitude),
  longitude: toNumberOrNull(job?.longitude)
});

const getStaticMapUris = (latitude, longitude) => [
  `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=14&size=640x300&markers=${latitude},${longitude},red-pushpin`,
  `https://static-maps.yandex.ru/1.x/?lang=en_US&ll=${longitude},${latitude}&size=640,300&z=14&l=map&pt=${longitude},${latitude},pm2rdm`
];

const getJobWorkModeLabel = (workMode) => {
  const normalized = String(workMode || 'ONSITE').toUpperCase();
  if (normalized === 'REMOTE') return 'Remote';
  if (normalized === 'HYBRID') return 'Hybrid';
  return 'Onsite';
};

export function JobLocationCard({ job, title = 'Location', styles, colors }) {
  const { latitude, longitude } = getJobCoordinates(job);
  const hasCoords = latitude !== null && longitude !== null;
  const { width } = useWindowDimensions();
  const [mapProviderIndex, setMapProviderIndex] = useState(0);
  const [useGooglePreview, setUseGooglePreview] = useState(canUseGoogleMapPreview() || canUseNativeGoogleMapPreview());
  const staticMapUris = hasCoords ? getStaticMapUris(latitude, longitude) : [];
  const mapUri = staticMapUris[mapProviderIndex] || null;
  const mapHeight = width < 390 ? 132 : 158;

  useEffect(() => {
    setMapProviderIndex(0);
    setUseGooglePreview(canUseGoogleMapPreview() || canUseNativeGoogleMapPreview());
  }, [latitude, longitude]);

  return (
    <View style={styles.jobMapCard}>
      <View style={styles.jobMapCardHead}>
        <Ionicons name="map-outline" size={16} color={colors.primary} />
        <Text style={styles.jobMapCardTitle}>{title}</Text>
      </View>

      {hasCoords ? (
        <View style={styles.jobMapImageWrap}>
          {useGooglePreview && canUseGoogleMapPreview() ? (
            <GoogleJobMapPreview
              latitude={latitude}
              longitude={longitude}
              height={mapHeight}
              styles={styles}
              onUnavailable={() => setUseGooglePreview(false)}
            />
          ) : useGooglePreview && canUseNativeGoogleMapPreview() ? (
            <NativeJobMapPreview
              latitude={latitude}
              longitude={longitude}
              height={mapHeight}
              styles={styles}
            />
          ) : mapUri ? (
            <Image
              source={{ uri: mapUri }}
              style={[styles.jobMapImage, { height: mapHeight }]}
              resizeMode="cover"
              onError={() => {
                if (mapProviderIndex < staticMapUris.length - 1) {
                  setMapProviderIndex((prev) => prev + 1);
                } else {
                  setMapProviderIndex(staticMapUris.length);
                }
              }}
            />
          ) : (
            <View style={[styles.jobMapEmpty, { height: mapHeight }]}>
              <Ionicons name="map-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.jobMapEmptyText}>Map preview unavailable</Text>
            </View>
          )}
          <Pressable
            style={styles.jobMapOpenBtn}
            onPress={() => Linking.openURL(`https://maps.google.com/?q=${latitude},${longitude}`)}
          >
            <Ionicons name="navigate-outline" size={14} color="#FFFFFF" />
            <Text style={styles.jobMapOpenBtnText}>Open Map</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.jobMapEmpty}>
          <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.jobMapEmptyText}>Location coordinates not available</Text>
        </View>
      )}

      <Text style={styles.jobMapAddressText}>{job?.address || '-'}</Text>
      <Text style={styles.jobMapCoordsText}>Work Mode: {getJobWorkModeLabel(job?.workMode)}</Text>
      {hasCoords ? (
        <Text style={styles.jobMapCoordsText}>
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </Text>
      ) : null}
    </View>
  );
}

export function AvatarFallback({ size }) {
  const outerSize = size;
  const headSize = Math.round(size * 0.33);
  const shoulderWidth = Math.round(size * 0.88);
  const shoulderHeight = Math.round(size * 0.5);
  const headTop = Math.round(size * 0.2);
  return (
    <View
      style={{
        width: outerSize,
        height: outerSize,
        borderRadius: outerSize / 2,
        backgroundColor: '#D1D1D4',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: headTop,
          width: headSize,
          height: headSize,
          borderRadius: headSize / 2,
          backgroundColor: '#A9A9AC',
          zIndex: 2
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: Math.round(size * -0.1),
          width: shoulderWidth,
          height: shoulderHeight,
          borderTopLeftRadius: shoulderHeight,
          borderTopRightRadius: shoulderHeight,
          borderBottomLeftRadius: Math.round(size * 0.18),
          borderBottomRightRadius: Math.round(size * 0.18),
          backgroundColor: '#A9A9AC',
          zIndex: 1
        }}
      />
    </View>
  );
}

export function AvatarView({ imageUrl, size, colors, showBorder = false, iconSize = 28 }) {
  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2
          },
          showBorder ? { borderWidth: 2, borderColor: colors.primarySoft } : null
        ]}
      />
    );
  }

  return <AvatarFallback size={size} colors={colors} iconSize={iconSize} />;
}

export function PageCard({ title, subtitle, icon, styles, colors }) {
  return (
    <View style={styles.pageCard}>
      <View style={styles.pageIconWrap}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={styles.pageTitle}>{title}</Text>
      <Text style={styles.pageSubtitle}>{subtitle}</Text>
    </View>
  );
}

export function SettingsOption({ icon, title, subtitle, onPress, styles, colors, right = true }) {
  return (
    <Pressable style={styles.settingRow} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={styles.settingIconWrap}>
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle ? <Text style={styles.settingSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {right ? <Ionicons name="chevron-forward" size={18} color={colors.iconInactive} /> : null}
    </Pressable>
  );
}

export function CategoryStatusBadge({ status, styles }) {
  const normalized = String(status || '').toUpperCase();
  const badgeStyle =
    normalized === 'APPROVED'
      ? styles.categoryStatusApproved
      : normalized === 'REJECTED'
        ? styles.categoryStatusRejected
        : styles.categoryStatusPending;

  return (
    <View style={[styles.categoryStatusBadge, badgeStyle]}>
      <Text style={styles.categoryStatusText}>{normalized || 'PENDING'}</Text>
    </View>
  );
}
