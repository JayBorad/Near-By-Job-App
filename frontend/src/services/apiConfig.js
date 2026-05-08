import { NativeModules, Platform } from 'react-native';

const DEFAULT_WEB_API_BASE_URL = 'http://localhost:8000/api/v1';
const DEFAULT_IOS_API_BASE_URL = 'http://127.0.0.1:8000/api/v1';
const DEFAULT_ANDROID_API_BASE_URL = 'http://10.0.2.2:8000/api/v1';

const WEB_ENV_URL = process.env.EXPO_PUBLIC_API_BASE_URL_WEB;
const NATIVE_ENV_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

const stripTrailingSlash = (value) => String(value || '').replace(/\/+$/, '');

const formatHostForHttp = (host) => {
  if (!host) return '';
  return host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
};

const getMetroHost = () => {
  const scriptURL = NativeModules?.SourceCode?.scriptURL;
  if (!scriptURL) return '';
  try {
    return new URL(scriptURL).hostname || '';
  } catch {
    return '';
  }
};

const getDefaultNativeApiBaseUrl = () => {
  const metroHost = getMetroHost();
  if (metroHost) {
    return `http://${formatHostForHttp(metroHost)}:8000/api/v1`;
  }
  return Platform.OS === 'android' ? DEFAULT_ANDROID_API_BASE_URL : DEFAULT_IOS_API_BASE_URL;
};

export const getApiBaseUrl = () => {
  const resolved = Platform.OS === 'web'
    ? (WEB_ENV_URL || DEFAULT_WEB_API_BASE_URL)
    : (NATIVE_ENV_URL || getDefaultNativeApiBaseUrl());
  return stripTrailingSlash(resolved);
};

export const getSocketBaseUrl = () => getApiBaseUrl().replace(/\/api\/v1$/, '');
