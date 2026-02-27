import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const USER_KEY = 'auth_user';

let memoryStore = {
  token: null,
  refreshToken: null,
  user: null
};

export async function saveSession({ token, refreshToken, user }) {
  memoryStore = {
    token: token || null,
    refreshToken: refreshToken || null,
    user: user || null
  };

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (token) {
      window.localStorage.setItem(TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_KEY);
    }
    if (refreshToken) {
      window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } else {
      window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
    if (user) {
      window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(USER_KEY);
    }
    return;
  }

  if (token) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
  if (refreshToken) {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  }
  if (user) {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    await AsyncStorage.removeItem(USER_KEY);
  }
}

export async function loadSession() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const token = window.localStorage.getItem(TOKEN_KEY);
    const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);
    const userRaw = window.localStorage.getItem(USER_KEY);
    const user = userRaw ? JSON.parse(userRaw) : null;
    memoryStore = { token, refreshToken, user };
    return memoryStore;
  }

  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  const userRaw = await AsyncStorage.getItem(USER_KEY);
  const user = userRaw ? JSON.parse(userRaw) : null;
  memoryStore = { token, refreshToken, user };
  return memoryStore;
}

export async function clearSession() {
  memoryStore = { token: null, refreshToken: null, user: null };

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    return;
  }

  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
}
