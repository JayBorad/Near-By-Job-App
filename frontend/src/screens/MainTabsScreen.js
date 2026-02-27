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
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPopup } from '../components/AnimatedPopup';
import { LottieLoader } from '../components/LottieLoader';
import {
  createCategory,
  getApprovedCategories,
  getMyCategories,
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
const STATIC_AVATARS = [
  'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=Sky',
  'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=Milo',
  'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=Ava',
  'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=Kai',
  'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=Noah',
  'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=Luna'
];

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

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid-outline', activeIcon: 'grid' },
  { key: 'explore', label: 'Explore', icon: 'compass-outline', activeIcon: 'compass' },
  { key: 'create', label: '', icon: 'add', activeIcon: 'add' },
  { key: 'messages', label: 'Messages', icon: 'chatbubble-ellipses-outline', activeIcon: 'chatbubble-ellipses' },
  { key: 'settings', label: 'Settings', icon: 'settings-outline', activeIcon: 'settings' }
];

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
          subtitle="Browse and create job categories"
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
  isUploadingAvatar,
  styles,
  colors
}) {
  if (tabKey === 'dashboard') {
    return (
      <View style={styles.centerPage}>
        <PageCard
          title="Dashboard"
          subtitle="Welcome to your dashboard. Stats and cards will appear here soon."
          icon="grid"
          styles={styles}
          colors={colors}
        />
      </View>
    );
  }
  if (tabKey === 'explore') {
    return (
      <View style={styles.centerPage}>
        <PageCard
          title="Explore"
          subtitle="Discover content, recommendations, and latest updates in this section."
          icon="compass"
          styles={styles}
          colors={colors}
        />
      </View>
    );
  }
  if (tabKey === 'create') {
    return (
      <View style={styles.centerPage}>
        <PageCard
          title="Create"
          subtitle="Create a new job post quickly from this action tab."
          icon="add-circle"
          styles={styles}
          colors={colors}
        />
      </View>
    );
  }
  if (tabKey === 'messages') {
    return (
      <View style={styles.centerPage}>
        <PageCard
          title="Messages"
          subtitle="Check your chats, conversations, and team communications here."
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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [themeMode, setThemeMode] = useState('light');
  const [settingsPage, setSettingsPage] = useState('main');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showAvatarOptions, setShowAvatarOptions] = useState(false);
  const [showAvatarList, setShowAvatarList] = useState(false);
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [showWebCropper, setShowWebCropper] = useState(false);
  const [webCropSource, setWebCropSource] = useState('');
  const [webCropMimeType, setWebCropMimeType] = useState('image/jpeg');
  const [webCrop, setWebCrop] = useState({ x: 0, y: 0 });
  const [webZoom, setWebZoom] = useState(1);
  const [webCroppedPixels, setWebCroppedPixels] = useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const [hasFetchedCategoriesOnce, setHasFetchedCategoriesOnce] = useState(false);
  const [isCategorySubmitting, setIsCategorySubmitting] = useState(false);
  const [categoriesTab, setCategoriesTab] = useState('all');
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [allCategories, setAllCategories] = useState([]);
  const [myCategories, setMyCategories] = useState([]);
  const [localUser, setLocalUser] = useState(user || null);
  const [popup, setPopup] = useState({ visible: false, title: '', message: '', type: 'error' });
  const contentFade = useRef(new Animated.Value(1)).current;
  const contentShift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setLocalUser(user || null);
  }, [user]);

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
    TABS.forEach((tab) => {
      values[tab.key] = new Animated.Value(1);
    });
    return values;
  }, []);

  const iconLift = useMemo(() => {
    const values = {};
    TABS.forEach((tab) => {
      values[tab.key] = new Animated.Value(0);
    });
    return values;
  }, []);

  const showPopup = (title, message, type = 'error') => {
    setPopup({
      visible: true,
      title,
      message,
      type
    });
  };

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

  const submitCategory = async () => {
    if (!token) return;
    if (!newCategoryName.trim()) {
      showPopup('Validation Error', 'Category name is required.', 'warning');
      return;
    }
    try {
      setIsCategorySubmitting(true);
      await createCategory({
        token,
        payload: {
          name: newCategoryName.trim(),
          description: newCategoryDescription.trim()
        }
      });
      setShowAddCategoryModal(false);
      setNewCategoryName('');
      setNewCategoryDescription('');
      showPopup('Category Added', 'Category submitted with pending status.', 'success');
      await fetchCategories({ forceLoader: true });
    } catch (error) {
      showPopup('Create Failed', error?.message || 'Unable to create category.', 'error');
    } finally {
      setIsCategorySubmitting(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'settings' || settingsPage !== 'categories') return;
    fetchCategories();
  }, [activeTab, settingsPage, categorySearch, categoryFilter, categoriesTab, token]);

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

  const centerTab = TABS.find((tab) => tab.key === 'create') || TABS[2];

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.pageWrap, { opacity: contentFade, transform: [{ translateY: contentShift }] }]}>
        <PageContent
          tabKey={activeTab}
          user={localUser}
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
          isUploadingAvatar={isUploadingAvatar}
          styles={styles}
          colors={colors}
        />
      </Animated.View>

      {activeTab === 'settings' && settingsPage === 'categories' ? (
        <Pressable style={styles.categoryFab} onPress={() => setShowAddCategoryModal(true)}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>
      ) : null}

      <Modal visible={showAddCategoryModal} transparent animationType="fade" onRequestClose={() => setShowAddCategoryModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.categoryCreateCard}>
            <View style={styles.categoryCreateHeader}>
              <View style={styles.categoryCreateIconWrap}>
                <Ionicons name="layers-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.categoryCreateHeaderText}>
                <Text style={styles.optionTitle}>Create Category</Text>
                <Text style={styles.optionSubtitle}>Submit your category for admin approval</Text>
              </View>
            </View>
            <TextInput
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="Category name"
              placeholderTextColor={colors.textSecondary}
              style={styles.categoryCreateInput}
            />
            <TextInput
              value={newCategoryDescription}
              onChangeText={setNewCategoryDescription}
              placeholder="One-line description"
              placeholderTextColor={colors.textSecondary}
              style={[styles.categoryCreateInput, styles.categoryCreateDescription]}
              multiline
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalBtnSecondary} onPress={() => setShowAddCategoryModal(false)}>
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalBtnPrimary} onPress={submitCategory}>
                <Text style={styles.modalBtnPrimaryText}>Submit</Text>
              </Pressable>
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
          {TABS.map((tab) => {
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

        <Pressable style={styles.centerBtn} onPress={() => switchTab(centerTab.key)}>
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
        visible={isCategorySubmitting || isUploadingAvatar || isSavingProfile}
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
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center'
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
      marginLeft: 8,
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
    categoryCreateCard: {
      width: '100%',
      maxWidth: 380,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14
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
