import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPopup } from '../components/AnimatedPopup';
import { AdminListState } from '../components/AdminListState';
import { LottieLoader } from '../components/LottieLoader';
import {
  createCategory,
  createJob,
  getAllCategoriesAdmin,
  getAllJobs,
  getAllUsers,
  getApprovedCategories,
  getMyCategories,
  updateCategoryStatus,
  updateUserAccess,
  updateProfile,
  updateProfileAvatar
} from '../services/authApi';
import { COUNTRY_CODES } from '../constants/countryCodes';

const DEFAULT_AVATAR_URL = null;
const TAB_BAR_HEIGHT = 74;
const TAB_BAR_SHADOW_SPACE = 8;
const TOP_SAFE_PADDING = Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight || 0) + 10;
const THEME_MODE_KEY = 'app_theme_mode';
const WebCropper = Platform.OS === 'web' ? require('react-easy-crop').default : null;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
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

const COUNTRY_PHONE_RULES = {
  '+91': { exact: 10 },
  '+1': { exact: 10 },
  '+44': { min: 10, max: 10 },
  '+61': { exact: 9 },
  '+971': { exact: 9 }
};

const getPhoneRule = (code) => COUNTRY_PHONE_RULES[code] || { min: 6, max: 15 };
const COUNTRY_CODE_LIST = Array.from(new Set(COUNTRY_CODES.map((item) => item.code))).sort(
  (a, b) => b.length - a.length
);

const splitPhoneByCountryCode = (rawPhone, fallbackCode = '+91') => {
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

const createWebImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = (error) => reject(error);
    image.src = url;
  });

const getWebCroppedDataUrl = async (imageSrc, pixelCrop, mimeType = 'image/jpeg') => {
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

const lightTheme = {
  background: '#F5F7FB',
  surface: '#FFFFFF',
  primary: '#0F766E',
  primarySoft: '#DFF4F2',
  textMain: '#111827',
  textSecondary: '#6B7280',
  border: '#D1D5DB',
  iconInactive: '#94A3B8',
  danger: '#DC2626',
  pageSubtitle: '#64748B',
  sheet: '#F8FAFC'
};

const darkTheme = {
  background: '#0B1220',
  surface: '#111A2E',
  primary: '#2DD4BF',
  primarySoft: '#133332',
  textMain: '#F8FAFC',
  textSecondary: '#94A3B8',
  border: '#263247',
  iconInactive: '#64748B',
  danger: '#EF4444',
  pageSubtitle: '#A5B4C8',
  sheet: '#17233A'
};

const BASE_TABS_BY_ROLE = {
  JOB_PICKER: [
    { key: 'dashboard', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
    { key: 'explore', label: 'Jobs', icon: 'briefcase-outline', activeIcon: 'briefcase' },
    { key: 'create', label: '', icon: 'paper-plane-outline', activeIcon: 'paper-plane' },
    { key: 'messages', label: 'Chats', icon: 'chatbubble-ellipses-outline', activeIcon: 'chatbubble-ellipses' },
    { key: 'settings', label: 'Settings', icon: 'settings-outline', activeIcon: 'settings' }
  ],
  JOB_POSTER: [
    { key: 'dashboard', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
    { key: 'explore', label: 'My Jobs', icon: 'briefcase-outline', activeIcon: 'briefcase' },
    { key: 'create', label: '', icon: 'add', activeIcon: 'add' },
    { key: 'messages', label: 'Applicants', icon: 'people-outline', activeIcon: 'people' },
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

const getTabsByRole = (role) => BASE_TABS_BY_ROLE[role] || BASE_TABS_BY_ROLE.JOB_PICKER;
const getRoleLabel = (role) =>
  role === 'ADMIN' ? 'Administrator' : role === 'JOB_POSTER' ? 'Job Poster' : 'Job Picker';
const formatDateValue = (value) => (value ? value.toISOString().slice(0, 10) : '');

function AvatarFallback({ size }) {
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

function AvatarView({ imageUrl, size, colors, showBorder = false, iconSize = 28 }) {
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

function PageCard({ title, subtitle, icon, styles, colors }) {
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

function SettingsOption({ icon, title, subtitle, onPress, styles, colors, right = true }) {
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

function ProfilePage({
  user,
  onBack,
  onOpenAvatarOptions,
  onOpenAvatarPreview,
  onSaveProfile,
  isSavingProfile,
  isUploadingAvatar,
  styles,
  colors
}) {
  const avatarUrl = user?.avatar || DEFAULT_AVATAR_URL;
  const [form, setForm] = useState({
    name: user?.name || '',
    username: user?.username || '',
    age: user?.age ? String(user.age) : '',
    gender: user?.gender || 'OTHER',
    address: user?.address || '',
    phone: user?.phone || '',
    bio: user?.bio || ''
  });
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeSearch, setCodeSearch] = useState('');

  useEffect(() => {
    setForm({
      name: user?.name || '',
      username: user?.username || '',
      age: user?.age ? String(user.age) : '',
      gender: user?.gender || 'OTHER',
      address: user?.address || '',
      phone: user?.phone || '',
      bio: user?.bio || ''
    });
  }, [user]);

  const { code: selectedCode, local: localPhone } = splitPhoneByCountryCode(form.phone, '+91');
  const phoneRule = getPhoneRule(selectedCode);
  const filteredCodes = COUNTRY_CODES.filter((item) => item.name.toLowerCase().includes(codeSearch.toLowerCase()));
  const selectedCodeOption = filteredCodes.find((item) => item.code === selectedCode);
  const sortedCodeOptions = [
    ...(selectedCodeOption ? [selectedCodeOption] : []),
    ...filteredCodes.filter((item) => item.code !== selectedCode)
  ];

  return (
    <View style={styles.settingsScreen}>
      <View style={styles.settingsNav}>
        <Pressable style={styles.settingsBackBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text style={styles.settingsBackText}>Settings</Text>
        </Pressable>
        <Text style={styles.settingsNavTitle}>Profile</Text>
        <View style={styles.settingsNavRight} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        <View style={styles.profileHero}>
          <Pressable style={styles.avatarWrap} onPress={onOpenAvatarPreview}>
            <AvatarView imageUrl={avatarUrl} size={88} colors={colors} showBorder />
            <Pressable style={styles.avatarBadge} onPress={onOpenAvatarOptions} disabled={isUploadingAvatar}>
              {isUploadingAvatar ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              )}
            </Pressable>
          </Pressable>

          <Text style={styles.profileName}>{user?.name || 'User'}</Text>
          <Text style={styles.profileEmail}>{user?.email || 'No email available'}</Text>
          <Text style={styles.profileHint}>Tap photo to view profile. Tap camera icon to edit.</Text>
        </View>

        <View style={styles.profileEditCard}>
          <Text style={styles.profileSectionTitle}>Editable Profile</Text>
          <View style={styles.profileInputWrap}>
            <Text style={styles.profileInputLabel}>Full Name</Text>
            <TextInput
              style={styles.profileInput}
              value={form.name}
              onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
              placeholder="Your name"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.profileInputWrap}>
            <Text style={styles.profileInputLabel}>Username (unique)</Text>
            <TextInput
              style={styles.profileInput}
              value={form.username}
              autoCapitalize="none"
              onChangeText={(value) => setForm((prev) => ({ ...prev, username: value.toLowerCase().replace(/\s/g, '') }))}
              placeholder="username"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.profileInputWrap}>
            <Text style={styles.profileInputLabel}>Email (read only)</Text>
            <View style={[styles.profileInput, styles.profileReadOnly]}>
              <Text style={styles.profileReadOnlyText}>{user?.email || '-'}</Text>
            </View>
          </View>

          <View style={styles.profileInputWrap}>
            <Text style={styles.profileInputLabel}>Phone</Text>
            <View style={styles.profilePhoneRow}>
              <Pressable style={styles.profileCodeBtn} onPress={() => setShowCodeModal(true)}>
                <Text style={styles.profileCodeText}>{selectedCode}</Text>
              </Pressable>
              <TextInput
                style={styles.profilePhoneInput}
                value={localPhone}
                keyboardType="phone-pad"
                maxLength={phoneRule.exact || phoneRule.max}
                onChangeText={(value) => {
                  const digits = value.replace(/[^0-9]/g, '');
                  setForm((prev) => ({ ...prev, phone: `${selectedCode}${digits}` }));
                }}
                placeholder="Phone number"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.profileInputWrap}>
            <Text style={styles.profileInputLabel}>Age</Text>
            <TextInput
              style={styles.profileInput}
              value={form.age}
              keyboardType="number-pad"
              onChangeText={(value) => setForm((prev) => ({ ...prev, age: value.replace(/[^0-9]/g, '') }))}
              placeholder="Age"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.profileInputWrap}>
            <Text style={styles.profileInputLabel}>Gender</Text>
            <View style={styles.genderRow}>
              {['MALE', 'FEMALE', 'OTHER'].map((g) => (
                <Pressable
                  key={g}
                  style={[styles.genderPill, form.gender === g && styles.genderPillActive]}
                  onPress={() => setForm((prev) => ({ ...prev, gender: g }))}
                >
                  <Text style={[styles.genderPillText, form.gender === g && styles.genderPillTextActive]}>
                    {g.charAt(0) + g.slice(1).toLowerCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.profileInputWrap}>
            <Text style={styles.profileInputLabel}>Address</Text>
            <TextInput
              style={[styles.profileInput, styles.profileMultiline]}
              value={form.address}
              multiline
              onChangeText={(value) => setForm((prev) => ({ ...prev, address: value }))}
              placeholder="Your address"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.profileInputWrap}>
            <Text style={styles.profileInputLabel}>Bio</Text>
            <TextInput
              style={[styles.profileInput, styles.profileMultiline]}
              value={form.bio}
              multiline
              onChangeText={(value) => setForm((prev) => ({ ...prev, bio: value }))}
              placeholder="Write something about yourself"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <Pressable
            style={styles.profileSaveBtn}
            onPress={() => onSaveProfile(form)}
            disabled={isSavingProfile}
          >
            {isSavingProfile ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="save-outline" size={16} color="#FFFFFF" />
                <Text style={styles.profileSaveBtnText}>Save Profile</Text>
              </>
            )}
          </Pressable>
        </View>

        <Modal visible={showCodeModal} transparent animationType="fade" onRequestClose={() => setShowCodeModal(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.codeSheet}>
              <Text style={styles.optionTitle}>Country Code</Text>
              <TextInput
                value={codeSearch}
                onChangeText={setCodeSearch}
                style={styles.codeSearchInput}
                placeholder="Search country"
                placeholderTextColor={colors.textSecondary}
              />
              <ScrollView style={styles.codeScroll}>
                {sortedCodeOptions.map((item) => (
                  <Pressable
                    key={`${item.iso}-${item.code}`}
                    style={[styles.codeRow, item.code === selectedCode && styles.codeRowSelected]}
                    onPress={() => {
                      const codeRule = getPhoneRule(item.code);
                      const limit = codeRule.exact || codeRule.max;
                      const limitedLocal = localPhone.slice(0, limit);
                      setForm((prev) => ({ ...prev, phone: `${item.code}${limitedLocal}` }));
                      setShowCodeModal(false);
                      setCodeSearch('');
                    }}
                  >
                    <Text style={styles.codeRowName}>{item.name}</Text>
                    <Text style={styles.codeRowCode}>{item.code}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

function CategoryStatusBadge({ status, styles }) {
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

function CategoryPage({
  onBack,
  isLoading,
  hasFetchedOnce,
  categoriesTab,
  setCategoriesTab,
  categorySearch,
  setCategorySearch,
  categoryFilter,
  setCategoryFilter,
  allCategories,
  myCategories,
  onRefresh,
  styles,
  colors
}) {
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const data = categoriesTab === 'all' ? allCategories : myCategories;
  const filterOptions = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'];

  return (
    <View style={styles.settingsScreen}>
      <View style={styles.settingsNav}>
        <Pressable style={styles.settingsBackBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text style={styles.settingsBackText}>Settings</Text>
        </Pressable>
        <Text style={styles.settingsNavTitle}>Categories</Text>
        <View style={styles.settingsNavRight}>
          <Pressable style={styles.settingsNavIconBtn} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={20} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.categoryTabWrap}>
        <Pressable
          style={[styles.categoryTabBtn, categoriesTab === 'all' && styles.categoryTabBtnActive]}
          onPress={() => setCategoriesTab('all')}
        >
          <Text style={[styles.categoryTabText, categoriesTab === 'all' && styles.categoryTabTextActive]}>All Categories</Text>
        </Pressable>
        <Pressable
          style={[styles.categoryTabBtn, categoriesTab === 'mine' && styles.categoryTabBtnActive]}
          onPress={() => setCategoriesTab('mine')}
        >
          <Text style={[styles.categoryTabText, categoriesTab === 'mine' && styles.categoryTabTextActive]}>My Categories</Text>
        </Pressable>
      </View>

      <View style={styles.categorySearchRow}>
        <View style={styles.categorySearchWrap}>
          <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
          <TextInput
            value={categorySearch}
            onChangeText={setCategorySearch}
            placeholder="Search categories..."
            placeholderTextColor={colors.textSecondary}
            style={styles.categorySearchInput}
          />
        </View>
        {categoriesTab === 'mine' ? (
          <Pressable style={styles.categoryFilterIconBtn} onPress={() => setShowFilterModal(true)}>
            <Ionicons name="filter-outline" size={18} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <View key={`skeleton-${idx}`} style={styles.categorySkeletonCard}>
              <View style={styles.categorySkeletonTitle} />
              <View style={styles.categorySkeletonLine} />
              <View style={[styles.categorySkeletonLine, styles.categorySkeletonLineShort]} />
            </View>
          ))
        ) : data.length ? (
          data.map((item) => (
            <Pressable key={item.id} style={styles.categoryCard} onPress={() => setSelectedItem(item)}>
              <View style={styles.categoryCardTop}>
                <Text style={styles.categoryName}>{item.name}</Text>
                {categoriesTab === 'mine' ? <CategoryStatusBadge status={item.status} styles={styles} /> : null}
              </View>
              <Text style={styles.categoryDescription}>{item.description || 'No description provided.'}</Text>
            </Pressable>
          ))
        ) : hasFetchedOnce ? (
          <View style={styles.categoryEmptyCard}>
            <Ionicons name="layers-outline" size={24} color={colors.textSecondary} />
            <Text style={styles.categoryEmptyText}>No categories found</Text>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={showFilterModal} transparent animationType="fade" onRequestClose={() => setShowFilterModal(false)}>
        <Pressable style={styles.filterBackdrop} onPress={() => setShowFilterModal(false)}>
          <Pressable style={styles.categoryFilterModal} onPress={() => {}}>
            <Text style={styles.optionTitle}>Filter My Categories</Text>
            <Text style={styles.categoryFilterHint}>Choose status to refine your categories</Text>
            {filterOptions.map((option) => (
              <Pressable
                key={option}
                style={[styles.categoryFilterOption, categoryFilter === option && styles.categoryFilterOptionActive]}
                onPress={() => {
                  setCategoryFilter(option);
                  setShowFilterModal(false);
                }}
              >
                <View style={styles.categoryFilterOptionLeft}>
                  <Ionicons
                    name={
                      option === 'ALL'
                        ? 'apps-outline'
                        : option === 'APPROVED'
                          ? 'checkmark-circle-outline'
                          : option === 'REJECTED'
                            ? 'close-circle-outline'
                            : 'time-outline'
                    }
                    size={16}
                    color={categoryFilter === option ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.categoryFilterOptionText, categoryFilter === option && styles.categoryFilterOptionTextActive]}>
                    {option}
                  </Text>
                </View>
                {categoryFilter === option ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={Boolean(selectedItem)} transparent animationType="fade" onRequestClose={() => setSelectedItem(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.categoryDetailModal}>
            <Text style={styles.categoryDetailTitle}>{selectedItem?.name || ''}</Text>
            <Text style={styles.categoryDetailDescription}>{selectedItem?.description || 'No description provided.'}</Text>
            {categoriesTab === 'mine' ? (
              <View style={styles.categoryDetailStatusWrap}>
                <Text style={styles.categoryDetailStatusLabel}>Status</Text>
                <CategoryStatusBadge status={selectedItem?.status} styles={styles} />
              </View>
            ) : null}
            <Pressable style={styles.optionCancel} onPress={() => setSelectedItem(null)}>
              <Text style={styles.optionCancelText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function AdminUsersPage({ users, isLoading, onRefresh, onUpdateAccess, styles, colors }) {
  return (
    <View style={styles.settingsScreen}>
      <View style={styles.settingsNav}>
        <View style={styles.settingsNavRight} />
        <Text style={styles.settingsNavTitle}>User Access</Text>
        <Pressable style={styles.settingsNavIconBtn} onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={18} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        {isLoading ? (
          <View style={styles.centerLoaderWrap}>
            <LottieLoader inline size={94} text="Loading users..." />
            <Text style={styles.pageSubtitle}>Loading users...</Text>
          </View>
        ) : users.length ? (
          users.map((item) => (
            <View key={item.id} style={styles.adminUserCard}>
              <View style={styles.adminUserHead}>
                <Text style={styles.adminUserName}>{item.name}</Text>
                <Text style={styles.adminUserMeta}>{item.email}</Text>
              </View>

              <View style={styles.adminControlRow}>
                {['JOB_PICKER', 'JOB_POSTER', 'ADMIN'].map((roleOption) => (
                  <Pressable
                    key={`${item.id}-${roleOption}`}
                    style={[styles.adminChip, item.role === roleOption && styles.adminChipActive]}
                    onPress={() => onUpdateAccess(item.id, { role: roleOption })}
                  >
                    <Text style={[styles.adminChipText, item.role === roleOption && styles.adminChipTextActive]}>
                      {roleOption === 'JOB_PICKER' ? 'Picker' : roleOption === 'JOB_POSTER' ? 'Poster' : 'Admin'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.adminStatusRow}>
                <Pressable
                  style={[styles.adminStatusBtn, item.status === 'ACTIVE' && styles.adminStatusBtnActive]}
                  onPress={() => onUpdateAccess(item.id, { status: 'ACTIVE' })}
                >
                  <Text style={[styles.adminStatusText, item.status === 'ACTIVE' && styles.adminStatusTextActive]}>
                    Active
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.adminStatusBtn, item.status === 'DELETED' && styles.adminStatusBtnDanger]}
                  onPress={() => onUpdateAccess(item.id, { status: 'DELETED' })}
                >
                  <Text style={[styles.adminStatusText, item.status === 'DELETED' && styles.adminStatusTextDanger]}>
                    Disable
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.centerLoaderWrap}>
            <Ionicons name="people-outline" size={36} color={colors.iconInactive} />
            <Text style={styles.pageSubtitle}>No users found.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function AdminModerationPage({
  adminPanelTab,
  setAdminPanelTab,
  jobs,
  categories,
  isLoading,
  onRefresh,
  categorySearch,
  setCategorySearch,
  categoryFilter,
  setCategoryFilter,
  categoryDraft,
  setCategoryDraft,
  onCreateCategory,
  onUpdateCategoryStatus,
  styles,
  colors
}) {
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [statusPickerItem, setStatusPickerItem] = useState(null);
  const [pendingStatusChange, setPendingStatusChange] = useState(null);
  const adminFilterOptions = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'];
  const closeCreateCategoryModal = () => {
    setShowCreateModal(false);
    setCategoryDraft({ name: '', description: '' });
  };

  return (
    <View style={styles.settingsScreen}>
      <View style={styles.settingsNav}>
        <View style={styles.settingsNavRight} />
        <Text style={styles.settingsNavTitle}>Admin Panel</Text>
        <Pressable style={styles.settingsNavIconBtn} onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={18} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.adminPanelTabs}>
        <Pressable
          style={[styles.adminPanelTabBtn, adminPanelTab === 'jobs' && styles.adminPanelTabBtnActive]}
          onPress={() => setAdminPanelTab('jobs')}
        >
          <Text style={[styles.adminPanelTabText, adminPanelTab === 'jobs' && styles.adminPanelTabTextActive]}>All Jobs</Text>
        </Pressable>
        <Pressable
          style={[styles.adminPanelTabBtn, adminPanelTab === 'categories' && styles.adminPanelTabBtnActive]}
          onPress={() => setAdminPanelTab('categories')}
        >
          <Text style={[styles.adminPanelTabText, adminPanelTab === 'categories' && styles.adminPanelTabTextActive]}>
            All Categories
          </Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        {isLoading ? (
          <AdminListState
            mode="loading"
            title={adminPanelTab === 'jobs' ? 'Loading all jobs...' : 'Loading all categories...'}
            subtitle="Please wait while we fetch latest records."
            colors={colors}
          />
        ) : adminPanelTab === 'jobs' ? (
          jobs.length ? (
            jobs.map((job) => (
              <View key={job.id} style={styles.adminJobCard}>
                <Text style={styles.adminJobTitle}>{job.title}</Text>
                <Text style={styles.adminJobMeta}>Category: {job?.category?.name || '-'}</Text>
                <Text style={styles.adminJobMeta}>Posted By: {job?.owner?.name || '-'}</Text>
                <Text style={styles.adminJobMeta}>Status: {job.status}</Text>
                <Text style={styles.adminJobMeta}>Budget: {job.budget}</Text>
              </View>
            ))
          ) : (
            <AdminListState
              mode="empty"
              title="No jobs found"
              subtitle="Try changing filters or create a new job."
              colors={colors}
              emptySource={ADMIN_EMPTY_ANIMATION}
            />
          )
        ) : (
          <>
            <View style={styles.adminCategoryToolbar}>
              <View style={styles.categorySearchWrap}>
                <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
                <TextInput
                  value={categorySearch}
                  onChangeText={setCategorySearch}
                  placeholder="Search categories..."
                  placeholderTextColor={colors.textSecondary}
                  style={styles.categorySearchInput}
                />
              </View>
              <Pressable style={styles.categoryFilterIconBtn} onPress={() => setShowCreateModal(true)}>
                <Ionicons name="add" size={18} color={colors.primary} />
              </Pressable>
              <Pressable style={styles.categoryFilterIconBtn} onPress={() => setShowFilterModal(true)}>
                <Ionicons name="filter-outline" size={18} color={colors.primary} />
              </Pressable>
            </View>

            {categories.length ? (
              categories.map((item) => (
                <Pressable key={item.id} style={styles.adminCategoryCard} onPress={() => setSelectedCategory(item)}>
                  <View style={styles.adminCategoryTop}>
                    <View style={styles.adminCategoryNameWrap}>
                      <Text style={styles.adminCategoryName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.adminCategoryDescriptionOneLine} numberOfLines={1}>
                        {item.description || 'No description provided.'}
                      </Text>
                    </View>
                    <Pressable
                      style={styles.adminCategoryDropdownBtn}
                      onPress={(event) => {
                        event?.stopPropagation?.();
                        setStatusPickerItem(item);
                      }}
                    >
                      <Text style={styles.adminCategoryDropdownText}>{item.status}</Text>
                      <Ionicons name="chevron-down" size={14} color={colors.primary} />
                    </Pressable>
                  </View>
                </Pressable>
              ))
            ) : (
              <AdminListState
                mode="empty"
                title="No categories found"
                subtitle="Use + button to create a category or adjust filters."
                colors={colors}
                emptySource={ADMIN_EMPTY_ANIMATION}
              />
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={showFilterModal} transparent animationType="fade" onRequestClose={() => setShowFilterModal(false)}>
        <Pressable style={styles.filterBackdrop} onPress={() => setShowFilterModal(false)}>
          <Pressable style={styles.categoryFilterModal} onPress={() => {}}>
            <Text style={styles.optionTitle}>Filter Categories</Text>
            <Text style={styles.categoryFilterHint}>Choose status to refine admin categories</Text>
            {adminFilterOptions.map((option) => (
              <Pressable
                key={option}
                style={[styles.categoryFilterOption, categoryFilter === option && styles.categoryFilterOptionActive]}
                onPress={() => {
                  setCategoryFilter(option);
                  setShowFilterModal(false);
                }}
              >
                <View style={styles.categoryFilterOptionLeft}>
                  <Ionicons
                    name={
                      option === 'ALL'
                        ? 'apps-outline'
                        : option === 'APPROVED'
                          ? 'checkmark-circle-outline'
                          : option === 'REJECTED'
                            ? 'close-circle-outline'
                            : 'time-outline'
                    }
                    size={16}
                    color={categoryFilter === option ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.categoryFilterOptionText, categoryFilter === option && styles.categoryFilterOptionTextActive]}>
                    {option}
                  </Text>
                </View>
                {categoryFilter === option ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={Boolean(selectedCategory)} transparent animationType="fade" onRequestClose={() => setSelectedCategory(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.categoryDetailModal}>
            <Text style={styles.categoryDetailTitle}>{selectedCategory?.name || ''}</Text>
            <Text style={styles.categoryDetailDescription}>{selectedCategory?.description || 'No description provided.'}</Text>
            <View style={styles.categoryDetailStatusWrap}>
              <Text style={styles.categoryDetailStatusLabel}>Status</Text>
              <CategoryStatusBadge status={selectedCategory?.status} styles={styles} />
            </View>
            <View style={styles.optionActionsRow}>
              <Pressable
                style={[styles.optionCancel, styles.optionActionBtn]}
                onPress={() => {
                  if (selectedCategory) {
                    setStatusPickerItem(selectedCategory);
                  }
                }}
              >
                <Text style={styles.optionCancelText}>Change Status</Text>
              </Pressable>
              <Pressable style={[styles.modalBtnPrimary, styles.optionActionBtn]} onPress={() => setSelectedCategory(null)}>
                <Text style={styles.modalBtnPrimaryText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showCreateModal} transparent animationType="fade" onRequestClose={closeCreateCategoryModal}>
        <Pressable style={styles.modalBackdrop} onPress={closeCreateCategoryModal}>
          <Pressable style={styles.optionModal} onPress={() => {}}>
            <View style={styles.adminSectionHeader}>
              <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
              <Text style={styles.adminCreateCategoryTitle}>Create Category</Text>
            </View>
            <TextInput
              value={categoryDraft.name}
              onChangeText={(value) => setCategoryDraft((prev) => ({ ...prev, name: value }))}
              placeholder="Category name"
              placeholderTextColor={colors.textSecondary}
              style={styles.categoryCreateInput}
            />
            <TextInput
              value={categoryDraft.description}
              onChangeText={(value) => setCategoryDraft((prev) => ({ ...prev, description: value }))}
              placeholder="Category description"
              placeholderTextColor={colors.textSecondary}
              style={[styles.categoryCreateInput, styles.categoryCreateDescription]}
              multiline
            />
            <View style={styles.optionActionsRow}>
              <Pressable style={[styles.optionCancel, styles.optionActionBtn]} onPress={closeCreateCategoryModal}>
                <Text style={styles.optionCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtnPrimary, styles.optionActionBtn]}
                onPress={async () => {
                  const created = await onCreateCategory();
                  if (created) {
                    closeCreateCategoryModal();
                  }
                }}
              >
                <Text style={styles.modalBtnPrimaryText}>Create</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={Boolean(statusPickerItem)} transparent animationType="fade" onRequestClose={() => setStatusPickerItem(null)}>
        <Pressable style={styles.filterBackdrop} onPress={() => setStatusPickerItem(null)}>
          <Pressable style={styles.categoryFilterModal} onPress={() => {}}>
            <Text style={styles.optionTitle}>Change Status</Text>
            <Text style={styles.categoryFilterHint}>{statusPickerItem?.name || ''}</Text>
            {['PENDING', 'APPROVED', 'REJECTED'].map((status) => (
              <Pressable
                key={status}
                style={[styles.categoryFilterOption, statusPickerItem?.status === status && styles.categoryFilterOptionActive]}
                onPress={() => {
                  if (!statusPickerItem || statusPickerItem.status === status) {
                    setStatusPickerItem(null);
                    return;
                  }
                  setPendingStatusChange({
                    categoryId: statusPickerItem.id,
                    categoryName: statusPickerItem.name,
                    fromStatus: statusPickerItem.status,
                    toStatus: status
                  });
                  setStatusPickerItem(null);
                }}
              >
                <Text style={[styles.categoryFilterOptionText, statusPickerItem?.status === status && styles.categoryFilterOptionTextActive]}>
                  {status}
                </Text>
                {statusPickerItem?.status === status ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={Boolean(pendingStatusChange)}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingStatusChange(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.optionModal}>
            <Text style={styles.optionTitle}>Confirm Status Change</Text>
            <Text style={styles.optionMessage}>
              {`Change "${pendingStatusChange?.categoryName || ''}" from ${pendingStatusChange?.fromStatus || ''} to ${pendingStatusChange?.toStatus || ''}?`}
            </Text>
            <View style={styles.optionActionsRow}>
              <Pressable style={[styles.optionCancel, styles.optionActionBtn]} onPress={() => setPendingStatusChange(null)}>
                <Text style={styles.optionCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtnPrimary, styles.optionActionBtn]}
                onPress={async () => {
                  const payload = pendingStatusChange;
                  setPendingStatusChange(null);
                  if (!payload) return;
                  await onUpdateCategoryStatus(payload.categoryId, payload.toStatus);
                  setSelectedCategory((prev) =>
                    prev && prev.id === payload.categoryId ? { ...prev, status: payload.toStatus } : prev
                  );
                }}
              >
                <Text style={styles.modalBtnPrimaryText}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function CreateJobPage({
  userRole,
  token,
  jobForm,
  setJobForm,
  approvedCategoryOptions,
  onCreateJob,
  onValidationError,
  isCreatingJob,
  styles,
  colors
}) {
  const scrollRef = useRef(null);
  const titleRef = useRef(null);
  const descriptionRef = useRef(null);
  const budgetRef = useRef(null);
  const locationLinkRef = useRef(null);
  const addressRef = useRef(null);
  const fieldYRef = useRef({});
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerPage, setPickerPage] = useState('form');
  const [mapZoom, setMapZoom] = useState(13);
  const [mapCanvasLayout, setMapCanvasLayout] = useState({ width: 0, height: 0 });
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSearchResults, setMapSearchResults] = useState([]);
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const [draftCoordinate, setDraftCoordinate] = useState(
    jobForm.latitude !== null && jobForm.longitude !== null
      ? { latitude: jobForm.latitude, longitude: jobForm.longitude }
      : { latitude: 22.3039, longitude: 70.8022 }
  );
  const pinchStartDistanceRef = useRef(null);
  const pinchStartZoomRef = useRef(mapZoom);
  const isPinchingRef = useRef(false);
  const suppressNextTapRef = useRef(false);
  const [errors, setErrors] = useState({});
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardRise = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardFade, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(cardRise, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true })
    ]).start();
  }, [cardFade, cardRise]);

  const selectedCategory = approvedCategoryOptions.find((item) => item.id === jobForm.categoryId);
  const dueDateValue = jobForm.dueDate ? new Date(jobForm.dueDate) : new Date();
  const registerFieldY = (fieldName) => (event) => {
    fieldYRef.current[fieldName] = event.nativeEvent.layout.y;
  };

  const scrollToField = (fieldName) => {
    const y = fieldYRef.current[fieldName];
    if (typeof y === 'number') {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 20), animated: true });
    }
  };

  const focusFirstInvalidField = (fieldName) => {
    if (fieldName === 'title') {
      scrollToField('title');
      setTimeout(() => titleRef.current?.focus(), 120);
      return;
    }
    if (fieldName === 'description') {
      scrollToField('description');
      setTimeout(() => descriptionRef.current?.focus(), 120);
      return;
    }
    if (fieldName === 'categoryId') {
      scrollToField('categoryId');
      setShowCategoryDropdown(true);
      return;
    }
    if (fieldName === 'budget') {
      scrollToField('budget');
      setTimeout(() => budgetRef.current?.focus(), 120);
      return;
    }
    if (fieldName === 'jobType') {
      scrollToField('jobType');
      return;
    }
    if (fieldName === 'locationLink') {
      scrollToField('locationLink');
      setTimeout(() => locationLinkRef.current?.focus(), 120);
      return;
    }
    if (fieldName === 'address') {
      scrollToField('address');
      setTimeout(() => addressRef.current?.focus(), 120);
      return;
    }
    if (fieldName === 'status') {
      scrollToField('status');
      return;
    }
    if (fieldName === 'map') {
      setPickerPage('map');
    }
  };

  const confirmMapSelection = () => {
    setJobForm((prev) => ({
      ...prev,
      latitude: Number(draftCoordinate.latitude.toFixed(6)),
      longitude: Number(draftCoordinate.longitude.toFixed(6)),
      locationLink: `https://maps.google.com/?q=${draftCoordinate.latitude.toFixed(6)},${draftCoordinate.longitude.toFixed(6)}`
    }));
    setErrors((prev) => ({ ...prev, map: '' }));
    setPickerPage('form');
  };

  const lngToPixelX = (lng, zoom) => {
    const worldSize = 256 * 2 ** zoom;
    return ((lng + 180) / 360) * worldSize;
  };

  const latToPixelY = (lat, zoom) => {
    const worldSize = 256 * 2 ** zoom;
    const latRad = (lat * Math.PI) / 180;
    const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
    return worldSize / 2 - (worldSize * mercN) / (2 * Math.PI);
  };

  const pixelXToLng = (x, zoom) => {
    const worldSize = 256 * 2 ** zoom;
    return (x / worldSize) * 360 - 180;
  };

  const pixelYToLat = (y, zoom) => {
    const worldSize = 256 * 2 ** zoom;
    const n = Math.PI - (2 * Math.PI * y) / worldSize;
    return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  };

  const getMapTopLeftWorld = () => {
    const width = mapCanvasLayout.width || 1;
    const height = mapCanvasLayout.height || 1;
    const centerX = lngToPixelX(draftCoordinate.longitude, mapZoom);
    const centerY = latToPixelY(draftCoordinate.latitude, mapZoom);
    return { topLeftWorldX: centerX - width / 2, topLeftWorldY: centerY - height / 2, width, height };
  };

  const mapTiles = useMemo(() => {
    if (!mapCanvasLayout.width || !mapCanvasLayout.height) return [];
    const { topLeftWorldX, topLeftWorldY, width, height } = getMapTopLeftWorld();
    const startTileX = Math.floor(topLeftWorldX / TILE_SIZE);
    const startTileY = Math.floor(topLeftWorldY / TILE_SIZE);
    const endTileX = Math.floor((topLeftWorldX + width) / TILE_SIZE);
    const endTileY = Math.floor((topLeftWorldY + height) / TILE_SIZE);
    const limit = 2 ** mapZoom;
    const tiles = [];

    for (let tileX = startTileX; tileX <= endTileX; tileX += 1) {
      for (let tileY = startTileY; tileY <= endTileY; tileY += 1) {
        if (tileY < 0 || tileY >= limit) continue;
        const wrappedX = ((tileX % limit) + limit) % limit;
        tiles.push({
          key: `${tileX}-${tileY}-${mapZoom}`,
          left: tileX * TILE_SIZE - topLeftWorldX,
          top: tileY * TILE_SIZE - topLeftWorldY,
          url: `https://tile.openstreetmap.org/${mapZoom}/${wrappedX}/${tileY}.png`
        });
      }
    }
    return tiles;
  }, [mapCanvasLayout.width, mapCanvasLayout.height, draftCoordinate.latitude, draftCoordinate.longitude, mapZoom]);

  const pickFromMapPress = (event) => {
    if (suppressNextTapRef.current) {
      suppressNextTapRef.current = false;
      return;
    }
    const { topLeftWorldX, topLeftWorldY, width, height } = getMapTopLeftWorld();
    const px = clamp(event.nativeEvent.locationX, 0, width);
    const py = clamp(event.nativeEvent.locationY, 0, height);

    const targetX = topLeftWorldX + px;
    const targetY = topLeftWorldY + py;

    const selectedLng = pixelXToLng(targetX, mapZoom);
    const selectedLat = pixelYToLat(targetY, mapZoom);

    setDraftCoordinate({
      latitude: Number(selectedLat.toFixed(6)),
      longitude: Number(selectedLng.toFixed(6))
    });
  };

  const getTouchDistance = (touches) => {
    if (!touches || touches.length < 2) return null;
    const a = touches[0];
    const b = touches[1];
    const dx = a.pageX - b.pageX;
    const dy = a.pageY - b.pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const onMapTouchStart = (event) => {
    const distance = getTouchDistance(event.nativeEvent.touches);
    if (!distance) return;
    pinchStartDistanceRef.current = distance;
    pinchStartZoomRef.current = mapZoom;
    isPinchingRef.current = true;
  };

  const onMapTouchMove = (event) => {
    if (!isPinchingRef.current) return;
    const distance = getTouchDistance(event.nativeEvent.touches);
    const startDistance = pinchStartDistanceRef.current;
    if (!distance || !startDistance) return;

    const scale = distance / startDistance;
    const nextZoom = clamp(Math.round(pinchStartZoomRef.current + Math.log2(scale) * 3), 2, 18);
    if (nextZoom !== mapZoom) {
      setMapZoom(nextZoom);
    }
  };

  const onMapTouchEnd = (event) => {
    if (!event.nativeEvent.touches || event.nativeEvent.touches.length < 2) {
      if (isPinchingRef.current) {
        suppressNextTapRef.current = true;
      }
      isPinchingRef.current = false;
      pinchStartDistanceRef.current = null;
    }
  };

  const searchMapLocation = async () => {
    const query = String(mapSearchQuery || '').trim();
    if (!query) {
      setMapSearchResults([]);
      return;
    }

    try {
      setIsSearchingMap(true);
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6&lang=en`
      );
      const data = await response.json();
      const items = Array.isArray(data?.features)
        ? data.features
            .map((item, idx) => {
              const lon = item?.geometry?.coordinates?.[0];
              const lat = item?.geometry?.coordinates?.[1];
              if (typeof lat !== 'number' || typeof lon !== 'number') return null;
              const props = item?.properties || {};
              const name = props?.name || props?.city || props?.state || query;
              const region = [props?.city, props?.state, props?.country].filter(Boolean).join(', ');
              return {
                id: `${name}-${lat}-${lon}-${idx}`,
                name,
                region,
                latitude: lat,
                longitude: lon
              };
            })
            .filter(Boolean)
        : [];
      setMapSearchResults(items);
    } catch (_error) {
      setMapSearchResults([]);
      if (onValidationError) {
        onValidationError('Search Failed', 'Unable to search this location right now.', 'warning');
      }
    } finally {
      setIsSearchingMap(false);
    }
  };

  const submitWithValidation = () => {
    const nextErrors = {};
    const checks = [
      { key: 'title', valid: Boolean(jobForm.title.trim()), label: 'Title is required' },
      { key: 'description', valid: Boolean(jobForm.description.trim()), label: 'Description is required' },
      { key: 'categoryId', valid: Boolean(jobForm.categoryId), label: 'Category is required' },
      { key: 'budget', valid: Boolean(jobForm.budget.trim()), label: 'Budget is required' },
      { key: 'jobType', valid: Boolean(jobForm.jobType), label: 'Job type is required' },
      { key: 'locationLink', valid: Boolean(jobForm.locationLink.trim()), label: 'Location link is required' },
      { key: 'address', valid: Boolean(jobForm.address.trim()), label: 'Address is required' },
      { key: 'status', valid: Boolean(jobForm.status), label: 'Status is required' },
      { key: 'map', valid: jobForm.latitude !== null && jobForm.longitude !== null, label: 'Map location is required' }
    ];

    checks.forEach((item) => {
      if (!item.valid) nextErrors[item.key] = item.label;
    });

    setErrors(nextErrors);
    const firstInvalid = checks.find((item) => !item.valid)?.key;
    if (firstInvalid) {
      focusFirstInvalidField(firstInvalid);
      if (onValidationError) {
        onValidationError('Validation Error', nextErrors[firstInvalid], 'warning');
      }
      return;
    }

    const fallbackDueDate = new Date();
    fallbackDueDate.setDate(fallbackDueDate.getDate() + 7);
    const payload = {
      title: jobForm.title.trim(),
      description: jobForm.description.trim(),
      categoryId: jobForm.categoryId,
      budget: Number(jobForm.budget),
      jobType: jobForm.jobType,
      latitude: jobForm.latitude,
      longitude: jobForm.longitude,
      address: jobForm.address.trim(),
      dueDate: jobForm.dueDate || fallbackDueDate.toISOString()
    };

    onCreateJob(payload);
  };

  if (userRole === 'ADMIN') {
    return (
      <View style={styles.centerPage}>
        <PageCard
          title="Moderation"
          subtitle="Admin users can review approvals here. Job creation is available for Job Poster accounts."
          icon="shield-checkmark"
          styles={styles}
          colors={colors}
        />
      </View>
    );
  }

  if (pickerPage === 'map') {
    return (
      <View style={styles.settingsScreen}>
        <View style={styles.createMapHeaderWrap}>
          <View style={styles.createMapHeaderTop}>
            <Pressable
              style={[styles.createMapHeaderBtn, styles.createMapHeaderBtnLeft]}
              onPress={() => setPickerPage('form')}
              hitSlop={12}
            >
              <Ionicons name="close-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.createMapHeaderBtnText}>Cancel</Text>
            </Pressable>
            <Text style={styles.createMapHeaderTitle}>Pick Location</Text>
            <Pressable
              style={[styles.createMapHeaderBtnPrimary, styles.createMapHeaderBtnRight]}
              onPress={confirmMapSelection}
              hitSlop={12}
            >
              <Ionicons name="checkmark-outline" size={16} color="#FFFFFF" />
              <Text style={styles.createMapHeaderBtnPrimaryText}>Confirm</Text>
            </Pressable>
          </View>
          <View style={styles.createMapHeaderMeta}>
            <Ionicons name="pin-outline" size={14} color={colors.primary} />
            <Text style={styles.createMapHeaderMetaText}>
              {draftCoordinate.latitude.toFixed(6)}, {draftCoordinate.longitude.toFixed(6)}
            </Text>
          </View>
        </View>

        <View style={styles.createMapFullWrap}>
          <View style={styles.createMapSearchRow}>
            <View style={styles.createMapSearchInputWrap}>
              <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
              <TextInput
                value={mapSearchQuery}
                onChangeText={setMapSearchQuery}
                onSubmitEditing={searchMapLocation}
                style={styles.createMapSearchInput}
                placeholder="Search city, area, landmark..."
                placeholderTextColor={colors.textSecondary}
                returnKeyType="search"
              />
            </View>
            <Pressable style={styles.createMapSearchBtn} onPress={searchMapLocation}>
              {isSearchingMap ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              )}
            </Pressable>
          </View>
          {mapSearchResults.length ? (
            <View style={styles.createMapResultsCard}>
              {mapSearchResults.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.createMapResultItem}
                  onPress={() => {
                    setDraftCoordinate({
                      latitude: Number(item.latitude),
                      longitude: Number(item.longitude)
                    });
                    setMapZoom(14);
                    setMapSearchResults([]);
                    setMapSearchQuery(item.region ? `${item.name}, ${item.region}` : item.name);
                  }}
                >
                  <Ionicons name="location-outline" size={16} color={colors.primary} />
                  <View style={styles.createMapResultTextWrap}>
                    <Text style={styles.createMapResultTitle}>{item.name}</Text>
                    {item.region ? <Text style={styles.createMapResultSub}>{item.region}</Text> : null}
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}
          <View style={styles.createMapNativeContainer}>
            <Pressable
              style={styles.createMapNativePressable}
              onLayout={(event) => setMapCanvasLayout(event.nativeEvent.layout)}
              onPress={pickFromMapPress}
              onTouchStart={onMapTouchStart}
              onTouchMove={onMapTouchMove}
              onTouchEnd={onMapTouchEnd}
            >
              <View style={styles.createMapTilesCanvas}>
                {mapTiles.map((tile) => (
                  <Image
                    key={tile.key}
                    source={{ uri: tile.url }}
                    style={[styles.createMapTileImage, { left: tile.left, top: tile.top }]}
                  />
                ))}
              </View>
              <View style={styles.createMapNativeCrosshair}>
                <Ionicons name="location" size={22} color={colors.primary} />
              </View>
              <View style={styles.createMapNativeHint}>
                <Text style={styles.createMapNativeHintText}>Tap map to select location</Text>
              </View>
            </Pressable>
            <View style={styles.createMapNativeControls}>
              <Pressable style={styles.createMapZoomBtn} onPress={() => setMapZoom((prev) => clamp(prev - 1, 2, 18))}>
                <Ionicons name="remove" size={16} color={colors.textMain} />
              </Pressable>
              <Text style={styles.createMapZoomText}>Zoom {mapZoom}</Text>
              <Pressable style={styles.createMapZoomBtn} onPress={() => setMapZoom((prev) => clamp(prev + 1, 2, 18))}>
                <Ionicons name="add" size={16} color={colors.textMain} />
              </Pressable>
            </View>
          </View>
          <View style={styles.createMapWebCoords}>
            <TextInput
              value={String(draftCoordinate.latitude)}
              onChangeText={(value) =>
                setDraftCoordinate((prev) => ({ ...prev, latitude: Number(value || 0) }))
              }
              style={[styles.createFieldInput, styles.createMapCoordInput]}
              placeholder="Latitude"
              keyboardType="decimal-pad"
              placeholderTextColor={colors.textSecondary}
            />
            <TextInput
              value={String(draftCoordinate.longitude)}
              onChangeText={(value) =>
                setDraftCoordinate((prev) => ({ ...prev, longitude: Number(value || 0) }))
              }
              style={[styles.createFieldInput, styles.createMapCoordInput]}
              placeholder="Longitude"
              keyboardType="decimal-pad"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.settingsScreen}>
      <View style={styles.settingsNav}>
        <View style={styles.settingsNavRight} />
        <Text style={styles.settingsNavTitle}>Create Job</Text>
        <View style={styles.settingsNavRight} />
      </View>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollBody}
      >
        <Animated.View style={[styles.createJobCard, { opacity: cardFade, transform: [{ translateY: cardRise }] }]}>
          <View style={styles.createJobCardHeader}>
            <View style={styles.createJobCardIcon}>
              <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.createJobCardHeaderText}>
              <Text style={styles.optionTitle}>Post New Job</Text>
              <Text style={styles.optionSubtitle}>Fill required details and publish when ready.</Text>
            </View>
          </View>

          <View onLayout={registerFieldY('title')}>
            <Text style={styles.createFieldLabel}>Title *</Text>
          </View>
          <TextInput
            ref={titleRef}
            value={jobForm.title}
            onChangeText={(value) => {
              setJobForm((prev) => ({ ...prev, title: value }));
              setErrors((prev) => ({ ...prev, title: '' }));
            }}
            style={[styles.createFieldInput, errors.title ? styles.createFieldInputError : null]}
            placeholder="Need plumber for bathroom leakage"
            placeholderTextColor={colors.textSecondary}
          />
          {errors.title ? <Text style={styles.createFieldErrorText}>{errors.title}</Text> : null}

          <View onLayout={registerFieldY('description')}>
            <Text style={styles.createFieldLabel}>Description *</Text>
          </View>
          <TextInput
            ref={descriptionRef}
            value={jobForm.description}
            onChangeText={(value) => {
              setJobForm((prev) => ({ ...prev, description: value }));
              setErrors((prev) => ({ ...prev, description: '' }));
            }}
            style={[styles.createFieldInput, styles.createFieldArea, errors.description ? styles.createFieldInputError : null]}
            placeholder="Describe the work, timing and expectations..."
            placeholderTextColor={colors.textSecondary}
            multiline
          />
          {errors.description ? <Text style={styles.createFieldErrorText}>{errors.description}</Text> : null}

          <View onLayout={registerFieldY('categoryId')}>
            <Text style={styles.createFieldLabel}>Category *</Text>
          </View>
          <Pressable
            style={[styles.createFieldSelect, errors.categoryId ? styles.createFieldInputError : null]}
            onPress={() => approvedCategoryOptions.length && setShowCategoryDropdown((prev) => !prev)}
          >
            <Ionicons name="layers-outline" size={16} color={colors.primary} />
            <Text style={styles.createFieldSelectText}>
              {selectedCategory?.name || (approvedCategoryOptions.length ? 'Select category' : 'No categories available')}
            </Text>
            <Ionicons name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
          </Pressable>
          {showCategoryDropdown && approvedCategoryOptions.length ? (
            <View style={styles.createDropdown}>
              {approvedCategoryOptions.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.createDropdownItem}
                  onPress={() => {
                    setJobForm((prev) => ({ ...prev, categoryId: item.id }));
                    setShowCategoryDropdown(false);
                    setErrors((prev) => ({ ...prev, categoryId: '' }));
                  }}
                >
                  <Text style={styles.createDropdownItemText}>{item.name}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {errors.categoryId ? <Text style={styles.createFieldErrorText}>{errors.categoryId}</Text> : null}

          <View onLayout={registerFieldY('budget')}>
            <Text style={styles.createFieldLabel}>Budget *</Text>
          </View>
          <TextInput
            ref={budgetRef}
            value={jobForm.budget}
            onChangeText={(value) => {
              setJobForm((prev) => ({ ...prev, budget: value.replace(/[^0-9.]/g, '') }));
              setErrors((prev) => ({ ...prev, budget: '' }));
            }}
            style={[styles.createFieldInput, errors.budget ? styles.createFieldInputError : null]}
            placeholder="5000"
            keyboardType="decimal-pad"
            placeholderTextColor={colors.textSecondary}
          />
          {errors.budget ? <Text style={styles.createFieldErrorText}>{errors.budget}</Text> : null}

          <View onLayout={registerFieldY('jobType')}>
            <Text style={styles.createFieldLabel}>Job Type *</Text>
          </View>
          <View style={styles.createPillRow}>
            {['ONE_TIME', 'PART_TIME', 'FULL_TIME'].map((type) => (
              <Pressable
                key={type}
                style={[
                  styles.createPill,
                  jobForm.jobType === type && styles.createPillActive,
                  errors.jobType ? styles.createPillError : null
                ]}
                onPress={() => {
                  setJobForm((prev) => ({ ...prev, jobType: type }));
                  setErrors((prev) => ({ ...prev, jobType: '' }));
                }}
              >
                <Text style={[styles.createPillText, jobForm.jobType === type && styles.createPillTextActive]}>
                  {type.replace('_', ' ')}
                </Text>
              </Pressable>
            ))}
          </View>
          {errors.jobType ? <Text style={styles.createFieldErrorText}>{errors.jobType}</Text> : null}

          <View onLayout={registerFieldY('locationLink')}>
            <Text style={styles.createFieldLabel}>Location Link *</Text>
          </View>
          <View style={[styles.createLocationRow, errors.locationLink ? styles.createFieldInputErrorWrap : null]}>
            <TextInput
              ref={locationLinkRef}
              value={jobForm.locationLink}
              onChangeText={(value) => {
                setJobForm((prev) => ({ ...prev, locationLink: value }));
                setErrors((prev) => ({ ...prev, locationLink: '' }));
              }}
              style={[styles.createFieldInput, styles.createLocationInput]}
              placeholder="Pick from map to auto-fill"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
            />
            <Pressable style={styles.createMapBtn} onPress={() => setPickerPage('map')}>
              <Ionicons name="map-outline" size={16} color="#FFFFFF" />
              <Text style={styles.createMapBtnText}>Add</Text>
            </Pressable>
          </View>
          {errors.locationLink ? <Text style={styles.createFieldErrorText}>{errors.locationLink}</Text> : null}
          <View onLayout={registerFieldY('map')} style={styles.createMapSelectedWrap}>
            <Ionicons name="navigate-circle-outline" size={16} color={colors.primary} />
            <Text style={styles.createMapSelectedText}>
              {jobForm.latitude !== null && jobForm.longitude !== null
                ? `${jobForm.latitude}, ${jobForm.longitude}`
                : 'No map location selected yet'}
            </Text>
          </View>
          {errors.map ? <Text style={styles.createFieldErrorText}>{errors.map}</Text> : null}

          <View onLayout={registerFieldY('address')}>
            <Text style={styles.createFieldLabel}>Address *</Text>
          </View>
          <TextInput
            ref={addressRef}
            value={jobForm.address}
            onChangeText={(value) => {
              setJobForm((prev) => ({ ...prev, address: value }));
              setErrors((prev) => ({ ...prev, address: '' }));
            }}
            style={[styles.createFieldInput, styles.createFieldArea, errors.address ? styles.createFieldInputError : null]}
            placeholder="Street, city, area..."
            placeholderTextColor={colors.textSecondary}
            multiline
          />
          {errors.address ? <Text style={styles.createFieldErrorText}>{errors.address}</Text> : null}

          <View onLayout={registerFieldY('status')}>
            <Text style={styles.createFieldLabel}>Status *</Text>
          </View>
          <View style={styles.createPillRow}>
            {['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((status) => (
              <Pressable
                key={status}
                style={[
                  styles.createPill,
                  jobForm.status === status && styles.createPillActive,
                  errors.status ? styles.createPillError : null
                ]}
                onPress={() => {
                  setJobForm((prev) => ({ ...prev, status }));
                  setErrors((prev) => ({ ...prev, status: '' }));
                }}
              >
                <Text style={[styles.createPillText, jobForm.status === status && styles.createPillTextActive]}>
                  {status.replace('_', ' ')}
                </Text>
              </Pressable>
            ))}
          </View>
          {errors.status ? <Text style={styles.createFieldErrorText}>{errors.status}</Text> : null}

          <Text style={styles.createFieldLabel}>Due Date (Optional)</Text>
          <Pressable style={styles.createFieldSelect} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            <Text style={styles.createFieldSelectText}>
              {jobForm.dueDate ? formatDateValue(new Date(jobForm.dueDate)) : 'Select date'}
            </Text>
          </Pressable>
          {showDatePicker && Platform.OS === 'ios' ? (
            <Modal transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
              <Pressable style={styles.datePickerBackdrop} onPress={() => setShowDatePicker(false)}>
                <Pressable style={styles.datePickerCard} onPress={() => {}}>
                  <DateTimePicker
                    value={dueDateValue}
                    mode="date"
                    minimumDate={new Date()}
                    display="spinner"
                    onChange={(_event, selectedDate) => {
                      if (!selectedDate) return;
                      setJobForm((prev) => ({ ...prev, dueDate: selectedDate.toISOString() }));
                    }}
                  />
                  <Pressable style={styles.datePickerDoneBtn} onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.datePickerDoneText}>Done</Text>
                  </Pressable>
                </Pressable>
              </Pressable>
            </Modal>
          ) : null}
          {showDatePicker && Platform.OS !== 'ios' ? (
            <DateTimePicker
              value={dueDateValue}
              mode="date"
              minimumDate={new Date()}
              display="default"
              onChange={(_event, selectedDate) => {
                setShowDatePicker(false);
                if (!selectedDate) return;
                setJobForm((prev) => ({ ...prev, dueDate: selectedDate.toISOString() }));
              }}
            />
          ) : null}

          <Pressable style={styles.createSubmitBtn} onPress={submitWithValidation} disabled={isCreatingJob || !token}>
            {isCreatingJob ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="send-outline" size={16} color="#FFFFFF" />
                <Text style={styles.createSubmitBtnText}>Create Job</Text>
              </>
            )}
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function SettingsPage({ user, themeMode, setThemeMode, onOpenProfile, onOpenCategories, onRequestLogout, styles, colors }) {
  return (
    <View style={styles.settingsScreen}>
      <View style={styles.settingsNav}>
        <View style={styles.settingsNavRight} />
        <Text style={styles.settingsNavTitle}>Settings</Text>
        <View style={styles.settingsNavRight} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        <View style={styles.settingsHeaderCard}>
          <AvatarView imageUrl={user?.avatar || DEFAULT_AVATAR_URL} size={44} colors={colors} />
          <View style={styles.settingsHeaderInfo}>
            <Text style={styles.settingsHeaderName}>{user?.name || 'User'}</Text>
            <Text style={styles.settingsHeaderEmail}>{user?.email || 'No email available'}</Text>
            <Text style={styles.settingsRolePill}>{getRoleLabel(user?.role)}</Text>
          </View>
        </View>

        <View style={styles.themeSwitchWrap}>
          <Pressable
            style={[styles.themePill, themeMode === 'light' && styles.themePillActive]}
            onPress={() => setThemeMode('light')}
          >
            <Ionicons name="sunny" size={16} color={themeMode === 'light' ? '#FFFFFF' : colors.iconInactive} />
            <Text style={[styles.themePillText, themeMode === 'light' && styles.themePillTextActive]}>Light</Text>
          </Pressable>

          <Pressable
            style={[styles.themePill, themeMode === 'dark' && styles.themePillActive]}
            onPress={() => setThemeMode('dark')}
          >
            <Ionicons name="moon" size={16} color={themeMode === 'dark' ? '#FFFFFF' : colors.iconInactive} />
            <Text style={[styles.themePillText, themeMode === 'dark' && styles.themePillTextActive]}>Dark</Text>
          </Pressable>
        </View>

        <View style={styles.settingsGroup}>
        <SettingsOption
          icon="person-circle-outline"
          title="Profile"
          subtitle="View your account details"
          onPress={onOpenProfile}
          styles={styles}
          colors={colors}
        />
        <SettingsOption
          icon="layers-outline"
          title="Categories"
          subtitle={user?.role === 'ADMIN' ? 'Review and approve categories' : 'Browse and create job categories'}
          onPress={onOpenCategories}
          styles={styles}
          colors={colors}
        />
          <SettingsOption
            icon="notifications-outline"
            title="Notifications"
            subtitle="Push and email preferences"
            onPress={() => {}}
            styles={styles}
            colors={colors}
          />
          <SettingsOption
            icon="lock-closed-outline"
            title="Privacy & Security"
            subtitle="Password and account protection"
            onPress={() => {}}
            styles={styles}
            colors={colors}
          />
          <SettingsOption
            icon="help-circle-outline"
            title="Help & Support"
            subtitle="Get help and contact support"
            onPress={() => {}}
            styles={styles}
            colors={colors}
          />
          <SettingsOption
            icon="information-circle-outline"
            title="About"
            subtitle="App version and details"
            onPress={() => {}}
            styles={styles}
            colors={colors}
          />
        </View>

        <Pressable style={styles.logoutBtn} onPress={onRequestLogout}>
          <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
          <Text style={styles.logoutBtnText}>Logout</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function PageContent({
  tabKey,
  user,
  userRole,
  token,
  settingsPage,
  themeMode,
  setThemeMode,
  onOpenProfile,
  onBackFromProfile,
  onBackFromCategories,
  onRequestLogout,
  onOpenAvatarOptions,
  onOpenAvatarPreview,
  onSaveProfile,
  onOpenCategories,
  isSavingProfile,
  categoriesTab,
  setCategoriesTab,
  categorySearch,
  setCategorySearch,
  categoryFilter,
  setCategoryFilter,
  allCategories,
  myCategories,
  isCategoryLoading,
  hasFetchedCategoriesOnce,
  onRefreshCategories,
  jobForm,
  setJobForm,
  approvedCategoryOptions,
  onCreateJob,
  onValidationError,
  isCreatingJob,
  adminPanelTab,
  setAdminPanelTab,
  adminJobs,
  adminCategories,
  isAdminPanelLoading,
  onRefreshAdminPanel,
  adminCategorySearch,
  setAdminCategorySearch,
  adminCategoryFilter,
  setAdminCategoryFilter,
  adminCategoryDraft,
  setAdminCategoryDraft,
  onCreateAdminCategory,
  onUpdateAdminCategoryStatus,
  adminUsers,
  isAdminUsersLoading,
  onRefreshAdminUsers,
  onUpdateUserAccess,
  isUploadingAvatar,
  styles,
  colors
}) {
  if (tabKey === 'dashboard') {
    const dashboardSubtitle =
      userRole === 'ADMIN'
        ? 'Control users, categories, and platform operations from one place.'
        : userRole === 'JOB_POSTER'
          ? 'Track your posted jobs and manage applicants faster.'
          : 'Browse jobs near you and manage your applications.';

    return (
      <View style={styles.centerPage}>
        <PageCard
          title="Dashboard"
          subtitle={dashboardSubtitle}
          icon="grid"
          styles={styles}
          colors={colors}
        />
      </View>
    );
  }
  if (tabKey === 'users' && userRole === 'ADMIN') {
    return (
      <AdminUsersPage
        users={adminUsers}
        isLoading={isAdminUsersLoading}
        onRefresh={onRefreshAdminUsers}
        onUpdateAccess={onUpdateUserAccess}
        styles={styles}
        colors={colors}
      />
    );
  }
  if (tabKey === 'explore') {
    const title = userRole === 'JOB_POSTER' ? 'My Jobs' : 'Explore Jobs';
    const subtitle =
      userRole === 'JOB_POSTER'
        ? 'Review, edit, and track the jobs you have posted.'
        : 'Discover jobs, requirements, and opportunities.';

    return (
      <View style={styles.centerPage}>
        <PageCard
          title={title}
          subtitle={subtitle}
          icon="compass"
          styles={styles}
          colors={colors}
        />
      </View>
    );
  }
  if (tabKey === 'create') {
    if (userRole === 'ADMIN') {
      return (
        <AdminModerationPage
          adminPanelTab={adminPanelTab}
          setAdminPanelTab={setAdminPanelTab}
          jobs={adminJobs}
          categories={adminCategories}
          isLoading={isAdminPanelLoading}
          onRefresh={onRefreshAdminPanel}
          categorySearch={adminCategorySearch}
          setCategorySearch={setAdminCategorySearch}
          categoryFilter={adminCategoryFilter}
          setCategoryFilter={setAdminCategoryFilter}
          categoryDraft={adminCategoryDraft}
          setCategoryDraft={setAdminCategoryDraft}
          onCreateCategory={onCreateAdminCategory}
          onUpdateCategoryStatus={onUpdateAdminCategoryStatus}
          styles={styles}
          colors={colors}
        />
      );
    }
    return (
      <CreateJobPage
        userRole={userRole}
        token={token}
        jobForm={jobForm}
        setJobForm={setJobForm}
        approvedCategoryOptions={approvedCategoryOptions}
        onCreateJob={onCreateJob}
        onValidationError={onValidationError}
        isCreatingJob={isCreatingJob}
        styles={styles}
        colors={colors}
      />
    );
  }
  if (tabKey === 'messages') {
    const title = userRole === 'ADMIN' ? 'Reports' : userRole === 'JOB_POSTER' ? 'Applicants' : 'Messages';
    const subtitle =
      userRole === 'ADMIN'
        ? 'Review system reports and escalations.'
        : userRole === 'JOB_POSTER'
          ? 'Review applicants and communication from pickers.'
          : 'Check your chats, interview updates, and job communication.';

    return (
      <View style={styles.centerPage}>
        <PageCard
          title={title}
          subtitle={subtitle}
          icon="chatbubble-ellipses"
          styles={styles}
          colors={colors}
        />
      </View>
    );
  }

  if (settingsPage === 'profile') {
    return (
      <ProfilePage
        user={user}
        onBack={onBackFromProfile}
        onOpenAvatarOptions={onOpenAvatarOptions}
        onOpenAvatarPreview={onOpenAvatarPreview}
        onSaveProfile={onSaveProfile}
        isSavingProfile={isSavingProfile}
        isUploadingAvatar={isUploadingAvatar}
        styles={styles}
        colors={colors}
      />
    );
  }
  if (settingsPage === 'categories') {
    return (
      <CategoryPage
        categoriesTab={categoriesTab}
        setCategoriesTab={setCategoriesTab}
        categorySearch={categorySearch}
        setCategorySearch={setCategorySearch}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        allCategories={allCategories}
        myCategories={myCategories}
        isLoading={isCategoryLoading}
        hasFetchedOnce={hasFetchedCategoriesOnce}
        onBack={onBackFromCategories}
        onRefresh={onRefreshCategories}
        styles={styles}
        colors={colors}
      />
    );
  }

  return (
    <SettingsPage
      user={user}
      themeMode={themeMode}
      setThemeMode={setThemeMode}
      onOpenProfile={onOpenProfile}
      onOpenCategories={onOpenCategories}
      onRequestLogout={onRequestLogout}
      styles={styles}
      colors={colors}
    />
  );
}

export function MainTabsScreen({ user, token, onUserUpdated, onLogout }) {
  const initialRole = user?.role || 'JOB_PICKER';
  const initialTabs = getTabsByRole(initialRole);
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
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const [hasFetchedCategoriesOnce, setHasFetchedCategoriesOnce] = useState(false);
  const [categoriesTab, setCategoriesTab] = useState('all');
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [allCategories, setAllCategories] = useState([]);
  const [myCategories, setMyCategories] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [isAdminUsersLoading, setIsAdminUsersLoading] = useState(false);
  const [adminPanelTab, setAdminPanelTab] = useState('jobs');
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

  const userRole = localUser?.role || 'JOB_PICKER';
  const visibleTabs = useMemo(() => getTabsByRole(userRole), [userRole]);

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
      setActiveTab('explore');
    } catch (error) {
      showPopup('Create Failed', error?.message || 'Unable to create job.', 'error');
    } finally {
      setIsCreatingJob(false);
    }
  };

  const fetchAdminPanelData = async ({ forceLoader = false, tab = adminPanelTab } = {}) => {
    if (!token || userRole !== 'ADMIN') return;
    try {
      setIsAdminPanelLoading(true);

      const isCategoryTab = tab === 'categories';
      if (isCategoryTab) {
        const categoriesRes = await getAllCategoriesAdmin({
          token,
          status: adminCategoryFilter,
          q: debouncedAdminCategorySearch.trim() || undefined
        });
        setAdminCategories(categoriesRes?.data || []);
      } else {
        const jobsRes = await getAllJobs({ token, page: 1, limit: 60, status: 'ALL' });
        setAdminJobs(jobsRes?.data?.jobs || []);
      }
    } catch (error) {
      showPopup('Admin Panel Failed', error?.message || 'Unable to load admin panel data.', 'error');
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
      await fetchAdminPanelData({ forceLoader: true, tab: 'categories' });
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
      const response = await getAllUsers({ token, page: 1, limit: 40 });
      const users = response?.data?.users || [];
      setAdminUsers(users.filter((item) => item.id !== localUser?.id));
    } catch (error) {
      showPopup('Users Failed', error?.message || 'Unable to load users.', 'error');
    } finally {
      setIsAdminUsersLoading(false);
    }
  };

  const handleUpdateUserAccess = async (userId, payload) => {
    if (!token || userRole !== 'ADMIN') return;
    try {
      await updateUserAccess({ token, userId, payload });
      setAdminUsers((prev) =>
        prev.map((item) =>
          item.id === userId
            ? {
                ...item,
                ...(payload.role ? { role: payload.role } : {}),
                ...(payload.status ? { status: payload.status } : {})
              }
            : item
        )
      );
      showPopup('User Updated', 'Access updated successfully.', 'success');
    } catch (error) {
      showPopup('Update Failed', error?.message || 'Unable to update user access.', 'error');
    }
  };

  useEffect(() => {
    if (!token) return;
    if (activeTab === 'create') {
      if (userRole === 'ADMIN') {
        fetchAdminPanelData({ forceLoader: true, tab: adminPanelTab });
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
      fetchCategories();
    }
  }, [activeTab, settingsPage, categorySearch, categoryFilter, categoriesTab, token, allCategories.length, userRole, adminPanelTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAdminCategorySearch(adminCategorySearch);
    }, 450);

    return () => clearTimeout(timer);
  }, [adminCategorySearch]);

  useEffect(() => {
    if (!token || userRole !== 'ADMIN' || activeTab !== 'create') return;
    if (adminPanelTab !== 'categories') return;
    fetchAdminPanelData({ tab: 'categories' });
  }, [activeTab, userRole, token, adminPanelTab, debouncedAdminCategorySearch, adminCategoryFilter]);

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
          adminPanelTab={adminPanelTab}
          setAdminPanelTab={setAdminPanelTab}
          adminJobs={adminJobs}
          adminCategories={adminCategories}
          isAdminPanelLoading={isAdminPanelLoading}
          onRefreshAdminPanel={() => fetchAdminPanelData({ forceLoader: true })}
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
          onUpdateUserAccess={handleUpdateUserAccess}
          isUploadingAvatar={isUploadingAvatar}
          styles={styles}
          colors={colors}
        />
      </Animated.View>

      {activeTab === 'settings' && settingsPage === 'categories' ? (
        <Pressable style={styles.categoryFab} onPress={() => setActiveTab('create')}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>
      ) : null}

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
      <LottieLoader
        visible={isUploadingAvatar || isSavingProfile || isCreatingJob}
        text="Please wait..."
      />
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background
    },
    pageWrap: {
      flex: 1,
      alignItems: 'stretch',
      paddingBottom: TAB_BAR_HEIGHT + TAB_BAR_SHADOW_SPACE
    },
    centerPage: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 22
    },
    pageCard: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      paddingVertical: 32,
      paddingHorizontal: 20,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.18,
      shadowRadius: 14,
      elevation: 6
    },
    pageIconWrap: {
      width: 62,
      height: 62,
      borderRadius: 31,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16
    },
    pageTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.textMain,
      marginBottom: 8
    },
    pageSubtitle: {
      fontSize: 15,
      color: colors.pageSubtitle,
      textAlign: 'center',
      lineHeight: 22
    },
    tabBarOuter: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center'
    },
    tabBar: {
      width: '100%',
      backgroundColor: colors.surface,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      borderTopWidth: 1,
      borderColor: colors.border,
      height: TAB_BAR_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingTop: 6,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 12
    },
    tabSlot: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center'
    },
    tabLabel: {
      marginTop: 4,
      fontSize: 11,
      fontWeight: '600',
      color: colors.iconInactive
    },
    tabLabelActive: {
      color: colors.primary
    },
    centerBtn: {
      position: 'absolute',
      top: -22,
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.28,
      shadowRadius: 10,
      elevation: 14,
      borderWidth: 3,
      borderColor: colors.surface
    },
    settingsScreen: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: TOP_SAFE_PADDING
    },
    scrollBody: {
      paddingBottom: 24
    },
    settingsNav: {
      height: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10
    },
    settingsNavTitle: {
      fontSize: 19,
      fontWeight: '800',
      color: colors.textMain
    },
    settingsNavRight: {
      width: 74
    },
    settingsNavIconBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-end'
    },
    settingsBackBtn: {
      width: 74,
      flexDirection: 'row',
      alignItems: 'center'
    },
    settingsBackText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 14
    },
    settingsHeaderCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 12
    },
    settingsHeaderInfo: {
      marginLeft: 10,
      flex: 1
    },
    settingsHeaderName: {
      color: colors.textMain,
      fontWeight: '700',
      fontSize: 15
    },
    settingsHeaderEmail: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 2
    },
    settingsRolePill: {
      marginTop: 6,
      alignSelf: 'flex-start',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.primary,
      color: colors.primary,
      fontSize: 11,
      fontWeight: '800',
      paddingHorizontal: 8,
      paddingVertical: 2
    },
    themeSwitchWrap: {
      flexDirection: 'row',
      backgroundColor: colors.sheet,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 6,
      marginBottom: 12
    },
    themePill: {
      flex: 1,
      height: 36,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row'
    },
    themePillActive: {
      backgroundColor: colors.primary
    },
    themePillText: {
      marginLeft: 6,
      color: colors.iconInactive,
      fontWeight: '700',
      fontSize: 12
    },
    themePillTextActive: {
      color: '#FFFFFF'
    },
    settingsGroup: {
      backgroundColor: colors.sheet,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden'
    },
    settingRow: {
      minHeight: 58,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center'
    },
    settingIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10
    },
    settingTitle: {
      color: colors.textMain,
      fontWeight: '700',
      fontSize: 13
    },
    settingSubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 1
    },
    logoutBtn: {
      marginTop: 14,
      height: 44,
      backgroundColor: colors.danger,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row'
    },
    logoutBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
      marginLeft: 8
    },
    profileHero: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 16,
      paddingHorizontal: 14,
      alignItems: 'center',
      marginBottom: 12
    },
    avatarWrap: {
      alignItems: 'center',
      justifyContent: 'center'
    },
    avatarBadge: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.primary,
      borderWidth: 2,
      borderColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center'
    },
    profileName: {
      marginTop: 14,
      fontSize: 22,
      fontWeight: '800',
      color: colors.textMain,
      textAlign: 'center'
    },
    profileEmail: {
      marginTop: 6,
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center'
    },
    profileHint: {
      marginTop: 8,
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center'
    },
    profileEditCard: {
      backgroundColor: colors.sheet,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12
    },
    profileSectionTitle: {
      color: colors.textMain,
      fontWeight: '800',
      fontSize: 14,
      marginBottom: 10
    },
    profileInputWrap: {
      marginBottom: 14
    },
    profileInputLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 6
    },
    profileInput: {
      height: 44,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      color: colors.textMain,
      fontSize: 14
    },
    profileReadOnly: {
      justifyContent: 'center'
    },
    profileReadOnlyText: {
      color: colors.textSecondary,
      fontSize: 14
    },
    profilePhoneRow: {
      flexDirection: 'row',
      alignItems: 'center'
    },
    profileCodeBtn: {
      width: 74,
      height: 44,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8
    },
    profileCodeText: {
      color: colors.textMain,
      fontWeight: '700'
    },
    profilePhoneInput: {
      flex: 1,
      height: 44,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      color: colors.textMain,
      fontSize: 14
    },
    genderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between'
    },
    genderPill: {
      flex: 1,
      height: 38,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 6
    },
    genderPillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary
    },
    genderPillText: {
      color: colors.textMain,
      fontWeight: '700',
      fontSize: 12
    },
    genderPillTextActive: {
      color: '#FFFFFF'
    },
    profileMultiline: {
      height: undefined,
      minHeight: 96,
      textAlignVertical: 'top',
      paddingTop: 12,
      paddingBottom: 10
    },
    profileSaveBtn: {
      marginTop: 8,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row'
    },
    profileSaveBtnText: {
      marginLeft: 8,
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 14
    },
    codeSheet: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      maxHeight: '70%'
    },
    codeSearchInput: {
      height: 40,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 10,
      color: colors.textMain,
      marginBottom: 8
    },
    codeScroll: {
      maxHeight: 320
    },
    codeRow: {
      minHeight: 42,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    codeRowSelected: {
      backgroundColor: colors.primarySoft
    },
    codeRowName: {
      color: colors.textMain,
      fontSize: 13
    },
    codeRowCode: {
      color: colors.primary,
      fontWeight: '700'
    },
    profileInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      minHeight: 54,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border
    },
    profileInfoLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '600'
    },
    profileInfoValue: {
      fontSize: 13,
      color: colors.textMain,
      fontWeight: '700',
      textTransform: 'capitalize'
    },
    categoryTabWrap: {
      flexDirection: 'row',
      backgroundColor: colors.sheet,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 5,
      marginBottom: 10
    },
    categoryTabBtn: {
      flex: 1,
      height: 34,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center'
    },
    categoryTabBtnActive: {
      backgroundColor: colors.primary
    },
    categoryTabText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700'
    },
    categoryTabTextActive: {
      color: '#FFFFFF'
    },
    categorySearchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10
    },
    categorySearchWrap: {
      flex: 1,
      height: 42,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10
    },
    categorySearchInput: {
      flex: 1,
      marginLeft: 6,
      color: colors.textMain,
      fontSize: 14
    },
    categoryFilterIconBtn: {
      marginLeft: 0,
      width: 42,
      height: 42,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center'
    },
    categoryFilterModal: {
      width: 280,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 12,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.18,
      shadowRadius: 14,
      elevation: 12
    },
    filterBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(2, 6, 23, 0.5)',
      alignItems: 'flex-end',
      justifyContent: 'flex-start',
      paddingHorizontal: 16,
      paddingTop: TOP_SAFE_PADDING + 118
    },
    categoryFilterHint: {
      marginTop: 2,
      marginBottom: 10,
      color: colors.textSecondary,
      fontSize: 12
    },
    categoryFilterOption: {
      height: 44,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.sheet,
      marginBottom: 8,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 10,
      flexDirection: 'row'
    },
    categoryFilterOptionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft
    },
    categoryFilterOptionText: {
      marginLeft: 8,
      color: colors.textMain,
      fontWeight: '700',
      fontSize: 13
    },
    categoryFilterOptionLeft: {
      flexDirection: 'row',
      alignItems: 'center'
    },
    categoryFilterOptionTextActive: {
      color: colors.primary
    },
    categoryFilterScroll: {
      maxHeight: 38,
      marginBottom: 10
    },
    categoryFilterPill: {
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8
    },
    categoryFilterPillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary
    },
    categoryFilterText: {
      color: colors.textMain,
      fontSize: 12,
      fontWeight: '700'
    },
    categoryFilterTextActive: {
      color: '#FFFFFF'
    },
    categoryCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      padding: 12,
      marginBottom: 10
    },
    categoryCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    categoryName: {
      color: colors.textMain,
      fontWeight: '800',
      fontSize: 15,
      flex: 1,
      marginRight: 10
    },
    categoryDescription: {
      marginTop: 6,
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 18
    },
    categoryStatusBadge: {
      height: 24,
      borderRadius: 12,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center'
    },
    categoryStatusPending: {
      backgroundColor: '#FEF3C7'
    },
    categoryStatusApproved: {
      backgroundColor: '#D1FAE5'
    },
    categoryStatusRejected: {
      backgroundColor: '#FEE2E2'
    },
    categoryStatusText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#0F172A'
    },
    categoryEmptyCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      paddingVertical: 24,
      alignItems: 'center'
    },
    categoryEmptyText: {
      marginTop: 8,
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '700'
    },
    centerLoaderWrap: {
      minHeight: 180,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 20
    },
    adminUserCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      backgroundColor: colors.surface,
      padding: 12,
      marginBottom: 10
    },
    adminUserHead: {
      marginBottom: 10
    },
    adminUserName: {
      color: colors.textMain,
      fontWeight: '800',
      fontSize: 15
    },
    adminUserMeta: {
      marginTop: 4,
      color: colors.textSecondary,
      fontSize: 12
    },
    adminControlRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 10
    },
    adminChip: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      backgroundColor: colors.sheet
    },
    adminChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft
    },
    adminChipText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700'
    },
    adminChipTextActive: {
      color: colors.primary
    },
    adminStatusRow: {
      flexDirection: 'row',
      gap: 8
    },
    adminStatusBtn: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      backgroundColor: colors.sheet
    },
    adminStatusBtnActive: {
      borderColor: '#059669',
      backgroundColor: '#D1FAE5'
    },
    adminStatusBtnDanger: {
      borderColor: '#DC2626',
      backgroundColor: '#FEE2E2'
    },
    adminStatusText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700'
    },
    adminStatusTextActive: {
      color: '#047857'
    },
    adminStatusTextDanger: {
      color: '#B91C1C'
    },
    adminPanelTabs: {
      flexDirection: 'row',
      marginBottom: 10,
      gap: 8
    },
    adminPanelTabBtn: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.sheet,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10
    },
    adminPanelTabBtnActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft
    },
    adminPanelTabText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700'
    },
    adminPanelTabTextActive: {
      color: colors.primary
    },
    adminJobCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      padding: 12,
      marginBottom: 10
    },
    adminJobTitle: {
      color: colors.textMain,
      fontWeight: '800',
      fontSize: 15
    },
    adminJobMeta: {
      marginTop: 4,
      color: colors.textSecondary,
      fontSize: 12
    },
    adminCreateCategoryCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      backgroundColor: colors.surface,
      padding: 14,
      marginBottom: 10
    },
    adminSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8
    },
    adminCreateCategoryTitle: {
      color: colors.textMain,
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 0
    },
    adminCategoryToolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10
    },
    adminCategoryCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      backgroundColor: colors.surface,
      padding: 12,
      marginBottom: 10
    },
    adminCategoryTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    adminCategoryNameWrap: {
      flex: 1,
      marginRight: 10
    },
    adminCategoryName: {
      color: colors.textMain,
      fontWeight: '800',
      fontSize: 14,
      maxWidth: '100%'
    },
    adminCategoryDescriptionOneLine: {
      marginTop: 4,
      color: colors.textSecondary,
      fontSize: 12
    },
    adminCategoryDescription: {
      marginTop: 8,
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 18
    },
    adminCategoryDropdownBtn: {
      minWidth: 98,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.sheet,
      paddingHorizontal: 8,
      paddingVertical: 6,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6
    },
    adminCategoryDropdownText: {
      color: colors.textMain,
      fontSize: 11,
      fontWeight: '800'
    },
    adminCategoryActions: {
      flexDirection: 'row',
      marginTop: 10,
      gap: 8
    },
    adminCategoryActionBtn: {
      flex: 1,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 9
    },
    adminCategoryApproveBtn: {
      backgroundColor: '#059669'
    },
    adminCategoryRejectBtn: {
      backgroundColor: '#DC2626'
    },
    adminCategoryActionText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700'
    },
    categorySkeletonCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      padding: 12,
      marginBottom: 10
    },
    categorySkeletonTitle: {
      width: '48%',
      height: 14,
      borderRadius: 7,
      backgroundColor: colors.primarySoft
    },
    categorySkeletonLine: {
      marginTop: 10,
      width: '100%',
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primarySoft
    },
    categorySkeletonLineShort: {
      width: '72%'
    },
    categoryDetailModal: {
      width: '100%',
      maxWidth: 380,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14
    },
    categoryDetailTitle: {
      color: colors.textMain,
      fontSize: 18,
      fontWeight: '800'
    },
    categoryDetailDescription: {
      marginTop: 8,
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20
    },
    categoryDetailStatusWrap: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    categoryDetailStatusLabel: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '700'
    },
    categoryFab: {
      position: 'absolute',
      right: 18,
      bottom: TAB_BAR_HEIGHT + 16,
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 10
    },
    createJobCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      backgroundColor: colors.surface,
      padding: 14
    },
    createJobCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10
    },
    createJobCardIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10
    },
    createJobCardHeaderText: {
      flex: 1
    },
    createFieldLabel: {
      color: colors.textMain,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 6
    },
    createFieldInput: {
      height: 42,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.sheet,
      color: colors.textMain,
      paddingHorizontal: 10,
      marginBottom: 10
    },
    createFieldInputError: {
      borderColor: '#DC2626'
    },
    createFieldInputErrorWrap: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#DC2626',
      padding: 6,
      marginBottom: 8
    },
    createFieldErrorText: {
      color: '#DC2626',
      fontSize: 12,
      marginTop: -4,
      marginBottom: 8,
      fontWeight: '600'
    },
    createFieldArea: {
      minHeight: 78,
      height: undefined,
      textAlignVertical: 'top',
      paddingTop: 10
    },
    createFieldSelect: {
      height: 42,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.sheet,
      paddingHorizontal: 10,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8
    },
    createFieldSelectText: {
      flex: 1,
      color: colors.textMain,
      fontSize: 13,
      fontWeight: '600'
    },
    createDropdown: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.surface,
      marginBottom: 10,
      overflow: 'hidden'
    },
    createDropdownItem: {
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border
    },
    createDropdownItemText: {
      color: colors.textMain,
      fontSize: 13
    },
    createPillRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 10
    },
    createPill: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.sheet,
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 12,
      marginRight: 8,
      marginBottom: 8
    },
    createPillActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft
    },
    createPillError: {
      borderColor: '#DC2626'
    },
    createPillText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700'
    },
    createPillTextActive: {
      color: colors.primary
    },
    createLocationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 2
    },
    createLocationInput: {
      flex: 1,
      marginBottom: 0,
      marginRight: 8
    },
    createMapBtn: {
      height: 42,
      borderRadius: 10,
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6
    },
    createMapBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700'
    },
    createMapSelectedWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primarySoft,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 9,
      marginBottom: 8
    },
    createMapSelectedText: {
      marginLeft: 8,
      color: colors.textMain,
      fontSize: 12,
      fontWeight: '600'
    },
    createMapHeaderWrap: {
      borderBottomWidth: 1,
      borderBottomColor: '#0B5F59',
      backgroundColor: '#0F766E',
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 10,
      marginHorizontal: -16
    },
    createMapHeaderTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8
    },
    createMapHeaderMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5
    },
    createMapHeaderMetaText: {
      marginLeft: 6,
      color: '#E6FFFA',
      fontSize: 12,
      fontWeight: '700'
    },
    createMapHeaderTitle: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800'
    },
    createMapHeaderBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 40,
      paddingHorizontal: 10
    },
    createMapHeaderBtnLeft: {
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.06)'
    },
    createMapHeaderBtnRight: {
      minWidth: 94,
      justifyContent: 'center'
    },
    createMapHeaderBtnText: {
      marginLeft: 4,
      color: '#D1FAE5',
      fontSize: 13,
      fontWeight: '700'
    },
    createMapHeaderBtnPrimary: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#0EA5A2',
      borderRadius: 18,
      paddingHorizontal: 10,
      paddingVertical: 7
    },
    createMapHeaderBtnPrimaryText: {
      marginLeft: 4,
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800'
    },
    datePickerBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(2, 6, 23, 0.35)',
      justifyContent: 'flex-end'
    },
    datePickerCard: {
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingTop: 8,
      paddingBottom: 16,
      paddingHorizontal: 10
    },
    datePickerDoneBtn: {
      alignSelf: 'flex-end',
      marginTop: 4,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.primary
    },
    datePickerDoneText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800'
    },
    createMapFullWrap: {
      flex: 1,
      padding: 12,
      backgroundColor: colors.background
    },
    createMapSearchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8
    },
    createMapSearchInputWrap: {
      flex: 1,
      height: 42,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10
    },
    createMapSearchInput: {
      flex: 1,
      marginLeft: 8,
      color: colors.textMain,
      fontSize: 13
    },
    createMapSearchBtn: {
      width: 42,
      height: 42,
      borderRadius: 12,
      marginLeft: 8,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center'
    },
    createMapResultsCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      marginBottom: 8,
      maxHeight: 180
    },
    createMapResultItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border
    },
    createMapResultTextWrap: {
      marginLeft: 8,
      flex: 1
    },
    createMapResultTitle: {
      color: colors.textMain,
      fontSize: 13,
      fontWeight: '700'
    },
    createMapResultSub: {
      marginTop: 2,
      color: colors.textSecondary,
      fontSize: 11
    },
    createMapNativeContainer: {
      flex: 1,
      minHeight: 360,
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface
    },
    createMapNativePressable: {
      flex: 1
    },
    createMapTilesCanvas: {
      flex: 1,
      backgroundColor: '#E5E7EB'
    },
    createMapTileImage: {
      position: 'absolute',
      width: TILE_SIZE,
      height: TILE_SIZE
    },
    createMapNativeCrosshair: {
      position: 'absolute',
      left: '50%',
      top: '50%',
      marginLeft: -11,
      marginTop: -22
    },
    createMapNativeHint: {
      position: 'absolute',
      top: 10,
      alignSelf: 'center',
      backgroundColor: 'rgba(15, 23, 42, 0.72)',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5
    },
    createMapNativeHintText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700'
    },
    createMapNativeControls: {
      position: 'absolute',
      right: 10,
      bottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.92)',
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: colors.border
    },
    createMapZoomBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface
    },
    createMapZoomText: {
      marginHorizontal: 10,
      color: colors.textMain,
      fontSize: 12,
      fontWeight: '700'
    },
    createMapWebOnlyWrap: {
      flex: 1
    },
    createMapNativeFull: {
      width: '100%',
      height: '100%'
    },
    createMapCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.sheet,
      padding: 10,
      marginBottom: 10
    },
    createMapNative: {
      width: '100%',
      height: 260,
      borderRadius: 10
    },
    createMapWebFrame: {
      width: '100%',
      height: 220,
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: 8
    },
    createMapWebCoords: {
      flexDirection: 'row'
    },
    createMapCoordInput: {
      flex: 1,
      marginBottom: 0,
      marginRight: 8
    },
    createMapActionRow: {
      marginTop: 10,
      flexDirection: 'row'
    },
    createSubmitBtn: {
      height: 46,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      marginTop: 8
    },
    createSubmitBtnText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 14
    },
    categoryCreateCard: {
      width: '100%',
      maxWidth: 380,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14
    },
    jobCreateCard: {
      width: '100%',
      maxWidth: 420,
      maxHeight: '88%',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14
    },
    jobCreateForm: {
      marginTop: 4
    },
    jobFieldLabel: {
      color: colors.textMain,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 6
    },
    jobChipRow: {
      paddingBottom: 8
    },
    jobTypeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 8
    },
    jobChip: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.sheet,
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 12,
      marginRight: 8,
      marginBottom: 8
    },
    jobChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft
    },
    jobChipText: {
      color: colors.textSecondary,
      fontWeight: '700',
      fontSize: 12
    },
    jobChipTextActive: {
      color: colors.primary
    },
    jobEmptyHintWrap: {
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 12
    },
    jobEmptyHint: {
      color: colors.textSecondary,
      fontSize: 12
    },
    jobMapBox: {
      height: 180,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.sheet,
      marginBottom: 8,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center'
    },
    jobMapGridLineHorizontal: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: '50%',
      height: 1,
      backgroundColor: colors.border
    },
    jobMapGridLineVertical: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: '50%',
      width: 1,
      backgroundColor: colors.border
    },
    jobMapHint: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600'
    },
    jobMapMarker: {
      position: 'absolute',
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: '#FFFFFF',
      backgroundColor: colors.primary
    },
    jobMapCoords: {
      color: colors.textSecondary,
      fontSize: 12,
      marginBottom: 8
    },
    categoryCreateHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10
    },
    categoryCreateIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10
    },
    categoryCreateHeaderText: {
      flex: 1
    },
    categoryCreateInput: {
      height: 42,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.sheet,
      color: colors.textMain,
      paddingHorizontal: 10,
      marginBottom: 8
    },
    categoryCreateDescription: {
      minHeight: 74,
      height: undefined,
      textAlignVertical: 'top',
      paddingTop: 10
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(2, 6, 23, 0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24
    },
    previewBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(2, 6, 23, 0.75)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20
    },
    previewCard: {
      width: '100%',
      maxWidth: 420,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 16
    },
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    previewTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textMain
    },
    previewClose: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.sheet
    },
    previewAvatarWrap: {
      marginTop: 14,
      alignItems: 'center'
    },
    previewName: {
      marginTop: 14,
      fontSize: 20,
      fontWeight: '800',
      color: colors.textMain,
      textAlign: 'center'
    },
    previewEmail: {
      marginTop: 4,
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center'
    },
    previewEditBtn: {
      marginTop: 14,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center'
    },
    previewEditText: {
      marginLeft: 8,
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 14
    },
    modalCard: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 18,
      paddingVertical: 20,
      alignItems: 'center'
    },
    optionCard: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 14
    },
    optionTop: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10
    },
    optionAvatarMini: {
      marginRight: 10
    },
    optionTopContent: {
      flex: 1
    },
    avatarSheet: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 14
    },
    cropCard: {
      width: '100%',
      maxWidth: 420,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 16
    },
    cropAreaWrap: {
      marginTop: 12,
      height: 320,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: '#0F172A',
      position: 'relative'
    },
    zoomRow: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    zoomLabel: {
      color: colors.textSecondary,
      fontWeight: '700',
      fontSize: 13
    },
    zoomButtons: {
      flexDirection: 'row',
      alignItems: 'center'
    },
    zoomBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.sheet,
      alignItems: 'center',
      justifyContent: 'center'
    },
    zoomBtnText: {
      color: colors.textMain,
      fontWeight: '800',
      fontSize: 18,
      marginTop: -1
    },
    zoomValue: {
      minWidth: 48,
      textAlign: 'center',
      color: colors.textMain,
      fontWeight: '700',
      fontSize: 13
    },
    optionTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.textMain
    },
    optionSubtitle: {
      marginTop: 2,
      color: colors.textSecondary,
      fontSize: 12
    },
    optionModal: {
      width: '100%',
      maxWidth: 360,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14
    },
    optionMessage: {
      marginTop: 8,
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 20
    },
    optionActionsRow: {
      marginTop: 12,
      flexDirection: 'row',
      gap: 8
    },
    optionActionBtn: {
      flex: 1,
      height: 42,
      marginTop: 0,
      marginLeft: 0,
      marginRight: 0
    },
    optionRow: {
      height: 46,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.sheet,
      marginBottom: 8,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center'
    },
    optionLabel: {
      marginLeft: 10,
      fontSize: 14,
      fontWeight: '700',
      color: colors.textMain
    },
    optionCancel: {
      marginTop: 6,
      height: 42,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center'
    },
    optionCancelText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSecondary
    },
    staticAvatarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between'
    },
    staticAvatarItem: {
      width: '31%',
      aspectRatio: 1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
      padding: 6,
      backgroundColor: colors.sheet
    },
    staticAvatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 10
    },
    modalTitle: {
      marginTop: 10,
      fontSize: 20,
      fontWeight: '800',
      color: colors.textMain
    },
    modalSubtitle: {
      marginTop: 6,
      textAlign: 'center',
      color: colors.textSecondary,
      lineHeight: 20,
      fontSize: 13
    },
    modalActions: {
      marginTop: 16,
      width: '100%',
      flexDirection: 'row'
    },
    modalBtnSecondary: {
      flex: 1,
      height: 42,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8
    },
    modalBtnSecondaryText: {
      color: colors.textSecondary,
      fontWeight: '700'
    },
    modalBtnDanger: {
      flex: 1,
      height: 42,
      borderRadius: 10,
      backgroundColor: colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8
    },
    modalBtnDangerText: {
      color: '#FFFFFF',
      fontWeight: '700'
    },
    modalBtnPrimary: {
      flex: 1,
      height: 42,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8
    },
    modalBtnPrimaryText: {
      color: '#FFFFFF',
      fontWeight: '700'
    }
  });
