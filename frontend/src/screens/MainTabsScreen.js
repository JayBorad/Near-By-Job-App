import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPopup } from '../components/AnimatedPopup';
import { AdminListState } from '../components/AdminListState';
import {
  acceptApplication,
  rejectApplication,
  createCategory,
  createJob,
  applyToJob,
  getAllCategoriesAdmin,
  getAllJobs,
  getAllUsers,
  getApplicationsByJob,
  getChatConversations,
  getChatMessagesByJob,
  getMyReceivedReviews,
  getReceivedReviewsByUser,
  getMyApplications,
  getApprovedCategories,
  getMyCategories,
  createOrUpdateReview,
  updateCategoryStatus,
  updateCategoryAdmin,
  deleteCategoryAdmin,
  updateJob,
  updateUserAvatarByAdmin,
  updateUserByAdmin,
  updateProfile,
  updateProfileAvatar,
  deleteAllNotifications,
  deleteNotification,
  createReport,
  getMyReports,
  getAllReportsAdmin,
  getMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  updateReportStatus
} from '../services/authApi';
import { io } from 'socket.io-client';
import { COUNTRY_CODES } from '../constants/countryCodes';
import {
  createStyles,
  darkTheme,
  lightTheme,
  TAB_BAR_HEIGHT,
  TAB_BAR_SHADOW_SPACE,
  TOP_SAFE_PADDING
} from './mainTabs/styles';
import {
  AvatarView,
  CategoryStatusBadge,
  JobLocationCard,
  PageCard,
  SettingsOption
} from './mainTabs/components/SharedBlocks';
import {
  clamp,
  formatDateValue,
  getPhoneRule,
  getRoleLabel,
  getTabsByRoleAndMode,
  getTouchDistance,
  getUserModeLabel,
  getWebCroppedDataUrl,
  latToPixelY,
  lngToPixelX,
  pixelXToLng,
  pixelYToLat,
  splitPhoneByCountryCode,
  toNumberOrNull
} from './mainTabs/utils';
import { PageContent } from './mainTabs/tabs/PageContent';
import { NotificationsPage } from './mainTabs/tabScreens';

const DEFAULT_AVATAR_URL = null;
const THEME_MODE_KEY = 'app_theme_mode';
const WebCropper = Platform.OS === 'web' ? require('react-easy-crop').default : null;
const TILE_SIZE = 256;
const STATIC_AVATARS = [
  'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=Sky',
  'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=Milo',
  'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=Ava',
  'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=Kai',
  'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=Noah',
  'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=Luna'
];
const ADMIN_EMPTY_ANIMATION = require('../../assets/lottie/no-result-found.json');
const SOCKET_BASE_URL = (Platform.OS === 'web'
  ? (process.env.EXPO_PUBLIC_API_BASE_URL_WEB || 'http://localhost:8000/api/v1')
  : (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.31.157:8000/api/v1')
).replace(/\/api\/v1\/?$/, '');

const formatChatTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
};

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const formatChatDayLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diff = Math.round((today.getTime() - target.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
};

const getNotificationIconName = (notification) => {
  if (notification?.icon) return notification.icon;
  const type = String(notification?.type || '').toUpperCase();
  if (type === 'JOB_APPLIED') return 'briefcase-outline';
  if (type === 'APPLICATION_ACCEPTED') return 'checkmark-circle';
  if (type === 'APPLICATION_REJECTED') return 'close-circle';
  if (type === 'JOB_UPDATED') return 'create-outline';
  if (type === 'JOB_CANCELLED') return 'alert-circle';
  if (type === 'ADMIN_JOB_UPDATED') return 'shield-checkmark-outline';
  if (type === 'CHAT_MESSAGE') return 'chatbubble-ellipses-outline';
  if (type === 'CATEGORY_SUBMITTED') return 'layers-outline';
  if (type === 'CATEGORY_STATUS_UPDATED') return 'alert-circle-outline';
  return 'notifications';
};

const isUuidValue = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));

export function MainTabsScreen({ user, token, onUserUpdated, onLogout }) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const initialRole = user?.role || 'USER';
  const initialMode = user?.userMode || 'JOB_PICKER';
  const initialTabs = getTabsByRoleAndMode(initialRole, initialMode);
  const [activeTab, setActiveTab] = useState(initialTabs[0]?.key || 'dashboard');
  const [themeMode, setThemeMode] = useState('light');
  const [settingsPage, setSettingsPage] = useState('main');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showAvatarOptions, setShowAvatarOptions] = useState(false);
  const [showAvatarList, setShowAvatarList] = useState(false);
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);
  const [jobForm, setJobForm] = useState({
    title: '',
    description: '',
    requiredWorkers: '1',
    categoryId: '',
    budget: '',
    budgetType: 'TOTAL',
    jobType: 'ONE_TIME',
    workMode: 'ONSITE',
    locationLink: '',
    address: '',
    status: 'OPEN',
    dueDate: '',
    latitude: null,
    longitude: null
  });
  const [showWebCropper, setShowWebCropper] = useState(false);
  const [webCropSource, setWebCropSource] = useState('');
  const [webCropMimeType, setWebCropMimeType] = useState('image/jpeg');
  const [webCrop, setWebCrop] = useState({ x: 0, y: 0 });
  const [webZoom, setWebZoom] = useState(1);
  const [webCroppedPixels, setWebCroppedPixels] = useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingMode, setIsChangingMode] = useState(false);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [isMyJobsLoading, setIsMyJobsLoading] = useState(false);
  const [myJobs, setMyJobs] = useState([]);
  const [pickerJobs, setPickerJobs] = useState([]);
  const [isPickerJobsLoading, setIsPickerJobsLoading] = useState(false);
  const [myApplications, setMyApplications] = useState([]);
  const [isMyApplicationsLoading, setIsMyApplicationsLoading] = useState(false);
  const [myReceivedReviews, setMyReceivedReviews] = useState(null);
  const [isMyReceivedReviewsLoading, setIsMyReceivedReviewsLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [isReportsLoading, setIsReportsLoading] = useState(false);
  const [adminReports, setAdminReports] = useState([]);
  const [isAdminReportsLoading, setIsAdminReportsLoading] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isUpdatingMyJobStatus, setIsUpdatingMyJobStatus] = useState(false);
  const [isApplyingJob, setIsApplyingJob] = useState(false);
  const [selectedMyJob, setSelectedMyJob] = useState(null);
  const [myJobsPage, setMyJobsPage] = useState('list');
  const [pickerExplorePage, setPickerExplorePage] = useState('jobs');
  const [selectedMyJobApplications, setSelectedMyJobApplications] = useState([]);
  const [isSelectedMyJobApplicationsLoading, setIsSelectedMyJobApplicationsLoading] = useState(false);
  const [isUpdatingJobApplicationStatus, setIsUpdatingJobApplicationStatus] = useState(false);
  const [showEditJobModal, setShowEditJobModal] = useState(false);
  const [showEditMapPicker, setShowEditMapPicker] = useState(false);
  const [showEditCategoryPicker, setShowEditCategoryPicker] = useState(false);
  const [showEditDueDatePicker, setShowEditDueDatePicker] = useState(false);
  const [editingJobId, setEditingJobId] = useState(null);
  const [isUpdatingJob, setIsUpdatingJob] = useState(false);
  const [editMapZoom, setEditMapZoom] = useState(13);
  const [editMapCanvasLayout, setEditMapCanvasLayout] = useState({ width: 0, height: 0 });
  const [editDraftCoordinate, setEditDraftCoordinate] = useState({ latitude: 22.3039, longitude: 70.8022 });
  const editPinchStartDistanceRef = useRef(null);
  const editPinchStartZoomRef = useRef(editMapZoom);
  const editIsPinchingRef = useRef(false);
  const editSuppressNextTapRef = useRef(false);
  const [editJobForm, setEditJobForm] = useState({
    title: '',
    description: '',
    requiredWorkers: '1',
    categoryId: '',
    budget: '',
    budgetType: 'TOTAL',
    jobType: 'ONE_TIME',
    workMode: 'ONSITE',
    latitude: '',
    longitude: '',
    address: '',
    status: 'OPEN',
    dueDate: ''
  });
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const [hasFetchedCategoriesOnce, setHasFetchedCategoriesOnce] = useState(false);
  const [categoriesTab, setCategoriesTab] = useState('all');
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [allCategories, setAllCategories] = useState([]);
  const [myCategories, setMyCategories] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminSelectedUserId, setAdminSelectedUserId] = useState(null);
  const [adminUserDetailsReturnTarget, setAdminUserDetailsReturnTarget] = useState(null);
  const [adminReturnJobId, setAdminReturnJobId] = useState(null);
  const [isAdminUsersLoading, setIsAdminUsersLoading] = useState(false);
  const [adminJobs, setAdminJobs] = useState([]);
  const [adminCategories, setAdminCategories] = useState([]);
  const [isAdminPanelLoading, setIsAdminPanelLoading] = useState(false);
  const [adminCategorySearch, setAdminCategorySearch] = useState('');
  const [debouncedAdminCategorySearch, setDebouncedAdminCategorySearch] = useState('');
  const [adminCategoryFilter, setAdminCategoryFilter] = useState('ALL');
  const [adminCategoryDraft, setAdminCategoryDraft] = useState({ name: '', description: '' });
  const [userCategoryDraft, setUserCategoryDraft] = useState({ name: '', description: '' });
  const [showUserCategoryCreateModal, setShowUserCategoryCreateModal] = useState(false);
  const [isCreatingUserCategory, setIsCreatingUserCategory] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);
  const [showNotificationsPage, setShowNotificationsPage] = useState(false);
  const [notificationPingKey, setNotificationPingKey] = useState(0);
  const [activeToastNotification, setActiveToastNotification] = useState(null);
  const toastTranslateY = useRef(new Animated.Value(-110)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimerRef = useRef(null);
  const [localUser, setLocalUser] = useState(user || null);
  const [popup, setPopup] = useState({ visible: false, title: '', message: '', type: 'error' });
  const [showChatModal, setShowChatModal] = useState(false);
  const [activeChatSession, setActiveChatSession] = useState(null);
  const [chatConversations, setChatConversations] = useState([]);
  const [isChatConversationsLoading, setIsChatConversationsLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatMessagesLoading, setIsChatMessagesLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isSendingChatMessage, setIsSendingChatMessage] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isPeerOnline, setIsPeerOnline] = useState(false);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [typingDots, setTypingDots] = useState('.');
  const socketRef = useRef(null);
  const chatScrollRef = useRef(null);
  const typingStopTimerRef = useRef(null);
  const peerOnlinePollRef = useRef(null);
  const conversationRefreshTimerRef = useRef(null);
  const unreadNotificationCount = useMemo(
    () =>
      notifications.filter(
        (item) => !item?.isRead && String(item?.type || '').toUpperCase() !== 'CHAT_MESSAGE'
      ).length,
    [notifications]
  );
  const activeChatSessionRef = useRef(null);
  const localUserIdRef = useRef(localUser?.id || null);
  const contentFade = useRef(new Animated.Value(1)).current;
  const contentShift = useRef(new Animated.Value(0)).current;
  const ensureSocketConnected = (timeoutMs = 8000) =>
    new Promise((resolve, reject) => {
      const socket = socketRef.current;
      if (!socket) {
        reject(new Error('Chat service is unavailable right now. Please try again.'));
        return;
      }
      if (socket.connected) {
        setIsSocketConnected(true);
        resolve(true);
        return;
      }

      let settled = false;
      const cleanup = () => {
        socket.off('connect', onConnect);
        socket.off('connect_error', onConnectError);
        clearTimeout(timer);
      };
      const onConnect = () => {
        if (settled) return;
        settled = true;
        cleanup();
        setIsSocketConnected(true);
        resolve(true);
      };
      const onConnectError = (error) => {
        if (settled) return;
        settled = true;
        cleanup();
        setIsSocketConnected(false);
        reject(new Error(error?.message || 'Chat is still connecting. Please try again.'));
      };
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        setIsSocketConnected(false);
        reject(new Error('Chat connection timed out. Please check your internet and try again.'));
      }, timeoutMs);

      socket.on('connect', onConnect);
      socket.on('connect_error', onConnectError);
      try {
        socket.connect();
      } catch (_error) {
        onConnectError(_error);
      }
    });
  const emitWithAck = (eventName, payload, timeoutMs = 8000) =>
    new Promise((resolve, reject) => {
      const socket = socketRef.current;
      if (!socket || !socket.connected) {
        reject(new Error('Chat is connecting. Please try again.'));
        return;
      }

      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error('Request timed out. Please try again.'));
      }, timeoutMs);

      socket.emit(eventName, payload, (ack) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (ack?.success) {
          resolve(ack.data);
          return;
        }
        reject(new Error(ack?.message || 'Request failed'));
      });
    });
  const chatRenderItems = useMemo(() => {
    const items = [];
    let previousDayKey = '';
    chatMessages.forEach((message) => {
      const parsed = new Date(message?.createdAt || '');
      const dayKey = Number.isNaN(parsed.getTime()) ? '' : `${parsed.getFullYear()}-${parsed.getMonth()}-${parsed.getDate()}`;
      if (dayKey && dayKey !== previousDayKey) {
        previousDayKey = dayKey;
        items.push({
          type: 'day',
          key: `day-${dayKey}`,
          label: formatChatDayLabel(parsed)
        });
      }
      items.push({
        type: 'message',
        key: `message-${message.id}`,
        message
      });
    });
    return items;
  }, [chatMessages]);

  useEffect(() => {
    setLocalUser(user || null);
  }, [user]);

  const userRole = localUser?.role || 'USER';
  const userMode = localUser?.userMode || 'JOB_PICKER';
  const visibleTabs = useMemo(() => getTabsByRoleAndMode(userRole, userMode), [userRole, userMode]);
  const totalUnreadChatCount = useMemo(
    () => chatConversations.reduce((sum, item) => sum + Number(item?.unreadCount || 0), 0),
    [chatConversations]
  );

  useEffect(() => {
    if (!visibleTabs.find((tab) => tab.key === activeTab)) {
      setActiveTab(visibleTabs[0]?.key || 'dashboard');
    }
  }, [activeTab, visibleTabs]);

  useEffect(() => {
    if (!showNotificationsPage) return;
    setShowNotificationsPage(false);
    // only when tab actually changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    activeChatSessionRef.current = activeChatSession;
  }, [activeChatSession]);

  useEffect(() => {
    localUserIdRef.current = localUser?.id || null;
  }, [localUser?.id]);

  useEffect(() => {
    const loadThemeMode = async () => {
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const saved = window.localStorage.getItem(THEME_MODE_KEY);
          if (saved === 'light' || saved === 'dark') {
            setThemeMode(saved);
          }
          return;
        }

        const saved = await AsyncStorage.getItem(THEME_MODE_KEY);
        if (saved === 'light' || saved === 'dark') {
          setThemeMode(saved);
        }
      } catch (_error) {
        // Keep default theme on storage read failure.
      }
    };

    loadThemeMode();
  }, []);

  useEffect(() => {
    const saveThemeMode = async () => {
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.localStorage.setItem(THEME_MODE_KEY, themeMode);
          return;
        }
        await AsyncStorage.setItem(THEME_MODE_KEY, themeMode);
      } catch (_error) {
        // Ignore storage write errors.
      }
    };

    saveThemeMode();
  }, [themeMode]);

  const colors = themeMode === 'dark' ? darkTheme : lightTheme;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const iconScales = useMemo(() => {
    const values = {};
    visibleTabs.forEach((tab) => {
      values[tab.key] = new Animated.Value(1);
    });
    return values;
  }, [visibleTabs]);

  const iconLift = useMemo(() => {
    const values = {};
    visibleTabs.forEach((tab) => {
      values[tab.key] = new Animated.Value(0);
    });
    return values;
  }, [visibleTabs]);

  const showPopup = (title, message, type = 'error') => {
    setPopup({
      visible: true,
      title,
      message,
      type
    });
  };

  const approvedCategoryOptions = useMemo(
    () => allCategories.filter((item) => {
      const status = String(item?.status || '').toUpperCase();
      return !status || status === 'APPROVED';
    }),
    [allCategories]
  );

  const getEditMapTopLeftWorld = () => {
    const width = editMapCanvasLayout.width || 1;
    const height = editMapCanvasLayout.height || 1;
    const centerX = lngToPixelX(editDraftCoordinate.longitude, editMapZoom);
    const centerY = latToPixelY(editDraftCoordinate.latitude, editMapZoom);
    return { topLeftWorldX: centerX - width / 2, topLeftWorldY: centerY - height / 2, width, height };
  };

  const editMapTiles = useMemo(() => {
    if (!editMapCanvasLayout.width || !editMapCanvasLayout.height) return [];
    const { topLeftWorldX, topLeftWorldY, width, height } = getEditMapTopLeftWorld();
    const startTileX = Math.floor(topLeftWorldX / TILE_SIZE);
    const startTileY = Math.floor(topLeftWorldY / TILE_SIZE);
    const endTileX = Math.floor((topLeftWorldX + width) / TILE_SIZE);
    const endTileY = Math.floor((topLeftWorldY + height) / TILE_SIZE);
    const limit = 2 ** editMapZoom;
    const tiles = [];

    for (let tileX = startTileX; tileX <= endTileX; tileX += 1) {
      for (let tileY = startTileY; tileY <= endTileY; tileY += 1) {
        if (tileY < 0 || tileY >= limit) continue;
        const wrappedX = ((tileX % limit) + limit) % limit;
        tiles.push({
          key: `edit-${tileX}-${tileY}-${editMapZoom}`,
          left: tileX * TILE_SIZE - topLeftWorldX,
          top: tileY * TILE_SIZE - topLeftWorldY,
          url: `https://tile.openstreetmap.org/${editMapZoom}/${wrappedX}/${tileY}.png`
        });
      }
    }
    return tiles;
  }, [editMapCanvasLayout.width, editMapCanvasLayout.height, editDraftCoordinate.latitude, editDraftCoordinate.longitude, editMapZoom]);

  const applyAvatarUpdate = async ({ avatarData, avatarUrl, resetAvatar }) => {
    if (!token) {
      showPopup('Session Expired', 'Please login again to update your profile image.');
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const response = await updateProfileAvatar({
        token,
        ...(avatarData ? { avatarData } : {}),
        ...(avatarUrl ? { avatarUrl } : {}),
        ...(resetAvatar ? { resetAvatar: true } : {})
      });

      const updatedUser = response?.data || null;
      if (updatedUser) {
        setLocalUser(updatedUser);
        if (onUserUpdated) {
          await onUserUpdated(updatedUser);
        }
      }

      showPopup('Profile Updated', 'Your profile image has been updated successfully.', 'success');
    } catch (error) {
      showPopup('Update Failed', error?.message || 'Unable to update profile image right now.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const saveWebCroppedImage = async () => {
    if (!webCropSource || !webCroppedPixels) {
      showPopup('Crop Failed', 'Please adjust crop area and try again.');
      return;
    }

    try {
      const dataUrl = await getWebCroppedDataUrl(webCropSource, webCroppedPixels, webCropMimeType);
      setShowWebCropper(false);
      setWebCropSource('');
      await applyAvatarUpdate({ avatarData: dataUrl });
    } catch (_error) {
      showPopup('Crop Failed', 'Unable to crop selected image. Please try another image.');
    }
  };

  const selectFromDevice = async () => {
    setShowAvatarOptions(false);
    try {
      await new Promise((resolve) => setTimeout(resolve, 120));

      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          showPopup('Permission Needed', 'Please allow photo library access to update your profile image.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
        base64: true
      });

      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];

      if (Platform.OS === 'web') {
        setWebCropSource(asset.uri);
        setWebCropMimeType((asset.mimeType || 'image/jpeg').toLowerCase());
        setWebCrop({ x: 0, y: 0 });
        setWebZoom(1);
        setWebCroppedPixels(null);
        setShowWebCropper(true);
        return;
      }

      if (!asset.base64) {
        showPopup('Unsupported Image', 'Please pick another image. Base64 data was not available.');
        return;
      }

      const normalizedMimeType = (asset.mimeType || 'image/jpeg').toLowerCase();
      const avatarData = `data:${normalizedMimeType};base64,${asset.base64}`;
      await applyAvatarUpdate({ avatarData });
    } catch (error) {
      showPopup('Picker Failed', error?.message || 'Unable to open image picker.');
    }
  };

  const takePhoto = async () => {
    setShowAvatarOptions(false);
    try {
      await new Promise((resolve) => setTimeout(resolve, 120));

      if (Platform.OS === 'web') {
        showPopup('Use Device Camera', 'On web, please use mobile app camera or choose from device.');
        return;
      }

      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          showPopup('Permission Needed', 'Please allow camera access to capture profile image.');
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
        base64: true
      });

      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.base64) {
        showPopup('Unsupported Image', 'Unable to process captured image. Please try again.');
        return;
      }

      const normalizedMimeType = (asset.mimeType || 'image/jpeg').toLowerCase();
      const avatarData = `data:${normalizedMimeType};base64,${asset.base64}`;
      await applyAvatarUpdate({ avatarData });
    } catch (error) {
      showPopup('Camera Failed', error?.message || 'Unable to open camera.');
    }
  };

  const chooseStaticAvatar = (avatarUrl) => {
    setShowAvatarList(false);
    applyAvatarUpdate({ avatarUrl });
  };

  const resetAvatar = () => {
    setShowAvatarOptions(false);
    applyAvatarUpdate({ resetAvatar: true });
  };

  const saveProfileDetails = async (form) => {
    if (!token) {
      showPopup('Session Expired', 'Please login again to update profile.');
      return;
    }
    if (!String(form.phone || '').trim()) {
      showPopup('Validation Error', 'Phone number is required.', 'warning');
      return;
    }
    const { code: selectedCode, local: digits } = splitPhoneByCountryCode(form.phone, '+91');
    if (!digits) {
      showPopup('Validation Error', 'Please enter a valid phone number.', 'warning');
      return;
    }
    const phoneRule = getPhoneRule(selectedCode);
    if (phoneRule.exact && digits.length !== phoneRule.exact) {
      showPopup(
        'Validation Error',
        `${selectedCode} mobile numbers must be exactly ${phoneRule.exact} digits.`,
        'warning'
      );
      return;
    }
    if (!phoneRule.exact) {
      if (phoneRule.min && digits.length < phoneRule.min) {
        showPopup('Validation Error', `${selectedCode} mobile number is too short.`, 'warning');
        return;
      }
      if (phoneRule.max && digits.length > phoneRule.max) {
        showPopup('Validation Error', `${selectedCode} mobile number is too long.`, 'warning');
        return;
      }
    }

    try {
      setIsSavingProfile(true);
      const payload = {
        name: String(form.name || '').trim(),
        username: String(form.username || '').trim().toLowerCase(),
        phone: String(form.phone || '').trim(),
        age: form.age ? Number(form.age) : null,
        gender: form.gender || null,
        userMode: form.userMode || 'JOB_PICKER',
        address: String(form.address || '').trim(),
        bio: String(form.bio || '').trim()
      };

      const response = await updateProfile({ token, payload });
      const updatedUser = response?.data || null;
      if (updatedUser) {
        setLocalUser(updatedUser);
        if (onUserUpdated) {
          await onUserUpdated(updatedUser);
        }
      }
      showPopup('Profile Saved', 'Your profile details have been updated.', 'success');
    } catch (error) {
      showPopup('Update Failed', error?.message || 'Unable to update profile right now.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const changeUserMode = async (nextMode) => {
    if (!token) {
      showPopup('Session Expired', 'Please login again to update mode.');
      return;
    }
    if (userRole === 'ADMIN') return;

    const normalizedMode = String(nextMode || '').toUpperCase();
    if (!['JOB_PICKER', 'JOB_POSTER'].includes(normalizedMode)) return;
    if (userMode === normalizedMode) return;

    try {
      setIsChangingMode(true);
      const response = await updateProfile({
        token,
        payload: { userMode: normalizedMode }
      });
      const updatedUser = response?.data || null;
      if (updatedUser) {
        setLocalUser(updatedUser);
        if (onUserUpdated) {
          await onUserUpdated(updatedUser);
        }
      }
      showPopup('Mode Updated', `You are now using ${normalizedMode === 'JOB_POSTER' ? 'Job Poster' : 'Job Picker'} mode.`, 'success');
      switchSettingsPage('main');
    } catch (error) {
      showPopup('Update Failed', error?.message || 'Unable to switch mode right now.');
    } finally {
      setIsChangingMode(false);
    }
  };

  const fetchCategories = async ({ forceLoader = false, targetTab = categoriesTab, statusOverride } = {}) => {
    if (!token) return;
    const searchText = categorySearch.trim();
    const hasCurrentTabData = targetTab === 'all' ? allCategories.length > 0 : myCategories.length > 0;
    const shouldShowLoader = forceLoader || (!hasFetchedCategoriesOnce && !hasCurrentTabData);

    try {
      if (shouldShowLoader) {
        setIsCategoryLoading(true);
      }

      if (targetTab === 'all') {
        const approvedRes = await getApprovedCategories({ token, q: searchText || undefined });
        setAllCategories(approvedRes?.data || []);
      } else {
        const effectiveStatus = statusOverride ?? categoryFilter;
        const myRes = await getMyCategories({
          token,
          q: searchText || undefined,
          status: effectiveStatus !== 'ALL' ? effectiveStatus : undefined
        });
        setMyCategories(myRes?.data || []);
      }
      setHasFetchedCategoriesOnce(true);
    } catch (error) {
      showPopup('Categories Failed', error?.message || 'Unable to load categories.', 'error');
    } finally {
      if (shouldShowLoader) {
        setIsCategoryLoading(false);
      }
    }
  };

  const fetchMyJobs = async ({ forceLoader = false } = {}) => {
    if (!token || userRole !== 'USER') return [];
    try {
      if (forceLoader || !myJobs.length) {
        setIsMyJobsLoading(true);
      }
      const response = await getAllJobs({ token, page: 1, limit: 200, status: 'ALL' });
      const allJobs = response?.data?.jobs || [];
      const ownJobs = allJobs.filter((item) => item?.owner?.id === localUser?.id);
      const ownJobsWithApplications = await Promise.all(
        ownJobs.map(async (job) => {
          try {
            const appRes = await getApplicationsByJob({ token, jobId: job.id });
            const applications = Array.isArray(appRes?.data) ? appRes.data : [];
            const acceptedCount = applications.filter(
              (application) => String(application?.status || '').toUpperCase() === 'ACCEPTED'
            ).length;
            const pendingCount = applications.filter(
              (application) => String(application?.status || '').toUpperCase() === 'PENDING'
            ).length;
            return {
              ...job,
              applicationCount: applications.length,
              acceptedApplicationCount: acceptedCount,
              pendingApplicationCount: pendingCount
            };
          } catch (_error) {
            return {
              ...job,
              applicationCount: 0,
              acceptedApplicationCount: 0,
              pendingApplicationCount: 0
            };
          }
        })
      );
      setMyJobs(ownJobsWithApplications);
      setSelectedMyJob((prev) => (prev ? ownJobsWithApplications.find((item) => item.id === prev.id) || null : null));
      return ownJobsWithApplications;
    } catch (error) {
      showPopup('Jobs Failed', error?.message || 'Unable to load your jobs.', 'error');
      return [];
    } finally {
      setIsMyJobsLoading(false);
    }
  };

  const fetchApplicationsForMySelectedJob = async (jobId, { forceLoader = false } = {}) => {
    if (!token || !jobId) return;
    try {
      if (forceLoader || !selectedMyJobApplications.length) {
        setIsSelectedMyJobApplicationsLoading(true);
      }
      const response = await getApplicationsByJob({ token, jobId });
      setSelectedMyJobApplications(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      showPopup('Applications Failed', error?.message || 'Unable to load job applications.', 'error');
    } finally {
      setIsSelectedMyJobApplicationsLoading(false);
    }
  };

  const openMyJobDetailPage = async (job) => {
    if (!job?.id) return;
    setSelectedMyJob(job);
    setMyJobsPage('detail');
    await fetchApplicationsForMySelectedJob(job.id, { forceLoader: true });
  };

  const backFromMyJobDetailPage = () => {
    setMyJobsPage('list');
    setSelectedMyJobApplications([]);
    setSelectedMyJob(null);
  };

  const updateSelectedJobApplicationStatus = async (applicationId, status) => {
    if (!token || !applicationId || !selectedMyJob?.id) return;
    try {
      setIsUpdatingJobApplicationStatus(true);
      if (status === 'ACCEPTED') {
        await acceptApplication({ token, applicationId });
      } else {
        await rejectApplication({ token, applicationId });
      }
      showPopup('Application Updated', `Application ${status.toLowerCase()} successfully.`, 'success');
      await Promise.all([
        fetchApplicationsForMySelectedJob(selectedMyJob.id, { forceLoader: false }),
        fetchMyJobs({ forceLoader: false })
      ]);
    } catch (error) {
      showPopup('Update Failed', error?.message || 'Unable to update application.', 'error');
    } finally {
      setIsUpdatingJobApplicationStatus(false);
    }
  };

  const fetchPickerJobs = async ({ forceLoader = false } = {}) => {
    if (!token || userRole !== 'USER' || userMode !== 'JOB_PICKER') return;
    try {
      if (forceLoader || !pickerJobs.length) {
        setIsPickerJobsLoading(true);
      }
      const response = await getAllJobs({ token, page: 1, limit: 200, status: 'ALL' });
      const jobs = response?.data?.jobs || [];
      setPickerJobs(
        jobs.filter((item) => {
          const status = String(item?.status || '').toUpperCase();
          return item?.createdBy !== localUser?.id && (status === 'OPEN' || status === 'IN_PROGRESS');
        })
      );
    } catch (error) {
      showPopup('Jobs Failed', error?.message || 'Unable to load jobs.', 'error');
    } finally {
      setIsPickerJobsLoading(false);
    }
  };

  const fetchMyApplications = async ({ forceLoader = false } = {}) => {
    if (!token || userRole !== 'USER') return;
    try {
      if (forceLoader || !myApplications.length) {
        setIsMyApplicationsLoading(true);
      }
      const response = await getMyApplications({ token });
      setMyApplications(response?.data || []);
    } catch (error) {
      showPopup('Applications Failed', error?.message || 'Unable to load applications.', 'error');
    } finally {
      setIsMyApplicationsLoading(false);
    }
  };

  const showNotificationToast = (notification) => {
    if (!notification?.id) return;
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }

    setActiveToastNotification(notification);
    toastTranslateY.setValue(-110);
    toastOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(toastTranslateY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();

    toastTimerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastTranslateY, {
          toValue: -110,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true
        }),
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true
        })
      ]).start(() => setActiveToastNotification(null));
      toastTimerRef.current = null;
    }, 3200);
  };

  const fetchNotifications = async ({ forceLoader = false, silentError = false } = {}) => {
    if (!token || !['USER', 'ADMIN'].includes(userRole)) return;
    try {
      if (forceLoader || !notifications.length) {
        setIsNotificationsLoading(true);
      }
      const response = await getMyNotifications({ token });
      setNotifications(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      if (!silentError) {
        showPopup('Notifications Failed', error?.message || 'Unable to load notifications.', 'error');
      }
    } finally {
      setIsNotificationsLoading(false);
    }
  };

  const navigateFromNotification = async (notification) => {
    const actionPage = String(notification?.actionPage || '').toUpperCase();
    const jobId = notification?.jobId || null;

    if (actionPage === 'JOB_DETAILS') {
      if (userRole === 'ADMIN') {
        setActiveTab('create');
        await fetchAdminJobs({ forceLoader: true });
        return;
      }
      if (userRole === 'USER' && userMode === 'JOB_POSTER') {
        setActiveTab('explore');
        const ownJobs = await fetchMyJobs({ forceLoader: false });
        const matched = ownJobs.find((item) => item.id === jobId);
        if (matched) {
          await openMyJobDetailPage(matched);
          return;
        }
      }
      return;
    }

    if (actionPage === 'MY_APPLICATIONS') {
      if (userRole === 'USER' && userMode === 'JOB_PICKER') {
        setActiveTab('explore');
        setPickerExplorePage('applications');
        await fetchMyApplications({ forceLoader: true });
      }
      return;
    }

    if (actionPage === 'MESSAGES') {
      setActiveTab('messages');
      if (userRole !== 'USER') return;
      const senderId = notification?.applicationId || null;
      const conversations = await fetchChatConversations({ forceLoader: true, silentError: true });
      const matched = (Array.isArray(conversations) ? conversations : []).find(
        (item) => item?.job?.id === jobId && (!senderId || item?.peer?.id === senderId)
      );

      if (matched?.job?.id && matched?.peer?.id) {
        await openChatSession({ job: matched.job, peer: matched.peer });
        return;
      }

      showPopup('Chat Not Found', 'This chat is not available right now.', 'warning');
      return;
    }

    if (actionPage === 'ADMIN_CATEGORIES') {
      if (userRole === 'ADMIN') {
        setActiveTab('settings');
        setSettingsPage('categories');
        setAdminCategoryFilter('PENDING');
        await fetchAdminCategories({ forceLoader: true, statusOverride: 'PENDING' });
      }
      return;
    }

    if (actionPage === 'MY_CATEGORIES') {
      if (userRole === 'USER') {
        setActiveTab('settings');
        setSettingsPage('categories');
        setCategoriesTab('mine');
        setCategoryFilter('ALL');
        await fetchCategories({ forceLoader: true, targetTab: 'mine', statusOverride: 'ALL' });
      }
    }
  };

  const readNotificationById = async (notificationId, { silent = false } = {}) => {
    if (!notificationId) return;
    if (!isUuidValue(notificationId) || !token) {
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId
            ? { ...item, isRead: true, readAt: item?.readAt || new Date().toISOString() }
            : item
        )
      );
      return;
    }
    try {
      const response = await markNotificationAsRead({ token, notificationId });
      const updated = response?.data;
      setNotifications((prev) => prev.map((item) => (item.id === notificationId ? { ...item, ...(updated || {}), isRead: true } : item)));
    } catch (error) {
      if (!silent) {
        showPopup('Read Failed', error?.message || 'Unable to mark notification as read.', 'error');
      }
    }
  };

  const openNotification = async (notification) => {
    if (!notification?.id) return;
    if (!notification?.isRead) {
      await readNotificationById(notification.id, { silent: true });
    }
    await navigateFromNotification(notification);
  };

  const openNotificationFromPage = async (notification) => {
    await openNotification(notification);
    setShowNotificationsPage(false);
  };

  const deleteNotificationById = async (notificationId) => {
    if (!notificationId) return;
    if (!isUuidValue(notificationId) || !token) {
      setNotifications((prev) => prev.filter((item) => item.id !== notificationId));
      return;
    }
    try {
      await deleteNotification({ token, notificationId });
      setNotifications((prev) => prev.filter((item) => item.id !== notificationId));
    } catch (error) {
      showPopup('Delete Failed', error?.message || 'Unable to delete notification.', 'error');
    }
  };

  const readAllNotifications = async () => {
    if (!token) return;
    try {
      await markAllNotificationsAsRead({ token });
      const nowIso = new Date().toISOString();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true, readAt: item?.readAt || nowIso })));
    } catch (error) {
      showPopup('Read Failed', error?.message || 'Unable to mark all as read.', 'error');
    }
  };

  const deleteAllNotificationsFromList = async () => {
    if (!token) return;
    try {
      await deleteAllNotifications({ token });
      setNotifications([]);
    } catch (error) {
      showPopup('Delete Failed', error?.message || 'Unable to delete all notifications.', 'error');
    }
  };

  const openNotificationsPage = async () => {
    setShowNotificationsPage(true);
    await fetchNotifications({ forceLoader: true });
  };

  const closeNotificationsPageToHome = () => {
    setShowNotificationsPage(false);
    switchTab('dashboard');
  };

  const fetchMyReceivedReviews = async ({ forceLoader = false } = {}) => {
    if (!token || userRole !== 'USER') return;
    try {
      if (forceLoader || !myReceivedReviews) {
        setIsMyReceivedReviewsLoading(true);
      }
      const response = await getMyReceivedReviews({ token });
      setMyReceivedReviews(response?.data || null);
      if (response?.data?.summary) {
        setLocalUser((prev) =>
          prev
            ? {
                ...prev,
                ratingSummary: response.data.summary
              }
            : prev
        );
      }
    } catch (error) {
      showPopup('Reviews Failed', error?.message || 'Unable to load your reviews.', 'error');
    } finally {
      setIsMyReceivedReviewsLoading(false);
    }
  };

  const fetchReports = async ({ forceLoader = false } = {}) => {
    if (!token || userRole !== 'USER') return;
    try {
      if (forceLoader || !reports.length) {
        setIsReportsLoading(true);
      }
      const response = await getMyReports({ token });
      setReports(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      showPopup('Reports Failed', error?.message || 'Unable to load reports.', 'error');
    } finally {
      setIsReportsLoading(false);
    }
  };

  const submitReport = async ({ title, description, imageData }) => {
    if (!token || userRole !== 'USER') return false;
    try {
      await createReport({
        token,
        payload: {
          title: String(title || '').trim(),
          description: String(description || '').trim(),
          ...(imageData ? { imageData } : {})
        }
      });
      await fetchReports({ forceLoader: false });
      showPopup('Report Submitted', 'Your report has been submitted and is pending review.', 'success');
      return true;
    } catch (error) {
      showPopup('Submit Failed', error?.message || 'Unable to submit report.', 'error');
      return false;
    }
  };

  const fetchAdminReports = async ({ forceLoader = false, status = 'ALL', q = '' } = {}) => {
    if (!token || userRole !== 'ADMIN') return;
    try {
      if (forceLoader || !adminReports.length) {
        setIsAdminReportsLoading(true);
      }
      const response = await getAllReportsAdmin({ token, status, q, page: 1, limit: 100 });
      const records = response?.data?.reports || [];
      setAdminReports(Array.isArray(records) ? records : []);
    } catch (error) {
      showPopup('Reports Failed', error?.message || 'Unable to load reports.', 'error');
    } finally {
      setIsAdminReportsLoading(false);
    }
  };

  const changeAdminReportStatus = async (reportId, nextStatus) => {
    if (!token || userRole !== 'ADMIN' || !reportId) return false;
    const normalizedStatus = String(nextStatus || '').trim().toUpperCase();
    if (!['PENDING', 'IN_REVIEW', 'RESOLVED', 'REJECTED'].includes(normalizedStatus)) return false;
    try {
      const response = await updateReportStatus({ token, reportId, status: normalizedStatus });
      const updatedReport = response?.data;
      setAdminReports((prev) =>
        prev.map((item) =>
          item.id === reportId
            ? {
                ...item,
                ...(updatedReport || {}),
                status: updatedReport?.status || normalizedStatus
              }
            : item
        )
      );
      showPopup('Report Updated', `Report status changed to ${normalizedStatus.replace('_', ' ')}.`, 'success');
      return true;
    } catch (error) {
      showPopup('Update Failed', error?.message || 'Unable to update report status.', 'error');
      return false;
    }
  };

  const submitReviewForJobPicker = async ({ jobId, revieweeId, rating, comment }) => {
    if (!token) return;
    try {
      setIsSubmittingReview(true);
      await createOrUpdateReview({
        token,
        payload: {
          jobId,
          revieweeId,
          rating,
          comment: String(comment || '').trim()
        }
      });
      showPopup('Review Saved', 'Review submitted successfully.', 'success');
      if (selectedMyJob?.id) {
        await fetchApplicationsForMySelectedJob(selectedMyJob.id, { forceLoader: false });
      }
    } catch (error) {
      showPopup('Review Failed', error?.message || 'Unable to submit review.', 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const changeMyJobStatus = async (nextStatus) => {
    if (!token || !selectedMyJob?.id) return;
    const normalizedStatus = String(nextStatus || '').trim().toUpperCase();
    if (!['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(normalizedStatus)) return;
    if (String(selectedMyJob?.status || '').toUpperCase() === normalizedStatus) return;

    try {
      setIsUpdatingMyJobStatus(true);
      await updateJob({
        token,
        jobId: selectedMyJob.id,
        payload: { status: normalizedStatus }
      });
      showPopup('Status Updated', `Job status changed to ${normalizedStatus.replace('_', ' ')}.`, 'success');
      await Promise.all([
        fetchMyJobs({ forceLoader: false }),
        fetchApplicationsForMySelectedJob(selectedMyJob.id, { forceLoader: false })
      ]);
      setSelectedMyJob((prev) => (prev ? { ...prev, status: normalizedStatus } : prev));
    } catch (error) {
      showPopup('Update Failed', error?.message || 'Unable to update job status.', 'error');
    } finally {
      setIsUpdatingMyJobStatus(false);
    }
  };

  const changeAdminJobStatus = async (jobId, nextStatus) => {
    if (!token || userRole !== 'ADMIN' || !jobId) return false;
    const normalizedStatus = String(nextStatus || '').trim().toUpperCase();
    if (!['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(normalizedStatus)) return false;

    try {
      await updateJob({
        token,
        jobId,
        payload: { status: normalizedStatus }
      });
      showPopup('Status Updated', `Job status changed to ${normalizedStatus.replace('_', ' ')}.`, 'success');
      await fetchAdminJobs({ forceLoader: false });
      return true;
    } catch (error) {
      showPopup('Update Failed', error?.message || 'Unable to update job status.', 'error');
      return false;
    }
  };

  const handleApplyJob = async (jobId) => {
    if (!token || !jobId) return;
    try {
      setIsApplyingJob(true);
      await applyToJob({ token, jobId });
      showPopup('Applied', 'You picked this job successfully.', 'success');
      await fetchMyApplications({ forceLoader: false });
    } catch (error) {
      showPopup('Apply Failed', error?.message || 'Unable to pick this job.', 'error');
    } finally {
      setIsApplyingJob(false);
    }
  };

  const openPickerApplicationsPage = async () => {
    setPickerExplorePage('applications');
    await fetchMyApplications({ forceLoader: true });
  };

  const backFromPickerApplicationsPage = () => {
    setPickerExplorePage('jobs');
  };

  const ensureApprovedCategoriesLoaded = async () => {
    if (!token || allCategories.length) return;
    const approvedRes = await getApprovedCategories({ token });
    setAllCategories(approvedRes?.data || []);
  };

  const openEditJobModal = async (job) => {
    if (!job) return;
    try {
      await ensureApprovedCategoriesLoaded();
    } catch (_error) {
      // If categories fail to load, user can still edit remaining fields.
    }

    setEditingJobId(job.id);
    setEditJobForm({
      title: String(job.title || ''),
      description: String(job.description || ''),
      requiredWorkers: String(job.requiredWorkers || 1),
      categoryId: String(job.categoryId || ''),
      budget: String(job.budget || ''),
      budgetType: String(job.budgetType || 'TOTAL'),
      jobType: String(job.jobType || 'ONE_TIME'),
      workMode: String(job.workMode || 'ONSITE'),
      latitude: String(toNumberOrNull(job.latitude) ?? ''),
      longitude: String(toNumberOrNull(job.longitude) ?? ''),
      address: String(job.address || ''),
      status: String(job.status || 'OPEN'),
      dueDate: job?.dueDate ? String(job.dueDate).slice(0, 10) : ''
    });
    const latitude = toNumberOrNull(job.latitude) ?? 22.3039;
    const longitude = toNumberOrNull(job.longitude) ?? 70.8022;
    setEditDraftCoordinate({ latitude, longitude });
    setEditMapZoom(13);
    setShowEditCategoryPicker(false);
    setShowEditDueDatePicker(false);
    setShowEditJobModal(true);
  };

  const openEditMapPicker = () => {
    setShowEditCategoryPicker(false);
    setShowEditDueDatePicker(false);
    setShowEditJobModal(false);
    setTimeout(() => setShowEditMapPicker(true), 80);
  };

  const closeEditMapPicker = () => {
    setShowEditMapPicker(false);
    setTimeout(() => setShowEditJobModal(true), 80);
  };

  const editDueDateValue = useMemo(() => {
    if (!editJobForm.dueDate) return new Date();
    const parsed = new Date(editJobForm.dueDate);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [editJobForm.dueDate]);

  const pickEditLocationFromMapPress = (event) => {
    if (editSuppressNextTapRef.current) {
      editSuppressNextTapRef.current = false;
      return;
    }
    const { topLeftWorldX, topLeftWorldY, width, height } = getEditMapTopLeftWorld();
    const px = clamp(event.nativeEvent.locationX, 0, width);
    const py = clamp(event.nativeEvent.locationY, 0, height);

    const targetX = topLeftWorldX + px;
    const targetY = topLeftWorldY + py;

    const selectedLng = pixelXToLng(targetX, editMapZoom);
    const selectedLat = pixelYToLat(targetY, editMapZoom);

    setEditDraftCoordinate({
      latitude: Number(selectedLat.toFixed(6)),
      longitude: Number(selectedLng.toFixed(6))
    });
  };

  const onEditMapTouchStart = (event) => {
    const distance = getTouchDistance(event.nativeEvent.touches);
    if (!distance) return;
    editPinchStartDistanceRef.current = distance;
    editPinchStartZoomRef.current = editMapZoom;
    editIsPinchingRef.current = true;
  };

  const onEditMapTouchMove = (event) => {
    if (!editIsPinchingRef.current) return;
    const distance = getTouchDistance(event.nativeEvent.touches);
    const startDistance = editPinchStartDistanceRef.current;
    if (!distance || !startDistance) return;

    const scale = distance / startDistance;
    const nextZoom = clamp(Math.round(editPinchStartZoomRef.current + Math.log2(scale) * 3), 2, 18);
    if (nextZoom !== editMapZoom) {
      setEditMapZoom(nextZoom);
    }
  };

  const onEditMapTouchEnd = (event) => {
    if (!event.nativeEvent.touches || event.nativeEvent.touches.length < 2) {
      if (editIsPinchingRef.current) {
        editSuppressNextTapRef.current = true;
      }
      editIsPinchingRef.current = false;
      editPinchStartDistanceRef.current = null;
    }
  };

  const confirmEditMapSelection = () => {
    setEditJobForm((prev) => ({
      ...prev,
      latitude: String(Number(editDraftCoordinate.latitude.toFixed(6))),
      longitude: String(Number(editDraftCoordinate.longitude.toFixed(6)))
    }));
    closeEditMapPicker();
  };

  const submitUpdateJob = async () => {
    if (!token || !editingJobId) {
      showPopup('Update Failed', 'Job not selected.', 'warning');
      return;
    }
    if (!editJobForm.title.trim() || !editJobForm.description.trim() || !editJobForm.budget.trim() || !editJobForm.address.trim()) {
      showPopup('Validation Error', 'Please fill all required fields.', 'warning');
      return;
    }
    const requiredWorkers = Number.parseInt(editJobForm.requiredWorkers, 10);
    if (!Number.isInteger(requiredWorkers) || requiredWorkers < 1) {
      showPopup('Validation Error', 'Required workers must be at least 1.', 'warning');
      return;
    }
    if (!editJobForm.categoryId) {
      showPopup('Validation Error', 'Category is required.', 'warning');
      return;
    }
    if (editJobForm.dueDate && Number.isNaN(new Date(editJobForm.dueDate).getTime())) {
      showPopup('Validation Error', 'Due date must be in YYYY-MM-DD format.', 'warning');
      return;
    }
    const latitude = Number(editJobForm.latitude);
    const longitude = Number(editJobForm.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      showPopup('Validation Error', 'Latitude must be between -90 and 90.', 'warning');
      return;
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      showPopup('Validation Error', 'Longitude must be between -180 and 180.', 'warning');
      return;
    }

    try {
      setIsUpdatingJob(true);
      await updateJob({
        token,
        jobId: editingJobId,
        payload: {
          title: editJobForm.title.trim(),
          description: editJobForm.description.trim(),
          requiredWorkers,
          categoryId: editJobForm.categoryId,
          budget: Number(editJobForm.budget),
          budgetType: editJobForm.budgetType,
          jobType: editJobForm.jobType,
          workMode: editJobForm.workMode,
          latitude,
          longitude,
          address: editJobForm.address.trim(),
          status: editJobForm.status,
          dueDate: editJobForm.dueDate ? new Date(editJobForm.dueDate).toISOString() : undefined
        }
      });
      setShowEditJobModal(false);
      setShowEditMapPicker(false);
      setShowEditCategoryPicker(false);
      setShowEditDueDatePicker(false);
      setEditingJobId(null);
      showPopup('Job Updated', 'Job details updated successfully.', 'success');
      if (userRole === 'ADMIN') {
        await fetchAdminJobs({ forceLoader: false });
      } else {
        await fetchMyJobs({ forceLoader: false });
      }
    } catch (error) {
      showPopup('Update Failed', error?.message || 'Unable to update job.', 'error');
    } finally {
      setIsUpdatingJob(false);
    }
  };

  const submitCreateJob = async (payload) => {
    if (!token) {
      showPopup('Session Expired', 'Please login again to create job.', 'warning');
      return;
    }

    try {
      setIsCreatingJob(true);
      await createJob({ token, payload });
      setJobForm({
        title: '',
        description: '',
        requiredWorkers: '1',
        categoryId: '',
        budget: '',
        budgetType: 'TOTAL',
        jobType: 'ONE_TIME',
        workMode: 'ONSITE',
        locationLink: '',
        address: '',
        status: 'OPEN',
        dueDate: '',
        latitude: null,
        longitude: null
      });
      showPopup('Job Created', 'Your job has been created successfully.', 'success');
      await fetchMyJobs({ forceLoader: false });
      setActiveTab('explore');
    } catch (error) {
      showPopup('Create Failed', error?.message || 'Unable to create job.', 'error');
    } finally {
      setIsCreatingJob(false);
    }
  };

  const fetchAdminJobs = async ({ forceLoader = false } = {}) => {
    if (!token || userRole !== 'ADMIN') return;
    try {
      if (forceLoader || !adminJobs.length) {
        setIsAdminPanelLoading(true);
      }
      const jobsRes = await getAllJobs({ token, page: 1, limit: 60, status: 'ALL' });
      setAdminJobs(jobsRes?.data?.jobs || []);
    } catch (error) {
      showPopup('Jobs Failed', error?.message || 'Unable to load admin jobs.', 'error');
    } finally {
      setIsAdminPanelLoading(false);
    }
  };

  const getApplicationsByJobForAdmin = async (jobId) => {
    if (!token || !jobId) return [];
    try {
      const response = await getApplicationsByJob({ token, jobId });
      return Array.isArray(response?.data) ? response.data : [];
    } catch (error) {
      showPopup('Applications Failed', error?.message || 'Unable to load job applications.', 'error');
      return [];
    }
  };

  const fetchAdminCategories = async ({ forceLoader = false, statusOverride, queryOverride } = {}) => {
    if (!token || userRole !== 'ADMIN') return;
    try {
      if (forceLoader || !adminCategories.length) {
        setIsAdminPanelLoading(true);
      }
      const resolvedStatus = statusOverride || adminCategoryFilter;
      const resolvedQuery = queryOverride !== undefined ? queryOverride : debouncedAdminCategorySearch.trim() || undefined;
      const categoriesRes = await getAllCategoriesAdmin({
        token,
        status: resolvedStatus,
        q: resolvedQuery
      });
      setAdminCategories(categoriesRes?.data || []);
    } catch (error) {
      showPopup('Categories Failed', error?.message || 'Unable to load admin categories.', 'error');
    } finally {
      setIsAdminPanelLoading(false);
    }
  };

  const createAdminCategory = async () => {
    if (!token || userRole !== 'ADMIN') return;
    const normalizedName = adminCategoryDraft.name.trim().replace(/\s+/g, ' ');
    if (!normalizedName) {
      showPopup('Validation Error', 'Category name is required.', 'warning');
      return false;
    }
    if (adminCategories.some((item) => String(item.name || '').trim().toLowerCase() === normalizedName.toLowerCase())) {
      showPopup('Validation Error', 'Category name already exists.', 'warning');
      return false;
    }
    try {
      await createCategory({
        token,
        payload: {
          name: normalizedName,
          description: adminCategoryDraft.description.trim()
        }
      });
      setAdminCategoryDraft({ name: '', description: '' });
      showPopup('Category Created', 'Category created successfully.', 'success');
      await fetchAdminCategories({ forceLoader: true });
      return true;
    } catch (error) {
      showPopup('Create Failed', error?.message || 'Unable to create category.', 'error');
      return false;
    }
  };

  const createUserCategory = async () => {
    if (!token) {
      showPopup('Session Expired', 'Please login again to create category.');
      return false;
    }
    const name = String(userCategoryDraft.name || '').trim();
    const description = String(userCategoryDraft.description || '').trim();
    if (!name || !description) {
      showPopup('Missing Fields', 'Please enter both name and description.', 'warning');
      return false;
    }

    try {
      setIsCreatingUserCategory(true);
      await createCategory({
        token,
        payload: { name, description }
      });
      setShowUserCategoryCreateModal(false);
      setUserCategoryDraft({ name: '', description: '' });
      setCategoriesTab('mine');
      await fetchCategories({ forceLoader: true, targetTab: 'mine' });
      showPopup('Category Created', 'Category submitted for review.', 'success');
      return true;
    } catch (error) {
      showPopup('Create Failed', error?.message || 'Unable to create category right now.');
      return false;
    } finally {
      setIsCreatingUserCategory(false);
    }
  };

  const updateAdminCategoryStatus = async (categoryId, status) => {
    if (!token || userRole !== 'ADMIN') return;
    try {
      await updateCategoryStatus({ token, categoryId, status });
      setAdminCategories((prev) =>
        prev.map((item) => (item.id === categoryId ? { ...item, status } : item))
      );
      showPopup('Category Updated', `Category status changed to ${status}.`, 'success');
    } catch (error) {
      showPopup('Update Failed', error?.message || 'Unable to update category status.', 'error');
    }
  };

  const updateAdminCategoryDetails = async (categoryId, payload) => {
    if (!token || userRole !== 'ADMIN' || !categoryId) return null;
    const normalizedName = String(payload?.name || '').trim().replace(/\s+/g, ' ');
    if (!normalizedName) {
      showPopup('Validation Error', 'Category name is required.', 'warning');
      return null;
    }
    if (
      adminCategories.some(
        (item) =>
          item.id !== categoryId &&
          String(item.name || '').trim().toLowerCase() === normalizedName.toLowerCase()
      )
    ) {
      showPopup('Validation Error', 'Category name already exists.', 'warning');
      return null;
    }
    try {
      const response = await updateCategoryAdmin({
        token,
        categoryId,
        payload: {
          name: normalizedName,
          description: String(payload?.description || '').trim()
        }
      });
      const updatedCategory = response?.data || null;
      setAdminCategories((prev) =>
        prev.map((item) =>
          item.id === categoryId
            ? {
                ...item,
                ...(updatedCategory || {}),
                description:
                  updatedCategory?.description !== undefined
                    ? updatedCategory.description
                    : String(payload?.description || '').trim() || null,
                name: updatedCategory?.name || normalizedName
              }
            : item
        )
      );
      showPopup('Category Updated', 'Category details updated successfully.', 'success');
      return updatedCategory || {
        id: categoryId,
        name: normalizedName,
        description: String(payload?.description || '').trim() || null
      };
    } catch (error) {
      showPopup('Update Failed', error?.message || 'Unable to update category details.', 'error');
      return null;
    }
  };

  const deleteAdminCategoryById = async (categoryId) => {
    if (!token || userRole !== 'ADMIN' || !categoryId) return false;
    try {
      await deleteCategoryAdmin({ token, categoryId });
      setAdminCategories((prev) => prev.filter((item) => item.id !== categoryId));
      showPopup('Category Deleted', 'Category deleted successfully.', 'success');
      return true;
    } catch (error) {
      showPopup('Delete Failed', error?.message || 'Unable to delete category.', 'error');
      return false;
    }
  };

  const fetchAdminUsers = async ({ forceLoader = false } = {}) => {
    if (!token || userRole !== 'ADMIN') return;
    try {
      if (forceLoader || !adminUsers.length) {
        setIsAdminUsersLoading(true);
      }
      const response = await getAllUsers({ token, page: 1, limit: 200 });
      const users = response?.data?.users || [];
      setAdminUsers(users.filter((item) => item.id !== localUser?.id));
    } catch (error) {
      showPopup('Users Failed', error?.message || 'Unable to load users.', 'error');
    } finally {
      setIsAdminUsersLoading(false);
    }
  };

  const getReceivedReviewsByUserForAdmin = async (userId) => {
    if (!token || userRole !== 'ADMIN' || !userId) return null;
    try {
      const response = await getReceivedReviewsByUser({ token, userId });
      return response?.data || null;
    } catch (error) {
      showPopup('Reviews Failed', error?.message || 'Unable to load user reviews.', 'error');
      return null;
    }
  };

  const openAdminUserDetailsById = (userId, options = null) => {
    if (!userId) return;
    const fallbackTarget = {
      tab: activeTab,
      settingsPage
    };
    const requestedTarget = options && options.tab ? options : fallbackTarget;
    if (requestedTarget?.tab && requestedTarget.tab !== 'users') {
      setAdminUserDetailsReturnTarget({
        tab: requestedTarget.tab,
        settingsPage: requestedTarget.settingsPage || 'main',
        adminJobId: requestedTarget.adminJobId || null
      });
    } else {
      setAdminUserDetailsReturnTarget(null);
    }
    setAdminSelectedUserId(userId);
    setSettingsPage('main');
    setActiveTab('users');
  };

  const clearAdminSelectedUserId = () => {
    setAdminSelectedUserId(null);
  };

  const exitAdminUserDetails = () => {
    if (!adminUserDetailsReturnTarget?.tab) return false;
    setActiveTab(adminUserDetailsReturnTarget.tab);
    if (adminUserDetailsReturnTarget.tab === 'create' && adminUserDetailsReturnTarget.adminJobId) {
      setAdminReturnJobId(adminUserDetailsReturnTarget.adminJobId);
    }
    if (adminUserDetailsReturnTarget.tab === 'settings') {
      setSettingsPage(adminUserDetailsReturnTarget.settingsPage || 'main');
    }
    setAdminUserDetailsReturnTarget(null);
    return true;
  };

  const clearAdminReturnJobId = () => {
    setAdminReturnJobId(null);
  };

  const handleUpdateUserDetails = async (userId, payload) => {
    if (!token || userRole !== 'ADMIN') return null;
    try {
      const response = await updateUserByAdmin({ token, userId, payload });
      const updatedUser = response?.data || null;
      if (!updatedUser) {
        showPopup('Update Failed', 'Unable to update user details.', 'error');
        return null;
      }
      setAdminUsers((prev) => prev.map((item) => (item.id === userId ? { ...item, ...updatedUser } : item)));
      showPopup('User Updated', 'User details updated successfully.', 'success');
      return updatedUser;
    } catch (error) {
      showPopup('Update Failed', error?.message || 'Unable to update user details.', 'error');
      return null;
    }
  };

  const handleUpdateUserAvatar = async (userId, payload) => {
    if (!token || userRole !== 'ADMIN') return null;
    try {
      const response = await updateUserAvatarByAdmin({ token, userId, payload });
      const updatedUser = response?.data || null;
      if (!updatedUser) {
        showPopup('Update Failed', 'Unable to update user avatar.', 'error');
        return null;
      }
      setAdminUsers((prev) => prev.map((item) => (item.id === userId ? { ...item, ...updatedUser } : item)));
      showPopup('User Updated', 'User profile image updated successfully.', 'success');
      return updatedUser;
    } catch (error) {
      showPopup('Update Failed', error?.message || 'Unable to update user avatar.', 'error');
      return null;
    }
  };

  const loadChatMessages = async (jobId, peerId) => {
    if (!token || !jobId) return;
    try {
      setIsChatMessagesLoading(true);
      const response = await getChatMessagesByJob({ token, jobId, peerId });
      setChatMessages(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      showPopup('Chat Failed', error?.message || 'Unable to load chat messages.', 'error');
    } finally {
      setIsChatMessagesLoading(false);
    }
  };

  const fetchChatConversations = async ({ forceLoader = false, silentError = false } = {}) => {
    if (!token || userRole !== 'USER') return;
    try {
      if (forceLoader || !chatConversations.length) {
        setIsChatConversationsLoading(true);
      }
      const response = await getChatConversations({ token });
      const rows = Array.isArray(response?.data) ? response.data : [];
      setChatConversations(rows);
      return rows;
    } catch (error) {
      if (!silentError) {
        showPopup('Chat Failed', error?.message || 'Unable to load chat conversations.', 'error');
      }
      return [];
    } finally {
      setIsChatConversationsLoading(false);
    }
  };

  const scheduleChatConversationsRefresh = () => {
    if (conversationRefreshTimerRef.current) {
      clearTimeout(conversationRefreshTimerRef.current);
    }
    conversationRefreshTimerRef.current = setTimeout(() => {
      fetchChatConversations({ forceLoader: false, silentError: true });
      conversationRefreshTimerRef.current = null;
    }, 250);
  };

  const markConversationReadLocally = (jobId, peerId) => {
    if (!jobId || !peerId) return;
    setChatConversations((prev) =>
      prev.map((item) => {
        if (item?.job?.id !== jobId || item?.peer?.id !== peerId || !item?.unreadCount) return item;
        return { ...item, unreadCount: 0 };
      })
    );
  };

  const openChatSession = async ({ job, peer }) => {
    if (!job?.id || !peer?.id) return;
    const previousSession = activeChatSessionRef.current;
    if (previousSession?.jobId && socketRef.current?.connected) {
      socketRef.current.emit('leave_job_room', { jobId: previousSession.jobId });
    }
    const nextSession = {
      jobId: job.id,
      jobTitle: job.title || 'Job Chat',
      peerId: peer.id,
      peerName: peer.name || peer.username || 'User',
      peerAvatar: peer.avatar || null
    };
    setActiveChatSession(nextSession);
    setShowChatModal(true);
    await loadChatMessages(job.id, peer.id);
    markConversationReadLocally(job.id, peer.id);
  };

  const closeChatSession = () => {
    const currentSession = activeChatSessionRef.current;
    if (currentSession?.jobId && socketRef.current?.connected) {
      socketRef.current.emit('leave_job_room', { jobId: currentSession.jobId });
    }
    setShowChatModal(false);
    setActiveChatSession(null);
    setChatMessages([]);
    setChatInput('');
    setIsPeerOnline(false);
    setIsPeerTyping(false);
    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }
    if (peerOnlinePollRef.current) {
      clearInterval(peerOnlinePollRef.current);
      peerOnlinePollRef.current = null;
    }
  };

  const openChatFromConversation = (conversation) => {
    if (!conversation?.job?.id || !conversation?.peer?.id) return;
    openChatSession({
      job: conversation.job,
      peer: conversation.peer
    });
  };

  const sendChatMessage = async () => {
    const messageText = String(chatInput || '').trim();
    if (!messageText || !activeChatSession?.jobId || !activeChatSession?.peerId || !socketRef.current) return;
    setChatInput('');
    if (!socketRef.current.connected) {
      try {
        await ensureSocketConnected(9000);
      } catch (error) {
        setChatInput((prev) => (String(prev || '').trim() ? prev : messageText));
        showPopup('Chat Connecting', error?.message || 'Please wait a moment and send again.', 'warning');
        return;
      }
    }
    try {
      setIsSendingChatMessage(true);
      if (typingStopTimerRef.current) {
        clearTimeout(typingStopTimerRef.current);
        typingStopTimerRef.current = null;
      }
      socketRef.current.emit('typing_stop', {
        jobId: activeChatSession.jobId,
        receiverId: activeChatSession.peerId
      });
      await emitWithAck(
        'send_message',
        {
          jobId: activeChatSession.jobId,
          receiverId: activeChatSession.peerId,
          message: messageText
        },
        9000
      );
    } catch (error) {
      setChatInput((prev) => (String(prev || '').trim() ? prev : messageText));
      showPopup('Send Failed', error?.message || 'Unable to send message.', 'error');
    } finally {
      setIsSendingChatMessage(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    if (activeTab === 'create') {
      if (userRole === 'ADMIN') {
        fetchAdminJobs({ forceLoader: true });
        return;
      }
      (async () => {
        try {
          setIsCategoryLoading(true);
          const approvedRes = await getApprovedCategories({ token });
          setAllCategories(approvedRes?.data || []);
          setHasFetchedCategoriesOnce(true);
        } catch (error) {
          showPopup('Categories Failed', error?.message || 'Unable to load categories.', 'error');
        } finally {
          setIsCategoryLoading(false);
        }
      })();
      return;
    }
    if (activeTab === 'settings' && settingsPage === 'categories') {
      if (userRole === 'ADMIN') {
        fetchAdminCategories({ forceLoader: true });
      } else {
        fetchCategories({ forceLoader: categoriesTab === 'mine' });
      }
    }
  }, [activeTab, settingsPage, categorySearch, categoryFilter, categoriesTab, token, allCategories.length, userRole]);

  useEffect(() => {
    if (!token || userRole !== 'USER' || activeTab !== 'settings' || settingsPage !== 'reviews') return;
    fetchMyReceivedReviews({ forceLoader: true });
  }, [activeTab, settingsPage, token, userRole]);

  useEffect(() => {
    if (!token || userRole !== 'USER' || activeTab !== 'settings' || settingsPage !== 'reports') return;
    fetchReports({ forceLoader: true });
  }, [activeTab, settingsPage, token, userRole]);

  useEffect(() => {
    if (!token || userRole !== 'USER' || userMode !== 'JOB_POSTER' || activeTab !== 'explore') return;
    fetchMyJobs();
  }, [activeTab, token, userRole, userMode]);

  useEffect(() => {
    if (!token || userRole !== 'USER' || activeTab !== 'dashboard') return;
    fetchMyJobs();
  }, [activeTab, token, userRole]);

  useEffect(() => {
    if (!token || userRole !== 'ADMIN' || activeTab !== 'dashboard') return;
    fetchAdminJobs();
    fetchAdminUsers();
  }, [activeTab, token, userRole]);

  useEffect(() => {
    if (!token || userRole !== 'USER' || userMode !== 'JOB_PICKER' || activeTab !== 'explore') return;
    fetchPickerJobs();
  }, [activeTab, token, userRole, userMode]);

  useEffect(() => {
    if (!token || userRole !== 'USER' || activeTab !== 'messages') return;
    fetchChatConversations({ forceLoader: true });
  }, [activeTab, token, userRole]);

  useEffect(() => {
    if (!token || userRole !== 'ADMIN' || activeTab !== 'messages') return;
    fetchAdminReports({ forceLoader: true });
  }, [activeTab, token, userRole]);

  useEffect(() => {
    if (!token || userRole !== 'USER' || userMode !== 'JOB_PICKER' || activeTab !== 'explore' || pickerExplorePage !== 'applications') return;
    fetchMyApplications({ forceLoader: true });
  }, [activeTab, token, userRole, userMode, pickerExplorePage]);

  useEffect(() => {
    if (!token || userRole !== 'USER' || activeTab !== 'dashboard') return;
    fetchMyApplications({ forceLoader: false });
  }, [activeTab, token, userRole]);

  useEffect(() => {
    if (!token || userRole !== 'USER') return;
    fetchChatConversations({ forceLoader: false });
  }, [token, userRole]);

  useEffect(() => {
    if (!token || !['USER', 'ADMIN'].includes(userRole)) return;
    fetchNotifications({ forceLoader: false, silentError: true });
  }, [token, userRole]);

  useEffect(() => {
    if (!token || !['USER', 'ADMIN'].includes(userRole)) return;
    const socket = io(SOCKET_BASE_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
      reconnectionDelayMax: 4000,
      timeout: 9000
    });
    socketRef.current = socket;
    setIsSocketConnected(Boolean(socket.connected));

    socket.on('connect', () => {
      setIsSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setIsSocketConnected(false);
      setIsPeerOnline(false);
    });

    socket.on('connect_error', () => {
      setIsSocketConnected(false);
      setIsPeerOnline(false);
    });

    socket.on('new_message', (incoming) => {
      if (!incoming?.id) return;
      const currentSession = activeChatSessionRef.current;
      const isCurrentConversation =
        currentSession?.jobId &&
        incoming.jobId === currentSession.jobId &&
        [incoming.senderId, incoming.receiverId].includes(currentSession.peerId);

      scheduleChatConversationsRefresh();

      if (!isCurrentConversation) return;

      if (incoming?.receiverId === localUserIdRef.current && currentSession?.peerId) {
        socket.emit('mark_seen', { jobId: currentSession.jobId, peerId: currentSession.peerId });
        markConversationReadLocally(currentSession.jobId, currentSession.peerId);
      }
      setChatMessages((prev) => {
        if (prev.some((item) => item.id === incoming.id)) return prev;
        return [...prev, incoming];
      });
    });

    socket.on('message_status_updated', (payload) => {
      const ids = Array.isArray(payload?.messageIds) ? payload.messageIds : [];
      if (!ids.length || !payload?.status) return;
      setChatMessages((prev) =>
        prev.map((item) => (ids.includes(item.id) ? { ...item, status: payload.status } : item))
      );
      if (payload.status === 'SEEN' || payload.status === 'DELIVERED') {
        scheduleChatConversationsRefresh();
      }
    });

    socket.on('typing', (payload) => {
      if (!activeChatSession?.jobId || !activeChatSession?.peerId) return;
      if (payload?.jobId !== activeChatSession.jobId) return;
      if (payload?.userId !== activeChatSession.peerId) return;
      setIsPeerTyping(Boolean(payload?.isTyping));
    });

    socket.on('notification_created', (incomingNotification) => {
      if (!incomingNotification?.id) return;
      setNotifications((prev) => {
        const exists = prev.some((item) => item.id === incomingNotification.id);
        if (exists) {
          return prev.map((item) => (item.id === incomingNotification.id ? incomingNotification : item));
        }
        return [incomingNotification, ...prev];
      });
      setNotificationPingKey((prev) => prev + 1);
      showNotificationToast(incomingNotification);
    });

    socket.on('chat_message_alert', (incomingAlert) => {
      if (!incomingAlert?.id) return;
      setNotifications((prev) => {
        const exists = prev.some((item) => item.id === incomingAlert.id);
        if (exists) return prev;
        return [incomingAlert, ...prev];
      });
      setNotificationPingKey((prev) => prev + 1);
      showNotificationToast(incomingAlert);
    });

    return () => {
      if (conversationRefreshTimerRef.current) {
        clearTimeout(conversationRefreshTimerRef.current);
        conversationRefreshTimerRef.current = null;
      }
      socket.disconnect();
      socketRef.current = null;
      setIsSocketConnected(false);
    };
  }, [token, userRole]);

  useEffect(() => {
    if (!showChatModal || !activeChatSession?.jobId || !activeChatSession?.peerId) return;
    if (!socketRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        await ensureSocketConnected(7000);
        if (cancelled) return;
        const data = await emitWithAck(
          'join_job_room',
          { jobId: activeChatSession.jobId, peerId: activeChatSession.peerId },
          7000
        );
        if (cancelled) return;
        setIsPeerOnline(Boolean(data?.online));
        markConversationReadLocally(activeChatSession.jobId, activeChatSession.peerId);
      } catch (_error) {
        // Ignore transient join errors; chat can retry as socket stabilizes.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showChatModal, activeChatSession?.jobId, activeChatSession?.peerId, isSocketConnected]);

  useEffect(() => {
    if (!showChatModal || !activeChatSession?.peerId || !socketRef.current) return;
    if (!isSocketConnected) return;
    const checkOnline = () => {
      emitWithAck('check_user_online', { userId: activeChatSession.peerId }, 5000)
        .then((data) => {
          setIsPeerOnline(Boolean(data?.online));
        })
        .catch(() => {
          setIsPeerOnline(false);
        });
    };
    checkOnline();
    peerOnlinePollRef.current = setInterval(checkOnline, 6000);
    return () => {
      if (peerOnlinePollRef.current) {
        clearInterval(peerOnlinePollRef.current);
        peerOnlinePollRef.current = null;
      }
    };
  }, [showChatModal, activeChatSession?.peerId, isSocketConnected]);

  useEffect(() => {
    if (!isPeerTyping) return;
    const ticker = setInterval(() => {
      setTypingDots((prev) => (prev.length >= 3 ? '.' : `${prev}.`));
    }, 360);
    return () => clearInterval(ticker);
  }, [isPeerTyping]);

  useEffect(() => {
    if (!chatMessages.length) return;
    requestAnimationFrame(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true });
    });
  }, [chatMessages]);

  useEffect(
    () => () => {
      if (conversationRefreshTimerRef.current) {
        clearTimeout(conversationRefreshTimerRef.current);
        conversationRefreshTimerRef.current = null;
      }
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    },
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAdminCategorySearch(adminCategorySearch);
    }, 450);

    return () => clearTimeout(timer);
  }, [adminCategorySearch]);

  useEffect(() => {
    if (!token || userRole !== 'ADMIN' || activeTab !== 'settings' || settingsPage !== 'categories') return;
    fetchAdminCategories({ forceLoader: true });
  }, [activeTab, settingsPage, userRole, token, debouncedAdminCategorySearch, adminCategoryFilter]);

  useEffect(() => {
    if (userRole !== 'ADMIN' || activeTab !== 'users') return;
    fetchAdminUsers();
  }, [activeTab, userRole, token]);

  const animateIcon = (key) => {
    iconLift[key].setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(iconScales[key], { toValue: 1.13, duration: 110, useNativeDriver: true }),
        Animated.spring(iconScales[key], { toValue: 1, friction: 6, tension: 130, useNativeDriver: true })
      ]),
      Animated.sequence([
        Animated.timing(iconLift[key], { toValue: -5, duration: 110, useNativeDriver: true }),
        Animated.spring(iconLift[key], { toValue: 0, friction: 7, tension: 130, useNativeDriver: true })
      ])
    ]).start();
  };

  const switchTab = (nextKey) => {
    if (showNotificationsPage) {
      setShowNotificationsPage(false);
    }
    if (nextKey === activeTab) {
      animateIcon(nextKey);
      return;
    }

    Animated.parallel([
      Animated.timing(contentFade, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(contentShift, { toValue: 12, duration: 120, useNativeDriver: true })
    ]).start(() => {
      setActiveTab(nextKey);
      if (nextKey !== 'settings') setSettingsPage('main');
      if (nextKey !== 'explore') {
        setPickerExplorePage('jobs');
        setMyJobsPage('list');
        setSelectedMyJobApplications([]);
        setSelectedMyJob(null);
      }
      animateIcon(nextKey);
      Animated.parallel([
        Animated.timing(contentFade, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        }),
        Animated.timing(contentShift, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        })
      ]).start();
    });
  };

  const switchSettingsPage = (nextPage) => {
    if (nextPage === settingsPage) return;
    Animated.parallel([
      Animated.timing(contentFade, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(contentShift, { toValue: 10, duration: 120, useNativeDriver: true })
    ]).start(() => {
      setSettingsPage(nextPage);
      Animated.parallel([
        Animated.timing(contentFade, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        }),
        Animated.timing(contentShift, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        })
      ]).start();
    });
  };

  const centerTab = visibleTabs[2] || visibleTabs[0];
  const handleCenterAction = () => {
    if (showNotificationsPage) {
      setShowNotificationsPage(false);
    }
    switchTab(centerTab.key);
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.pageWrap, { opacity: contentFade, transform: [{ translateY: contentShift }] }]}>
        {showNotificationsPage ? (
          <NotificationsPage
            notifications={notifications}
            isLoading={isNotificationsLoading}
            onBack={closeNotificationsPageToHome}
            onRefresh={() => fetchNotifications({ forceLoader: true })}
            onOpenNotification={openNotificationFromPage}
            onReadNotification={(notificationId) => readNotificationById(notificationId)}
            onDeleteNotification={deleteNotificationById}
            onReadAll={readAllNotifications}
            onDeleteAll={deleteAllNotificationsFromList}
            styles={styles}
            colors={colors}
          />
        ) : (
          <PageContent
            tabKey={activeTab}
            user={localUser}
            userRole={userRole}
            userMode={userMode}
            token={token}
            settingsPage={settingsPage}
            themeMode={themeMode}
            setThemeMode={setThemeMode}
            onOpenProfile={() => switchSettingsPage('profile')}
            onOpenMode={() => switchSettingsPage('mode')}
            onOpenReviews={() => switchSettingsPage('reviews')}
            onOpenReports={() => switchSettingsPage('reports')}
            onOpenNotifications={openNotificationsPage}
            onBackFromProfile={() => switchSettingsPage('main')}
            onBackFromMode={() => switchSettingsPage('main')}
            onBackFromReviews={() => switchSettingsPage('main')}
            onBackFromReports={() => switchSettingsPage('main')}
            onBackFromCategories={() => switchSettingsPage('main')}
            onRequestLogout={() => setShowLogoutConfirm(true)}
            onOpenAvatarOptions={() => setShowAvatarOptions(true)}
            onOpenAvatarPreview={() => setShowAvatarPreview(true)}
            onSaveProfile={saveProfileDetails}
            onChangeMode={changeUserMode}
            isSavingProfile={isSavingProfile}
            isChangingMode={isChangingMode}
            onOpenCategories={() => switchSettingsPage('categories')}
            categoriesTab={categoriesTab}
            setCategoriesTab={setCategoriesTab}
            categorySearch={categorySearch}
            setCategorySearch={setCategorySearch}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            allCategories={allCategories}
            myCategories={myCategories}
            isCategoryLoading={isCategoryLoading}
            hasFetchedCategoriesOnce={hasFetchedCategoriesOnce}
            onRefreshCategories={() => fetchCategories({ forceLoader: true })}
            jobForm={jobForm}
            setJobForm={setJobForm}
            approvedCategoryOptions={approvedCategoryOptions}
            onCreateJob={submitCreateJob}
            onValidationError={showPopup}
            isCreatingJob={isCreatingJob}
            myJobs={myJobs}
            isMyJobsLoading={isMyJobsLoading}
            onRefreshMyJobs={() => fetchMyJobs({ forceLoader: true })}
            myJobsPage={myJobsPage}
            onOpenMyJob={openMyJobDetailPage}
            selectedMyJob={selectedMyJob}
            selectedMyJobApplications={selectedMyJobApplications}
            isSelectedMyJobApplicationsLoading={isSelectedMyJobApplicationsLoading}
            isUpdatingJobApplicationStatus={isUpdatingJobApplicationStatus}
            isSubmittingReview={isSubmittingReview}
            isUpdatingJobStatus={isUpdatingMyJobStatus}
            onBackFromMyJobDetail={backFromMyJobDetailPage}
            onRefreshSelectedMyJobApplications={() =>
              fetchApplicationsForMySelectedJob(selectedMyJob?.id, { forceLoader: true })
            }
            onApproveJobApplication={(applicationId) => updateSelectedJobApplicationStatus(applicationId, 'ACCEPTED')}
            onRejectJobApplication={(applicationId) => updateSelectedJobApplicationStatus(applicationId, 'REJECTED')}
            onSubmitReview={submitReviewForJobPicker}
            onChangeJobStatus={changeMyJobStatus}
            onEditMyJob={openEditJobModal}
            pickerExplorePage={pickerExplorePage}
            onOpenPickerApplications={openPickerApplicationsPage}
            onBackFromPickerApplications={backFromPickerApplicationsPage}
            pickerJobs={pickerJobs}
            isPickerJobsLoading={isPickerJobsLoading}
            onRefreshPickerJobs={() => fetchPickerJobs({ forceLoader: true })}
            onApplyJob={handleApplyJob}
            isApplyingJob={isApplyingJob}
            myApplications={myApplications}
            isMyApplicationsLoading={isMyApplicationsLoading}
            onRefreshMyApplications={() => fetchMyApplications({ forceLoader: true })}
            notifications={notifications}
            isNotificationsLoading={isNotificationsLoading}
            notificationPingKey={notificationPingKey}
            unreadNotificationCount={unreadNotificationCount}
            onRefreshNotifications={() => fetchNotifications({ forceLoader: true })}
            onOpenNotification={openNotification}
            onReadNotification={(notificationId) => readNotificationById(notificationId)}
            onDeleteNotification={deleteNotificationById}
            onReadAllNotifications={readAllNotifications}
            onDeleteAllNotifications={deleteAllNotificationsFromList}
            myReceivedReviews={myReceivedReviews}
            isMyReceivedReviewsLoading={isMyReceivedReviewsLoading}
            onRefreshMyReceivedReviews={() => fetchMyReceivedReviews({ forceLoader: true })}
            reports={reports}
            isReportsLoading={isReportsLoading}
            onRefreshReports={() => fetchReports({ forceLoader: true })}
            onCreateReport={submitReport}
            onOpenChatWithJobPoster={(application) =>
              openChatSession({
                job: application?.job,
                peer: application?.job?.owner
              })
            }
            chatConversations={chatConversations}
            isChatConversationsLoading={isChatConversationsLoading}
            onRefreshChatConversations={() => fetchChatConversations({ forceLoader: true })}
            onOpenChatConversation={openChatFromConversation}
            onOpenChatWithApplicant={(payload) =>
              openChatSession({
                job: payload?.job,
                peer: payload?.applicant
              })
            }
            onOpenChatWithUser={(payload) =>
              openChatSession({
                job: payload?.job,
                peer: payload?.applicant
              })
            }
            onOpenAdminUserDetails={openAdminUserDetailsById}
            onGetApplicationsByJob={getApplicationsByJobForAdmin}
            onChangeAdminJobStatus={changeAdminJobStatus}
            onEditAdminJob={openEditJobModal}
            adminReturnJobId={adminReturnJobId}
            onAdminReturnJobHandled={clearAdminReturnJobId}
            adminJobs={adminJobs}
            adminCategories={adminCategories}
            isAdminPanelLoading={isAdminPanelLoading}
            onRefreshAdminJobs={() => fetchAdminJobs({ forceLoader: true })}
            onRefreshAdminCategories={() => fetchAdminCategories({ forceLoader: true })}
            adminCategorySearch={adminCategorySearch}
            setAdminCategorySearch={setAdminCategorySearch}
            adminCategoryFilter={adminCategoryFilter}
            setAdminCategoryFilter={setAdminCategoryFilter}
            adminCategoryDraft={adminCategoryDraft}
            setAdminCategoryDraft={setAdminCategoryDraft}
            onCreateAdminCategory={createAdminCategory}
            onUpdateAdminCategory={updateAdminCategoryDetails}
            onUpdateAdminCategoryStatus={updateAdminCategoryStatus}
            onDeleteAdminCategory={deleteAdminCategoryById}
            adminUsers={adminUsers}
            isAdminUsersLoading={isAdminUsersLoading}
            onRefreshAdminUsers={() => fetchAdminUsers({ forceLoader: true })}
            adminReports={adminReports}
            isAdminReportsLoading={isAdminReportsLoading}
            onRefreshAdminReports={(params = {}) => fetchAdminReports({ forceLoader: true, ...params })}
            onUpdateAdminReportStatus={changeAdminReportStatus}
            onGetUserReviews={getReceivedReviewsByUserForAdmin}
            selectedAdminUserId={adminSelectedUserId}
            onAdminUserDetailOpened={clearAdminSelectedUserId}
            onExitAdminUserDetails={exitAdminUserDetails}
            onSaveUserDetails={handleUpdateUserDetails}
            onSaveUserAvatar={handleUpdateUserAvatar}
            isUploadingAvatar={isUploadingAvatar}
            styles={styles}
            colors={colors}
          />
        )}
      </Animated.View>

      {activeToastNotification ? (
        <Animated.View
          style={[
            styles.inAppNotificationToast,
            {
              transform: [{ translateY: toastTranslateY }],
              opacity: toastOpacity
            }
          ]}
        >
          <Pressable style={styles.inAppNotificationToastContent} onPress={() => openNotification(activeToastNotification)}>
            <View style={styles.inAppNotificationToastIconWrap}>
              <Ionicons
                name={getNotificationIconName(activeToastNotification)}
                size={18}
                color={colors.primary}
              />
            </View>
            <View style={styles.inAppNotificationToastTextWrap}>
              <Text style={styles.inAppNotificationToastTitle} numberOfLines={1}>
                {activeToastNotification?.title || 'Notification'}
              </Text>
              <Text style={styles.inAppNotificationToastDescription} numberOfLines={2}>
                {activeToastNotification?.description || ''}
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      ) : null}

      {activeTab === 'settings' && settingsPage === 'categories' && userRole !== 'ADMIN' ? (
        <Pressable
          style={styles.categoryFab}
          onPress={() => {
            setShowUserCategoryCreateModal(true);
          }}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>
      ) : null}

      <Modal
        visible={showUserCategoryCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUserCategoryCreateModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowUserCategoryCreateModal(false)}>
          <Pressable style={styles.optionModal} onPress={() => {}}>
            <View style={styles.adminSectionHeader}>
              <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
              <Text style={styles.adminCreateCategoryTitle}>Create Category</Text>
            </View>
            <TextInput
              value={userCategoryDraft.name}
              onChangeText={(value) => setUserCategoryDraft((prev) => ({ ...prev, name: value }))}
              placeholder="Category name"
              placeholderTextColor={colors.textSecondary}
              style={styles.categoryCreateInput}
            />
            <TextInput
              value={userCategoryDraft.description}
              onChangeText={(value) => setUserCategoryDraft((prev) => ({ ...prev, description: value }))}
              placeholder="Category description"
              placeholderTextColor={colors.textSecondary}
              style={[styles.categoryCreateInput, styles.categoryCreateDescription]}
              multiline
            />
            <View style={styles.optionActionsRow}>
              <Pressable
                style={[styles.optionCancel, styles.optionActionBtn]}
                onPress={() => setShowUserCategoryCreateModal(false)}
              >
                <Text style={styles.optionCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtnPrimary, styles.optionActionBtn, isCreatingUserCategory ? styles.modalBtnDisabled : null]}
                onPress={createUserCategory}
                disabled={isCreatingUserCategory}
              >
                <Text style={styles.modalBtnPrimaryText}>{isCreatingUserCategory ? 'Creating...' : 'Create'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showEditJobModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowEditJobModal(false);
          setShowEditMapPicker(false);
          setShowEditCategoryPicker(false);
          setShowEditDueDatePicker(false);
          setEditingJobId(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.myJobEditModal}>
            <Text style={styles.optionTitle}>Edit Job</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.createFieldLabel}>Title *</Text>
              <TextInput
                value={editJobForm.title}
                onChangeText={(value) => setEditJobForm((prev) => ({ ...prev, title: value }))}
                style={styles.createFieldInput}
                placeholder="Job title"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.createFieldLabel}>Description *</Text>
              <TextInput
                value={editJobForm.description}
                onChangeText={(value) => setEditJobForm((prev) => ({ ...prev, description: value }))}
                style={[styles.createFieldInput, styles.createFieldArea]}
                placeholder="Job description"
                placeholderTextColor={colors.textSecondary}
                multiline
              />

              <Text style={styles.createFieldLabel}>Required Workers *</Text>
              <TextInput
                value={editJobForm.requiredWorkers}
                onChangeText={(value) =>
                  setEditJobForm((prev) => ({ ...prev, requiredWorkers: value.replace(/[^0-9]/g, '') }))
                }
                style={styles.createFieldInput}
                placeholder="1"
                keyboardType="number-pad"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.createFieldLabel}>Category *</Text>
              <Pressable style={styles.createFieldSelect} onPress={() => setShowEditCategoryPicker(true)}>
                <Ionicons name="layers-outline" size={16} color={colors.primary} />
                <Text style={styles.createFieldSelectText}>
                  {approvedCategoryOptions.find((item) => item.id === editJobForm.categoryId)?.name ||
                    (approvedCategoryOptions.length ? 'Select category' : 'No categories available')}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
              </Pressable>

              <Text style={styles.createFieldLabel}>Budget *</Text>
              <TextInput
                value={editJobForm.budget}
                onChangeText={(value) => setEditJobForm((prev) => ({ ...prev, budget: value.replace(/[^0-9.]/g, '') }))}
                style={styles.createFieldInput}
                placeholder="Budget"
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.createFieldLabel}>Budget Distribution</Text>
              <View style={styles.createPillRow}>
                {['TOTAL', 'PER_PERSON'].map((type) => (
                  <Pressable
                    key={`edit-budget-type-${type}`}
                    style={[styles.createPill, editJobForm.budgetType === type && styles.createPillActive]}
                    onPress={() => setEditJobForm((prev) => ({ ...prev, budgetType: type }))}
                  >
                    <Text style={[styles.createPillText, editJobForm.budgetType === type && styles.createPillTextActive]}>
                      {type === 'TOTAL' ? 'Total Budget' : 'Per Person'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.createFieldLabel}>Latitude *</Text>
              <TextInput
                value={editJobForm.latitude}
                onChangeText={(value) =>
                  setEditJobForm((prev) => ({ ...prev, latitude: value.replace(/[^0-9.-]/g, '') }))
                }
                style={styles.createFieldInput}
                placeholder="22.303900"
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.createFieldLabel}>Longitude *</Text>
              <TextInput
                value={editJobForm.longitude}
                onChangeText={(value) =>
                  setEditJobForm((prev) => ({ ...prev, longitude: value.replace(/[^0-9.-]/g, '') }))
                }
                style={styles.createFieldInput}
                placeholder="70.802200"
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textSecondary}
              />
              <Pressable style={styles.createMapBtn} onPress={openEditMapPicker}>
                <Ionicons name="map-outline" size={16} color="#FFFFFF" />
                <Text style={styles.createMapBtnText}>Pick From Map</Text>
              </Pressable>

              <JobLocationCard
                job={{
                  latitude: editJobForm.latitude,
                  longitude: editJobForm.longitude,
                  address: editJobForm.address,
                  workMode: editJobForm.workMode
                }}
                title="Map Preview"
                styles={styles}
                colors={colors}
              />

              <Text style={styles.createFieldLabel}>Address *</Text>
              <TextInput
                value={editJobForm.address}
                onChangeText={(value) => setEditJobForm((prev) => ({ ...prev, address: value }))}
                style={[styles.createFieldInput, styles.createFieldArea]}
                placeholder="Address"
                placeholderTextColor={colors.textSecondary}
                multiline
              />

              <Text style={styles.createFieldLabel}>Job Type</Text>
              <View style={styles.createPillRow}>
                {['ONE_TIME', 'PART_TIME', 'FULL_TIME'].map((type) => (
                  <Pressable
                    key={`edit-${type}`}
                    style={[styles.createPill, editJobForm.jobType === type && styles.createPillActive]}
                    onPress={() => setEditJobForm((prev) => ({ ...prev, jobType: type }))}
                  >
                    <Text style={[styles.createPillText, editJobForm.jobType === type && styles.createPillTextActive]}>
                      {type.replace('_', ' ')}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.createFieldLabel}>Work Mode</Text>
              <View style={styles.createPillRow}>
                {['REMOTE', 'HYBRID', 'ONSITE'].map((type) => (
                  <Pressable
                    key={`edit-work-mode-${type}`}
                    style={[styles.createPill, editJobForm.workMode === type && styles.createPillActive]}
                    onPress={() => setEditJobForm((prev) => ({ ...prev, workMode: type }))}
                  >
                    <Text style={[styles.createPillText, editJobForm.workMode === type && styles.createPillTextActive]}>
                      {type === 'ONSITE' ? 'Onsite' : type.charAt(0) + type.slice(1).toLowerCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.createFieldLabel}>Status</Text>
              <View style={styles.createPillRow}>
                {['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((status) => (
                  <Pressable
                    key={`edit-${status}`}
                    style={[styles.createPill, editJobForm.status === status && styles.createPillActive]}
                    onPress={() => setEditJobForm((prev) => ({ ...prev, status }))}
                  >
                    <Text style={[styles.createPillText, editJobForm.status === status && styles.createPillTextActive]}>
                      {status.replace('_', ' ')}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.createFieldLabel}>Due Date (Optional)</Text>
              <Pressable style={styles.createFieldSelect} onPress={() => setShowEditDueDatePicker(true)}>
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                <Text style={styles.createFieldSelectText}>
                  {editJobForm.dueDate ? formatDateValue(new Date(editJobForm.dueDate)) : 'Select date'}
                </Text>
              </Pressable>
              {showEditDueDatePicker && Platform.OS === 'ios' ? (
                <Modal transparent animationType="fade" onRequestClose={() => setShowEditDueDatePicker(false)}>
                  <Pressable style={styles.datePickerBackdrop} onPress={() => setShowEditDueDatePicker(false)}>
                    <Pressable style={styles.datePickerCard} onPress={() => {}}>
                      <DateTimePicker
                        value={editDueDateValue}
                        mode="date"
                        minimumDate={new Date()}
                        display="spinner"
                        onChange={(_event, selectedDate) => {
                          if (!selectedDate) return;
                          setEditJobForm((prev) => ({ ...prev, dueDate: formatDateValue(selectedDate) }));
                        }}
                      />
                      <Pressable style={styles.datePickerDoneBtn} onPress={() => setShowEditDueDatePicker(false)}>
                        <Text style={styles.datePickerDoneText}>Done</Text>
                      </Pressable>
                    </Pressable>
                  </Pressable>
                </Modal>
              ) : null}
              {showEditDueDatePicker && Platform.OS !== 'ios' ? (
                <DateTimePicker
                  value={editDueDateValue}
                  mode="date"
                  minimumDate={new Date()}
                  display="default"
                  onChange={(_event, selectedDate) => {
                    setShowEditDueDatePicker(false);
                    if (!selectedDate) return;
                    setEditJobForm((prev) => ({ ...prev, dueDate: formatDateValue(selectedDate) }));
                  }}
                />
              ) : null}
            </ScrollView>

            <View style={styles.optionActionsRow}>
              <Pressable
                style={[styles.optionCancel, styles.optionActionBtn]}
                onPress={() => {
                  setShowEditJobModal(false);
                  setShowEditMapPicker(false);
                  setShowEditCategoryPicker(false);
                  setShowEditDueDatePicker(false);
                  setEditingJobId(null);
                }}
              >
                <Text style={styles.optionCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtnPrimary, styles.optionActionBtn, isUpdatingJob ? styles.modalBtnDisabled : null]}
                onPress={submitUpdateJob}
                disabled={isUpdatingJob}
              >
                <Text style={styles.modalBtnPrimaryText}>{isUpdatingJob ? 'Saving...' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEditCategoryPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditCategoryPicker(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowEditCategoryPicker(false)}>
          <Pressable style={styles.optionCard} onPress={() => {}}>
            <Text style={styles.optionTitle}>Select Category</Text>
            <ScrollView style={styles.codeScroll}>
              {approvedCategoryOptions.map((item) => (
                <Pressable
                  key={`edit-category-${item.id}`}
                  style={[styles.categoryFilterOption, editJobForm.categoryId === item.id && styles.categoryFilterOptionActive]}
                  onPress={() => {
                    setEditJobForm((prev) => ({ ...prev, categoryId: item.id }));
                    setShowEditCategoryPicker(false);
                  }}
                >
                  <View style={styles.categoryFilterOptionLeft}>
                    <Ionicons
                      name={editJobForm.categoryId === item.id ? 'checkmark-circle-outline' : 'ellipse-outline'}
                      size={16}
                      color={editJobForm.categoryId === item.id ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.categoryFilterOptionText,
                        editJobForm.categoryId === item.id && styles.categoryFilterOptionTextActive
                      ]}
                    >
                      {item.name}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.optionCancel} onPress={() => setShowEditCategoryPicker(false)}>
              <Text style={styles.optionCancelText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showEditMapPicker}
        transparent
        animationType="fade"
        onRequestClose={closeEditMapPicker}
      >
        <View style={[styles.modalBackdrop, screenWidth < 430 ? styles.editMapBackdropMobile : null]}>
          <View
            style={[
              styles.editMapModalCard,
              {
                maxHeight: Math.min(screenHeight * 0.94, 760),
                width: Math.min(screenWidth - (screenWidth < 430 ? 12 : 20), 560),
                padding: screenWidth < 430 ? 10 : 12
              }
            ]}
          >
            <View style={styles.editMapHeader}>
              <Pressable style={styles.editMapCancelBtn} onPress={closeEditMapPicker}>
                <Ionicons name="close-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.editMapCancelText}>Cancel</Text>
              </Pressable>
              <Text style={styles.editMapTitle}>Pick Location</Text>
              <Pressable style={[styles.createMapHeaderBtnPrimary, styles.createMapHeaderBtnRight]} onPress={confirmEditMapSelection}>
                <Ionicons name="checkmark-outline" size={16} color="#FFFFFF" />
                <Text style={styles.createMapHeaderBtnPrimaryText}>Confirm</Text>
              </Pressable>
            </View>

            <View style={styles.editMapMeta}>
              <Ionicons name="pin-outline" size={14} color={colors.primary} />
              <Text style={styles.editMapMetaText}>
                {editDraftCoordinate.latitude.toFixed(6)}, {editDraftCoordinate.longitude.toFixed(6)}
              </Text>
            </View>

            <View
              style={[
                styles.createMapNativeContainer,
                styles.editMapNativeContainer,
                {
                  flex: 0,
                  height: screenWidth < 430 ? Math.max(220, Math.min(screenHeight * 0.4, 300)) : 320,
                  minHeight: screenWidth < 430 ? 220 : 300
                }
              ]}
            >
              <Pressable
                style={styles.createMapNativePressable}
                onLayout={(event) => setEditMapCanvasLayout(event.nativeEvent.layout)}
                onPress={pickEditLocationFromMapPress}
                onTouchStart={onEditMapTouchStart}
                onTouchMove={onEditMapTouchMove}
                onTouchEnd={onEditMapTouchEnd}
              >
                <View style={styles.createMapTilesCanvas}>
                  {editMapTiles.map((tile) => (
                    <Image key={tile.key} source={{ uri: tile.url }} style={[styles.createMapTileImage, { left: tile.left, top: tile.top }]} />
                  ))}
                </View>
                <View style={styles.createMapNativeCrosshair}>
                  <Ionicons name="location" size={22} color={colors.primary} />
                </View>
              </Pressable>
              <View style={styles.createMapNativeControls}>
                <Pressable style={styles.createMapZoomBtn} onPress={() => setEditMapZoom((prev) => clamp(prev - 1, 2, 18))}>
                  <Ionicons name="remove" size={16} color={colors.textMain} />
                </Pressable>
                <Text style={styles.createMapZoomText}>Zoom {editMapZoom}</Text>
                <Pressable style={styles.createMapZoomBtn} onPress={() => setEditMapZoom((prev) => clamp(prev + 1, 2, 18))}>
                  <Ionicons name="add" size={16} color={colors.textMain} />
                </Pressable>
              </View>
            </View>

            <View style={[styles.createMapWebCoords, styles.editMapCoordsWrap]}>
              <TextInput
                value={String(editDraftCoordinate.latitude)}
                onChangeText={(value) => setEditDraftCoordinate((prev) => ({ ...prev, latitude: Number(value || 0) }))}
                style={[styles.createFieldInput, styles.createMapCoordInput]}
                placeholder="Latitude"
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textSecondary}
              />
              <TextInput
                value={String(editDraftCoordinate.longitude)}
                onChangeText={(value) => setEditDraftCoordinate((prev) => ({ ...prev, longitude: Number(value || 0) }))}
                style={[styles.createFieldInput, styles.createMapCoordInput]}
                placeholder="Longitude"
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showAvatarPreview} transparent animationType="fade" onRequestClose={() => setShowAvatarPreview(false)}>
        <View style={styles.previewBackdrop}>
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Profile Photo</Text>
              <Pressable style={styles.previewClose} onPress={() => setShowAvatarPreview(false)}>
                <Ionicons name="close" size={18} color={colors.textMain} />
              </Pressable>
            </View>
            <View style={styles.previewAvatarWrap}>
              <AvatarView imageUrl={localUser?.avatar || DEFAULT_AVATAR_URL} size={220} colors={colors} showBorder />
            </View>
            <Text style={styles.previewName}>{localUser?.name || 'User'}</Text>
            <Text style={styles.previewEmail}>{localUser?.email || '-'}</Text>
            <Pressable
              style={styles.previewEditBtn}
              onPress={() => {
                setShowAvatarPreview(false);
                setShowAvatarOptions(true);
              }}
            >
              <Ionicons name="create-outline" size={16} color="#FFFFFF" />
              <Text style={styles.previewEditText}>Edit Photo</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <View style={styles.tabBarOuter}>
        <View style={styles.tabBar}>
          {visibleTabs.map((tab) => {
            const isCenter = tab.key === 'create';
            const active = activeTab === tab.key;

            if (isCenter) return <View key={tab.key} style={styles.tabSlot} />;

            return (
              <Pressable key={tab.key} style={styles.tabSlot} onPress={() => switchTab(tab.key)}>
                <Animated.View
                  style={{
                    transform: [{ translateY: iconLift[tab.key] }, { scale: iconScales[tab.key] }]
                  }}
                >
                  <View style={styles.tabIconWrap}>
                    <Ionicons
                      name={active ? tab.activeIcon : tab.icon}
                      size={22}
                      color={active ? colors.primary : colors.iconInactive}
                    />
                    {userRole === 'USER' && tab.key === 'messages' && totalUnreadChatCount > 0 ? (
                      <View style={styles.tabUnreadBadge}>
                        <Text style={styles.tabUnreadBadgeText}>{totalUnreadChatCount > 99 ? '99+' : totalUnreadChatCount}</Text>
                      </View>
                    ) : null}
                  </View>
                </Animated.View>
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.centerBtn} onPress={handleCenterAction}>
          <Animated.View
            style={{
              transform: [{ translateY: iconLift[centerTab.key] }, { scale: iconScales[centerTab.key] }]
            }}
          >
            <Ionicons
              name={activeTab === centerTab.key ? centerTab.activeIcon : centerTab.icon}
              size={24}
              color="#FFFFFF"
            />
          </Animated.View>
        </Pressable>
      </View>

      <Modal visible={showAvatarOptions} transparent animationType="fade" onRequestClose={() => setShowAvatarOptions(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.optionCard}>
            <View style={styles.optionTop}>
              <View style={styles.optionAvatarMini}>
                <AvatarView imageUrl={localUser?.avatar || DEFAULT_AVATAR_URL} size={52} colors={colors} showBorder />
              </View>
              <View style={styles.optionTopContent}>
                <Text style={styles.optionTitle}>Change Profile Photo</Text>
                <Text style={styles.optionSubtitle}>Pick a style you like</Text>
              </View>
            </View>
            <Pressable style={styles.optionRow} onPress={() => { setShowAvatarOptions(false); setShowAvatarList(true); }}>
              <Ionicons name="person-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.optionLabel}>Choose Avatar</Text>
            </Pressable>
            <Pressable style={styles.optionRow} onPress={selectFromDevice}>
              <Ionicons name="images-outline" size={18} color={colors.primary} />
              <Text style={styles.optionLabel}>Choose From Device</Text>
            </Pressable>
            <Pressable style={styles.optionRow} onPress={takePhoto}>
              <Ionicons name="camera-outline" size={18} color={colors.primary} />
              <Text style={styles.optionLabel}>Take Photo</Text>
            </Pressable>
            <Pressable style={styles.optionRow} onPress={resetAvatar}>
              <Ionicons name="refresh-outline" size={18} color={colors.danger} />
              <Text style={[styles.optionLabel, { color: colors.danger }]}>Delete / Reset To Default</Text>
            </Pressable>
            <Pressable style={styles.optionCancel} onPress={() => setShowAvatarOptions(false)}>
              <Text style={styles.optionCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showAvatarList} transparent animationType="fade" onRequestClose={() => setShowAvatarList(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.avatarSheet}>
            <Text style={styles.optionTitle}>Select Avatar</Text>
            <View style={styles.staticAvatarGrid}>
              {STATIC_AVATARS.map((avatarUrl) => (
                <Pressable key={avatarUrl} style={styles.staticAvatarItem} onPress={() => chooseStaticAvatar(avatarUrl)}>
                  <Image source={{ uri: avatarUrl }} style={styles.staticAvatarImage} />
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.optionCancel} onPress={() => setShowAvatarList(false)}>
              <Text style={styles.optionCancelText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showWebCropper} transparent animationType="fade" onRequestClose={() => setShowWebCropper(false)}>
        <View style={styles.previewBackdrop}>
          <View style={styles.cropCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Adjust Crop</Text>
              <Pressable style={styles.previewClose} onPress={() => setShowWebCropper(false)}>
                <Ionicons name="close" size={18} color={colors.textMain} />
              </Pressable>
            </View>
            <View style={styles.cropAreaWrap}>
              {WebCropper ? (
                <WebCropper
                  image={webCropSource}
                  crop={webCrop}
                  zoom={webZoom}
                  aspect={1}
                  cropShape="round"
                  showGrid
                  onCropChange={setWebCrop}
                  onZoomChange={setWebZoom}
                  onCropComplete={(_, croppedAreaPixels) => setWebCroppedPixels(croppedAreaPixels)}
                />
              ) : null}
            </View>
            <View style={styles.zoomRow}>
              <Text style={styles.zoomLabel}>Zoom</Text>
              <View style={styles.zoomButtons}>
                <Pressable style={styles.zoomBtn} onPress={() => setWebZoom((z) => Math.max(1, z - 0.2))}>
                  <Text style={styles.zoomBtnText}>-</Text>
                </Pressable>
                <Text style={styles.zoomValue}>{webZoom.toFixed(1)}x</Text>
                <Pressable style={styles.zoomBtn} onPress={() => setWebZoom((z) => Math.min(3, z + 0.2))}>
                  <Text style={styles.zoomBtnText}>+</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalBtnSecondary} onPress={() => setShowWebCropper(false)}>
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalBtnPrimary} onPress={saveWebCroppedImage}>
                <Text style={styles.modalBtnPrimaryText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showLogoutConfirm} transparent animationType="fade" onRequestClose={() => setShowLogoutConfirm(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Ionicons name="log-out-outline" size={34} color={colors.danger} />
            <Text style={styles.modalTitle}>Confirm Logout</Text>
            <Text style={styles.modalSubtitle}>Are you sure you want to logout from this account?</Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalBtnSecondary} onPress={() => setShowLogoutConfirm(false)}>
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalBtnDanger}
                onPress={() => {
                  setShowLogoutConfirm(false);
                  if (onLogout) onLogout();
                }}
              >
                <Text style={styles.modalBtnDangerText}>Logout</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <AnimatedPopup
        visible={popup.visible}
        title={popup.title}
        message={popup.message}
        type={popup.type}
        onClose={() => setPopup((prev) => ({ ...prev, visible: false }))}
      />

      <Modal visible={showChatModal} animationType="slide" onRequestClose={closeChatSession}>
        <View style={[styles.settingsScreen, { paddingTop: TOP_SAFE_PADDING + 8 }]}>
          <View style={styles.settingsNav}>
            <Pressable style={[styles.settingsBackBtn, { width: 120 }]} onPress={closeChatSession}>
              <Ionicons name="chevron-back" size={22} color={colors.primary} />
              <Text style={styles.settingsBackText} numberOfLines={1}>Back</Text>
            </Pressable>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={styles.settingsNavTitle} numberOfLines={1}>{activeChatSession?.peerName || 'Chat'}</Text>
              <Text style={[styles.myJobMeta, { marginTop: 0, textAlign: 'right' }]} numberOfLines={1}>
                {isPeerTyping
                  ? `typing${typingDots}`
                  : !isSocketConnected
                    ? 'Connecting...'
                    : isPeerOnline
                      ? 'Online'
                      : activeChatSession?.jobTitle || 'Offline'}
              </Text>
            </View>
          </View>

          <ScrollView
            ref={chatScrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 12 }}
            showsVerticalScrollIndicator={false}
          >
            {isChatMessagesLoading ? (
              <AdminListState mode="loading" title="Loading chat..." subtitle="Please wait..." colors={colors} />
            ) : chatRenderItems.length ? (
              chatRenderItems.map((entry) => {
                if (entry.type === 'day') {
                  return (
                    <View key={entry.key} style={{ alignItems: 'center', marginBottom: 10, marginTop: 4 }}>
                      <View
                        style={{
                          borderWidth: 1,
                          borderColor: colors.border,
                          backgroundColor: colors.surface,
                          borderRadius: 999,
                          paddingHorizontal: 10,
                          paddingVertical: 4
                        }}
                      >
                        <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700' }}>{entry.label}</Text>
                      </View>
                    </View>
                  );
                }
                const item = entry.message;
                const isMine = item?.senderId === localUser?.id;
                const normalizedStatus = String(item?.status || 'SENT').toUpperCase();
                return (
                  <View
                    key={item.id}
                    style={{
                      alignSelf: isMine ? 'flex-end' : 'flex-start',
                      maxWidth: '82%',
                      marginBottom: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 14,
                      backgroundColor: isMine ? colors.primary : colors.surface,
                      borderWidth: isMine ? 0 : 1,
                      borderColor: colors.border
                    }}
                  >
                    <Text style={{ color: isMine ? '#FFFFFF' : colors.textMain, fontSize: 14 }}>{item?.message || ''}</Text>
                    <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                      <Text style={{ color: isMine ? 'rgba(255,255,255,0.85)' : colors.textSecondary, fontSize: 11 }}>
                        {formatChatTime(item?.createdAt)}
                      </Text>
                      {isMine ? (
                        normalizedStatus === 'SEEN' ? (
                          <Ionicons name="checkmark-done" size={13} color="#60A5FA" />
                        ) : normalizedStatus === 'DELIVERED' ? (
                          <Ionicons name="checkmark-done" size={13} color={isMine ? 'rgba(255,255,255,0.85)' : colors.textSecondary} />
                        ) : (
                          <Ionicons name="checkmark" size={13} color={isMine ? 'rgba(255,255,255,0.85)' : colors.textSecondary} />
                        )
                      ) : null}
                    </View>
                  </View>
                );
              })
            ) : (
              <AdminListState
                mode="empty"
                title="No messages yet"
                subtitle="Start the conversation by sending a message."
                colors={colors}
                emptySource={ADMIN_EMPTY_ANIMATION}
              />
            )}
          </ScrollView>

          {isPeerTyping ? (
            <View style={{ alignItems: 'flex-start', marginBottom: 6 }}>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 5
                }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{`typing${typingDots}`}</Text>
              </View>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingBottom: Platform.OS === 'web' ? 8 : 18 }}>
            <TextInput
              value={chatInput}
              onChangeText={(value) => {
                setChatInput(value);
                if (activeChatSession?.jobId && activeChatSession?.peerId && socketRef.current) {
                  socketRef.current.emit('typing_start', {
                    jobId: activeChatSession.jobId,
                    receiverId: activeChatSession.peerId
                  });
                  if (typingStopTimerRef.current) {
                    clearTimeout(typingStopTimerRef.current);
                  }
                  typingStopTimerRef.current = setTimeout(() => {
                    if (socketRef.current) {
                      socketRef.current.emit('typing_stop', {
                        jobId: activeChatSession.jobId,
                        receiverId: activeChatSession.peerId
                      });
                    }
                    typingStopTimerRef.current = null;
                  }, 900);
                }
              }}
              onSubmitEditing={sendChatMessage}
              onKeyPress={(event) => {
                const key = event?.nativeEvent?.key;
                const shiftKey = Boolean(event?.nativeEvent?.shiftKey);
                if (Platform.OS === 'web' && key === 'Enter' && !shiftKey) {
                  event?.preventDefault?.();
                  sendChatMessage();
                }
              }}
              placeholder="Type a message..."
              placeholderTextColor={colors.textSecondary}
              multiline
              blurOnSubmit={false}
              returnKeyType="send"
              submitBehavior="submit"
              style={[
                styles.createFieldInput,
                {
                  flex: 1,
                  minHeight: 42,
                  maxHeight: 120,
                  marginBottom: 0,
                  paddingTop: 10,
                  textAlignVertical: 'top'
                }
              ]}
            />
            <Pressable
              style={[
                {
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  backgroundColor: colors.primary,
                  paddingHorizontal: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 2,
                  shadowColor: '#0B141A',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.22,
                  shadowRadius: 4,
                  elevation: 4
                },
                isSendingChatMessage ? styles.modalBtnDisabled : null
              ]}
              disabled={isSendingChatMessage}
              onPress={sendChatMessage}
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
