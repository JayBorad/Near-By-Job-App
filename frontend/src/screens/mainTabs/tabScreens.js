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
  Text,
  TextInput,
  useWindowDimensions,
  View
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { AdminListState } from '../../components/AdminListState';
import { COUNTRY_CODES } from '../../constants/countryCodes';
import {
  AvatarView,
  CategoryStatusBadge,
  JobLocationCard,
  SettingsOption
} from './components/SharedBlocks';
import {
  clamp,
  formatDateValue,
  getPhoneRule,
  getRoleLabel,
  splitPhoneByCountryCode,
  getTouchDistance,
  getUserModeLabel,
  latToPixelY,
  lngToPixelX,
  pixelXToLng,
  pixelYToLat
} from './utils';

const DEFAULT_AVATAR_URL = null;
const TILE_SIZE = 256;
const STATIC_AVATARS = [
  'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=Sky',
  'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=Milo',
  'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=Ava',
  'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=Kai',
  'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=Noah',
  'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=Luna'
];
const ADMIN_EMPTY_ANIMATION = require('../../../assets/lottie/no-result-found.json');

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
    userMode: user?.userMode || 'JOB_PICKER',
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
      userMode: user?.userMode || 'JOB_PICKER',
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
          {user?.role !== 'ADMIN' ? (
            <View style={styles.profileInputWrap}>
              <Text style={styles.profileInputLabel}>Mode</Text>
              <View style={styles.genderRow}>
                {['JOB_PICKER', 'JOB_POSTER'].map((mode) => (
                  <Pressable
                    key={mode}
                    style={[styles.genderPill, form.userMode === mode && styles.genderPillActive]}
                    onPress={() => setForm((prev) => ({ ...prev, userMode: mode }))}
                  >
                    <Text style={[styles.genderPillText, form.userMode === mode && styles.genderPillTextActive]}>
                      {mode === 'JOB_PICKER' ? 'Job Picker' : 'Job Poster'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

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
          <AdminListState
            mode="loading"
            title="Loading categories..."
            subtitle="Please wait while we fetch categories."
            colors={colors}
          />
        ) : data.length ? (
          data.map((item) => (
            <Pressable key={item.id} style={styles.categoryCard} onPress={() => setSelectedItem(item)}>
              <View style={styles.categoryCardTop}>
                <Text style={styles.categoryName}>{item.name}</Text>
                {categoriesTab === 'mine' ? <CategoryStatusBadge status={item.status} styles={styles} /> : null}
              </View>
              <Text style={styles.categoryDescription} numberOfLines={1}>
                {item.description || 'No description provided.'}
              </Text>
            </Pressable>
          ))
        ) : hasFetchedOnce ? (
          <AdminListState
            mode="empty"
            title="No categories found"
            subtitle="No categories are available right now."
            colors={colors}
            emptySource={ADMIN_EMPTY_ANIMATION}
          />
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

function AdminUsersPage({ users, isLoading, onRefresh, onSaveUserDetails, onSaveUserAvatar, styles, colors }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showAvatarOptions, setShowAvatarOptions] = useState(false);
  const [showAvatarList, setShowAvatarList] = useState(false);
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [modeFilter, setModeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [genderFilter, setGenderFilter] = useState('ALL');
  const [form, setForm] = useState({
    name: '',
    username: '',
    phone: '',
    age: '',
    gender: 'OTHER',
    address: '',
    bio: '',
    role: 'USER',
    userMode: 'JOB_PICKER',
    status: 'ACTIVE'
  });

  const openUserDetail = (user) => {
    setSelectedUser(user);
    setForm({
      name: String(user?.name || ''),
      username: String(user?.username || ''),
      phone: String(user?.phone || ''),
      age: user?.age ? String(user.age) : '',
      gender: String(user?.gender || 'OTHER'),
      address: String(user?.address || ''),
      bio: String(user?.bio || ''),
      role: String(user?.role || 'USER'),
      userMode: String(user?.userMode || 'JOB_PICKER'),
      status: String(user?.status || 'ACTIVE')
    });
  };

  const filteredUsers = useMemo(
    () =>
      users.filter((item) => {
        const text = searchText.trim().toLowerCase();
        const matchesText = !text || [item?.name, item?.email, item?.username].some((value) =>
          String(value || '').toLowerCase().includes(text)
        );
        const matchesRole = roleFilter === 'ALL' || item?.role === roleFilter;
        const matchesMode = modeFilter === 'ALL' || item?.userMode === modeFilter;
        const matchesStatus = statusFilter === 'ALL' || item?.status === statusFilter;
        const matchesGender = genderFilter === 'ALL' || item?.gender === genderFilter;
        return matchesText && matchesRole && matchesMode && matchesStatus && matchesGender;
      }),
    [users, searchText, roleFilter, modeFilter, statusFilter, genderFilter]
  );
  const activeFilterCount = [roleFilter, modeFilter, statusFilter, genderFilter].filter((value) => value !== 'ALL').length;

  const saveDetails = async () => {
    if (!selectedUser?.id) return;
    if (!form.name.trim()) return;
    try {
      setIsSaving(true);
      const updated = await onSaveUserDetails(selectedUser.id, {
        name: form.name.trim(),
        username: form.username.trim().toLowerCase(),
        phone: form.phone.trim(),
        age: form.age ? Number(form.age) : null,
        gender: form.gender,
        address: form.address.trim(),
        bio: form.bio.trim(),
        role: form.role,
        ...(form.role !== 'ADMIN' ? { userMode: form.userMode } : {}),
        status: form.status
      });
      if (updated) {
        setSelectedUser(updated);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const applyAvatarUpdate = async (payload) => {
    if (!selectedUser?.id) return;
    try {
      setIsUploadingAvatar(true);
      const updated = await onSaveUserAvatar(selectedUser.id, payload);
      if (updated) {
        setSelectedUser(updated);
      }
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const selectFromDevice = async () => {
    setShowAvatarOptions(false);
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) return;
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
      if (!asset.base64) return;
      const normalizedMimeType = (asset.mimeType || 'image/jpeg').toLowerCase();
      const avatarData = `data:${normalizedMimeType};base64,${asset.base64}`;
      await applyAvatarUpdate({ avatarData });
    } catch (_error) {
      // no-op: toast is handled by parent API callback
    }
  };

  const takePhoto = async () => {
    setShowAvatarOptions(false);
    try {
      if (Platform.OS === 'web') return;
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
        base64: true
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.base64) return;
      const normalizedMimeType = (asset.mimeType || 'image/jpeg').toLowerCase();
      const avatarData = `data:${normalizedMimeType};base64,${asset.base64}`;
      await applyAvatarUpdate({ avatarData });
    } catch (_error) {
      // no-op: toast is handled by parent API callback
    }
  };

  if (selectedUser) {
    return (
      <View style={styles.settingsScreen}>
        <View style={styles.settingsNav}>
          <Pressable style={styles.settingsBackBtn} onPress={() => setSelectedUser(null)}>
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
            <Text style={styles.settingsBackText}>Users</Text>
          </Pressable>
          <Text style={styles.settingsNavTitle}>User Details</Text>
          <View style={styles.settingsNavRight} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
          <View style={styles.adminUserDetailHero}>
            <Pressable style={styles.avatarWrap} onPress={() => setShowAvatarPreview(true)}>
              <AvatarView imageUrl={selectedUser?.avatar || DEFAULT_AVATAR_URL} size={88} colors={colors} showBorder />
              <Pressable
                style={styles.avatarBadge}
                onPress={() => setShowAvatarOptions(true)}
                disabled={isUploadingAvatar}
              >
                {isUploadingAvatar ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                )}
              </Pressable>
            </Pressable>
            <Text style={styles.adminUserDetailName}>{selectedUser?.name || '-'}</Text>
            <Text style={styles.adminUserDetailEmail}>{selectedUser?.email || '-'}</Text>
            <Text style={styles.profileHint}>Tap camera icon to change profile photo.</Text>
          </View>

          <View style={styles.adminUserDetailCard}>
            <Text style={styles.createFieldLabel}>Full Name</Text>
            <TextInput
              value={form.name}
              onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
              style={styles.createFieldInput}
              placeholder="Full name"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.createFieldLabel}>Username</Text>
            <TextInput
              value={form.username}
              onChangeText={(value) => setForm((prev) => ({ ...prev, username: value }))}
              style={styles.createFieldInput}
              placeholder="username"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.createFieldLabel}>Email (read only)</Text>
            <View style={[styles.createFieldInput, styles.adminReadOnlyWrap]}>
              <Text style={styles.adminReadOnlyText}>{selectedUser?.email || '-'}</Text>
            </View>

            <Text style={styles.createFieldLabel}>Phone</Text>
            <TextInput
              value={form.phone}
              onChangeText={(value) => setForm((prev) => ({ ...prev, phone: value }))}
              style={styles.createFieldInput}
              placeholder="Phone"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.createFieldLabel}>Age</Text>
            <TextInput
              value={form.age}
              onChangeText={(value) => setForm((prev) => ({ ...prev, age: value.replace(/[^0-9]/g, '') }))}
              style={styles.createFieldInput}
              keyboardType="number-pad"
              placeholder="Age"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.createFieldLabel}>Gender</Text>
            <View style={styles.createPillRow}>
              {['MALE', 'FEMALE', 'OTHER'].map((g) => (
                <Pressable
                  key={`admin-gender-${g}`}
                  style={[styles.createPill, form.gender === g && styles.createPillActive]}
                  onPress={() => setForm((prev) => ({ ...prev, gender: g }))}
                >
                  <Text style={[styles.createPillText, form.gender === g && styles.createPillTextActive]}>{g}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.createFieldLabel}>Role</Text>
            <View style={styles.createPillRow}>
              {['USER', 'ADMIN'].map((r) => (
                <Pressable
                  key={`admin-role-${r}`}
                  style={[styles.createPill, form.role === r && styles.createPillActive]}
                  onPress={() => setForm((prev) => ({ ...prev, role: r }))}
                >
                  <Text style={[styles.createPillText, form.role === r && styles.createPillTextActive]}>{r}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.createFieldLabel}>User Mode</Text>
            {form.role === 'ADMIN' ? (
              <View style={[styles.createFieldInput, styles.adminReadOnlyWrap]}>
                <Text style={styles.adminReadOnlyText}>N/A for admin</Text>
              </View>
            ) : (
              <View style={styles.createPillRow}>
                {['JOB_PICKER', 'JOB_POSTER'].map((m) => (
                  <Pressable
                    key={`admin-mode-${m}`}
                    style={[styles.createPill, form.userMode === m && styles.createPillActive]}
                    onPress={() => setForm((prev) => ({ ...prev, userMode: m }))}
                  >
                    <Text style={[styles.createPillText, form.userMode === m && styles.createPillTextActive]}>{m}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={styles.createFieldLabel}>Status</Text>
            <View style={styles.createPillRow}>
              {['ACTIVE', 'DELETED'].map((s) => (
                <Pressable
                  key={`admin-status-${s}`}
                  style={[styles.createPill, form.status === s && styles.createPillActive]}
                  onPress={() => setForm((prev) => ({ ...prev, status: s }))}
                >
                  <Text style={[styles.createPillText, form.status === s && styles.createPillTextActive]}>{s}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.createFieldLabel}>Address</Text>
            <TextInput
              value={form.address}
              onChangeText={(value) => setForm((prev) => ({ ...prev, address: value }))}
              style={[styles.createFieldInput, styles.createFieldArea]}
              multiline
              placeholder="Address"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.createFieldLabel}>Bio</Text>
            <TextInput
              value={form.bio}
              onChangeText={(value) => setForm((prev) => ({ ...prev, bio: value }))}
              style={[styles.createFieldInput, styles.createFieldArea]}
              multiline
              placeholder="Bio"
              placeholderTextColor={colors.textSecondary}
            />

            <Pressable style={[styles.createSubmitBtn, isSaving ? styles.createSubmitBtnDisabled : null]} onPress={saveDetails} disabled={isSaving}>
              <Ionicons name="save-outline" size={16} color="#FFFFFF" />
              <Text style={styles.createSubmitBtnText}>{isSaving ? 'Saving...' : 'Save Changes'}</Text>
            </Pressable>
          </View>
        </ScrollView>

        <Modal visible={showAvatarOptions} transparent animationType="fade" onRequestClose={() => setShowAvatarOptions(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.optionCard}>
              <View style={styles.optionTop}>
                <View style={styles.optionAvatarMini}>
                  <AvatarView imageUrl={selectedUser?.avatar || DEFAULT_AVATAR_URL} size={52} colors={colors} showBorder />
                </View>
                <View style={styles.optionTopContent}>
                  <Text style={styles.optionTitle}>Change User Photo</Text>
                  <Text style={styles.optionSubtitle}>Update avatar just like profile</Text>
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
              <Pressable style={styles.optionRow} onPress={() => applyAvatarUpdate({ resetAvatar: true })}>
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
                  <Pressable
                    key={`admin-detail-avatar-${avatarUrl}`}
                    style={styles.staticAvatarItem}
                    onPress={() => {
                      setShowAvatarList(false);
                      applyAvatarUpdate({ avatarUrl });
                    }}
                  >
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
                <AvatarView imageUrl={selectedUser?.avatar || DEFAULT_AVATAR_URL} size={220} colors={colors} showBorder />
              </View>
              <Text style={styles.previewName}>{selectedUser?.name || 'User'}</Text>
              <Text style={styles.previewEmail}>{selectedUser?.email || '-'}</Text>
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
      </View>
    );
  }

  return (
    <View style={styles.settingsScreen}>
      <View style={styles.settingsNav}>
        <View style={styles.settingsNavRight} />
        <Text style={styles.settingsNavTitle}>Users</Text>
        <View style={styles.settingsNavRight}>
          <Pressable style={styles.settingsNavIconBtn} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.adminUserToolbar}>
        <View style={styles.adminUserSearchWrap}>
          <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search by name, email, username..."
            placeholderTextColor={colors.textSecondary}
            style={styles.categorySearchInput}
          />
        </View>
        <Pressable
          style={[styles.adminUserFilterBtn, activeFilterCount ? styles.adminUserFilterBtnActive : null]}
          onPress={() => setShowFilterSheet(true)}
        >
          <Ionicons name="options-outline" size={16} color={activeFilterCount ? '#FFFFFF' : colors.primary} />
          <Text style={[styles.adminUserFilterBtnText, activeFilterCount ? styles.adminUserFilterBtnTextActive : null]}>
            Filters
          </Text>
          {activeFilterCount ? (
            <View style={styles.adminUserFilterBadge}>
              <Text style={styles.adminUserFilterBadgeText}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View style={styles.adminUserAppliedRow}>
        <View style={styles.adminUserAppliedChip}>
          <Text style={styles.adminUserAppliedLabel}>Role</Text>
          <Text style={styles.adminUserAppliedValue}>{roleFilter}</Text>
        </View>
        <View style={styles.adminUserAppliedChip}>
          <Text style={styles.adminUserAppliedLabel}>Mode</Text>
          <Text style={styles.adminUserAppliedValue}>{modeFilter}</Text>
        </View>
        <View style={styles.adminUserAppliedChip}>
          <Text style={styles.adminUserAppliedLabel}>Status</Text>
          <Text style={styles.adminUserAppliedValue}>{statusFilter}</Text>
        </View>
        <View style={styles.adminUserAppliedChip}>
          <Text style={styles.adminUserAppliedLabel}>Gender</Text>
          <Text style={styles.adminUserAppliedValue}>{genderFilter}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        {isLoading ? (
          <AdminListState
            mode="loading"
            title="Loading users..."
            subtitle="Please wait while we fetch users."
            colors={colors}
          />
        ) : filteredUsers.length ? (
          filteredUsers.map((item) => (
            <Pressable key={item.id} style={styles.adminUserCardNew} onPress={() => openUserDetail(item)}>
              <View style={styles.adminUserCardLead}>
                <AvatarView imageUrl={item?.avatar || DEFAULT_AVATAR_URL} size={46} colors={colors} showBorder />
                <View style={styles.adminUserCardBody}>
                  <View style={styles.adminUserCardTop}>
                    <Text style={styles.adminUserCardName} numberOfLines={1}>
                      {item.name || '-'}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.iconInactive} />
                  </View>
                  <Text style={styles.adminUserCardEmail} numberOfLines={1}>
                    {item.email || '-'}
                  </Text>
                </View>
              </View>
              <View style={styles.adminUserCardTags}>
                <View style={styles.adminUserTag}>
                  <Text style={styles.adminUserTagText}>{item.role || '-'}</Text>
                </View>
                <View style={styles.adminUserTag}>
                  <Text style={styles.adminUserTagText}>{getUserModeLabel(item?.role, item?.userMode)}</Text>
                </View>
                <View style={styles.adminUserTag}>
                  <Text style={styles.adminUserTagText}>{item.status || '-'}</Text>
                </View>
              </View>
            </Pressable>
          ))
        ) : (
          <AdminListState
            mode="empty"
            title="No users found"
            subtitle={users.length ? 'No users match your current filters.' : 'No users are available right now.'}
            colors={colors}
            emptySource={ADMIN_EMPTY_ANIMATION}
          />
        )}
      </ScrollView>

      <Modal visible={showFilterSheet} transparent animationType="fade" onRequestClose={() => setShowFilterSheet(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowFilterSheet(false)}>
          <Pressable style={styles.adminFilterSheet} onPress={() => {}}>
            <View style={styles.adminFilterHead}>
              <Text style={styles.optionTitle}>User Filters</Text>
              <Pressable
                style={styles.settingsNavIconBtn}
                onPress={() => {
                  setRoleFilter('ALL');
                  setModeFilter('ALL');
                  setStatusFilter('ALL');
                  setGenderFilter('ALL');
                }}
              >
                <Ionicons name="refresh-outline" size={16} color={colors.primary} />
              </Pressable>
            </View>

            <Text style={styles.adminFilterLabel}>Role</Text>
            <View style={styles.adminFilterWrap}>
              {['ALL', 'USER', 'ADMIN'].map((value) => (
                <Pressable
                  key={`role-modal-${value}`}
                  style={[styles.categoryFilterPill, roleFilter === value && styles.categoryFilterPillActive]}
                  onPress={() => setRoleFilter(value)}
                >
                  <Text style={[styles.categoryFilterText, roleFilter === value && styles.categoryFilterTextActive]}>{value}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.adminFilterLabel}>Mode</Text>
            <View style={styles.adminFilterWrap}>
              {['ALL', 'JOB_PICKER', 'JOB_POSTER'].map((value) => (
                <Pressable
                  key={`mode-modal-${value}`}
                  style={[styles.categoryFilterPill, modeFilter === value && styles.categoryFilterPillActive]}
                  onPress={() => setModeFilter(value)}
                >
                  <Text style={[styles.categoryFilterText, modeFilter === value && styles.categoryFilterTextActive]}>{value}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.adminFilterLabel}>Status</Text>
            <View style={styles.adminFilterWrap}>
              {['ALL', 'ACTIVE', 'DELETED'].map((value) => (
                <Pressable
                  key={`status-modal-${value}`}
                  style={[styles.categoryFilterPill, statusFilter === value && styles.categoryFilterPillActive]}
                  onPress={() => setStatusFilter(value)}
                >
                  <Text style={[styles.categoryFilterText, statusFilter === value && styles.categoryFilterTextActive]}>{value}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.adminFilterLabel}>Gender</Text>
            <View style={styles.adminFilterWrap}>
              {['ALL', 'MALE', 'FEMALE', 'OTHER'].map((value) => (
                <Pressable
                  key={`gender-modal-${value}`}
                  style={[styles.categoryFilterPill, genderFilter === value && styles.categoryFilterPillActive]}
                  onPress={() => setGenderFilter(value)}
                >
                  <Text style={[styles.categoryFilterText, genderFilter === value && styles.categoryFilterTextActive]}>{value}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.createSubmitBtn} onPress={() => setShowFilterSheet(false)}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
              <Text style={styles.createSubmitBtnText}>Apply Filters</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showAvatarOptions} transparent animationType="fade" onRequestClose={() => setShowAvatarOptions(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.optionCard}>
            <View style={styles.optionTop}>
              <View style={styles.optionAvatarMini}>
                <AvatarView imageUrl={selectedUser?.avatar || DEFAULT_AVATAR_URL} size={52} colors={colors} showBorder />
              </View>
              <View style={styles.optionTopContent}>
                <Text style={styles.optionTitle}>Change User Photo</Text>
                <Text style={styles.optionSubtitle}>Update avatar just like profile</Text>
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
            <Pressable style={styles.optionRow} onPress={() => applyAvatarUpdate({ resetAvatar: true })}>
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
                <Pressable
                  key={`admin-avatar-${avatarUrl}`}
                  style={styles.staticAvatarItem}
                  onPress={() => {
                    setShowAvatarList(false);
                    applyAvatarUpdate({ avatarUrl });
                  }}
                >
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
    </View>
  );
}

function AdminModerationPage({
  jobs,
  isLoading,
  onRefresh,
  styles,
  colors
}) {
  const [jobSearch, setJobSearch] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState('ALL');
  const [showJobFilterModal, setShowJobFilterModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const jobFilterOptions = ['ALL', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  const filteredJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const matchesStatus = jobStatusFilter === 'ALL' || String(job?.status || '').toUpperCase() === jobStatusFilter;
        const query = jobSearch.trim().toLowerCase();
        const matchesSearch =
          !query ||
          [job?.title, job?.description, job?.owner?.name, job?.category?.name]
            .some((value) => String(value || '').toLowerCase().includes(query));
        return matchesStatus && matchesSearch;
      }),
    [jobs, jobSearch, jobStatusFilter]
  );

  return (
    <View style={styles.settingsScreen}>
      <View style={styles.settingsNav}>
        <View style={styles.settingsNavRight} />
        <Text style={styles.settingsNavTitle}>Admin Panel</Text>
        <View style={styles.settingsNavRight}>
          <Pressable style={styles.settingsNavIconBtn} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.adminCategoryToolbar}>
        <View style={styles.categorySearchWrap}>
          <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
          <TextInput
            value={jobSearch}
            onChangeText={setJobSearch}
            placeholder="Search jobs..."
            placeholderTextColor={colors.textSecondary}
            style={styles.categorySearchInput}
          />
        </View>
        <Pressable style={styles.categoryFilterIconBtn} onPress={() => setShowJobFilterModal(true)}>
          <Ionicons name="filter-outline" size={18} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        {isLoading ? (
          <AdminListState
            mode="loading"
            title="Loading all jobs..."
            subtitle="Please wait while we fetch latest records."
            colors={colors}
          />
        ) : filteredJobs.length ? (
          filteredJobs.map((job) => (
            <Pressable key={job.id} style={styles.adminJobCard} onPress={() => setSelectedJob(job)}>
              <View style={styles.adminJobTop}>
                <Text style={styles.adminJobTitle} numberOfLines={1}>
                  {job.title}
                </Text>
                <View style={styles.adminJobStatusPill}>
                  <Text style={styles.adminJobStatusText}>{String(job?.status || 'OPEN').replace('_', ' ')}</Text>
                </View>
              </View>
              <Text style={styles.adminJobMeta} numberOfLines={1}>By: {job?.owner?.name || '-'}</Text>
              <Text style={styles.adminJobMeta} numberOfLines={1}>Category: {job?.category?.name || '-'}</Text>
              <View style={styles.adminJobBottomRow}>
                <Text style={styles.adminJobBudget}>₹{job?.budget || '-'}</Text>
                <Ionicons name="arrow-forward-circle-outline" size={18} color={colors.primary} />
              </View>
            </Pressable>
          ))
        ) : (
          <AdminListState
            mode="empty"
            title="No jobs found"
            subtitle={jobs.length ? 'No jobs match your current filters.' : 'No jobs are available right now.'}
            colors={colors}
            emptySource={ADMIN_EMPTY_ANIMATION}
          />
        )}
      </ScrollView>

      <Modal visible={showJobFilterModal} transparent animationType="fade" onRequestClose={() => setShowJobFilterModal(false)}>
        <Pressable style={styles.filterBackdrop} onPress={() => setShowJobFilterModal(false)}>
          <Pressable style={styles.categoryFilterModal} onPress={() => {}}>
            <Text style={styles.optionTitle}>Filter Jobs</Text>
            <Text style={styles.categoryFilterHint}>Choose status to refine jobs</Text>
            {jobFilterOptions.map((option) => (
              <Pressable
                key={option}
                style={[styles.categoryFilterOption, jobStatusFilter === option && styles.categoryFilterOptionActive]}
                onPress={() => {
                  setJobStatusFilter(option);
                  setShowJobFilterModal(false);
                }}
              >
                <View style={styles.categoryFilterOptionLeft}>
                  <Ionicons
                    name={option === 'ALL' ? 'apps-outline' : 'briefcase-outline'}
                    size={16}
                    color={jobStatusFilter === option ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.categoryFilterOptionText, jobStatusFilter === option && styles.categoryFilterOptionTextActive]}>
                    {option}
                  </Text>
                </View>
                {jobStatusFilter === option ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={Boolean(selectedJob)} transparent animationType="fade" onRequestClose={() => setSelectedJob(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.adminJobDetailModal}>
            <View style={styles.adminJobDetailHeader}>
              <Text style={styles.adminJobDetailTitle}>{selectedJob?.title || 'Job Details'}</Text>
              <View style={styles.adminJobStatusPill}>
                <Text style={styles.adminJobStatusText}>{String(selectedJob?.status || 'OPEN').replace('_', ' ')}</Text>
              </View>
            </View>
            <Text style={styles.adminJobDetailDescription}>{selectedJob?.description || 'No description provided.'}</Text>
            <View style={styles.adminJobDetailGrid}>
              <Text style={styles.adminJobMeta}>Category: {selectedJob?.category?.name || '-'}</Text>
              <Text style={styles.adminJobMeta}>Posted By: {selectedJob?.owner?.name || '-'}</Text>
              <Text style={styles.adminJobMeta}>Email: {selectedJob?.owner?.email || '-'}</Text>
              <Text style={styles.adminJobMeta}>Budget: ₹{selectedJob?.budget || '-'}</Text>
              <Text style={styles.adminJobMeta}>Type: {String(selectedJob?.jobType || '').replace('_', ' ') || '-'}</Text>
              <Text style={styles.adminJobMeta}>
                Due Date: {selectedJob?.dueDate ? String(selectedJob.dueDate).slice(0, 10) : '-'}
              </Text>
            </View>
            <JobLocationCard job={selectedJob} title="Job Location" styles={styles} colors={colors} />
            <Pressable style={styles.optionCancel} onPress={() => setSelectedJob(null)}>
              <Text style={styles.optionCancelText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function AdminCategoriesPage({
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
  const [creatorTypeFilter, setCreatorTypeFilter] = useState('ALL');
  const adminFilterOptions = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'];
  const creatorFilterOptions = ['ALL', 'ADMIN', 'USER'];
  const filteredCategories = useMemo(
    () =>
      categories.filter((item) => {
        if (creatorTypeFilter === 'ALL') return true;
        const creatorRole = String(item?.creator?.role || '').toUpperCase();
        if (creatorTypeFilter === 'ADMIN') return creatorRole === 'ADMIN';
        if (creatorTypeFilter === 'USER') return creatorRole && creatorRole !== 'ADMIN';
        return true;
      }),
    [categories, creatorTypeFilter]
  );
  const closeCreateCategoryModal = () => {
    setShowCreateModal(false);
    setCategoryDraft({ name: '', description: '' });
  };

  return (
    <View style={styles.settingsScreen}>
      <View style={styles.settingsNav}>
        <View style={styles.settingsNavRight} />
        <Text style={styles.settingsNavTitle}>Categories</Text>
        <View style={styles.settingsNavRight}>
          <Pressable style={styles.settingsNavIconBtn} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        {isLoading ? (
          <AdminListState
            mode="loading"
            title="Loading all categories..."
            subtitle="Please wait while we fetch latest records."
            colors={colors}
          />
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

            {filteredCategories.length ? (
              filteredCategories.map((item) => (
                <Pressable key={item.id} style={styles.adminCategoryCard} onPress={() => setSelectedCategory(item)}>
                  <View style={styles.adminCategoryTop}>
                    <View style={styles.adminCategoryNameWrap}>
                      <Text style={styles.adminCategoryName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.adminCategoryDescriptionOneLine} numberOfLines={1}>
                        {item.description || 'No description provided.'}
                      </Text>
                      <Text style={styles.adminCategoryDescriptionOneLine} numberOfLines={1}>
                        {`Created By: ${
                          String(item?.creator?.role || '').toUpperCase() === 'ADMIN'
                            ? `Admin (${item?.creator?.name || item?.creator?.username || 'Unknown'})`
                            : item?.creator?.name || item?.creator?.username || 'User'
                        }`}
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
                subtitle={categories.length ? 'No categories match your current filters.' : 'Use + button to create a category or adjust filters.'}
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
            <Text style={[styles.optionTitle, { marginTop: 4 }]}>Creator Type</Text>
            <Text style={styles.categoryFilterHint}>Filter by who created the category</Text>
            {creatorFilterOptions.map((option) => (
              <Pressable
                key={`creator-filter-${option}`}
                style={[styles.categoryFilterOption, creatorTypeFilter === option && styles.categoryFilterOptionActive]}
                onPress={() => {
                  setCreatorTypeFilter(option);
                  setShowFilterModal(false);
                }}
              >
                <View style={styles.categoryFilterOptionLeft}>
                  <Ionicons
                    name={option === 'ADMIN' ? 'shield-checkmark-outline' : option === 'USER' ? 'person-outline' : 'people-outline'}
                    size={16}
                    color={creatorTypeFilter === option ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.categoryFilterOptionText, creatorTypeFilter === option && styles.categoryFilterOptionTextActive]}>
                    {option}
                  </Text>
                </View>
                {creatorTypeFilter === option ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
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
            <Text style={styles.categoryDetailDescription}>
              {`Created By: ${
                String(selectedCategory?.creator?.role || '').toUpperCase() === 'ADMIN'
                  ? `Admin (${selectedCategory?.creator?.name || selectedCategory?.creator?.username || 'Unknown'})`
                  : selectedCategory?.creator?.name || selectedCategory?.creator?.username || 'User'
              }`}
            </Text>
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

          <Pressable
            style={[styles.createSubmitBtn, isCreatingJob || !token ? styles.createSubmitBtnDisabled : null]}
            onPress={submitWithValidation}
            disabled={isCreatingJob || !token}
          >
            <Ionicons name="send-outline" size={16} color="#FFFFFF" />
            <Text style={styles.createSubmitBtnText}>{isCreatingJob ? 'Creating Job...' : 'Create Job'}</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function MyJobsPage({ jobs, isLoading, onRefresh, onOpenJob, styles, colors }) {
  const openCount = jobs.filter((job) => String(job?.status || '').toUpperCase() === 'OPEN').length;
  const inProgressCount = jobs.filter((job) => String(job?.status || '').toUpperCase() === 'IN_PROGRESS').length;
  const completedCount = jobs.filter((job) => String(job?.status || '').toUpperCase() === 'COMPLETED').length;

  return (
    <View style={styles.settingsScreen}>
      <View style={styles.settingsNav}>
        <View style={styles.settingsNavRight} />
        <Text style={styles.settingsNavTitle}>My Jobs</Text>
        <View style={styles.settingsNavRight}>
          <Pressable style={styles.settingsNavIconBtn} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        {isLoading ? (
          <AdminListState
            mode="loading"
            title="Loading my jobs..."
            subtitle="Please wait while we fetch your posted jobs."
            colors={colors}
          />
        ) : (
          <>
        <View style={styles.myJobsHeroCard}>
          <Text style={styles.myJobsHeroTitle}>Your Job Posts</Text>
          <Text style={styles.myJobsHeroSubtitle}>Track, open, and quickly edit every job from one place.</Text>
          <View style={styles.myJobsStatsRow}>
            <View style={styles.myJobsStatChip}>
              <Text style={styles.myJobsStatValue}>{jobs.length}</Text>
              <Text style={styles.myJobsStatLabel}>Total</Text>
            </View>
            <View style={styles.myJobsStatChip}>
              <Text style={styles.myJobsStatValue}>{openCount}</Text>
              <Text style={styles.myJobsStatLabel}>Open</Text>
            </View>
            <View style={styles.myJobsStatChip}>
              <Text style={styles.myJobsStatValue}>{inProgressCount + completedCount}</Text>
              <Text style={styles.myJobsStatLabel}>Active</Text>
            </View>
          </View>
        </View>

        {jobs.length ? (
          jobs.map((item) => (
            <Pressable key={item.id} style={styles.myJobCard} onPress={() => onOpenJob(item)}>
              <View style={styles.myJobHead}>
                <Text style={styles.myJobTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={styles.myJobStatusPill}>
                  <Text style={styles.myJobStatusPillText}>{String(item?.status || 'OPEN').replace('_', ' ')}</Text>
                </View>
              </View>
              <Text style={styles.myJobDescription} numberOfLines={2}>
                {item.description || 'No description provided.'}
              </Text>
              <View style={styles.myJobMetaRow}>
                <View style={styles.myJobMetaPill}>
                  <Ionicons name="layers-outline" size={13} color={colors.primary} />
                  <Text style={styles.myJobMetaPillText}>{item?.category?.name || '-'}</Text>
                </View>
                <View style={styles.myJobMetaPill}>
                  <Ionicons name="cash-outline" size={13} color={colors.primary} />
                  <Text style={styles.myJobMetaPillText}>₹{item?.budget || '-'}</Text>
                </View>
                <View style={styles.myJobMetaPill}>
                  <Ionicons name="briefcase-outline" size={13} color={colors.primary} />
                  <Text style={styles.myJobMetaPillText}>{String(item?.jobType || '').replace('_', ' ') || '-'}</Text>
                </View>
              </View>
              <View style={styles.myJobOpenRow}>
                <Text style={styles.myJobOpenText}>Tap to open details</Text>
                <Ionicons name="arrow-forward-circle-outline" size={18} color={colors.primary} />
              </View>
            </Pressable>
          ))
        ) : (
          <AdminListState
            mode="empty"
            title="No jobs found"
            subtitle="You have not posted any jobs yet."
            colors={colors}
            emptySource={ADMIN_EMPTY_ANIMATION}
          />
        )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function PickerJobsPage({ jobs, isLoading, onRefresh, onApplyJob, isApplying, styles, colors }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedJob, setSelectedJob] = useState(null);
  const filteredJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const status = String(job?.status || '').toUpperCase();
        const okStatus = statusFilter === 'ALL' || status === statusFilter;
        const q = query.trim().toLowerCase();
        const okQuery =
          !q ||
          [job?.title, job?.description, job?.category?.name, job?.owner?.name]
            .some((v) => String(v || '').toLowerCase().includes(q));
        return okStatus && okQuery;
      }),
    [jobs, statusFilter, query]
  );

  return (
    <View style={styles.settingsScreen}>
      <View style={styles.settingsNav}>
        <View style={styles.settingsNavRight} />
        <Text style={styles.settingsNavTitle}>All Jobs</Text>
        <View style={styles.settingsNavRight}>
          <Pressable style={styles.settingsNavIconBtn} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.adminCategoryToolbar}>
        <View style={styles.categorySearchWrap}>
          <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search jobs..."
            placeholderTextColor={colors.textSecondary}
            style={styles.categorySearchInput}
          />
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.createPillRow}>
        {['ALL', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((value) => (
          <Pressable
            key={`picker-status-${value}`}
            style={[styles.createPill, statusFilter === value && styles.createPillActive]}
            onPress={() => setStatusFilter(value)}
          >
            <Text style={[styles.createPillText, statusFilter === value && styles.createPillTextActive]}>{value}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        {isLoading ? (
          <AdminListState
            mode="loading"
            title="Loading jobs..."
            subtitle="Please wait while we fetch jobs."
            colors={colors}
          />
        ) : filteredJobs.length ? (
          filteredJobs.map((item) => (
            <Pressable key={item.id} style={styles.myJobCard} onPress={() => setSelectedJob(item)}>
              <View style={styles.myJobHead}>
                <Text style={styles.myJobTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={styles.myJobStatusPill}>
                  <Text style={styles.myJobStatusPillText}>{String(item?.status || 'OPEN').replace('_', ' ')}</Text>
                </View>
              </View>
              <Text style={styles.myJobDescription} numberOfLines={2}>
                {item.description || 'No description provided.'}
              </Text>
              <View style={styles.myJobMetaRow}>
                <View style={styles.myJobMetaPill}>
                  <Ionicons name="layers-outline" size={13} color={colors.primary} />
                  <Text style={styles.myJobMetaPillText}>{item?.category?.name || '-'}</Text>
                </View>
                <View style={styles.myJobMetaPill}>
                  <Ionicons name="cash-outline" size={13} color={colors.primary} />
                  <Text style={styles.myJobMetaPillText}>₹{item?.budget || '-'}</Text>
                </View>
              </View>
            </Pressable>
          ))
        ) : (
          <AdminListState mode="empty" title="No jobs found" subtitle="Try changing filters." colors={colors} emptySource={ADMIN_EMPTY_ANIMATION} />
        )}
      </ScrollView>

      <Modal visible={Boolean(selectedJob)} transparent animationType="fade" onRequestClose={() => setSelectedJob(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.myJobDetailModal}>
            <View style={styles.myJobDetailHeader}>
              <Text style={styles.myJobDetailTitle} numberOfLines={2}>
                {selectedJob?.title || 'Job Details'}
              </Text>
              <View style={styles.myJobStatusPill}>
                <Text style={styles.myJobStatusPillText}>{String(selectedJob?.status || 'OPEN').replace('_', ' ')}</Text>
              </View>
            </View>
            <Text style={styles.myJobDetailDescription}>{selectedJob?.description || 'No description provided.'}</Text>
            <View style={styles.myJobInfoCard}>
              <Text style={styles.myJobMeta}>Category: {selectedJob?.category?.name || '-'}</Text>
              <Text style={styles.myJobMeta}>Posted By: {selectedJob?.owner?.name || '-'}</Text>
              <Text style={styles.myJobMeta}>Budget: ₹{selectedJob?.budget || '-'}</Text>
              <Text style={styles.myJobMeta}>Due Date: {selectedJob?.dueDate ? String(selectedJob.dueDate).slice(0, 10) : '-'}</Text>
            </View>
            <JobLocationCard job={selectedJob} title="Job Location" styles={styles} colors={colors} />
            <View style={styles.optionActionsRow}>
              <Pressable style={[styles.optionCancel, styles.optionActionBtn]} onPress={() => setSelectedJob(null)}>
                <Text style={styles.optionCancelText}>Close</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtnPrimary, styles.optionActionBtn, isApplying ? styles.modalBtnDisabled : null]}
                onPress={async () => {
                  if (!selectedJob?.id) return;
                  await onApplyJob(selectedJob.id);
                  setSelectedJob(null);
                }}
                disabled={isApplying}
              >
                <Text style={styles.modalBtnPrimaryText}>{isApplying ? 'Applying...' : 'Pick Job'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function MyApplicationsPage({ applications, isLoading, onRefresh, styles, colors }) {
  return (
    <View style={styles.settingsScreen}>
      <View style={styles.settingsNav}>
        <View style={styles.settingsNavRight} />
        <Text style={styles.settingsNavTitle}>My Applications</Text>
        <View style={styles.settingsNavRight}>
          <Pressable style={styles.settingsNavIconBtn} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        {isLoading ? (
          <AdminListState mode="loading" title="Loading applications..." subtitle="Please wait..." colors={colors} />
        ) : applications.length ? (
          applications.map((item) => (
            <View key={item.id} style={styles.myJobCard}>
              <View style={styles.myJobHead}>
                <Text style={styles.myJobTitle} numberOfLines={1}>{item?.job?.title || '-'}</Text>
                <View style={styles.myJobStatusPill}>
                  <Text style={styles.myJobStatusPillText}>{String(item?.status || 'PENDING')}</Text>
                </View>
              </View>
              <Text style={styles.myJobDescription} numberOfLines={2}>{item?.job?.description || 'No description provided.'}</Text>
              <View style={styles.myJobMetaRow}>
                <View style={styles.myJobMetaPill}>
                  <Ionicons name="layers-outline" size={13} color={colors.primary} />
                  <Text style={styles.myJobMetaPillText}>{item?.job?.category?.name || '-'}</Text>
                </View>
                <View style={styles.myJobMetaPill}>
                  <Ionicons name="person-outline" size={13} color={colors.primary} />
                  <Text style={styles.myJobMetaPillText}>{item?.job?.owner?.name || '-'}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <AdminListState mode="empty" title="No applications yet" subtitle="Pick jobs from All Jobs and they will appear here." colors={colors} emptySource={ADMIN_EMPTY_ANIMATION} />
        )}
      </ScrollView>
    </View>
  );
}

function UserModePage({ user, onBack, onChangeMode, isChangingMode, styles, colors }) {
  const currentMode = user?.userMode || 'JOB_PICKER';

  return (
    <View style={styles.settingsScreen}>
      <View style={styles.settingsNav}>
        <Pressable style={styles.settingsBackBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text style={styles.settingsBackText}>Settings</Text>
        </Pressable>
        <Text style={styles.settingsNavTitle}>Switch Mode</Text>
        <View style={styles.settingsNavRight} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        <View style={styles.profileEditCard}>
          <Text style={styles.profileSectionTitle}>Choose Your Work Mode</Text>
          <Text style={styles.profileHint}>
            Job Poster can create jobs. Job Picker can browse and apply jobs.
          </Text>
          <View style={[styles.genderRow, { marginTop: 12 }]}>
            {['JOB_PICKER', 'JOB_POSTER'].map((mode) => (
              <Pressable
                key={mode}
                style={[styles.genderPill, currentMode === mode && styles.genderPillActive]}
                onPress={() => onChangeMode(mode)}
                disabled={isChangingMode || currentMode === mode}
              >
                <Text style={[styles.genderPillText, currentMode === mode && styles.genderPillTextActive]}>
                  {mode === 'JOB_PICKER' ? 'Job Picker' : 'Job Poster'}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={[styles.profileReadOnly, { marginTop: 12 }]}>
            {isChangingMode ? <ActivityIndicator size="small" color={colors.primary} /> : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function SettingsPage({ user, themeMode, setThemeMode, onOpenProfile, onOpenMode, onOpenCategories, onRequestLogout, styles, colors }) {
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
            <Text style={styles.settingsRolePill}>{getRoleLabel(user?.role, user?.userMode)}</Text>
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
        {user?.role !== 'ADMIN' ? (
          <SettingsOption
            icon="swap-horizontal-outline"
            title="Switch Mode"
            subtitle={`Current: ${user?.userMode === 'JOB_POSTER' ? 'Job Poster' : 'Job Picker'}`}
            onPress={onOpenMode}
            styles={styles}
            colors={colors}
          />
        ) : null}
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


export {
  ProfilePage,
  UserModePage,
  CategoryPage,
  AdminUsersPage,
  AdminModerationPage,
  AdminCategoriesPage,
  CreateJobPage,
  MyJobsPage,
  PickerJobsPage,
  MyApplicationsPage,
  SettingsPage
};
