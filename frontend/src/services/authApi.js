import { Platform } from 'react-native';

const DEFAULT_WEB_API_BASE_URL = 'http://localhost:8000/api/v1';
const DEFAULT_NATIVE_API_BASE_URL = 'http://192.168.31.157:8000/api/v1';

const WEB_ENV_URL = process.env.EXPO_PUBLIC_API_BASE_URL_WEB;
const NATIVE_ENV_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

const API_BASE_URL = Platform.OS === 'web'
  ? (WEB_ENV_URL || DEFAULT_WEB_API_BASE_URL)
  : (NATIVE_ENV_URL || DEFAULT_NATIVE_API_BASE_URL);

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.message || 'Request failed';
    throw new Error(message);
  }

  return data;
}

export async function signIn(payload) {
  return apiRequest('/auth/signin', {
    method: 'POST',
    body: payload
  });
}

export async function signUp(payload) {
  return apiRequest('/auth/signup', {
    method: 'POST',
    body: payload
  });
}

export async function refreshSessionToken(refreshToken) {
  return apiRequest('/auth/refresh-token', {
    method: 'POST',
    body: { refreshToken }
  });
}

export async function getProfile(token) {
  return apiRequest('/users/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function forgotPassword(payload) {
  return apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: payload
  });
}

export async function updateProfileAvatar({ token, avatarData, avatarUrl, resetAvatar }) {
  return apiRequest('/users/me/avatar', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: {
      ...(avatarData ? { avatarData } : {}),
      ...(avatarUrl ? { avatarUrl } : {}),
      ...(resetAvatar ? { resetAvatar: true } : {})
    }
  });
}

export async function updateProfile({ token, payload }) {
  return apiRequest('/users/me', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: payload
  });
}

export async function getApprovedCategories({ token, q }) {
  const query = new URLSearchParams();
  if (q) query.set('q', q);
  return apiRequest(`/categories/approved${query.toString() ? `?${query.toString()}` : ''}`, {
    method: 'GET',
    headers: token
      ? {
          Authorization: `Bearer ${token}`
        }
      : {}
  });
}

export async function getMyCategories({ token, status, q }) {
  const query = new URLSearchParams();
  if (status) query.set('status', status);
  if (q) query.set('q', q);
  return apiRequest(`/categories/mine${query.toString() ? `?${query.toString()}` : ''}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function createCategory({ token, payload }) {
  return apiRequest('/categories', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: payload
  });
}

export async function updatePassword({ token, password }) {
  return apiRequest('/auth/update-password', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: { password }
  });
}
