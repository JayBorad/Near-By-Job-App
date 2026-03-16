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
import Svg, { Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
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

const getRatingSummaryText = (summary) => {
  const total = Number(summary?.totalReviews || 0);
  const average = summary?.averageRating;
  if (!total || average === null || average === undefined) {
    return 'No ratings yet';
  }
  return `${Number(average).toFixed(1)} / 5 (${total} review${total === 1 ? '' : 's'})`;
};

const getApplicationStats = (job) => ({
  appliedCount: Number(job?.applicationStats?.appliedCount || 0),
  acceptedCount: Number(job?.applicationStats?.acceptedCount || 0),
  pendingCount: Number(job?.applicationStats?.pendingCount || 0),
  rejectedCount: Number(job?.applicationStats?.rejectedCount || 0)
});

const getNotificationIconName = (notification) => {
  const type = String(notification?.type || '').toUpperCase();
  if (type === 'JOB_APPLIED') return 'briefcase-outline';
  if (type === 'APPLICATION_ACCEPTED') return 'checkmark-circle';
  if (type === 'APPLICATION_REJECTED') return 'close-circle';
  if (type === 'JOB_UPDATED') return 'create-outline';
  if (type === 'JOB_CANCELLED') return 'alert-circle';
  if (type === 'ADMIN_JOB_UPDATED') return 'shield-checkmark-outline';
  if (type === 'CHAT_MESSAGE') return 'chatbubble-ellipses-outline';
  return notification?.icon || 'notifications';
};

const getJobSeatStats = (job) => {
  const stats = getApplicationStats(job);
  const totalSeats = Math.max(1, Number(job?.requiredWorkers || 1));
  const filledSeats = Math.min(stats.acceptedCount, totalSeats);
  const remainingSeats = Math.max(totalSeats - filledSeats, 0);
  const remainingToApply = Math.max(totalSeats - stats.appliedCount, 0);
  return {
    ...stats,
    totalSeats,
    filledSeats,
    remainingSeats,
    remainingToApply
  };
};

const getBudgetDisplay = (job) => {
  const budget = Number(job?.budget || 0);
  const requiredWorkers = Math.max(1, Number(job?.requiredWorkers || 1));
  const budgetType = String(job?.budgetType || 'TOTAL').toUpperCase();
  if (!Number.isFinite(budget) || budget <= 0) return '₹-';
  if (budgetType === 'PER_PERSON') {
    return `₹${budget} per person (₹${budget * requiredWorkers} total)`;
  }
  return `₹${budget} total (₹${(budget / requiredWorkers).toFixed(2)} per person)`;
};

const getPerWorkerBudget = (job) => {
  const budget = Number(job?.budget || 0);
  const requiredWorkers = Math.max(1, Number(job?.requiredWorkers || 1));
  const budgetType = String(job?.budgetType || 'TOTAL').toUpperCase();
  if (!Number.isFinite(budget) || budget <= 0) return 0;
  return budgetType === 'PER_PERSON' ? budget : budget / requiredWorkers;
};

const getTotalBudget = (job) => {
  const budget = Number(job?.budget || 0);
  const requiredWorkers = Math.max(1, Number(job?.requiredWorkers || 1));
  const budgetType = String(job?.budgetType || 'TOTAL').toUpperCase();
  if (!Number.isFinite(budget) || budget <= 0) return 0;
  return budgetType === 'PER_PERSON' ? budget * requiredWorkers : budget;
};

const formatCurrency = (value) => `₹${Math.round(Number(value) || 0).toLocaleString('en-IN')}`;
const formatCompactCurrency = (value) => {
  const amount = Math.round(Number(value) || 0);
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1).replace(/\.0$/, '')}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `₹${amount}`;
};
const clampPointY = (value, minY, maxY) => Math.min(maxY, Math.max(minY, value));

const getSmoothPathD = (points, minY, maxY) => {
  if (!points.length) return '';
  if (points.length === 1) {
    const first = points[0];
    return `M ${first.x} ${clampPointY(first.y, minY, maxY)}`;
  }
  let path = `M ${points[0].x} ${clampPointY(points[0].y, minY, maxY)}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p1 = points[index];
    const p2 = points[index + 1];
    const cp1x = p1.x + (p2.x - p1.x) / 3;
    const cp1y = clampPointY(p1.y, minY, maxY);
    const cp2x = p1.x + ((p2.x - p1.x) * 2) / 3;
    const cp2y = clampPointY(p2.y, minY, maxY);
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return path;
};

const FINANCIAL_PERIOD_OPTIONS = [
  { key: 'THIS_WEEK', label: 'This Week' },
  { key: 'MONTHLY', label: 'Monthly' },
  { key: 'LAST_MONTH', label: 'Last Month' },
  { key: 'THIS_YEAR', label: 'This Year' },
  { key: 'LAST_YEAR', label: 'Last Year' }
];

const startOfDay = (dateValue) => {
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  return date;
};

const toDateKey = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const toMonthKey = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const isDateWithin = (dateValue, start, end) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  return date >= start && date <= end;
};

const getFinancialSeries = (entries, period) => {
  const now = new Date();
  const bars = [];

  if (period === 'THIS_YEAR' || period === 'LAST_YEAR') {
    const year = period === 'THIS_YEAR' ? now.getFullYear() : now.getFullYear() - 1;
    const start = new Date(year, 0, 1, 0, 0, 0, 0);
    const end = new Date(year, 11, 31, 23, 59, 59, 999);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const valueByMonth = {};

    for (let index = 0; index < 12; index += 1) {
      const monthKey = `${year}-${String(index + 1).padStart(2, '0')}`;
      valueByMonth[monthKey] = 0;
      bars.push({ key: monthKey, label: monthNames[index], value: 0 });
    }

    entries.forEach((item) => {
      if (!isDateWithin(item?.date, start, end)) return;
      const key = toMonthKey(item?.date);
      if (!(key in valueByMonth)) return;
      valueByMonth[key] += Number(item?.amount || 0);
    });

    return bars.map((bar) => ({ ...bar, value: valueByMonth[bar.key] || 0 }));
  }

  let start;
  let end;
  if (period === 'THIS_WEEK') {
    const today = startOfDay(now);
    const day = today.getDay();
    const mondayShift = day === 0 ? -6 : 1 - day;
    start = new Date(today);
    start.setDate(start.getDate() + mondayShift);
    end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else if (period === 'LAST_MONTH') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  const valueByDate = {};
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = toDateKey(cursor);
    valueByDate[key] = 0;
    bars.push({
      key,
      label: period === 'THIS_WEEK'
        ? cursor.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 1)
        : String(cursor.getDate()),
      value: 0
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  entries.forEach((item) => {
    if (!isDateWithin(item?.date, start, end)) return;
    const key = toDateKey(item?.date);
    if (!(key in valueByDate)) return;
    valueByDate[key] += Number(item?.amount || 0);
  });

  return bars.map((bar) => ({ ...bar, value: valueByDate[bar.key] || 0 }));
};

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
          {user?.role !== 'ADMIN' ? (
            <Text style={styles.profileHint}>Rating: {getRatingSummaryText(user?.ratingSummary)}</Text>
          ) : null}
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

function AdminUsersPage({
  users,
  isLoading,
  onRefresh,
  onGetUserReviews,
  selectedUserId,
  onSelectedUserHandled,
  onExitUserDetails,
  onSaveUserDetails,
  onSaveUserAvatar,
  styles,
  colors
}) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetailPage, setUserDetailPage] = useState('details');
  const [jobTab, setJobTab] = useState('POSTED');
  const [selectedUserJob, setSelectedUserJob] = useState(null);
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
  const [userJobSearch, setUserJobSearch] = useState('');
  const [userJobStatusFilter, setUserJobStatusFilter] = useState('ALL');
  const [userJobMinBudget, setUserJobMinBudget] = useState('');
  const [userJobMaxBudget, setUserJobMaxBudget] = useState('');
  const [showUserJobFilterSheet, setShowUserJobFilterSheet] = useState(false);
  const [financialTab, setFinancialTab] = useState('EARNED');
  const [financialPeriod, setFinancialPeriod] = useState('MONTHLY');
  const [showFinancialPeriodModal, setShowFinancialPeriodModal] = useState(false);
  const [financialPlotWidth, setFinancialPlotWidth] = useState(0);
  const [userDetailHistory, setUserDetailHistory] = useState([]);
  const [selectedUserReviews, setSelectedUserReviews] = useState(null);
  const [isSelectedUserReviewsLoading, setIsSelectedUserReviewsLoading] = useState(false);
  const detailScrollRef = useRef(null);
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

  const applyUserDetailState = (user) => {
    if (!user) return;
    setSelectedUser(user);
    setUserDetailPage('details');
    setJobTab('POSTED');
    setSelectedUserJob(null);
    setUserJobSearch('');
    setUserJobStatusFilter('ALL');
    setUserJobMinBudget('');
    setUserJobMaxBudget('');
    setShowUserJobFilterSheet(false);
    setFinancialTab('EARNED');
    setFinancialPeriod('MONTHLY');
    setShowFinancialPeriodModal(false);
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

  const openUserDetail = (user) => {
    if (!user) return;
    setUserDetailHistory([]);
    applyUserDetailState(user);
  };

  const openUserDetailById = (userId) => {
    if (!userId) return;
    const targetUser = users.find((item) => item?.id === userId);
    if (!targetUser || targetUser?.id === selectedUser?.id) return;
    if (selectedUser?.id) {
      setUserDetailHistory((prev) => [...prev, selectedUser.id]);
    }
    applyUserDetailState(targetUser);
  };

  const handleBackFromUserDetail = () => {
    if (isEditingUser) {
      setUserDetailPage('details');
      return;
    }
    if (userDetailHistory.length) {
      const previousId = userDetailHistory[userDetailHistory.length - 1];
      const previousUser = users.find((item) => item?.id === previousId);
      setUserDetailHistory((prev) => prev.slice(0, -1));
      if (previousUser) {
        applyUserDetailState(previousUser);
        return;
      }
    }
    const didHandleOutside = onExitUserDetails?.();
    if (didHandleOutside) {
      setSelectedUser(null);
      setSelectedUserJob(null);
      setUserDetailPage('details');
      setUserDetailHistory([]);
      return;
    }
    setSelectedUser(null);
    setSelectedUserJob(null);
    setUserDetailPage('details');
  };

  useEffect(() => {
    if (!selectedUserId) return;
    const matchedUser = users.find((item) => item?.id === selectedUserId);
    if (matchedUser) {
      setUserDetailHistory([]);
      openUserDetail(matchedUser);
    }
    onSelectedUserHandled?.();
  }, [selectedUserId, users, onSelectedUserHandled]);

  useEffect(() => {
    const loadReviews = async () => {
      if (!selectedUser?.id || !onGetUserReviews) {
        setSelectedUserReviews(null);
        return;
      }
      try {
        setIsSelectedUserReviewsLoading(true);
        const data = await onGetUserReviews(selectedUser.id);
        setSelectedUserReviews(data || null);
      } finally {
        setIsSelectedUserReviewsLoading(false);
      }
    };
    loadReviews();
  }, [selectedUser?.id, onGetUserReviews]);

  useEffect(() => {
    if (!selectedUser?.id) return;
    requestAnimationFrame(() => {
      detailScrollRef.current?.scrollTo({ y: 0, animated: false });
    });
  }, [selectedUser?.id]);

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
  const isEditingUser = userDetailPage === 'edit';
  const postedJobs = selectedUser?.jobs || [];
  const pickedJobs = (selectedUser?.applications || [])
    .map((application) => ({
      ...(application?.job || {}),
      applicationId: application?.id,
      applicationStatus: application?.status,
      pickedAt: application?.createdAt
    }))
    .filter((job) => Boolean(job?.id));
  const activeUserJobs = jobTab === 'POSTED' ? postedJobs : pickedJobs;
  const userJobStatusOptions = ['ALL', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  const parsedUserJobMinBudget = Number.parseFloat(userJobMinBudget);
  const parsedUserJobMaxBudget = Number.parseFloat(userJobMaxBudget);
  const hasValidUserJobMinBudget = Number.isFinite(parsedUserJobMinBudget);
  const hasValidUserJobMaxBudget = Number.isFinite(parsedUserJobMaxBudget);
  const hasAnyUserJobFilter = userJobStatusFilter !== 'ALL' || hasValidUserJobMinBudget || hasValidUserJobMaxBudget;
  const filteredActiveUserJobs = useMemo(
    () =>
      activeUserJobs.filter((job) => {
        const status = String(job?.status || '').toUpperCase();
        const matchesStatus = userJobStatusFilter === 'ALL' || status === userJobStatusFilter;
        const budget = Number(job?.budget || 0);
        const hasBudget = Number.isFinite(budget);
        const matchesMinBudget = !hasValidUserJobMinBudget || (hasBudget && budget >= parsedUserJobMinBudget);
        const matchesMaxBudget = !hasValidUserJobMaxBudget || (hasBudget && budget <= parsedUserJobMaxBudget);
        const q = userJobSearch.trim().toLowerCase();
        const matchesSearch =
          !q ||
          [job?.title, job?.description, job?.owner?.name, job?.category?.name]
            .some((value) => String(value || '').toLowerCase().includes(q));
        return matchesStatus && matchesMinBudget && matchesMaxBudget && matchesSearch;
      }),
    [
      activeUserJobs,
      userJobStatusFilter,
      hasValidUserJobMinBudget,
      hasValidUserJobMaxBudget,
      parsedUserJobMinBudget,
      parsedUserJobMaxBudget,
      userJobSearch
    ]
  );
  const earnedEntries = useMemo(
    () =>
      (selectedUser?.applications || [])
        .filter((application) => String(application?.status || '').toUpperCase() === 'ACCEPTED')
        .map((application) => ({
          date: application?.updatedAt || application?.createdAt || application?.job?.updatedAt || application?.job?.createdAt,
          amount: getPerWorkerBudget(application?.job)
        }))
        .filter((item) => item.date && item.amount > 0),
    [selectedUser?.applications]
  );
  const spendEntries = useMemo(
    () =>
      (selectedUser?.jobs || [])
        .filter((job) => {
          const status = String(job?.status || '').toUpperCase();
          return status === 'IN_PROGRESS' || status === 'COMPLETED';
        })
        .map((job) => ({
          date: job?.updatedAt || job?.createdAt,
          amount: getTotalBudget(job)
        }))
        .filter((item) => item.date && item.amount > 0),
    [selectedUser?.jobs]
  );
  const userEarnedAmount = useMemo(
    () => earnedEntries.reduce((sum, item) => sum + Number(item?.amount || 0), 0),
    [earnedEntries]
  );
  const userSpentAmount = useMemo(
    () => spendEntries.reduce((sum, item) => sum + Number(item?.amount || 0), 0),
    [spendEntries]
  );
  const financialSeries = useMemo(
    () => getFinancialSeries(financialTab === 'EARNED' ? earnedEntries : spendEntries, financialPeriod),
    [financialTab, financialPeriod, earnedEntries, spendEntries]
  );
  const financialPeriodTotal = useMemo(
    () => financialSeries.reduce((sum, item) => sum + Number(item?.value || 0), 0),
    [financialSeries]
  );
  const financialPeriodLabel = FINANCIAL_PERIOD_OPTIONS.find((item) => item.key === financialPeriod)?.label || 'Monthly';
  const financialChartMeta = useMemo(() => {
    const values = financialSeries.map((item) => Number(item?.value || 0));
    const maxValue = Math.max(1, ...values);
    const yTickCount = 4;
    const plotHeight = 170;
    const plotTop = 10;
    const plotBottom = 18;
    const xPadding = 10;
    const usableHeight = Math.max(40, plotHeight - plotTop - plotBottom);
    const baselineY = plotHeight - 2;
    const chartWidth = Math.max(200, Number(financialPlotWidth || 0));
    const seriesCount = Math.max(1, financialSeries.length);
    const usableWidth = Math.max(24, chartWidth - xPadding * 2);
    const pointGap = seriesCount > 1 ? usableWidth / (seriesCount - 1) : 0;
    const xLabelStep = seriesCount > 30 ? 4 : seriesCount > 24 ? 3 : seriesCount > 16 ? 2 : 1;
    const points = financialSeries.map((item, index) => {
      const value = Number(item?.value || 0);
      const ratio = maxValue ? value / maxValue : 0;
      return {
        key: item?.key || `point-${index}`,
        label: item?.label || '',
        x: xPadding + index * pointGap,
        y: clampPointY(plotTop + (1 - ratio) * usableHeight, plotTop, baselineY),
        showLabel: index % xLabelStep === 0 || index === seriesCount - 1
      };
    });
    const yTicks = Array.from({ length: yTickCount + 1 }, (_, index) => {
      const ratio = index / yTickCount;
      const value = Math.round(maxValue * (1 - ratio));
      return {
        key: `tick-${index}`,
        value,
        label: formatCompactCurrency(value),
        y: plotTop + ratio * usableHeight
      };
    });
    return {
      points,
      yTicks,
      chartWidth,
      plotHeight,
      baselineY,
      smoothPathD: getSmoothPathD(points, plotTop, baselineY),
      smoothAreaPathD: `${getSmoothPathD(points, plotTop, baselineY)} L ${points[points.length - 1]?.x || 0} ${baselineY} L ${points[0]?.x || 0} ${baselineY} Z`
    };
  }, [financialSeries, financialPlotWidth]);

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
        setSelectedUser((prev) => ({
          ...(prev || {}),
          ...updated,
          jobs: updated?.jobs || prev?.jobs || [],
          applications: updated?.applications || prev?.applications || []
        }));
        setUserDetailPage('details');
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
        setSelectedUser((prev) => ({
          ...(prev || {}),
          ...updated,
          jobs: updated?.jobs || prev?.jobs || [],
          applications: updated?.applications || prev?.applications || []
        }));
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
          <Pressable style={styles.settingsBackBtn} onPress={handleBackFromUserDetail}>
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
            <Text style={styles.settingsBackText}>
              {isEditingUser ? 'User Details' : userDetailHistory.length ? 'Back' : 'Users'}
            </Text>
          </Pressable>
          <Text style={styles.settingsNavTitle}>{isEditingUser ? 'Edit User' : 'User Details'}</Text>
          <View style={styles.settingsNavRight}>
            {!isEditingUser ? (
              <Pressable
                style={styles.settingsNavIconBtn}
                onPress={() => setUserDetailPage('edit')}
                disabled={isSaving || isUploadingAvatar}
              >
                <Ionicons name="create-outline" size={18} color={colors.primary} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <ScrollView ref={detailScrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
          <View style={styles.adminUserDetailHero}>
            <Pressable style={styles.avatarWrap} onPress={() => setShowAvatarPreview(true)}>
              <AvatarView imageUrl={selectedUser?.avatar || DEFAULT_AVATAR_URL} size={88} colors={colors} showBorder />
              {isEditingUser ? (
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
              ) : null}
            </Pressable>
            <Text style={styles.adminUserDetailName}>{selectedUser?.name || '-'}</Text>
            <Text style={styles.adminUserDetailEmail}>{selectedUser?.email || '-'}</Text>
            <Text style={styles.profileHint}>Rating: {getRatingSummaryText(selectedUser?.ratingSummary)}</Text>
            <Text style={styles.profileHint}>
              {isEditingUser
                ? 'Edit user details and save.'
                : 'Read-only details. Tap edit icon to update.'}
            </Text>
          </View>

          {isEditingUser ? (
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
          ) : (
            <View style={styles.adminUserDetailCard}>
              <View style={styles.adminDetailRow}>
                <Text style={styles.adminDetailLabel}>Full Name</Text>
                <Text style={styles.adminDetailValue}>{selectedUser?.name || '-'}</Text>
              </View>

              <View style={styles.adminDetailRow}>
                <Text style={styles.adminDetailLabel}>Username</Text>
                <Text style={styles.adminDetailValue}>{selectedUser?.username || '-'}</Text>
              </View>

              <View style={styles.adminDetailRow}>
                <Text style={styles.adminDetailLabel}>Email</Text>
                <Text style={styles.adminDetailValue}>{selectedUser?.email || '-'}</Text>
              </View>

              <View style={styles.adminDetailRow}>
                <Text style={styles.adminDetailLabel}>Phone</Text>
                <Text style={styles.adminDetailValue}>{selectedUser?.phone || '-'}</Text>
              </View>

              <View style={styles.adminDetailRow}>
                <Text style={styles.adminDetailLabel}>Age</Text>
                <Text style={styles.adminDetailValue}>{selectedUser?.age ? String(selectedUser.age) : '-'}</Text>
              </View>

              <View style={styles.adminDetailRow}>
                <Text style={styles.adminDetailLabel}>Gender</Text>
                <Text style={styles.adminDetailValue}>{selectedUser?.gender || '-'}</Text>
              </View>

              <View style={styles.adminDetailRow}>
                <Text style={styles.adminDetailLabel}>Role</Text>
                <Text style={styles.adminDetailValue}>{selectedUser?.role || '-'}</Text>
              </View>

              <View style={styles.adminDetailRow}>
                <Text style={styles.adminDetailLabel}>User Mode</Text>
                <Text style={styles.adminDetailValue}>
                  {selectedUser?.role === 'ADMIN' ? 'N/A for admin' : (selectedUser?.userMode || '-')}
                </Text>
              </View>

              <View style={styles.adminDetailRow}>
                <Text style={styles.adminDetailLabel}>Status</Text>
                <Text style={styles.adminDetailValue}>{selectedUser?.status || '-'}</Text>
              </View>

              <View style={styles.adminDetailRowBlock}>
                <Text style={styles.adminDetailLabel}>Address</Text>
                <Text style={styles.adminDetailValue}>{selectedUser?.address || '-'}</Text>
              </View>

              <View style={[styles.adminDetailRowBlock, styles.adminDetailRowLast]}>
                <Text style={styles.adminDetailLabel}>Bio</Text>
                <Text style={styles.adminDetailValue}>{selectedUser?.bio || '-'}</Text>
              </View>
            </View>
          )}

          {!isEditingUser ? (
            <View style={styles.adminUserDetailCard}>
              <View style={styles.financialHeaderRow}>
                <Text style={styles.createFieldLabel}>Financial Summary</Text>
                <Pressable style={styles.financialPeriodBtn} onPress={() => setShowFinancialPeriodModal(true)}>
                  <Ionicons name="calendar-outline" size={13} color={colors.primary} />
                  <Text style={styles.financialPeriodBtnText}>{financialPeriodLabel}</Text>
                  <Ionicons name="chevron-down" size={13} color={colors.primary} />
                </Pressable>
              </View>

              <View style={styles.financialTabRow}>
                <Pressable
                  style={[styles.financialTabBtn, financialTab === 'EARNED' && styles.financialTabBtnActive]}
                  onPress={() => setFinancialTab('EARNED')}
                >
                  <Text style={[styles.financialTabText, financialTab === 'EARNED' && styles.financialTabTextActive]}>
                    Earned
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.financialTabBtn, financialTab === 'SPEND' && styles.financialTabBtnActive]}
                  onPress={() => setFinancialTab('SPEND')}
                >
                  <Text style={[styles.financialTabText, financialTab === 'SPEND' && styles.financialTabTextActive]}>
                    Spend
                  </Text>
                </Pressable>
              </View>

              <View style={styles.adminUserStatsGrid}>
                <View style={styles.adminUserStatsCard}>
                  <Text style={styles.adminUserStatsLabel}>Selected Period</Text>
                  <Text style={styles.adminUserStatsValue}>{formatCurrency(financialPeriodTotal)}</Text>
                </View>
                <View style={styles.adminUserStatsCard}>
                  <Text style={styles.adminUserStatsLabel}>Lifetime</Text>
                  <Text style={styles.adminUserStatsValue}>
                    {formatCurrency(financialTab === 'EARNED' ? userEarnedAmount : userSpentAmount)}
                  </Text>
                </View>
              </View>

              <View style={styles.financialChartCard}>
                <View style={styles.financialChartHead}>
                  <Text style={styles.financialChartTitle}>
                    {financialTab === 'EARNED' ? 'Income Trend' : 'Spend Trend'}
                  </Text>
                  <Text style={styles.financialChartSubtitle}>
                    X axis: period, Y axis: amount
                  </Text>
                </View>

                <View style={styles.financialChartLayout}>
                  <View style={styles.financialYAxisWrap}>
                    <Text style={styles.financialAxisTitle}>Amount</Text>
                    <View style={[styles.financialYAxis, { height: financialChartMeta.plotHeight }]}>
                      {financialChartMeta.yTicks.map((tick) => (
                        <Text
                          key={tick.key}
                          style={[styles.financialYAxisLabel, { top: tick.y - 8 }]}
                          numberOfLines={1}
                        >
                          {tick.label}
                        </Text>
                      ))}
                    </View>
                  </View>

                  <View
                    style={styles.financialChartArea}
                    onLayout={(event) => {
                      const width = Math.floor(event?.nativeEvent?.layout?.width || 0);
                      if (width > 0 && width !== financialPlotWidth) {
                        setFinancialPlotWidth(width);
                      }
                    }}
                  >
                    <View style={[styles.financialChartCanvas, { width: financialChartMeta.chartWidth }]}>
                      <View style={[styles.financialChartPlot, { height: financialChartMeta.plotHeight }]}>
                        <Svg width={financialChartMeta.chartWidth} height={financialChartMeta.plotHeight}>
                          <Defs>
                            <LinearGradient id="financialAreaGradient" x1="0" y1="0" x2="0" y2="1">
                              <Stop
                                offset="0%"
                                stopColor={financialTab === 'EARNED' ? '#0EA5A4' : '#F97316'}
                                stopOpacity="0.28"
                              />
                              <Stop
                                offset="100%"
                                stopColor={financialTab === 'EARNED' ? '#0EA5A4' : '#F97316'}
                                stopOpacity="0.02"
                              />
                            </LinearGradient>
                          </Defs>
                          {financialChartMeta.yTicks.map((tick) => (
                            <Line
                              key={`guide-${tick.key}`}
                              x1="0"
                              x2={String(financialChartMeta.chartWidth)}
                              y1={String(tick.y)}
                              y2={String(tick.y)}
                              stroke={colors.border}
                              strokeWidth="1"
                              strokeOpacity="0.7"
                            />
                          ))}
                          <Line
                            x1="0"
                            x2="0"
                            y1="0"
                            y2={String(financialChartMeta.plotHeight)}
                            stroke={colors.border}
                            strokeWidth="1"
                          />
                          <Line
                            x1="0"
                            x2={String(financialChartMeta.chartWidth)}
                            y1={String(financialChartMeta.plotHeight)}
                            y2={String(financialChartMeta.plotHeight)}
                            stroke={colors.border}
                            strokeWidth="1"
                          />
                          <Path
                            d={financialChartMeta.smoothAreaPathD}
                            fill="url(#financialAreaGradient)"
                          />
                          <Path
                            d={financialChartMeta.smoothPathD}
                            fill="none"
                            stroke={financialTab === 'EARNED' ? '#0EA5A4' : '#F97316'}
                            strokeWidth="3"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                          />
                        </Svg>
                      </View>

                      <View style={styles.financialXAxisLabels}>
                        {financialChartMeta.points.filter((point) => point.showLabel).map((point) => (
                          <Text
                            key={`label-${point.key}`}
                            style={[styles.financialXAxisLabel, { left: point.x - 12 }]}
                            numberOfLines={1}
                          >
                            {point.label}
                          </Text>
                        ))}
                      </View>
                      <Text style={styles.financialXAxisTitle}>Period</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          ) : null}

          {!isEditingUser ? (
            <View style={styles.adminUserDetailCard}>
              <Text style={styles.createFieldLabel}>
                Reviews ({Number(selectedUserReviews?.summary?.totalReviews || 0)})
              </Text>
              <Text style={styles.profileHint}>
                Average: {getRatingSummaryText(selectedUserReviews?.summary || selectedUser?.ratingSummary)}
              </Text>
              {isSelectedUserReviewsLoading ? (
                <Text style={styles.adminJobMeta}>Loading reviews...</Text>
              ) : Array.isArray(selectedUserReviews?.reviews) && selectedUserReviews.reviews.length ? (
                selectedUserReviews.reviews.map((review) => (
                  <View key={review.id} style={styles.adminJobCard}>
                    <View style={styles.adminJobTop}>
                      <Text style={styles.adminJobTitle} numberOfLines={1}>
                        {review?.job?.title || 'Job'}
                      </Text>
                      <View style={styles.adminJobStatusPill}>
                        <Text style={styles.adminJobStatusText}>{Number(review?.rating || 0)} / 5</Text>
                      </View>
                    </View>
                    <Pressable
                      style={styles.adminJobMetaLinkRow}
                      onPress={() => openUserDetailById(review?.reviewer?.id)}
                      disabled={!review?.reviewer?.id}
                    >
                      <Text style={styles.adminJobMetaLinkText} numberOfLines={1}>
                        Reviewer: {review?.reviewer?.name || '-'} (View Profile)
                      </Text>
                      <Ionicons name="open-outline" size={14} color={colors.primary} />
                    </Pressable>
                    <Text style={styles.adminJobMeta} numberOfLines={1}>
                      Reviewer Role: {getUserModeLabel(review?.reviewer?.role, review?.reviewer?.userMode)}
                    </Text>
                    <Text style={styles.adminJobMeta}>Comment: {review?.comment || '-'}</Text>
                    <Text style={styles.adminJobMeta}>
                      Reviewed On: {review?.createdAt ? String(review.createdAt).slice(0, 10) : '-'}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.adminJobMeta}>No reviews yet for this user.</Text>
              )}
            </View>
          ) : null}

          {!isEditingUser ? (
            <View style={styles.adminUserDetailCard}>
              <Text style={styles.createFieldLabel}>User Jobs</Text>
              <View style={styles.createPillRow}>
                <Pressable
                  style={[styles.createPill, jobTab === 'POSTED' && styles.createPillActive]}
                  onPress={() => setJobTab('POSTED')}
                >
                  <Text style={[styles.createPillText, jobTab === 'POSTED' && styles.createPillTextActive]}>
                    Posted ({postedJobs.length})
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.createPill, jobTab === 'PICKED' && styles.createPillActive]}
                  onPress={() => setJobTab('PICKED')}
                >
                  <Text style={[styles.createPillText, jobTab === 'PICKED' && styles.createPillTextActive]}>
                    Picked ({pickedJobs.length})
                  </Text>
                </Pressable>
              </View>

              <View style={styles.adminCategoryToolbar}>
                <View style={styles.categorySearchWrap}>
                  <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
                  <TextInput
                    value={userJobSearch}
                    onChangeText={setUserJobSearch}
                    placeholder="Search user jobs..."
                    placeholderTextColor={colors.textSecondary}
                    style={styles.categorySearchInput}
                  />
                </View>
                <Pressable
                  style={[styles.categoryFilterIconBtn, hasAnyUserJobFilter ? styles.categoryFilterIconBtnActive : null]}
                  onPress={() => setShowUserJobFilterSheet(true)}
                >
                  <Ionicons name="filter-outline" size={18} color={hasAnyUserJobFilter ? '#FFFFFF' : colors.primary} />
                  {hasAnyUserJobFilter ? (
                    <View style={styles.adminUserFilterBadge}>
                      <Text style={styles.adminUserFilterBadgeText}>
                        {[userJobStatusFilter !== 'ALL', hasValidUserJobMinBudget, hasValidUserJobMaxBudget].filter(Boolean).length}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              </View>

              {filteredActiveUserJobs.length ? (
                filteredActiveUserJobs.map((job) => (
                  <Pressable key={`${jobTab}-${job.id}`} style={styles.adminJobCard} onPress={() => setSelectedUserJob(job)}>
                    <View style={styles.adminJobTop}>
                      <Text style={styles.adminJobTitle} numberOfLines={1}>
                        {job?.title || '-'}
                      </Text>
                      <View style={styles.adminJobStatusPill}>
                        <Text style={styles.adminJobStatusText}>{String(job?.status || 'OPEN').replace('_', ' ')}</Text>
                      </View>
                    </View>
                    {jobTab === 'PICKED' && job?.owner?.id ? (
                      <Pressable
                        style={styles.adminJobMetaLinkRow}
                        onPress={() => openUserDetailById(job?.owner?.id)}
                      >
                        <Text style={styles.adminJobMetaLinkText} numberOfLines={1}>
                          Posted By: {job?.owner?.name || '-'} (View Profile)
                        </Text>
                        <Ionicons name="open-outline" size={14} color={colors.primary} />
                      </Pressable>
                    ) : (
                      <Text style={styles.adminJobMeta} numberOfLines={1}>By: {job?.owner?.name || '-'}</Text>
                    )}
                    <Text style={styles.adminJobMeta} numberOfLines={1}>Category: {job?.category?.name || '-'}</Text>
                    <View style={styles.adminJobBottomRow}>
                      <Text style={styles.adminJobBudget}>{getBudgetDisplay(job)}</Text>
                      <Ionicons name="arrow-forward-circle-outline" size={18} color={colors.primary} />
                    </View>
                  </Pressable>
                ))
              ) : (
                <AdminListState
                  mode="empty"
                  title={jobTab === 'POSTED' ? 'No posted jobs' : 'No picked jobs'}
                  subtitle={activeUserJobs.length
                    ? 'No jobs match your current filters.'
                    : jobTab === 'POSTED'
                      ? 'This user has not posted any jobs yet.'
                      : 'This user has not picked any jobs yet.'}
                  colors={colors}
                  emptySource={ADMIN_EMPTY_ANIMATION}
                />
              )}
            </View>
          ) : null}
        </ScrollView>

        <Modal
          visible={showFinancialPeriodModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowFinancialPeriodModal(false)}
        >
          <Pressable style={styles.filterBackdrop} onPress={() => setShowFinancialPeriodModal(false)}>
            <Pressable style={styles.categoryFilterModal} onPress={() => {}}>
              <Text style={styles.optionTitle}>Financial Period</Text>
              <Text style={styles.categoryFilterHint}>Choose range for the bar chart</Text>
              {FINANCIAL_PERIOD_OPTIONS.map((option) => (
                <Pressable
                  key={`financial-period-${option.key}`}
                  style={[styles.categoryFilterOption, financialPeriod === option.key && styles.categoryFilterOptionActive]}
                  onPress={() => {
                    setFinancialPeriod(option.key);
                    setShowFinancialPeriodModal(false);
                  }}
                >
                  <View style={styles.categoryFilterOptionLeft}>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={financialPeriod === option.key ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[styles.categoryFilterOptionText, financialPeriod === option.key && styles.categoryFilterOptionTextActive]}>
                      {option.label}
                    </Text>
                  </View>
                  {financialPeriod === option.key ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
                </Pressable>
              ))}
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={showUserJobFilterSheet} transparent animationType="none" onRequestClose={() => setShowUserJobFilterSheet(false)}>
          <Pressable style={styles.bottomSheetBackdrop} onPress={() => setShowUserJobFilterSheet(false)}>
            <View style={styles.bottomFilterSheet}>
              <Pressable onPress={() => {}}>
                <View style={styles.bottomSheetGrabber} />
                <View style={styles.bottomSheetHeaderRow}>
                  <Text style={styles.optionTitle}>User Job Filters</Text>
                  <Pressable
                    onPress={() => {
                      setUserJobStatusFilter('ALL');
                      setUserJobMinBudget('');
                      setUserJobMaxBudget('');
                    }}
                  >
                    <Text style={styles.bottomSheetResetText}>Reset</Text>
                  </Pressable>
                </View>

                <Text style={styles.bottomSheetLabel}>Status</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.createPillRow}>
                  {userJobStatusOptions.map((value) => (
                    <Pressable
                      key={`admin-user-job-status-${value}`}
                      style={[styles.createPill, userJobStatusFilter === value && styles.createPillActive]}
                      onPress={() => setUserJobStatusFilter(value)}
                    >
                      <Text style={[styles.createPillText, userJobStatusFilter === value && styles.createPillTextActive]}>
                        {value.replace('_', ' ')}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <Text style={styles.bottomSheetLabel}>Budget Range</Text>
                <View style={styles.bottomBudgetRow}>
                  <View style={styles.bottomBudgetInputWrap}>
                    <Text style={styles.bottomBudgetInputLabel}>Min</Text>
                    <TextInput
                      value={userJobMinBudget}
                      onChangeText={(value) => setUserJobMinBudget(value.replace(/[^\d]/g, ''))}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                      style={styles.bottomBudgetInput}
                    />
                  </View>
                  <View style={styles.bottomBudgetInputWrap}>
                    <Text style={styles.bottomBudgetInputLabel}>Max</Text>
                    <TextInput
                      value={userJobMaxBudget}
                      onChangeText={(value) => setUserJobMaxBudget(value.replace(/[^\d]/g, ''))}
                      placeholder="50000"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                      style={styles.bottomBudgetInput}
                    />
                  </View>
                </View>

                <Pressable style={styles.bottomSheetApplyBtn} onPress={() => setShowUserJobFilterSheet(false)}>
                  <Text style={styles.bottomSheetApplyBtnText}>Apply Filters</Text>
                </Pressable>
              </Pressable>
            </View>
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
              {isEditingUser ? (
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
              ) : null}
            </View>
          </View>
        </Modal>

        <Modal visible={Boolean(selectedUserJob)} transparent animationType="fade" onRequestClose={() => setSelectedUserJob(null)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.adminJobDetailModal}>
              <View style={styles.adminJobDetailHeader}>
                <Text style={styles.adminJobDetailTitle}>{selectedUserJob?.title || 'Job Details'}</Text>
                <View style={styles.adminJobStatusPill}>
                  <Text style={styles.adminJobStatusText}>{String(selectedUserJob?.status || 'OPEN').replace('_', ' ')}</Text>
                </View>
              </View>
              <Text style={styles.adminJobDetailDescription}>{selectedUserJob?.description || 'No description provided.'}</Text>
              <View style={styles.adminJobDetailGrid}>
                <Text style={styles.adminJobMeta}>Category: {selectedUserJob?.category?.name || '-'}</Text>
                {selectedUserJob?.owner?.id ? (
                  <Pressable
                    style={styles.adminJobMetaLinkRow}
                    onPress={() => {
                      setSelectedUserJob(null);
                      openUserDetailById(selectedUserJob?.owner?.id);
                    }}
                  >
                    <Text style={styles.adminJobMetaLinkText} numberOfLines={1}>
                      Posted By: {selectedUserJob?.owner?.name || '-'} (View Profile)
                    </Text>
                    <Ionicons name="open-outline" size={14} color={colors.primary} />
                  </Pressable>
                ) : (
                  <Text style={styles.adminJobMeta}>Posted By: {selectedUserJob?.owner?.name || '-'}</Text>
                )}
                <Text style={styles.adminJobMeta}>Email: {selectedUserJob?.owner?.email || '-'}</Text>
                <Text style={styles.adminJobMeta}>Budget: {getBudgetDisplay(selectedUserJob)}</Text>
                <Text style={styles.adminJobMeta}>Type: {String(selectedUserJob?.jobType || '').replace('_', ' ') || '-'}</Text>
                <Text style={styles.adminJobMeta}>
                  Due Date: {selectedUserJob?.dueDate ? String(selectedUserJob.dueDate).slice(0, 10) : '-'}
                </Text>
                {selectedUserJob?.pickedAt ? (
                  <Text style={styles.adminJobMeta}>Picked At: {String(selectedUserJob.pickedAt).slice(0, 10)}</Text>
                ) : null}
              </View>
              <JobLocationCard job={selectedUserJob} title="Job Location" styles={styles} colors={colors} />
              <Pressable style={styles.optionCancel} onPress={() => setSelectedUserJob(null)}>
                <Text style={styles.optionCancelText}>Close</Text>
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
                  <Text style={styles.myJobMeta} numberOfLines={1}>
                    Rating: {getRatingSummaryText(item?.ratingSummary)}
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
  onGetApplicationsByJob,
  onOpenChatWithUser,
  onOpenUserDetails,
  onChangeJobStatus,
  onEditJob,
  openJobIdOnMount,
  onOpenJobIdHandled,
  styles,
  colors
}) {
  const [jobSearch, setJobSearch] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState('ALL');
  const [showJobFilterModal, setShowJobFilterModal] = useState(false);
  const [detailPage, setDetailPage] = useState('list');
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedJobApplications, setSelectedJobApplications] = useState([]);
  const [isSelectedJobApplicationsLoading, setIsSelectedJobApplicationsLoading] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState(null);
  const [isUpdatingJobStatus, setIsUpdatingJobStatus] = useState(false);
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
  const selectedJobStats = getApplicationStats(selectedJob);
  const currentJobStatus = String(selectedJob?.status || 'OPEN').toUpperCase();
  const jobStatusOptions = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

  useEffect(() => {
    if (!selectedJob?.id) return;
    const updatedJob = jobs.find((item) => item?.id === selectedJob.id);
    if (updatedJob) {
      setSelectedJob(updatedJob);
    }
  }, [jobs, selectedJob?.id]);

  const openJobDetails = async (job) => {
    if (!job?.id) return;
    setSelectedJob(job);
    setDetailPage('detail');
    setSelectedJobApplications([]);
    setPendingStatusChange(null);
    setShowStatusPicker(false);
    try {
      setIsSelectedJobApplicationsLoading(true);
      const data = onGetApplicationsByJob ? await onGetApplicationsByJob(job.id) : [];
      setSelectedJobApplications(Array.isArray(data) ? data : []);
    } finally {
      setIsSelectedJobApplicationsLoading(false);
    }
  };

  useEffect(() => {
    if (!openJobIdOnMount) return;
    const targetJob = jobs.find((item) => item?.id === openJobIdOnMount);
    if (!targetJob) return;
    openJobDetails(targetJob).finally(() => {
      onOpenJobIdHandled?.();
    });
  }, [openJobIdOnMount, jobs]);

  const backToJobList = () => {
    setDetailPage('list');
    setSelectedJob(null);
    setSelectedJobApplications([]);
    setPendingStatusChange(null);
    setShowStatusPicker(false);
  };

  if (detailPage === 'detail' && selectedJob) {
    return (
      <View style={styles.settingsScreen}>
        <View style={styles.settingsNav}>
          <Pressable style={[styles.settingsBackBtn, { width: 96 }]} onPress={backToJobList}>
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
            <Text style={styles.settingsBackText} numberOfLines={1}>All Jobs</Text>
          </Pressable>
          <Text style={[styles.settingsNavTitle, { flex: 1, textAlign: 'center' }]}>Job Details</Text>
          <View style={[styles.settingsNavRight, { width: 96, alignItems: 'flex-end' }]}>
            <Pressable
              style={styles.settingsNavIconBtn}
              onPress={async () => {
                if (!selectedJob?.id) return;
                try {
                  setIsSelectedJobApplicationsLoading(true);
                  const data = onGetApplicationsByJob ? await onGetApplicationsByJob(selectedJob.id) : [];
                  setSelectedJobApplications(Array.isArray(data) ? data : []);
                } finally {
                  setIsSelectedJobApplicationsLoading(false);
                }
              }}
            >
              <Ionicons name="refresh-outline" size={18} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
          <View style={styles.adminJobCard}>
            <View style={styles.adminJobTop}>
              <Text style={styles.adminJobDetailTitle}>{selectedJob?.title || 'Job Details'}</Text>
              <View style={styles.myJobDetailHeaderActions}>
                <Pressable
                  style={[styles.myJobStatusPill, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                  onPress={() => setShowStatusPicker(true)}
                  disabled={isUpdatingJobStatus}
                >
                  <Text style={styles.myJobStatusPillText}>{currentJobStatus.replace('_', ' ')}</Text>
                  <Ionicons name="chevron-down" size={12} color={colors.primary} />
                </Pressable>
                <Pressable
                  style={[styles.settingsNavIconBtn, { backgroundColor: colors.primarySoft }]}
                  onPress={() => onEditJob?.(selectedJob)}
                >
                  <Ionicons name="create-outline" size={16} color={colors.primary} />
                </Pressable>
              </View>
            </View>
            <Text style={styles.adminJobDetailDescription}>{selectedJob?.description || 'No description provided.'}</Text>
            <View style={styles.adminJobDetailGrid}>
              <Text style={styles.adminJobMeta}>Category: {selectedJob?.category?.name || '-'}</Text>
              {selectedJob?.owner?.id ? (
                <Pressable
                  style={styles.adminJobMetaLinkRow}
                  onPress={() =>
                    onOpenUserDetails?.(selectedJob?.owner?.id, {
                      tab: 'create',
                      settingsPage: 'main',
                      adminJobId: selectedJob?.id
                    })
                  }
                >
                  <Text style={styles.adminJobMetaLinkText} numberOfLines={1}>
                    Posted By: {selectedJob?.owner?.name || '-'} (View Profile)
                  </Text>
                  <Ionicons name="open-outline" size={14} color={colors.primary} />
                </Pressable>
              ) : (
                <Text style={styles.adminJobMeta}>Posted By: {selectedJob?.owner?.name || '-'}</Text>
              )}
              <Text style={styles.adminJobMeta}>Email: {selectedJob?.owner?.email || '-'}</Text>
              <Text style={styles.adminJobMeta}>Budget: {getBudgetDisplay(selectedJob)}</Text>
              <Text style={styles.adminJobMeta}>Type: {String(selectedJob?.jobType || '').replace('_', ' ') || '-'}</Text>
              <Text style={styles.adminJobMeta}>Required Workers: {selectedJob?.requiredWorkers || 1}</Text>
              <Text style={styles.adminJobMeta}>Applied Users: {selectedJobStats.appliedCount}</Text>
              <Text style={styles.adminJobMeta}>Accepted Users: {selectedJobStats.acceptedCount}</Text>
              <Text style={styles.adminJobMeta}>Pending Users: {selectedJobStats.pendingCount}</Text>
              <Text style={styles.adminJobMeta}>Due Date: {selectedJob?.dueDate ? String(selectedJob.dueDate).slice(0, 10) : '-'}</Text>
            </View>
            <JobLocationCard job={selectedJob} title="Job Location" styles={styles} colors={colors} />
          </View>

          <View style={styles.adminJobCard}>
            <Text style={styles.optionTitle}>Applied Users</Text>
            <Text style={styles.optionSubtitle}>Tap any user to open full user details and start chat.</Text>
          </View>

          {isSelectedJobApplicationsLoading ? (
            <AdminListState mode="loading" title="Loading applicants..." subtitle="Please wait..." colors={colors} />
          ) : selectedJobApplications.length ? (
            selectedJobApplications.map((application) => (
              <View key={application.id} style={styles.myJobCard}>
                <Pressable
                  onPress={() =>
                    onOpenUserDetails?.(application?.applicant?.id, {
                      tab: 'create',
                      settingsPage: 'main',
                      adminJobId: selectedJob?.id
                    })
                  }
                >
                  <View style={styles.adminUserCardLead}>
                    <AvatarView imageUrl={application?.applicant?.avatar || DEFAULT_AVATAR_URL} size={44} colors={colors} showBorder />
                    <View style={styles.adminUserCardBody}>
                      <View style={styles.adminUserCardTop}>
                        <Text style={styles.adminUserCardName} numberOfLines={1}>
                          {application?.applicant?.name || 'Unknown User'}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                      </View>
                      <Text style={styles.adminUserCardEmail} numberOfLines={1}>{application?.applicant?.email || '-'}</Text>
                    </View>
                  </View>
                  <View style={[styles.myJobHead, { marginTop: 10 }]}>
                    <Text style={styles.myJobMeta}>Phone: {application?.applicant?.phone || '-'}</Text>
                    <View style={styles.myJobStatusPill}>
                      <Text style={styles.myJobStatusPillText}>{String(application?.status || 'PENDING')}</Text>
                    </View>
                  </View>
                  <Text style={styles.myJobMeta}>Rating: {getRatingSummaryText(application?.applicant?.ratingSummary)}</Text>
                  {application?.ownerReview ? (
                    <Text style={styles.myJobMeta}>
                      Poster Review: {Number(application.ownerReview.rating || 0)}/5
                      {application.ownerReview.comment ? ` - ${application.ownerReview.comment}` : ''}
                    </Text>
                  ) : null}
                </Pressable>
                <View style={styles.optionActionsRow}>
                  <Pressable
                    style={[styles.modalBtnPrimary, styles.optionActionBtn, styles.modalBtnPrimaryInline]}
                    onPress={() =>
                      onOpenChatWithUser?.({
                        job: selectedJob,
                        applicant: application?.applicant
                      })
                    }
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={14} color="#FFFFFF" />
                    <Text style={styles.modalBtnPrimaryText} numberOfLines={1}>Chat</Text>
                  </Pressable>
                </View>
              </View>
            ))
          ) : (
            <AdminListState
              mode="empty"
              title="No applicants found"
              subtitle="No user has applied to this job yet."
              colors={colors}
              emptySource={ADMIN_EMPTY_ANIMATION}
            />
          )}
        </ScrollView>

        <Modal visible={showStatusPicker} transparent animationType="fade" onRequestClose={() => setShowStatusPicker(false)}>
          <Pressable style={styles.filterBackdrop} onPress={() => setShowStatusPicker(false)}>
            <Pressable style={styles.categoryFilterModal} onPress={() => {}}>
              <Text style={styles.optionTitle}>Change Job Status</Text>
              <Text style={styles.categoryFilterHint}>Select new status for this job</Text>
              {jobStatusOptions.map((option) => (
                <Pressable
                  key={`admin-job-status-${option}`}
                  style={[styles.categoryFilterOption, currentJobStatus === option && styles.categoryFilterOptionActive]}
                  onPress={() => {
                    setShowStatusPicker(false);
                    if (option === currentJobStatus) return;
                    setPendingStatusChange(option);
                  }}
                >
                  <View style={styles.categoryFilterOptionLeft}>
                    <Ionicons
                      name={option === 'COMPLETED' ? 'checkmark-circle-outline' : option === 'CANCELLED' ? 'close-circle-outline' : option === 'IN_PROGRESS' ? 'time-outline' : 'radio-button-on-outline'}
                      size={16}
                      color={currentJobStatus === option ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[styles.categoryFilterOptionText, currentJobStatus === option && styles.categoryFilterOptionTextActive]}>
                      {option.replace('_', ' ')}
                    </Text>
                  </View>
                  {currentJobStatus === option ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
                </Pressable>
              ))}
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={Boolean(pendingStatusChange)} transparent animationType="fade" onRequestClose={() => setPendingStatusChange(null)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPendingStatusChange(null)}>
            <Pressable style={styles.optionModal} onPress={() => {}}>
              <Text style={styles.optionTitle}>Confirm Status Change</Text>
              <Text style={styles.optionMessage}>
                Change status from {currentJobStatus.replace('_', ' ')} to {String(pendingStatusChange || '').replace('_', ' ')}?
              </Text>
              <View style={styles.optionActionsRow}>
                <Pressable style={[styles.optionCancel, styles.optionActionBtn]} onPress={() => setPendingStatusChange(null)}>
                  <Text style={styles.optionCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalBtnPrimary, styles.optionActionBtn, isUpdatingJobStatus ? styles.modalBtnDisabled : null]}
                  disabled={isUpdatingJobStatus}
                  onPress={async () => {
                    if (!pendingStatusChange || !selectedJob?.id || !onChangeJobStatus) return;
                    setIsUpdatingJobStatus(true);
                    const didUpdate = await onChangeJobStatus(selectedJob.id, pendingStatusChange);
                    setIsUpdatingJobStatus(false);
                    if (didUpdate) {
                      setSelectedJob((prev) => (prev ? { ...prev, status: pendingStatusChange } : prev));
                      setPendingStatusChange(null);
                    }
                  }}
                >
                  <Text style={styles.modalBtnPrimaryText}>{isUpdatingJobStatus ? 'Updating...' : 'Confirm'}</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    );
  }

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
            <Pressable key={job.id} style={styles.adminJobCard} onPress={() => openJobDetails(job)}>
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
              <Text style={styles.adminJobMeta} numberOfLines={1}>Applied: {Number(job?.applicationStats?.appliedCount || 0)}</Text>
              <View style={styles.adminJobBottomRow}>
                <Text style={styles.adminJobBudget}>{getBudgetDisplay(job)}</Text>
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

    </View>
  );
}

function AdminCategoriesPage({
  onBack,
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
        <Pressable style={styles.settingsBackBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text style={styles.settingsBackText}>Settings</Text>
        </Pressable>
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
  const requiredWorkersRef = useRef(null);
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
    if (fieldName === 'requiredWorkers') {
      scrollToField('requiredWorkers');
      setTimeout(() => requiredWorkersRef.current?.focus(), 120);
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
      {
        key: 'requiredWorkers',
        valid: Number.isInteger(Number.parseInt(jobForm.requiredWorkers, 10)) && Number.parseInt(jobForm.requiredWorkers, 10) > 0,
        label: 'Required workers must be at least 1'
      },
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
      budgetType: jobForm.budgetType || 'TOTAL',
      requiredWorkers: Number.parseInt(jobForm.requiredWorkers, 10),
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

          <Text style={styles.createFieldLabel}>Budget Distribution</Text>
          <View style={styles.createPillRow}>
            {['TOTAL', 'PER_PERSON'].map((type) => (
              <Pressable
                key={`budget-type-${type}`}
                style={[styles.createPill, jobForm.budgetType === type && styles.createPillActive]}
                onPress={() => setJobForm((prev) => ({ ...prev, budgetType: type }))}
              >
                <Text style={[styles.createPillText, jobForm.budgetType === type && styles.createPillTextActive]}>
                  {type === 'TOTAL' ? 'Total Budget' : 'Per Person'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View onLayout={registerFieldY('requiredWorkers')}>
            <Text style={styles.createFieldLabel}>Required Workers *</Text>
          </View>
          <TextInput
            ref={requiredWorkersRef}
            value={jobForm.requiredWorkers}
            onChangeText={(value) => {
              setJobForm((prev) => ({ ...prev, requiredWorkers: value.replace(/[^0-9]/g, '') }));
              setErrors((prev) => ({ ...prev, requiredWorkers: '' }));
            }}
            style={[styles.createFieldInput, errors.requiredWorkers ? styles.createFieldInputError : null]}
            placeholder="1"
            keyboardType="number-pad"
            placeholderTextColor={colors.textSecondary}
          />
          {errors.requiredWorkers ? <Text style={styles.createFieldErrorText}>{errors.requiredWorkers}</Text> : null}

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
  const totalApplicants = jobs.reduce((count, job) => count + Number(job?.applicationCount || 0), 0);

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
          <Text style={styles.myJobOpenText}>
            {totalApplicants} total {totalApplicants === 1 ? 'application' : 'applications'} received
          </Text>
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
                  <Text style={styles.myJobMetaPillText}>{getBudgetDisplay(item)}</Text>
                </View>
                <View style={styles.myJobMetaPill}>
                  <Ionicons name="briefcase-outline" size={13} color={colors.primary} />
                  <Text style={styles.myJobMetaPillText}>{String(item?.jobType || '').replace('_', ' ') || '-'}</Text>
                </View>
                <View style={styles.myJobMetaPill}>
                  <Ionicons name="people-outline" size={13} color={colors.primary} />
                  <Text style={styles.myJobMetaPillText}>{item?.applicationCount || 0} Applied</Text>
                </View>
                <View style={styles.myJobMetaPill}>
                  <Ionicons name="checkmark-done-outline" size={13} color={colors.primary} />
                  <Text style={styles.myJobMetaPillText}>
                    {item?.acceptedApplicationCount || 0}/{item?.requiredWorkers || 1} Approved
                  </Text>
                </View>
                {(item?.pendingApplicationCount || 0) > 0 ? (
                  <View style={styles.myJobMetaPill}>
                    <Ionicons name="time-outline" size={13} color={colors.primary} />
                    <Text style={styles.myJobMetaPillText}>{item?.pendingApplicationCount || 0} Pending</Text>
                  </View>
                ) : null}
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

function MyJobDetailsPage({
  job,
  applications,
  isLoadingApplications,
  isUpdatingApplicationStatus,
  isSubmittingReview,
  isUpdatingJobStatus,
  onBack,
  onRefreshApplications,
  onApproveApplication,
  onRejectApplication,
  onSubmitReview,
  onChangeJobStatus,
  onOpenChatWithApplicant,
  onEditJob,
  styles,
  colors
}) {
  const [selectedApplicantRecord, setSelectedApplicantRecord] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState(null);
  const requiredWorkers = Number(job?.requiredWorkers || 1);
  const acceptedCount = applications.filter((item) => String(item?.status || '').toUpperCase() === 'ACCEPTED').length;
  const pendingCount = applications.filter((item) => String(item?.status || '').toUpperCase() === 'PENDING').length;
  const remainingSlots = Math.max(requiredWorkers - acceptedCount, 0);
  const isJobCompleted = String(job?.status || '').toUpperCase() === 'COMPLETED';
  const currentJobStatus = String(job?.status || 'OPEN').toUpperCase();
  const jobStatusOptions = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

  return (
    <View style={styles.settingsScreen}>
      <View style={styles.settingsNav}>
        <Pressable style={[styles.settingsBackBtn, { width: 96 }]} onPress={onBack}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text style={styles.settingsBackText} numberOfLines={1}>
            My Jobs
          </Text>
        </Pressable>
        <Text style={[styles.settingsNavTitle, { flex: 1, textAlign: 'center' }]}>Job Details</Text>
        <View style={[styles.settingsNavRight, { width: 96, alignItems: 'flex-end' }]}>
          <Pressable style={styles.settingsNavIconBtn} onPress={onRefreshApplications}>
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        <View style={styles.myJobCard}>
          <View style={styles.myJobHead}>
            <Text style={styles.myJobTitle} numberOfLines={2}>
              {job?.title || '-'}
            </Text>
            <View style={styles.myJobDetailHeaderActions}>
              <Pressable
                style={[styles.myJobStatusPill, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                onPress={() => setShowStatusPicker(true)}
                disabled={isUpdatingJobStatus}
              >
                <Text style={styles.myJobStatusPillText}>{currentJobStatus.replace('_', ' ')}</Text>
                <Ionicons name="chevron-down" size={12} color={colors.primary} />
              </Pressable>
              <Pressable style={[styles.settingsNavIconBtn, { backgroundColor: colors.primarySoft }]} onPress={onEditJob}>
                <Ionicons name="create-outline" size={16} color={colors.primary} />
              </Pressable>
            </View>
          </View>
          <Text style={styles.myJobDescription}>{job?.description || 'No description provided.'}</Text>
          <View style={styles.myJobMetaRow}>
            <View style={styles.myJobMetaPill}>
              <Ionicons name="layers-outline" size={13} color={colors.primary} />
              <Text style={styles.myJobMetaPillText}>{job?.category?.name || '-'}</Text>
            </View>
            <View style={styles.myJobMetaPill}>
              <Ionicons name="cash-outline" size={13} color={colors.primary} />
              <Text style={styles.myJobMetaPillText}>{getBudgetDisplay(job)}</Text>
            </View>
            <View style={styles.myJobMetaPill}>
              <Ionicons name="people-outline" size={13} color={colors.primary} />
              <Text style={styles.myJobMetaPillText}>Required: {requiredWorkers}</Text>
            </View>
            <View style={styles.myJobMetaPill}>
              <Ionicons name="checkmark-done-outline" size={13} color={colors.primary} />
              <Text style={styles.myJobMetaPillText}>Approved: {acceptedCount}</Text>
            </View>
            <View style={styles.myJobMetaPill}>
              <Ionicons name="time-outline" size={13} color={colors.primary} />
              <Text style={styles.myJobMetaPillText}>Pending: {pendingCount}</Text>
            </View>
          </View>
          <Text style={styles.myJobMeta}>Due Date: {job?.dueDate ? String(job.dueDate).slice(0, 10) : '-'}</Text>
          <Text style={styles.myJobMeta}>Remaining Approvals: {remainingSlots}</Text>
          <JobLocationCard job={job} title="Job Location" styles={styles} colors={colors} />
        </View>

        <View style={styles.myJobCard}>
          <Text style={styles.optionTitle}>Applied Users</Text>
          <Text style={styles.optionSubtitle}>
            Approve or reject pending applications. Set job status to Completed to submit reviews for accepted pickers.
          </Text>
        </View>

        {isLoadingApplications ? (
          <AdminListState
            mode="loading"
            title="Loading applicants..."
            subtitle="Please wait while we fetch applications."
            colors={colors}
          />
        ) : applications.length ? (
          applications.map((item) => {
            const status = String(item?.status || 'PENDING').toUpperCase();
            const disabledApprove = status !== 'PENDING' || remainingSlots <= 0 || isUpdatingApplicationStatus;
            const disabledReject = status !== 'PENDING' || isUpdatingApplicationStatus;
            const isAccepted = status === 'ACCEPTED';
            const hasExistingReview = Boolean(item?.ownerReview?.id);
            return (
              <View key={item.id} style={styles.myJobCard}>
                <Pressable onPress={() => setSelectedApplicantRecord(item)}>
                  <View style={styles.adminUserCardLead}>
                    <AvatarView imageUrl={item?.applicant?.avatar || DEFAULT_AVATAR_URL} size={46} colors={colors} showBorder />
                    <View style={styles.adminUserCardBody}>
                      <View style={styles.adminUserCardTop}>
                        <Text style={styles.adminUserCardName} numberOfLines={1}>
                          {item?.applicant?.name || 'Unknown User'}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                      </View>
                      <Text style={styles.adminUserCardEmail} numberOfLines={1}>
                        {item?.applicant?.email || '-'}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.myJobHead, { marginTop: 10 }]}>
                    <Text style={styles.myJobMeta}>Phone: {item?.applicant?.phone || '-'}</Text>
                    <View style={styles.myJobStatusPill}>
                      <Text style={styles.myJobStatusPillText}>{status}</Text>
                    </View>
                  </View>
                  <Text style={styles.myJobMeta}>Rating: {getRatingSummaryText(item?.applicant?.ratingSummary)}</Text>
                  <Text style={styles.myJobMeta}>Applied: {item?.createdAt ? String(item.createdAt).slice(0, 10) : '-'}</Text>
                </Pressable>
                <View style={styles.optionActionsRow}>
                  {isAccepted ? (
                    <>
                      <Pressable
                        style={[styles.modalBtnPrimary, styles.optionActionBtn, styles.modalBtnPrimaryInline]}
                        onPress={() => onOpenChatWithApplicant(item)}
                      >
                        <Ionicons name="chatbubble-ellipses-outline" size={14} color="#FFFFFF" />
                        <Text style={styles.modalBtnPrimaryText} numberOfLines={1}>Chat</Text>
                      </Pressable>
                      {isJobCompleted ? (
                        <Pressable
                          style={[styles.optionCancel, styles.optionActionBtn, isSubmittingReview ? styles.modalBtnDisabled : null]}
                          disabled={isSubmittingReview}
                          onPress={() => {
                            setReviewTarget(item);
                            setReviewRating(Number(item?.ownerReview?.rating || 5));
                            setReviewComment(String(item?.ownerReview?.comment || ''));
                          }}
                        >
                          <Text style={styles.optionCancelText}>{hasExistingReview ? 'Update Review' : 'Add Review'}</Text>
                        </Pressable>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <Pressable
                        style={[styles.optionCancel, styles.optionActionBtn, disabledReject ? styles.modalBtnDisabled : null]}
                        disabled={disabledReject}
                        onPress={() => onRejectApplication(item.id)}
                      >
                        <Text style={styles.optionCancelText}>Reject</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.modalBtnPrimary, styles.optionActionBtn, disabledApprove ? styles.modalBtnDisabled : null]}
                        disabled={disabledApprove}
                        onPress={() => onApproveApplication(item.id)}
                      >
                        <Text style={styles.modalBtnPrimaryText}>{remainingSlots <= 0 && status === 'PENDING' ? 'Filled' : 'Approve'}</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            );
          })
        ) : (
          <AdminListState
            mode="empty"
            title="No applicants yet"
            subtitle="When users apply to this job, they will appear here."
            colors={colors}
            emptySource={ADMIN_EMPTY_ANIMATION}
          />
        )}
      </ScrollView>

      <Modal visible={Boolean(selectedApplicantRecord)} transparent animationType="fade" onRequestClose={() => setSelectedApplicantRecord(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedApplicantRecord(null)}>
          <Pressable style={styles.optionModal} onPress={() => {}}>
            <View style={styles.adminFilterHead}>
              <Text style={styles.optionTitle}>Applicant Details</Text>
              <Pressable style={styles.settingsNavIconBtn} onPress={() => setSelectedApplicantRecord(null)}>
                <Ionicons name="close-outline" size={20} color={colors.primary} />
              </Pressable>
            </View>
            <View style={styles.adminUserDetailHero}>
              <AvatarView
                imageUrl={selectedApplicantRecord?.applicant?.avatar || DEFAULT_AVATAR_URL}
                size={84}
                colors={colors}
                showBorder
              />
              <Text style={styles.adminUserDetailName}>{selectedApplicantRecord?.applicant?.name || 'Unknown User'}</Text>
              <Text style={styles.adminUserDetailEmail}>{selectedApplicantRecord?.applicant?.email || '-'}</Text>
            </View>

            <View style={styles.adminUserDetailCard}>
              <Text style={styles.myJobMeta}>Phone: {selectedApplicantRecord?.applicant?.phone || '-'}</Text>
              <Text style={styles.myJobMeta}>Rating: {getRatingSummaryText(selectedApplicantRecord?.applicant?.ratingSummary)}</Text>
              <Text style={styles.myJobMeta}>Application Status: {selectedApplicantRecord?.status || '-'}</Text>
              {selectedApplicantRecord?.ownerReview ? (
                <Text style={styles.myJobMeta}>
                  Your Review: {selectedApplicantRecord.ownerReview.rating}/5
                  {selectedApplicantRecord.ownerReview.comment ? ` - ${selectedApplicantRecord.ownerReview.comment}` : ''}
                </Text>
              ) : null}
              <Text style={styles.myJobMeta}>
                Applied On: {selectedApplicantRecord?.createdAt ? String(selectedApplicantRecord.createdAt).slice(0, 10) : '-'}
              </Text>
              <Text style={styles.myJobMeta}>Applicant ID: {selectedApplicantRecord?.applicant?.id || '-'}</Text>
            </View>

          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showStatusPicker} transparent animationType="fade" onRequestClose={() => setShowStatusPicker(false)}>
        <Pressable style={styles.filterBackdrop} onPress={() => setShowStatusPicker(false)}>
          <Pressable style={styles.categoryFilterModal} onPress={() => {}}>
            <Text style={styles.optionTitle}>Change Job Status</Text>
            <Text style={styles.categoryFilterHint}>Select new status for this job</Text>
            {jobStatusOptions.map((option) => (
              <Pressable
                key={`job-status-${option}`}
                style={[styles.categoryFilterOption, currentJobStatus === option && styles.categoryFilterOptionActive]}
                onPress={() => {
                  setShowStatusPicker(false);
                  if (option === currentJobStatus) return;
                  setPendingStatusChange(option);
                }}
              >
                <View style={styles.categoryFilterOptionLeft}>
                  <Ionicons
                    name={option === 'COMPLETED' ? 'checkmark-circle-outline' : option === 'CANCELLED' ? 'close-circle-outline' : option === 'IN_PROGRESS' ? 'time-outline' : 'radio-button-on-outline'}
                    size={16}
                    color={currentJobStatus === option ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.categoryFilterOptionText, currentJobStatus === option && styles.categoryFilterOptionTextActive]}>
                    {option.replace('_', ' ')}
                  </Text>
                </View>
                {currentJobStatus === option ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={Boolean(pendingStatusChange)} transparent animationType="fade" onRequestClose={() => setPendingStatusChange(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPendingStatusChange(null)}>
          <Pressable style={styles.optionModal} onPress={() => {}}>
            <Text style={styles.optionTitle}>Confirm Status Change</Text>
            <Text style={styles.optionMessage}>
              Change status from {currentJobStatus.replace('_', ' ')} to {String(pendingStatusChange || '').replace('_', ' ')}?
            </Text>
            <View style={styles.optionActionsRow}>
              <Pressable style={[styles.optionCancel, styles.optionActionBtn]} onPress={() => setPendingStatusChange(null)}>
                <Text style={styles.optionCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtnPrimary, styles.optionActionBtn, isUpdatingJobStatus ? styles.modalBtnDisabled : null]}
                disabled={isUpdatingJobStatus}
                onPress={async () => {
                  if (!pendingStatusChange) return;
                  await onChangeJobStatus(pendingStatusChange);
                  setPendingStatusChange(null);
                }}
              >
                <Text style={styles.modalBtnPrimaryText}>{isUpdatingJobStatus ? 'Updating...' : 'Confirm'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={Boolean(reviewTarget)} transparent animationType="fade" onRequestClose={() => setReviewTarget(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setReviewTarget(null)}>
          <Pressable style={styles.optionModal} onPress={() => {}}>
            <Text style={styles.optionTitle}>Review Job Picker</Text>
            <Text style={styles.optionSubtitle}>
              {reviewTarget?.applicant?.name || 'User'} for "{job?.title || 'Job'}"
            </Text>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 12 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={`star-${star}`} onPress={() => setReviewRating(star)}>
                  <Ionicons
                    name={star <= reviewRating ? 'star' : 'star-outline'}
                    size={26}
                    color={star <= reviewRating ? '#F59E0B' : colors.textSecondary}
                  />
                </Pressable>
              ))}
            </View>

            <TextInput
              style={[styles.createFieldInput, styles.createFieldArea, { marginTop: 4 }]}
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="Write review comment (optional)"
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={500}
            />

            <View style={styles.optionActionsRow}>
              <Pressable style={[styles.optionCancel, styles.optionActionBtn]} onPress={() => setReviewTarget(null)}>
                <Text style={styles.optionCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtnPrimary, styles.optionActionBtn, isSubmittingReview ? styles.modalBtnDisabled : null]}
                disabled={isSubmittingReview}
                onPress={async () => {
                  if (!reviewTarget?.applicant?.id || !job?.id) return;
                  await onSubmitReview({
                    jobId: job.id,
                    revieweeId: reviewTarget.applicant.id,
                    rating: reviewRating,
                    comment: reviewComment
                  });
                  setReviewTarget(null);
                }}
              >
                <Text style={styles.modalBtnPrimaryText}>{isSubmittingReview ? 'Submitting...' : 'Submit Review'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function PickerJobsPage({
  jobs,
  isLoading,
  onRefresh,
  onApplyJob,
  isApplying,
  onOpenMyApplications,
  styles,
  colors
}) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const filterSheetAnim = useRef(new Animated.Value(0)).current;
  const statusOptions = ['ALL', 'OPEN', 'IN_PROGRESS'];
  const parsedMinBudget = Number.parseFloat(minBudget);
  const parsedMaxBudget = Number.parseFloat(maxBudget);
  const hasValidMinBudget = Number.isFinite(parsedMinBudget);
  const hasValidMaxBudget = Number.isFinite(parsedMaxBudget);
  const hasAnyFilter = statusFilter !== 'ALL' || hasValidMinBudget || hasValidMaxBudget;

  const openFilterSheet = () => {
    setShowFilterSheet(true);
    Animated.timing(filterSheetAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  };

  const closeFilterSheet = () => {
    Animated.timing(filterSheetAnim, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) {
        setShowFilterSheet(false);
      }
    });
  };

  const filteredJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const status = String(job?.status || '').toUpperCase();
        const isVisibleStatus = status === 'OPEN' || status === 'IN_PROGRESS';
        if (!isVisibleStatus) return false;
        const okStatus = statusFilter === 'ALL' || status === statusFilter;
        const numericBudget = Number(job?.budget);
        const hasNumericBudget = Number.isFinite(numericBudget);
        const okMinBudget = !hasValidMinBudget || (hasNumericBudget && numericBudget >= parsedMinBudget);
        const okMaxBudget = !hasValidMaxBudget || (hasNumericBudget && numericBudget <= parsedMaxBudget);
        const q = query.trim().toLowerCase();
        const okQuery =
          !q ||
          [job?.title, job?.description, job?.category?.name, job?.owner?.name]
            .some((v) => String(v || '').toLowerCase().includes(q));
        return okStatus && okMinBudget && okMaxBudget && okQuery;
      }),
    [jobs, statusFilter, query, hasValidMinBudget, hasValidMaxBudget, parsedMinBudget, parsedMaxBudget]
  );

  return (
    <View style={styles.settingsScreen}>
      <View style={styles.settingsNav}>
        <View style={styles.settingsNavRight}>
          <Pressable style={[styles.settingsNavIconBtn, { alignSelf: 'flex-start' }]} onPress={onOpenMyApplications}>
            <Ionicons name="document-text-outline" size={18} color={colors.primary} />
          </Pressable>
        </View>
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
        <Pressable
          style={[styles.categoryFilterIconBtn, hasAnyFilter ? styles.categoryFilterIconBtnActive : null]}
          onPress={openFilterSheet}
        >
          <Ionicons name="filter-outline" size={18} color={hasAnyFilter ? '#FFFFFF' : colors.primary} />
          {hasAnyFilter ? (
            <View style={styles.adminUserFilterBadge}>
              <Text style={styles.adminUserFilterBadgeText}>
                {[statusFilter !== 'ALL', hasValidMinBudget, hasValidMaxBudget].filter(Boolean).length}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

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
              {(() => {
                const stats = getApplicationStats(item);
                return (
                  <>
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
                  <Text style={styles.myJobMetaPillText}>{getBudgetDisplay(item)}</Text>
                </View>
                <View style={styles.myJobMetaPill}>
                  <Ionicons name="people-outline" size={13} color={colors.primary} />
                  <Text style={styles.myJobMetaPillText}>Applied: {stats.appliedCount}</Text>
                </View>
                <View style={styles.myJobMetaPill}>
                  <Ionicons name="checkmark-done-outline" size={13} color={colors.primary} />
                  <Text style={styles.myJobMetaPillText}>Accepted: {stats.acceptedCount}</Text>
                </View>
                <View style={styles.myJobMetaPill}>
                  <Ionicons name="time-outline" size={13} color={colors.primary} />
                  <Text style={styles.myJobMetaPillText}>Pending: {stats.pendingCount}</Text>
                </View>
              </View>
                  </>
                );
              })()}
            </Pressable>
          ))
        ) : (
          <AdminListState mode="empty" title="No jobs found" subtitle="Try changing filters." colors={colors} emptySource={ADMIN_EMPTY_ANIMATION} />
        )}
      </ScrollView>

      <Modal visible={showFilterSheet} transparent animationType="none" onRequestClose={closeFilterSheet}>
        <Pressable style={styles.bottomSheetBackdrop} onPress={closeFilterSheet}>
          <Animated.View
            style={[
              styles.bottomFilterSheet,
              {
                transform: [
                  {
                    translateY: filterSheetAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [360, 0]
                    })
                  }
                ],
                opacity: filterSheetAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.7, 1]
                })
              }
            ]}
          >
            <Pressable onPress={() => {}}>
              <View style={styles.bottomSheetGrabber} />
              <View style={styles.bottomSheetHeaderRow}>
                <Text style={styles.optionTitle}>Filters</Text>
                <Pressable
                  onPress={() => {
                    setStatusFilter('ALL');
                    setMinBudget('');
                    setMaxBudget('');
                  }}
                >
                  <Text style={styles.bottomSheetResetText}>Reset</Text>
                </Pressable>
              </View>

              <Text style={styles.bottomSheetLabel}>Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.createPillRow}>
                {statusOptions.map((value) => (
                  <Pressable
                    key={`picker-status-${value}`}
                    style={[styles.createPill, statusFilter === value && styles.createPillActive]}
                    onPress={() => setStatusFilter(value)}
                  >
                    <Text style={[styles.createPillText, statusFilter === value && styles.createPillTextActive]}>{value}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.bottomSheetLabel}>Budget Range</Text>
              <View style={styles.bottomBudgetRow}>
                <View style={styles.bottomBudgetInputWrap}>
                  <Text style={styles.bottomBudgetInputLabel}>Min</Text>
                  <TextInput
                    value={minBudget}
                    onChangeText={(value) => setMinBudget(value.replace(/[^\d]/g, ''))}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    style={styles.bottomBudgetInput}
                  />
                </View>
                <View style={styles.bottomBudgetInputWrap}>
                  <Text style={styles.bottomBudgetInputLabel}>Max</Text>
                  <TextInput
                    value={maxBudget}
                    onChangeText={(value) => setMaxBudget(value.replace(/[^\d]/g, ''))}
                    placeholder="50000"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    style={styles.bottomBudgetInput}
                  />
                </View>
              </View>

              <Pressable style={styles.bottomSheetApplyBtn} onPress={closeFilterSheet}>
                <Text style={styles.bottomSheetApplyBtnText}>Apply Filters</Text>
              </Pressable>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

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
              {(() => {
                const stats = getApplicationStats(selectedJob);
                return (
                  <>
              <Text style={styles.myJobMeta}>Category: {selectedJob?.category?.name || '-'}</Text>
              <Text style={styles.myJobMeta}>Posted By: {selectedJob?.owner?.name || '-'}</Text>
              <Text style={styles.myJobMeta}>Budget: {getBudgetDisplay(selectedJob)}</Text>
              <Text style={styles.myJobMeta}>Applied Users: {stats.appliedCount}</Text>
              <Text style={styles.myJobMeta}>Accepted Users: {stats.acceptedCount}</Text>
              <Text style={styles.myJobMeta}>Pending Users: {stats.pendingCount}</Text>
              <Text style={styles.myJobMeta}>Due Date: {selectedJob?.dueDate ? String(selectedJob.dueDate).slice(0, 10) : '-'}</Text>
                  </>
                );
              })()}
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

function MyApplicationsPage({ applications, isLoading, onRefresh, onOpenChat, onBack, styles, colors }) {
  const [searchText, setSearchText] = useState('');
  const [applicationStatusFilter, setApplicationStatusFilter] = useState('ALL');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const filterOptions = ['ALL', 'PENDING', 'ACCEPTED', 'REJECTED'];
  const filteredApplications = useMemo(
    () =>
      applications.filter((item) => {
        const status = String(item?.status || '').toUpperCase();
        const matchesStatus = applicationStatusFilter === 'ALL' || status === applicationStatusFilter;
        const q = searchText.trim().toLowerCase();
        const matchesQuery =
          !q ||
          [item?.job?.title, item?.job?.description, item?.job?.category?.name, item?.job?.owner?.name]
            .some((v) => String(v || '').toLowerCase().includes(q));
        return matchesStatus && matchesQuery;
      }),
    [applications, applicationStatusFilter, searchText]
  );

  return (
    <View style={styles.settingsScreen}>
      <View style={styles.settingsNav}>
        <View style={styles.settingsNavRight}>
          {onBack ? (
            <Pressable style={[styles.settingsNavIconBtn, { alignSelf: 'flex-start' }]} onPress={onBack}>
              <Ionicons name="chevron-back" size={20} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.settingsNavTitle}>My Applications</Text>
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
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search applications..."
            placeholderTextColor={colors.textSecondary}
            style={styles.categorySearchInput}
          />
        </View>
        <Pressable style={styles.categoryFilterIconBtn} onPress={() => setShowFilterModal(true)}>
          <Ionicons name="filter-outline" size={18} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        {isLoading ? (
          <AdminListState mode="loading" title="Loading applications..." subtitle="Please wait..." colors={colors} />
        ) : filteredApplications.length ? (
          filteredApplications.map((item) => (
            <Pressable key={item.id} style={styles.myJobCard} onPress={() => setSelectedApplication(item)}>
              {(() => {
                const stats = getJobSeatStats(item?.job);
                return (
                  <>
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
                <View style={styles.myJobMetaPill}>
                  <Ionicons name="people-outline" size={13} color={colors.primary} />
                  <Text style={styles.myJobMetaPillText}>Seats: {stats.totalSeats}</Text>
                </View>
                <View style={styles.myJobMetaPill}>
                  <Ionicons name="person-add-outline" size={13} color={colors.primary} />
                  <Text style={styles.myJobMetaPillText}>Applied: {stats.appliedCount}</Text>
                </View>
                <View style={styles.myJobMetaPill}>
                  <Ionicons name="checkmark-done-outline" size={13} color={colors.primary} />
                  <Text style={styles.myJobMetaPillText}>Filled: {stats.filledSeats}</Text>
                </View>
                <View style={styles.myJobMetaPill}>
                  <Ionicons name="hourglass-outline" size={13} color={colors.primary} />
                  <Text style={styles.myJobMetaPillText}>Remaining: {stats.remainingSeats}</Text>
                </View>
              </View>
              <View style={styles.myJobOpenRow}>
                <Text style={styles.myJobOpenText}>Tap to open details</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {String(item?.status || '').toUpperCase() === 'ACCEPTED' ? (
                    <Pressable
                      style={[styles.settingsNavIconBtn, { backgroundColor: colors.primarySoft }]}
                      onPress={() => onOpenChat(item)}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.primary} />
                    </Pressable>
                  ) : null}
                  <Ionicons name="arrow-forward-circle-outline" size={18} color={colors.primary} />
                </View>
              </View>
                  </>
                );
              })()}
            </Pressable>
          ))
        ) : (
          <AdminListState
            mode="empty"
            title="No applications found"
            subtitle={applications.length ? 'No applications match your current filters.' : 'Pick jobs from All Jobs and they will appear here.'}
            colors={colors}
            emptySource={ADMIN_EMPTY_ANIMATION}
          />
        )}
      </ScrollView>

      <Modal visible={showFilterModal} transparent animationType="fade" onRequestClose={() => setShowFilterModal(false)}>
        <Pressable style={styles.filterBackdrop} onPress={() => setShowFilterModal(false)}>
          <Pressable style={styles.categoryFilterModal} onPress={() => {}}>
            <Text style={styles.optionTitle}>Filter Applications</Text>
            <Text style={styles.categoryFilterHint}>Choose application status</Text>
            {filterOptions.map((option) => (
              <Pressable
                key={option}
                style={[styles.categoryFilterOption, applicationStatusFilter === option && styles.categoryFilterOptionActive]}
                onPress={() => {
                  setApplicationStatusFilter(option);
                  setShowFilterModal(false);
                }}
              >
                <View style={styles.categoryFilterOptionLeft}>
                  <Ionicons
                    name={option === 'ALL' ? 'apps-outline' : option === 'ACCEPTED' ? 'checkmark-circle-outline' : option === 'REJECTED' ? 'close-circle-outline' : 'time-outline'}
                    size={16}
                    color={applicationStatusFilter === option ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.categoryFilterOptionText, applicationStatusFilter === option && styles.categoryFilterOptionTextActive]}>
                    {option}
                  </Text>
                </View>
                {applicationStatusFilter === option ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={Boolean(selectedApplication)} transparent animationType="fade" onRequestClose={() => setSelectedApplication(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.myJobDetailModal}>
            <View style={styles.myJobDetailHeader}>
              <Text style={styles.myJobDetailTitle} numberOfLines={2}>
                {selectedApplication?.job?.title || 'Job Details'}
              </Text>
              <View style={styles.myJobStatusPill}>
                <Text style={styles.myJobStatusPillText}>{String(selectedApplication?.status || 'PENDING')}</Text>
              </View>
            </View>
            <Text style={styles.myJobDetailDescription}>{selectedApplication?.job?.description || 'No description provided.'}</Text>
            <View style={styles.myJobInfoCard}>
              {(() => {
                const stats = getJobSeatStats(selectedApplication?.job);
                return (
                  <>
              <Text style={styles.myJobMeta}>Category: {selectedApplication?.job?.category?.name || '-'}</Text>
              <Text style={styles.myJobMeta}>Posted By: {selectedApplication?.job?.owner?.name || '-'}</Text>
              <Text style={styles.myJobMeta}>Poster Rating: {getRatingSummaryText(selectedApplication?.job?.owner?.ratingSummary)}</Text>
              <Text style={styles.myJobMeta}>Budget: {getBudgetDisplay(selectedApplication?.job)}</Text>
              <Text style={styles.myJobMeta}>Total Seats: {stats.totalSeats}</Text>
              <Text style={styles.myJobMeta}>Total Applied: {stats.appliedCount}</Text>
              <Text style={styles.myJobMeta}>Filled Seats: {stats.filledSeats}</Text>
              <Text style={styles.myJobMeta}>Seats Remaining: {stats.remainingSeats}</Text>
              <Text style={styles.myJobMeta}>Remaining To Apply: {stats.remainingToApply}</Text>
              <Text style={styles.myJobMeta}>Pending Users: {stats.pendingCount}</Text>
              <Text style={styles.myJobMeta}>Rejected Users: {stats.rejectedCount}</Text>
              <Text style={styles.myJobMeta}>Due Date: {selectedApplication?.job?.dueDate ? String(selectedApplication.job.dueDate).slice(0, 10) : '-'}</Text>
              <Text style={styles.myJobMeta}>Applied On: {selectedApplication?.createdAt ? String(selectedApplication.createdAt).slice(0, 10) : '-'}</Text>
                  </>
                );
              })()}
            </View>
            <JobLocationCard job={selectedApplication?.job} title="Job Location" styles={styles} colors={colors} />
            <View style={styles.optionActionsRow}>
              <Pressable style={[styles.optionCancel, styles.optionActionBtn]} onPress={() => setSelectedApplication(null)}>
                <Text style={styles.optionCancelText}>Close</Text>
              </Pressable>
              {String(selectedApplication?.status || '').toUpperCase() === 'ACCEPTED' ? (
                <Pressable
                  style={[styles.modalBtnPrimary, styles.optionActionBtn]}
                  onPress={() => {
                    onOpenChat(selectedApplication);
                    setSelectedApplication(null);
                  }}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.modalBtnPrimaryText}>Chat</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ReviewsPage({ reviewsData, isLoading, onBack, onRefresh, styles, colors }) {
  const summary = reviewsData?.summary || { averageRating: null, totalReviews: 0 };
  const reviews = Array.isArray(reviewsData?.reviews) ? reviewsData.reviews : [];
  const distribution = reviewsData?.distribution || {};

  return (
    <View style={styles.settingsScreen}>
      <View style={styles.settingsNav}>
        <Pressable style={styles.settingsBackBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text style={styles.settingsBackText}>Settings</Text>
        </Pressable>
        <Text style={styles.settingsNavTitle}>My Reviews</Text>
        <View style={styles.settingsNavRight}>
          <Pressable style={styles.settingsNavIconBtn} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        <View style={styles.myJobCard}>
          <Text style={styles.optionTitle}>Overall Rating</Text>
          <Text style={styles.profileHint}>{getRatingSummaryText(summary)}</Text>
          <View style={styles.myJobMetaRow}>
            {[5, 4, 3, 2, 1].map((rating) => (
              <View key={`rating-dist-${rating}`} style={styles.myJobMetaPill}>
                <Ionicons name="star" size={13} color="#F59E0B" />
                <Text style={styles.myJobMetaPillText}>{rating}: {Number(distribution?.[rating] || 0)}</Text>
              </View>
            ))}
          </View>
        </View>

        {isLoading ? (
          <AdminListState mode="loading" title="Loading reviews..." subtitle="Please wait..." colors={colors} />
        ) : reviews.length ? (
          reviews.map((review) => (
            <View key={review.id} style={styles.myJobCard}>
              <View style={styles.myJobHead}>
                <Text style={styles.myJobTitle} numberOfLines={1}>{review?.job?.title || 'Job'}</Text>
                <View style={styles.myJobStatusPill}>
                  <Text style={styles.myJobStatusPillText}>{Number(review?.rating || 0)}/5</Text>
                </View>
              </View>
              <Text style={styles.myJobMeta}>By: {review?.reviewer?.name || '-'}</Text>
              <Text style={styles.myJobMeta}>Date: {review?.createdAt ? String(review.createdAt).slice(0, 10) : '-'}</Text>
              <Text style={styles.myJobDescription}>
                {String(review?.comment || '').trim() || 'No comment added.'}
              </Text>
            </View>
          ))
        ) : (
          <AdminListState
            mode="empty"
            title="No reviews yet"
            subtitle="Complete jobs to receive ratings from job posters."
            colors={colors}
            emptySource={ADMIN_EMPTY_ANIMATION}
          />
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

function ReportsPage({
  reports,
  isLoading,
  onBack,
  onRefresh,
  onCreateReport,
  styles,
  colors
}) {
  const [selectedReport, setSelectedReport] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    imageData: '',
    imageUri: ''
  });

  const reportStatusTone = (status) => {
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'RESOLVED') return { bg: '#DCFCE7', text: '#166534' };
    if (normalized === 'REJECTED') return { bg: '#FEE2E2', text: '#991B1B' };
    if (normalized === 'IN_REVIEW') return { bg: '#DBEAFE', text: '#1D4ED8' };
    return { bg: colors.primarySoft, text: colors.primary };
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      imageData: '',
      imageUri: ''
    });
  };

  const pickReportImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.82,
        base64: true
      });

      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.base64) return;
      const normalizedMimeType = (asset.mimeType || 'image/jpeg').toLowerCase();
      setForm((prev) => ({
        ...prev,
        imageData: `data:${normalizedMimeType};base64,${asset.base64}`,
        imageUri: asset.uri || ''
      }));
    } catch (_error) {
      // no-op: parent flow already handles API errors
    }
  };

  const submitReport = async () => {
    const title = String(form.title || '').trim();
    const description = String(form.description || '').trim();
    if (!title || !description || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const created = await onCreateReport({
        title,
        description,
        imageData: form.imageData || ''
      });
      if (created) {
        setShowCreateModal(false);
        resetForm();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const items = Array.isArray(reports) ? reports : [];

  return (
    <View style={styles.settingsScreen}>
      <View style={styles.settingsNav}>
        <Pressable style={styles.settingsBackBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text style={styles.settingsBackText}>Settings</Text>
        </Pressable>
        <Text style={styles.settingsNavTitle}>Reports</Text>
        <View style={styles.settingsNavRight}>
          <Pressable style={styles.settingsNavIconBtn} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.reportBannerCard}>
        <View style={styles.reportBannerIcon}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
        </View>
        <View style={styles.reportBannerTextWrap}>
          <Text style={styles.reportBannerTitle}>Submit and Track Reports</Text>
          <Text style={styles.reportBannerSubtitle}>New reports start as pending until reviewed by admin.</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        {isLoading ? (
          <AdminListState mode="loading" title="Loading reports..." subtitle="Please wait..." colors={colors} />
        ) : items.length ? (
          items.map((item) => {
            const tone = reportStatusTone(item?.status);
            return (
              <Pressable key={item.id} style={styles.reportCard} onPress={() => setSelectedReport(item)}>
                <View style={styles.reportCardHead}>
                  <Text style={styles.reportCardTitle} numberOfLines={1}>
                    {item?.title || 'Untitled report'}
                  </Text>
                  <View style={[styles.reportStatusPill, { backgroundColor: tone.bg }]}>
                    <Text style={[styles.reportStatusPillText, { color: tone.text }]}>
                      {String(item?.status || 'PENDING').replace('_', ' ')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.reportCardDescription} numberOfLines={1}>
                  {item?.description || '-'}
                </Text>
                <Text style={styles.reportCardMeta}>
                  {item?.createdAt ? new Date(item.createdAt).toLocaleString('en-GB') : ''}
                </Text>
              </Pressable>
            );
          })
        ) : (
          <AdminListState
            mode="empty"
            title="No reports submitted"
            subtitle="Tap + to submit your first report."
            colors={colors}
            emptySource={ADMIN_EMPTY_ANIMATION}
          />
        )}
      </ScrollView>

      <Pressable style={styles.reportFab} onPress={() => setShowCreateModal(true)}>
        <Ionicons name="document-text-outline" size={23} color="#FFFFFF" />
      </Pressable>

      <Modal visible={showCreateModal} transparent animationType="fade" onRequestClose={() => setShowCreateModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowCreateModal(false)}>
          <Pressable style={styles.optionModal} onPress={() => {}}>
            <Text style={styles.optionTitle}>Create Report</Text>
            <TextInput
              value={form.title}
              onChangeText={(value) => setForm((prev) => ({ ...prev, title: value }))}
              placeholder="Title (required)"
              placeholderTextColor={colors.textSecondary}
              style={styles.categoryCreateInput}
            />
            <TextInput
              value={form.description}
              onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
              placeholder="Description (required)"
              placeholderTextColor={colors.textSecondary}
              style={[styles.categoryCreateInput, styles.categoryCreateDescription]}
              multiline
            />
            <View style={styles.reportUploadRow}>
              <Pressable style={styles.reportUploadBtn} onPress={pickReportImage}>
                <Ionicons name="image-outline" size={15} color={colors.primary} />
                <Text style={styles.reportUploadBtnText}>{form.imageData ? 'Change Image' : 'Upload Image (optional)'}</Text>
              </Pressable>
              {form.imageData ? (
                <Pressable
                  style={styles.reportImageRemoveBtn}
                  onPress={() => setForm((prev) => ({ ...prev, imageData: '', imageUri: '' }))}
                >
                  <Ionicons name="close" size={14} color={colors.danger} />
                </Pressable>
              ) : null}
            </View>
            {form.imageUri ? <Image source={{ uri: form.imageUri }} style={styles.reportPreviewImage} resizeMode="cover" /> : null}
            <View style={styles.optionActionsRow}>
              <Pressable
                style={[styles.optionCancel, styles.optionActionBtn]}
                onPress={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.optionCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalBtnPrimary,
                  styles.optionActionBtn,
                  (!String(form.title || '').trim() || !String(form.description || '').trim() || isSubmitting)
                    ? styles.modalBtnDisabled
                    : null
                ]}
                onPress={submitReport}
                disabled={!String(form.title || '').trim() || !String(form.description || '').trim() || isSubmitting}
              >
                <Text style={styles.modalBtnPrimaryText}>{isSubmitting ? 'Submitting...' : 'Report'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={Boolean(selectedReport)} transparent animationType="fade" onRequestClose={() => setSelectedReport(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.reportDetailModal}>
            <View style={styles.reportDetailHeader}>
              <View style={styles.reportDetailHeadingWrap}>
                <View style={styles.reportDetailHeadingIcon}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.primary} />
                </View>
                <Text style={styles.reportDetailTitle} numberOfLines={2}>
                  {selectedReport?.title || ''}
                </Text>
              </View>
              <Pressable style={styles.reportDetailCloseBtn} onPress={() => setSelectedReport(null)}>
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.reportDetailStatusRow}>
              <View style={[styles.reportStatusPill, { backgroundColor: reportStatusTone(selectedReport?.status).bg }]}>
                <Text style={[styles.reportStatusPillText, { color: reportStatusTone(selectedReport?.status).text }]}>
                  {String(selectedReport?.status || 'PENDING').replace('_', ' ')}
                </Text>
              </View>
            </View>

            <Text style={styles.reportDetailDescription}>{selectedReport?.description || '-'}</Text>
            {selectedReport?.imageUrl ? (
              <Image source={{ uri: selectedReport.imageUrl }} style={styles.reportDetailImage} resizeMode="cover" />
            ) : null}

            <View style={styles.reportDetailMetaCard}>
              <View style={styles.reportDetailMetaRow}>
                <Text style={styles.reportDetailMetaLabel}>Date</Text>
                <Text style={styles.reportDetailMetaValue}>
                  {selectedReport?.createdAt ? new Date(selectedReport.createdAt).toLocaleString('en-GB') : '-'}
                </Text>
              </View>
              <View style={styles.reportDetailMetaRow}>
                <Text style={styles.reportDetailMetaLabel}>Status</Text>
                <Text style={styles.reportDetailMetaValue}>
                  {String(selectedReport?.status || 'PENDING').replace('_', ' ')}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function NotificationsPage({
  notifications,
  isLoading,
  onBack,
  onRefresh,
  onOpenNotification,
  onReadNotification,
  onDeleteNotification,
  onReadAll,
  onDeleteAll,
  styles,
  colors
}) {
  const items = Array.isArray(notifications) ? notifications : [];
  const unreadCount = items.filter(
    (item) => !item?.isRead && String(item?.type || '').toUpperCase() !== 'CHAT_MESSAGE'
  ).length;

  return (
    <View style={styles.settingsScreen}>
      <View style={styles.settingsNav}>
        <Pressable style={styles.settingsBackBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text style={styles.settingsBackText}>Back</Text>
        </Pressable>
        <Text style={styles.settingsNavTitle}>Notifications</Text>
        <View style={styles.settingsNavRight}>
          <Pressable style={styles.settingsNavIconBtn} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.notificationsTopActions}>
        <View style={styles.notificationsUnreadPill}>
          <Ionicons name="notifications-outline" size={14} color={colors.primary} />
          <Text style={styles.notificationsUnreadPillText}>Unread: {unreadCount}</Text>
        </View>
        <View style={styles.notificationsTopIcons}>
          <Pressable style={styles.settingsNavIconBtn} onPress={onReadAll}>
            <Ionicons name="mail-open-outline" size={17} color={colors.primary} />
          </Pressable>
          <Pressable style={styles.settingsNavIconBtn} onPress={onDeleteAll}>
            <Ionicons name="trash-outline" size={17} color={colors.danger} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        {isLoading ? (
          <AdminListState mode="loading" title="Loading notifications..." subtitle="Please wait..." colors={colors} />
        ) : items.length ? (
          items.map((item) => (
            <Pressable
              key={item.id}
              style={[styles.notificationItemCard, !item?.isRead && styles.notificationItemCardUnread]}
              onPress={() => onOpenNotification(item)}
            >
              <View style={styles.notificationItemHead}>
                <View style={styles.notificationItemIconWrap}>
                  <Ionicons
                    name={getNotificationIconName(item)}
                    size={16}
                    color={!item?.isRead ? colors.primary : colors.textSecondary}
                  />
                </View>
                <View style={styles.notificationItemContent}>
                  <Text style={styles.notificationItemTitle} numberOfLines={1}>
                    {item?.title || 'Notification'}
                  </Text>
                  <Text style={styles.notificationItemDesc} numberOfLines={2}>
                    {item?.description || '-'}
                  </Text>
                </View>
                <View style={styles.notificationItemActions}>
                  <Pressable
                    style={styles.settingsNavIconBtn}
                    onPress={(event) => {
                      event?.stopPropagation?.();
                      onReadNotification(item.id);
                    }}
                  >
                    <Ionicons
                      name={item?.isRead ? 'checkmark-done-outline' : 'mail-open-outline'}
                      size={16}
                      color={colors.primary}
                    />
                  </Pressable>
                  <Pressable
                    style={styles.settingsNavIconBtn}
                    onPress={(event) => {
                      event?.stopPropagation?.();
                      onDeleteNotification(item.id);
                    }}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
              <View style={styles.notificationItemFooter}>
                <Text style={styles.notificationItemTime}>
                  {item?.createdAt ? new Date(item.createdAt).toLocaleString('en-GB') : ''}
                </Text>
                {!item?.isRead ? <View style={styles.notificationUnreadDot} /> : null}
              </View>
            </Pressable>
          ))
        ) : (
          <AdminListState
            mode="empty"
            title="No notifications yet"
            subtitle="Updates about jobs and applications will appear here."
            colors={colors}
            emptySource={ADMIN_EMPTY_ANIMATION}
          />
        )}
      </ScrollView>
    </View>
  );
}

function SettingsPage({
  user,
  themeMode,
  setThemeMode,
  onOpenProfile,
  onOpenMode,
  onOpenCategories,
  onOpenReviews,
  onOpenReports,
  onRequestLogout,
  styles,
  colors
}) {
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
            {user?.role !== 'ADMIN' ? (
              <Text style={styles.profileHint}>Rating: {getRatingSummaryText(user?.ratingSummary)}</Text>
            ) : null}
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
        {user?.role !== 'ADMIN' ? (
          <SettingsOption
            icon="star-outline"
            title="My Reviews"
            subtitle="View all ratings and comments received"
            onPress={onOpenReviews}
            styles={styles}
            colors={colors}
          />
        ) : null}
        {user?.role !== 'ADMIN' ? (
          <SettingsOption
            icon="alert-circle-outline"
            title="Reports"
            subtitle="Create and track your submitted reports"
            onPress={onOpenReports}
            styles={styles}
            colors={colors}
          />
        ) : null}
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
  MyJobDetailsPage,
  PickerJobsPage,
  MyApplicationsPage,
  ReportsPage,
  ReviewsPage,
  NotificationsPage,
  SettingsPage
};
