import { COUNTRY_CODES } from '../../constants/countryCodes';

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const COUNTRY_PHONE_RULES = {
  '+91': { exact: 10 },
  '+1': { exact: 10 },
  '+44': { min: 10, max: 10 },
  '+61': { exact: 9 },
  '+971': { exact: 9 }
};

export const getPhoneRule = (code) => COUNTRY_PHONE_RULES[code] || { min: 6, max: 15 };

const COUNTRY_CODE_LIST = Array.from(new Set(COUNTRY_CODES.map((item) => item.code))).sort(
  (a, b) => b.length - a.length
);

export const splitPhoneByCountryCode = (rawPhone, fallbackCode = '+91') => {
  const value = String(rawPhone || '').trim();
  if (!value) {
    return { code: fallbackCode, local: '' };
  }

  const normalized = value.startsWith('+') ? value : `${fallbackCode}${value.replace(/[^0-9]/g, '')}`;
  const matchedCode = COUNTRY_CODE_LIST.find((code) => normalized.startsWith(code)) || fallbackCode;
  const localRaw = normalized.slice(matchedCode.length);
  const local = localRaw.replace(/[^0-9]/g, '');

  return { code: matchedCode, local };
};

const BASE_TABS_BY_ROLE = {
  USER: [
    { key: 'dashboard', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
    { key: 'explore', label: 'Jobs', icon: 'briefcase-outline', activeIcon: 'briefcase' },
    { key: 'create', label: '', icon: 'add', activeIcon: 'add' },
    { key: 'messages', label: 'Chats', icon: 'chatbubble-ellipses-outline', activeIcon: 'chatbubble-ellipses' },
    { key: 'settings', label: 'Settings', icon: 'settings-outline', activeIcon: 'settings' }
  ],
  ADMIN: [
    { key: 'dashboard', label: 'Overview', icon: 'grid-outline', activeIcon: 'grid' },
    { key: 'users', label: 'Users', icon: 'people-outline', activeIcon: 'people' },
    { key: 'create', label: '', icon: 'shield-checkmark-outline', activeIcon: 'shield-checkmark' },
    { key: 'messages', label: 'Reports', icon: 'alert-circle-outline', activeIcon: 'alert-circle' },
    { key: 'settings', label: 'Settings', icon: 'settings-outline', activeIcon: 'settings' }
  ]
};

export const getTabsByRoleAndMode = (role, mode) => {
  if (role === 'ADMIN') return BASE_TABS_BY_ROLE.ADMIN;
  const tabs = BASE_TABS_BY_ROLE.USER.map((tab) => ({ ...tab }));
  const exploreTab = tabs.find((tab) => tab.key === 'explore');
  const createTab = tabs.find((tab) => tab.key === 'create');
  const messagesTab = tabs.find((tab) => tab.key === 'messages');
  if (exploreTab) {
    exploreTab.label = mode === 'JOB_POSTER' ? 'My Jobs' : 'All Jobs';
  }
  if (createTab) {
    createTab.icon = mode === 'JOB_POSTER' ? 'add' : 'search-outline';
    createTab.activeIcon = mode === 'JOB_POSTER' ? 'add' : 'search';
  }
  if (messagesTab) {
    messagesTab.label = 'Chats';
    messagesTab.icon = 'chatbubble-ellipses-outline';
    messagesTab.activeIcon = 'chatbubble-ellipses';
  }
  return tabs;
};

export const getRoleLabel = (role, mode) =>
  role === 'ADMIN' ? 'Administrator' : mode === 'JOB_POSTER' ? 'User (Job Poster)' : 'User (Job Picker)';

export const getUserModeLabel = (role, mode) => (role === 'ADMIN' ? 'N/A' : mode || '-');

export const formatDateValue = (value) => (value ? value.toISOString().slice(0, 10) : '');

export const toNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const lngToPixelX = (lng, zoom) => {
  const worldSize = 256 * 2 ** zoom;
  return ((lng + 180) / 360) * worldSize;
};

export const latToPixelY = (lat, zoom) => {
  const worldSize = 256 * 2 ** zoom;
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  return worldSize / 2 - (worldSize * mercN) / (2 * Math.PI);
};

export const pixelXToLng = (x, zoom) => {
  const worldSize = 256 * 2 ** zoom;
  return (x / worldSize) * 360 - 180;
};

export const pixelYToLat = (y, zoom) => {
  const worldSize = 256 * 2 ** zoom;
  const n = Math.PI - (2 * Math.PI * y) / worldSize;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

export const getTouchDistance = (touches) => {
  if (!touches || touches.length < 2) return null;
  const a = touches[0];
  const b = touches[1];
  const dx = a.pageX - b.pageX;
  const dy = a.pageY - b.pageY;
  return Math.sqrt(dx * dx + dy * dy);
};

const createWebImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = (error) => reject(error);
    image.src = url;
  });

export const getWebCroppedDataUrl = async (imageSrc, pixelCrop, mimeType = 'image/jpeg') => {
  const image = await createWebImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Unable to initialize image crop canvas');
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return canvas.toDataURL(mimeType, 0.9);
};
