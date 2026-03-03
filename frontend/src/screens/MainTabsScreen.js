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
  createCategory,
  createJob,
  applyToJob,
  getAllCategoriesAdmin,
  getAllJobs,
  getAllUsers,
  getMyApplications,
  getApprovedCategories,
  getMyCategories,
  updateCategoryStatus,
  updateJob,
  updateUserAvatarByAdmin,
  updateUserByAdmin,
  updateProfile,
  updateProfileAvatar
} from '../services/authApi';
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
    categoryId: '',
    budget: '',
    jobType: 'ONE_TIME',
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
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [isMyJobsLoading, setIsMyJobsLoading] = useState(false);
  const [myJobs, setMyJobs] = useState([]);
  const [pickerJobs, setPickerJobs] = useState([]);
  const [isPickerJobsLoading, setIsPickerJobsLoading] = useState(false);
  const [myApplications, setMyApplications] = useState([]);
  const [isMyApplicationsLoading, setIsMyApplicationsLoading] = useState(false);
  const [isApplyingJob, setIsApplyingJob] = useState(false);
  const [selectedMyJob, setSelectedMyJob] = useState(null);
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
    categoryId: '',
    budget: '',
    jobType: 'ONE_TIME',
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
  const [isAdminUsersLoading, setIsAdminUsersLoading] = useState(false);
  const [adminJobs, setAdminJobs] = useState([]);
  const [adminCategories, setAdminCategories] = useState([]);
  const [isAdminPanelLoading, setIsAdminPanelLoading] = useState(false);
  const [adminCategorySearch, setAdminCategorySearch] = useState('');
  const [debouncedAdminCategorySearch, setDebouncedAdminCategorySearch] = useState('');
  const [adminCategoryFilter, setAdminCategoryFilter] = useState('ALL');
  const [adminCategoryDraft, setAdminCategoryDraft] = useState({ name: '', description: '' });
  const [localUser, setLocalUser] = useState(user || null);
  const [popup, setPopup] = useState({ visible: false, title: '', message: '', type: 'error' });
  const contentFade = useRef(new Animated.Value(1)).current;
  const contentShift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setLocalUser(user || null);
  }, [user]);

  const userRole = localUser?.role || 'USER';
  const userMode = localUser?.userMode || 'JOB_PICKER';
  const visibleTabs = useMemo(() => getTabsByRoleAndMode(userRole, userMode), [userRole, userMode]);

  useEffect(() => {
    if (!visibleTabs.find((tab) => tab.key === activeTab)) {
      setActiveTab(visibleTabs[0]?.key || 'dashboard');
    }
  }, [activeTab, visibleTabs]);

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

  const fetchCategories = async ({ forceLoader = false } = {}) => {
    if (!token) return;
    const searchText = categorySearch.trim();
    const hasCurrentTabData = categoriesTab === 'all' ? allCategories.length > 0 : myCategories.length > 0;
    const shouldShowLoader = forceLoader || (!hasFetchedCategoriesOnce && !hasCurrentTabData);

    try {
      if (shouldShowLoader) {
        setIsCategoryLoading(true);
      }

      if (categoriesTab === 'all') {
        const approvedRes = await getApprovedCategories({ token, q: searchText || undefined });
        setAllCategories(approvedRes?.data || []);
      } else {
        const myRes = await getMyCategories({
          token,
          q: searchText || undefined,
          status: categoryFilter !== 'ALL' ? categoryFilter : undefined
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
    if (!token || userRole !== 'USER' || userMode !== 'JOB_POSTER') return;
    try {
      if (forceLoader || !myJobs.length) {
        setIsMyJobsLoading(true);
      }
      const response = await getAllJobs({ token, page: 1, limit: 200, status: 'ALL' });
      const allJobs = response?.data?.jobs || [];
      const ownJobs = allJobs.filter((item) => item?.owner?.id === localUser?.id);
      setMyJobs(ownJobs);
      setSelectedMyJob((prev) => (prev ? ownJobs.find((item) => item.id === prev.id) || null : null));
    } catch (error) {
      showPopup('Jobs Failed', error?.message || 'Unable to load your jobs.', 'error');
    } finally {
      setIsMyJobsLoading(false);
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
      setPickerJobs(jobs.filter((item) => item?.createdBy !== localUser?.id));
    } catch (error) {
      showPopup('Jobs Failed', error?.message || 'Unable to load jobs.', 'error');
    } finally {
      setIsPickerJobsLoading(false);
    }
  };

  const fetchMyApplications = async ({ forceLoader = false } = {}) => {
    if (!token || userRole !== 'USER' || userMode !== 'JOB_PICKER') return;
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
      categoryId: String(job.categoryId || ''),
      budget: String(job.budget || ''),
      jobType: String(job.jobType || 'ONE_TIME'),
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
          categoryId: editJobForm.categoryId,
          budget: Number(editJobForm.budget),
          jobType: editJobForm.jobType,
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
      await fetchMyJobs({ forceLoader: false });
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
        categoryId: '',
        budget: '',
        jobType: 'ONE_TIME',
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

  const fetchAdminCategories = async ({ forceLoader = false } = {}) => {
    if (!token || userRole !== 'ADMIN') return;
    try {
      if (forceLoader || !adminCategories.length) {
        setIsAdminPanelLoading(true);
      }
      const categoriesRes = await getAllCategoriesAdmin({
        token,
        status: adminCategoryFilter,
        q: debouncedAdminCategorySearch.trim() || undefined
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

  const handleUpdateUserDetails = async (userId, payload) => {
    if (!token || userRole !== 'ADMIN') return null;
    try {
      const response = await updateUserByAdmin({ token, userId, payload });
      const updatedUser = response?.data || null;
      if (!updatedUser) {
        showPopup('Update Failed', 'Unable to update user details.', 'error');
        return null;
      }
      setAdminUsers((prev) => prev.map((item) => (item.id === userId ? updatedUser : item)));
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
      setAdminUsers((prev) => prev.map((item) => (item.id === userId ? updatedUser : item)));
      showPopup('User Updated', 'User profile image updated successfully.', 'success');
      return updatedUser;
    } catch (error) {
      showPopup('Update Failed', error?.message || 'Unable to update user avatar.', 'error');
      return null;
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
        fetchCategories();
      }
    }
  }, [activeTab, settingsPage, categorySearch, categoryFilter, categoriesTab, token, allCategories.length, userRole]);

  useEffect(() => {
    if (!token || userRole !== 'USER' || userMode !== 'JOB_POSTER' || activeTab !== 'explore') return;
    fetchMyJobs();
  }, [activeTab, token, userRole, userMode]);

  useEffect(() => {
    if (!token || userRole !== 'USER' || userMode !== 'JOB_PICKER' || activeTab !== 'explore') return;
    fetchPickerJobs();
  }, [activeTab, token, userRole, userMode]);

  useEffect(() => {
    if (!token || userRole !== 'USER' || userMode !== 'JOB_PICKER' || activeTab !== 'messages') return;
    fetchMyApplications();
  }, [activeTab, token, userRole, userMode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAdminCategorySearch(adminCategorySearch);
    }, 450);

    return () => clearTimeout(timer);
  }, [adminCategorySearch]);

  useEffect(() => {
    if (!token || userRole !== 'ADMIN' || activeTab !== 'settings' || settingsPage !== 'categories') return;
    fetchAdminCategories();
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
    switchTab(centerTab.key);
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.pageWrap, { opacity: contentFade, transform: [{ translateY: contentShift }] }]}>
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
          onBackFromProfile={() => switchSettingsPage('main')}
          onBackFromCategories={() => switchSettingsPage('main')}
          onRequestLogout={() => setShowLogoutConfirm(true)}
          onOpenAvatarOptions={() => setShowAvatarOptions(true)}
          onOpenAvatarPreview={() => setShowAvatarPreview(true)}
          onSaveProfile={saveProfileDetails}
          isSavingProfile={isSavingProfile}
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
          onOpenMyJob={setSelectedMyJob}
          pickerJobs={pickerJobs}
          isPickerJobsLoading={isPickerJobsLoading}
          onRefreshPickerJobs={() => fetchPickerJobs({ forceLoader: true })}
          onApplyJob={handleApplyJob}
          isApplyingJob={isApplyingJob}
          myApplications={myApplications}
          isMyApplicationsLoading={isMyApplicationsLoading}
          onRefreshMyApplications={() => fetchMyApplications({ forceLoader: true })}
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
          onUpdateAdminCategoryStatus={updateAdminCategoryStatus}
          adminUsers={adminUsers}
          isAdminUsersLoading={isAdminUsersLoading}
          onRefreshAdminUsers={() => fetchAdminUsers({ forceLoader: true })}
          onSaveUserDetails={handleUpdateUserDetails}
          onSaveUserAvatar={handleUpdateUserAvatar}
          isUploadingAvatar={isUploadingAvatar}
          styles={styles}
          colors={colors}
        />
      </Animated.View>

      {activeTab === 'settings' && settingsPage === 'categories' && userRole !== 'ADMIN' ? (
        <Pressable style={styles.categoryFab} onPress={() => setActiveTab('create')}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>
      ) : null}

      <Modal visible={Boolean(selectedMyJob)} transparent animationType="fade" onRequestClose={() => setSelectedMyJob(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.myJobDetailModal}>
            <View style={styles.myJobDetailHeader}>
              <Text style={styles.myJobDetailTitle} numberOfLines={2}>
                {selectedMyJob?.title || 'Job Details'}
              </Text>
              <View style={styles.myJobStatusPill}>
                <Text style={styles.myJobStatusPillText}>{String(selectedMyJob?.status || 'OPEN').replace('_', ' ')}</Text>
              </View>
            </View>
            <Text style={styles.myJobDetailDescription}>{selectedMyJob?.description || 'No description provided.'}</Text>

            <View style={styles.myJobMetaRowSection}>
              <View style={styles.myJobMetaPill}>
                <Ionicons name="layers-outline" size={13} color={colors.primary} />
                <Text style={styles.myJobMetaPillText}>{selectedMyJob?.category?.name || '-'}</Text>
              </View>
              <View style={styles.myJobMetaPill}>
                <Ionicons name="briefcase-outline" size={13} color={colors.primary} />
                <Text style={styles.myJobMetaPillText}>{String(selectedMyJob?.jobType || '').replace('_', ' ') || '-'}</Text>
              </View>
              <View style={styles.myJobMetaPill}>
                <Ionicons name="cash-outline" size={13} color={colors.primary} />
                <Text style={styles.myJobMetaPillText}>₹{selectedMyJob?.budget || '-'}</Text>
              </View>
            </View>

            <View style={styles.myJobInfoCard}>
              <Text style={styles.myJobMeta}>
                Posted: {selectedMyJob?.createdAt ? String(selectedMyJob.createdAt).slice(0, 10) : '-'}
              </Text>
              <Text style={styles.myJobMeta}>
              Due Date: {selectedMyJob?.dueDate ? String(selectedMyJob.dueDate).slice(0, 10) : '-'}
              </Text>
            </View>

            <JobLocationCard job={selectedMyJob} title="Job Location" styles={styles} colors={colors} />

            <View style={styles.optionActionsRow}>
              <Pressable style={[styles.optionCancel, styles.optionActionBtn]} onPress={() => setSelectedMyJob(null)}>
                <Text style={styles.optionCancelText}>Close</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtnPrimary, styles.optionActionBtn, styles.modalBtnPrimaryInline]}
                onPress={() => {
                  openEditJobModal(selectedMyJob);
                  setSelectedMyJob(null);
                }}
              >
                <Ionicons name="create-outline" size={14} color="#FFFFFF" />
                <Text style={styles.modalBtnPrimaryText}>Edit Job</Text>
              </Pressable>
            </View>
          </View>
        </View>
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
                job={{ latitude: editJobForm.latitude, longitude: editJobForm.longitude, address: editJobForm.address }}
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
                  <Ionicons
                    name={active ? tab.activeIcon : tab.icon}
                    size={22}
                    color={active ? colors.primary : colors.iconInactive}
                  />
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
    </View>
  );
}
