import { Platform } from 'react-native';
import { clearSession, loadSession, saveSession } from './sessionStorage';

const DEFAULT_WEB_API_BASE_URL = 'http://localhost:8000/api/v1';
const DEFAULT_NATIVE_API_BASE_URL = 'http://192.168.31.157:8000/api/v1';

const WEB_ENV_URL = process.env.EXPO_PUBLIC_API_BASE_URL_WEB;
const NATIVE_ENV_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

const API_BASE_URL = Platform.OS === 'web'
  ? (WEB_ENV_URL || DEFAULT_WEB_API_BASE_URL)
  : (NATIVE_ENV_URL || DEFAULT_NATIVE_API_BASE_URL);

let refreshInFlight = null;

const isTokenExpiredMessage = (message) => {
  const normalized = String(message || '').toLowerCase();
  return normalized.includes('invalid or expired token') || normalized.includes('jwt expired');
};

async function requestTokenRefresh() {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const current = await loadSession();
    const refreshToken = current?.refreshToken;
    if (!refreshToken) {
      throw new Error('Session expired. Please login again.');
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      await clearSession();
      throw new Error(data?.message || 'Session expired. Please login again.');
    }

    const nextToken = data?.data?.accessToken;
    if (!nextToken) {
      await clearSession();
      throw new Error('Session expired. Please login again.');
    }

    await saveSession({
      token: nextToken,
      refreshToken: data?.data?.refreshToken || refreshToken,
      user: data?.data?.user || current?.user || null
    });
    return nextToken;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

async function apiRequest(path, options = {}, retryOnAuthError = true) {
  const requestHeaders = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers: requestHeaders,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.message || 'Request failed';
    const hasAuthHeader = Boolean(requestHeaders.Authorization);
    const canRetryRefresh = retryOnAuthError && hasAuthHeader && path !== '/auth/refresh-token' && isTokenExpiredMessage(message);
    if (canRetryRefresh) {
      const nextToken = await requestTokenRefresh();
      const retriedHeaders = {
        ...requestHeaders,
        Authorization: `Bearer ${nextToken}`
      };
      return apiRequest(
        path,
        {
          ...options,
          headers: retriedHeaders
        },
        false
      );
    }
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

export async function createJob({ token, payload }) {
  return apiRequest('/jobs', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: payload
  });
}

export async function updateJob({ token, jobId, payload }) {
  return apiRequest(`/jobs/${jobId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: payload
  });
}

export async function getAllJobs({ token, page = 1, limit = 20, status = 'ALL' }) {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    status
  });
  return apiRequest(`/jobs?${query.toString()}`, {
    method: 'GET',
    headers: token
      ? {
          Authorization: `Bearer ${token}`
        }
      : {}
  });
}

export async function getAllCategoriesAdmin({ token, status = 'ALL', q }) {
  const query = new URLSearchParams();
  if (status) query.set('status', status);
  if (q) query.set('q', q);
  return apiRequest(`/categories${query.toString() ? `?${query.toString()}` : ''}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function updateCategoryStatus({ token, categoryId, status }) {
  return apiRequest(`/categories/${categoryId}/status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: { status }
  });
}

export async function getAllUsers({ token, page = 1, limit = 20, role, mode, status, q }) {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit)
  });
  if (role) query.set('role', role);
  if (mode) query.set('mode', mode);
  if (status) query.set('status', status);
  if (q) query.set('q', q);

  return apiRequest(`/users?${query.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function updateUserAccess({ token, userId, payload }) {
  return apiRequest(`/users/${userId}/access`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: payload
  });
}

export async function updateUserByAdmin({ token, userId, payload }) {
  return apiRequest(`/users/${userId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: payload
  });
}

export async function updateUserAvatarByAdmin({ token, userId, payload }) {
  return apiRequest(`/users/${userId}/avatar`, {
    method: 'PATCH',
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

export async function applyToJob({ token, jobId }) {
  return apiRequest('/applications', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: { jobId }
  });
}

export async function getMyApplications({ token }) {
  return apiRequest('/applications/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function getApplicationsByJob({ token, jobId }) {
  return apiRequest(`/applications/job/${jobId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function acceptApplication({ token, applicationId }) {
  return apiRequest(`/applications/${applicationId}/accept`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function rejectApplication({ token, applicationId }) {
  return apiRequest(`/applications/${applicationId}/reject`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function getChatMessagesByJob({ token, jobId }) {
  return apiRequest(`/chat/job/${jobId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function getChatConversations({ token }) {
  return apiRequest('/chat/conversations', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}
