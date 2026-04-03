import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Path, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';

const WEB_SAFE_NATIVE_DRIVER = Platform.OS !== 'web';
const DAY_MS = 24 * 60 * 60 * 1000;
const PERIOD_OPTIONS = ['DAY', 'MONTH', 'YEAR'];
const ADMIN_RANGE_OPTIONS = ['7D', '30D', '12M'];

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function startOfWeekMonday(baseDate) {
  const date = new Date(baseDate);
  const shift = (date.getDay() + 6) % 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - shift);
  return date;
}

function getDateKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfDay(dateValue) {
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  return date;
}

function isSameDay(a, b) {
  return getDateKey(a) === getDateKey(b);
}

function getMonthKey(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getShortMonthLabel(dateValue) {
  return new Date(dateValue).toLocaleDateString('en-IN', { month: 'short' });
}

function formatCurrency(value) {
  return `Rs ${Math.round(Number(value) || 0).toLocaleString('en-IN')}`;
}

function normalizeHex(value) {
  const raw = String(value || '').trim();
  if (!raw.startsWith('#')) return null;
  if (raw.length === 4) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  }
  if (raw.length === 7) return raw;
  return null;
}

function shiftHexColor(hex, amount) {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const clamp = (n) => Math.max(0, Math.min(255, n));
  const r = clamp(parseInt(normalized.slice(1, 3), 16) + amount);
  const g = clamp(parseInt(normalized.slice(3, 5), 16) + amount);
  const b = clamp(parseInt(normalized.slice(5, 7), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function hexToRgba(hex, alpha) {
  const normalized = normalizeHex(hex);
  if (!normalized) return `rgba(15,118,110,${alpha})`;
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function compactAmount(value) {
  const amount = Number(value) || 0;
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}k`;
  return String(Math.round(amount));
}

function getPeriodLabel(period) {
  if (period === 'DAY') return 'Daily';
  if (period === 'YEAR') return 'Yearly';
  return 'Monthly';
}

function getJobBudgetTotal(job) {
  const budget = Number(job?.budget || 0);
  const workers = Math.max(1, Number(job?.requiredWorkers || 1));
  const budgetType = String(job?.budgetType || 'TOTAL').toUpperCase();
  if (!Number.isFinite(budget) || budget <= 0) return 0;
  return budgetType === 'PER_PERSON' ? budget * workers : budget;
}

function buildSmoothPath(points) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function buildMonotonePath(points) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  const n = points.length;
  const h = new Array(n - 1);
  const delta = new Array(n - 1);

  for (let i = 0; i < n - 1; i += 1) {
    h[i] = points[i + 1].x - points[i].x;
    delta[i] = h[i] === 0 ? 0 : (points[i + 1].y - points[i].y) / h[i];
  }

  const m = new Array(n).fill(0);
  m[0] = delta[0];
  m[n - 1] = delta[n - 2];

  for (let i = 1; i < n - 1; i += 1) {
    if (delta[i - 1] * delta[i] <= 0) {
      m[i] = 0;
    } else {
      m[i] = (delta[i - 1] + delta[i]) / 2;
    }
  }

  for (let i = 0; i < n - 1; i += 1) {
    if (delta[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / delta[i];
    const b = m[i + 1] / delta[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * delta[i];
      m[i + 1] = t * b * delta[i];
    }
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < n - 1; i += 1) {
    const x0 = points[i].x;
    const y0 = points[i].y;
    const x1 = points[i + 1].x;
    const y1 = points[i + 1].y;
    const segW = x1 - x0;

    const cp1x = x0 + segW / 3;
    const cp1y = y0 + (m[i] * segW) / 3;
    const cp2x = x1 - segW / 3;
    const cp2y = y1 - (m[i + 1] * segW) / 3;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x1} ${y1}`;
  }

  return d;
}

export function DashboardTab({
  user,
  userRole,
  myApplications,
  adminJobs = [],
  adminUsers = [],
  onRefreshAdminJobs,
  onRefreshAdminUsers,
  notificationPingKey = 0,
  unreadNotificationCount = 0,
  onOpenNotifications,
  styles,
  colors
}) {
  const bellAnim = useRef(new Animated.Value(0)).current;
  const profitAnim = useRef(new Animated.Value(0)).current;
  const filterAnim = useRef(new Animated.Value(0)).current;
  const statAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0)
  ]).current;
  const [isBellActive, setIsBellActive] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [chartWidth, setChartWidth] = useState(0);
  const [statsChartWidth, setStatsChartWidth] = useState(0);
  const [selectedJobType, setSelectedJobType] = useState('ALL');
  const [earnPeriod, setEarnPeriod] = useState('MONTH');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [periodDropdownAnchor, setPeriodDropdownAnchor] = useState(null);
  const [adminRange, setAdminRange] = useState('30D');
  const [adminPage, setAdminPage] = useState('overview');
  const [adminJobStatusFilter, setAdminJobStatusFilter] = useState('ALL');
  const [adminEarningFilter, setAdminEarningFilter] = useState('ALL');
  const [adminUserFilter, setAdminUserFilter] = useState('ALL');
  const adminFadeAnim = useRef(new Animated.Value(0)).current;
  const adminEarningsChartAnim = useRef(new Animated.Value(0)).current;
  const adminJobsBarAnims = useRef(Array.from({ length: 16 }, () => new Animated.Value(0))).current;
  const adminUsersBarAnims = useRef(Array.from({ length: 16 }, () => new Animated.Value(0))).current;
  const periodTriggerRef = useRef(null);
  const [adminEarningsChartWidth, setAdminEarningsChartWidth] = useState(0);
  const salesGradientId = useMemo(() => `salesArea-${String(userRole || 'user').toLowerCase()}`, [userRole]);

  const displayName = useMemo(() => {
    const candidate = String(user?.name || user?.username || user?.email || 'User').trim();
    return candidate || 'User';
  }, [user?.email, user?.name, user?.username]);

  const avatarUri = String(user?.avatar || '').trim();
  const fallbackLetter = displayName.charAt(0).toUpperCase();

  const bellRotate = bellAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-18deg', '18deg']
  });

  const analytics = useMemo(() => {
    const startCurrent = startOfWeekMonday(new Date());
    const startPrevious = new Date(startCurrent);
    startPrevious.setDate(startPrevious.getDate() - 7);
    const endCurrent = new Date(startCurrent);
    endCurrent.setDate(endCurrent.getDate() + 6);
    endCurrent.setHours(23, 59, 59, 999);

    const endPrevious = new Date(startPrevious);
    endPrevious.setDate(endPrevious.getDate() + 6);
    endPrevious.setHours(23, 59, 59, 999);

    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(startCurrent);
      date.setDate(startCurrent.getDate() + index);
      return {
        index,
        date,
        key: getDateKey(date),
        shortLabel: WEEKDAY_SHORT[index],
        fullDate: date.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }),
        amount: 0
      };
    });
    const dayIndexByKey = Object.fromEntries(days.map((day) => [day.key, day.index]));

    let totalEarned = 0;
    let currentWeekTotal = 0;
    let previousWeekTotal = 0;

    (Array.isArray(myApplications) ? myApplications : []).forEach((app) => {
      const status = String(app?.status || '').toUpperCase();
      if (status !== 'ACCEPTED') return;

      const amount = Number(app?.job?.budget || 0);
      if (!Number.isFinite(amount) || amount <= 0) return;
      totalEarned += amount;

      const sourceDate = app?.updatedAt || app?.createdAt;
      if (!sourceDate) return;
      const date = new Date(sourceDate);
      if (Number.isNaN(date.getTime())) return;

      if (date >= startCurrent && date <= endCurrent) {
        currentWeekTotal += amount;
        const key = getDateKey(date);
        if (key in dayIndexByKey) {
          days[dayIndexByKey[key]].amount += amount;
        }
      } else if (date >= startPrevious && date <= endPrevious) {
        previousWeekTotal += amount;
      }
    });

    const trendPercent = previousWeekTotal > 0
      ? Math.round(((currentWeekTotal - previousWeekTotal) / previousWeekTotal) * 100)
      : currentWeekTotal > 0
        ? 100
        : 0;

    return { days, totalEarned, trendPercent };
  }, [myApplications]);

  const statusCards = useMemo(() => {
    const records = Array.isArray(myApplications) ? myApplications : [];
    const counts = {
      OPEN: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      CANCELLED: 0
    };

    records.forEach((item) => {
      const jobType = String(item?.job?.jobType || '').toUpperCase();
      if (selectedJobType !== 'ALL' && jobType !== selectedJobType) return;

      const status = String(item?.job?.status || '').toUpperCase();
      if (status in counts) {
        counts[status] += 1;
      }
    });

    return counts;
  }, [myApplications, selectedJobType]);

  useEffect(() => {
    const today = new Date();
    const currentWeekStart = startOfWeekMonday(today);
    const normalizedToday = new Date(today);
    normalizedToday.setHours(0, 0, 0, 0);
    const diff = Math.floor((normalizedToday.getTime() - currentWeekStart.getTime()) / DAY_MS);
    setSelectedIndex(Math.max(0, Math.min(6, diff)));
  }, []);

  useEffect(() => {
    Animated.timing(profitAnim, {
      toValue: 1,
      duration: 360,
      useNativeDriver: WEB_SAFE_NATIVE_DRIVER
    }).start();
    Animated.timing(filterAnim, {
      toValue: 1,
      duration: 420,
      delay: 100,
      useNativeDriver: WEB_SAFE_NATIVE_DRIVER
    }).start();
    Animated.stagger(
      85,
      statAnims.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: WEB_SAFE_NATIVE_DRIVER
        })
      )
    ).start();
  }, [filterAnim, profitAnim, statAnims]);

  const chart = useMemo(() => {
    const values = analytics.days.map((day) => day.amount);
    const maxValue = Math.max(...values, 1);
    const width = Math.max(chartWidth, 240);
    const height = 128;
    const padX = 10;
    const padY = 10;
    const usableWidth = width - padX * 2;
    const usableHeight = height - padY * 2;

    const points = analytics.days.map((day, index) => {
      const x = padX + (usableWidth * index) / 6;
      const y = padY + (1 - day.amount / maxValue) * usableHeight;
      return { x, y };
    });

    const linePath = buildSmoothPath(points);
    const first = points[0] || { x: padX, y: height - padY };
    const last = points[points.length - 1] || first;
    const areaPath = `${linePath} L ${last.x} ${height - padY} L ${first.x} ${height - padY} Z`;

    return {
      width,
      height,
      points,
      linePath,
      areaPath
    };
  }, [analytics.days, chartWidth]);

  const earningsStatsSeries = useMemo(() => {
    const accepted = (Array.isArray(myApplications) ? myApplications : []).filter(
      (item) => String(item?.status || '').toUpperCase() === 'ACCEPTED'
    );

    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (earnPeriod === 'DAY') {
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const points = Array.from({ length: daysInMonth }, (_, idx) => ({
        label: String(idx + 1),
        value: 0,
        showLabel: idx === 0 || (idx + 1) % 5 === 0 || idx === daysInMonth - 1
      }));

      accepted.forEach((item) => {
        const at = new Date(item?.updatedAt || item?.createdAt);
        if (Number.isNaN(at.getTime())) return;
        if (at.getFullYear() !== year || at.getMonth() !== month) return;
        const budget = Number(item?.job?.budget || 0);
        if (!Number.isFinite(budget) || budget <= 0) return;
        points[at.getDate() - 1].value += budget;
      });

      return points;
    }

    if (earnPeriod === 'YEAR') {
      const currentYear = now.getFullYear();
      const years = Array.from({ length: 6 }, (_, idx) => currentYear - 5 + idx);
      const yearMap = Object.fromEntries(years.map((year, idx) => [year, idx]));
      const points = years.map((year) => ({ label: String(year), value: 0, showLabel: true }));

      accepted.forEach((item) => {
        const at = new Date(item?.updatedAt || item?.createdAt);
        if (Number.isNaN(at.getTime())) return;
        const idx = yearMap[at.getFullYear()];
        if (idx === undefined) return;
        const budget = Number(item?.job?.budget || 0);
        if (!Number.isFinite(budget) || budget <= 0) return;
        points[idx].value += budget;
      });

      return points;
    }

    const currentYear = now.getFullYear();
    const points = monthNames.map((label) => ({ label, value: 0, showLabel: true }));
    accepted.forEach((item) => {
      const at = new Date(item?.updatedAt || item?.createdAt);
      if (Number.isNaN(at.getTime()) || at.getFullYear() !== currentYear) return;
      const budget = Number(item?.job?.budget || 0);
      if (!Number.isFinite(budget) || budget <= 0) return;
      points[at.getMonth()].value += budget;
    });
    return points;
  }, [earnPeriod, myApplications]);

  const earningsTotalForPeriod = useMemo(
    () => earningsStatsSeries.reduce((sum, item) => sum + (Number(item.value) || 0), 0),
    [earningsStatsSeries]
  );

  const earningsGraph = useMemo(() => {
    const width = Math.max(statsChartWidth, 260);
    const height = 180;
    const padLeft = 28;
    const padRight = 10;
    const padTop = 10;
    const padBottom = 28;
    const usableWidth = width - padLeft - padRight;
    const usableHeight = height - padTop - padBottom;
    const maxValueRaw = Math.max(...earningsStatsSeries.map((item) => Number(item.value) || 0), 1);
    const maxValue = Math.ceil(maxValueRaw / 1000) * 1000 || 1000;

    const points = earningsStatsSeries.map((item, idx) => {
      const x = padLeft + (usableWidth * idx) / Math.max(earningsStatsSeries.length - 1, 1);
      const y = padTop + (1 - (Number(item.value) || 0) / maxValue) * usableHeight;
      return { x, y };
    });

    const path = buildMonotonePath(points);
    const first = points[0] || { x: padLeft, y: height - padBottom };
    const last = points[points.length - 1] || first;
    const areaPath = `${path} L ${last.x} ${height - padBottom} L ${first.x} ${height - padBottom} Z`;
    const yTicks = Array.from({ length: 5 }, (_, idx) => {
      const ratio = idx / 4;
      const value = Math.round(maxValue * (1 - ratio));
      const y = padTop + ratio * usableHeight;
      return { y, value };
    });

    return { width, height, padBottom, points, path, areaPath, yTicks };
  }, [earningsStatsSeries, statsChartWidth]);

  const profitGradient = useMemo(() => {
    const base = normalizeHex(colors?.primary);
    if (!base) return ['#0F766E', '#14B8A6'];
    return [shiftHexColor(base, 18) || base, shiftHexColor(base, -8) || base];
  }, [colors?.primary]);
  const statsLineColor = useMemo(() => shiftHexColor(colors?.primary || '#0F766E', 10) || '#0F766E', [colors?.primary]);
  const themedBarColor = useMemo(() => normalizeHex(colors?.primary) || '#197D74', [colors?.primary]);

  const ringBell = () => {
    bellAnim.stopAnimation();
    bellAnim.setValue(0);
    setIsBellActive(true);

    Animated.sequence([
      Animated.timing(bellAnim, { toValue: 1, duration: 80, useNativeDriver: WEB_SAFE_NATIVE_DRIVER }),
      Animated.timing(bellAnim, { toValue: -1, duration: 80, useNativeDriver: WEB_SAFE_NATIVE_DRIVER }),
      Animated.timing(bellAnim, { toValue: 0.6, duration: 70, useNativeDriver: WEB_SAFE_NATIVE_DRIVER }),
      Animated.timing(bellAnim, { toValue: -0.6, duration: 70, useNativeDriver: WEB_SAFE_NATIVE_DRIVER }),
      Animated.timing(bellAnim, { toValue: 0, duration: 90, useNativeDriver: WEB_SAFE_NATIVE_DRIVER })
    ]).start(() => setIsBellActive(false));
  };

  useEffect(() => {
    if (!notificationPingKey) return;
    ringBell();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationPingKey]);

  const isUserDashboard = String(userRole || '').toUpperCase() === 'USER';
  const isAdminDashboard = String(userRole || '').toUpperCase() === 'ADMIN';
  const adminRangeDays = adminRange === '7D' ? 7 : adminRange === '30D' ? 30 : 365;

  useEffect(() => {
    if (!isAdminDashboard) return;
    adminFadeAnim.setValue(0);
    Animated.timing(adminFadeAnim, {
      toValue: 1,
      duration: 340,
      useNativeDriver: WEB_SAFE_NATIVE_DRIVER
    }).start();
  }, [adminFadeAnim, adminPage, adminRange, isAdminDashboard]);

  const adminDateWindow = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = startOfDay(end);
    start.setDate(start.getDate() - (adminRangeDays - 1));
    return { start, end };
  }, [adminRangeDays]);

  const adminJobMetrics = useMemo(() => {
    const jobs = Array.isArray(adminJobs) ? adminJobs : [];
    const filtered = jobs.filter((job) => {
      const date = new Date(job?.createdAt || job?.updatedAt);
      if (Number.isNaN(date.getTime())) return false;
      return date >= adminDateWindow.start && date <= adminDateWindow.end;
    });

    const allCounts = { OPEN: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0 };
    const rangeCounts = { OPEN: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0 };
    jobs.forEach((job) => {
      const status = String(job?.status || '').toUpperCase();
      if (status in allCounts) allCounts[status] += 1;
    });
    filtered.forEach((job) => {
      const status = String(job?.status || '').toUpperCase();
      if (status in rangeCounts) rangeCounts[status] += 1;
    });

    const monthPoints = [];
    const monthMap = {};
    const baseMonth = new Date();
    baseMonth.setDate(1);
    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date(baseMonth.getFullYear(), baseMonth.getMonth() - index, 1);
      const key = getMonthKey(date);
      monthMap[key] = monthPoints.length;
      monthPoints.push({
        key,
        label: getShortMonthLabel(date),
        total: 0,
        completed: 0
      });
    }
    jobs.forEach((job) => {
      const key = getMonthKey(job?.createdAt);
      const idx = monthMap[key];
      if (idx === undefined) return;
      monthPoints[idx].total += 1;
      if (String(job?.status || '').toUpperCase() === 'COMPLETED') {
        monthPoints[idx].completed += 1;
      }
    });

    return {
      totalJobs: jobs.length,
      pendingJobs: allCounts.OPEN + allCounts.IN_PROGRESS,
      completedJobs: allCounts.COMPLETED,
      cancelledJobs: allCounts.CANCELLED,
      allCounts,
      rangeCounts,
      filteredCount: filtered.length,
      monthPoints
    };
  }, [adminDateWindow.end, adminDateWindow.start, adminJobs]);

  const adminEarningMetrics = useMemo(() => {
    const jobs = Array.isArray(adminJobs) ? adminJobs : [];
    const today = new Date();
    const completedJobs = jobs.filter((job) => String(job?.status || '').toUpperCase() === 'COMPLETED');
    const activeJobs = jobs.filter((job) => ['OPEN', 'IN_PROGRESS'].includes(String(job?.status || '').toUpperCase()));
    const totalEarning = completedJobs.reduce((sum, job) => sum + getJobBudgetTotal(job), 0);
    const todayEarning = completedJobs.reduce((sum, job) => {
      const date = new Date(job?.updatedAt || job?.createdAt);
      if (Number.isNaN(date.getTime()) || !isSameDay(date, today)) return sum;
      return sum + getJobBudgetTotal(job);
    }, 0);
    const projectedEarning = activeJobs.reduce((sum, job) => sum + getJobBudgetTotal(job), 0);
    const rangeEarning = completedJobs.reduce((sum, job) => {
      const date = new Date(job?.updatedAt || job?.createdAt);
      if (Number.isNaN(date.getTime())) return sum;
      if (date < adminDateWindow.start || date > adminDateWindow.end) return sum;
      return sum + getJobBudgetTotal(job);
    }, 0);
    const avgPerCompleted = completedJobs.length ? totalEarning / completedJobs.length : 0;

    const daySeries = [];
    const dayMap = {};
    const dayCount = adminRange === '7D' ? 7 : adminRange === '30D' ? 10 : 12;
    if (adminRange === '12M') {
      const cursor = new Date();
      cursor.setDate(1);
      for (let index = dayCount - 1; index >= 0; index -= 1) {
        const date = new Date(cursor.getFullYear(), cursor.getMonth() - index, 1);
        const key = getMonthKey(date);
        dayMap[key] = daySeries.length;
        daySeries.push({ key, label: getShortMonthLabel(date), value: 0 });
      }
      completedJobs.forEach((job) => {
        const key = getMonthKey(job?.updatedAt || job?.createdAt);
        const idx = dayMap[key];
        if (idx === undefined) return;
        daySeries[idx].value += getJobBudgetTotal(job);
      });
    } else {
      const bucketSize = adminRange === '30D' ? 3 : 1;
      for (let index = dayCount - 1; index >= 0; index -= 1) {
        const date = startOfDay(new Date());
        date.setDate(date.getDate() - index * bucketSize);
        const end = new Date(date);
        end.setDate(end.getDate() + bucketSize - 1);
        end.setHours(23, 59, 59, 999);
        const key = `${getDateKey(date)}_${getDateKey(end)}`;
        dayMap[key] = daySeries.length;
        daySeries.push({
          key,
          start: date,
          end,
          label: bucketSize === 1 ? date.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 1) : `${date.getDate()}`
            + `-${end.getDate()}`,
          value: 0
        });
      }
      completedJobs.forEach((job) => {
        const date = new Date(job?.updatedAt || job?.createdAt);
        if (Number.isNaN(date.getTime())) return;
        daySeries.forEach((bucket) => {
          if (date >= bucket.start && date <= bucket.end) {
            bucket.value += getJobBudgetTotal(job);
          }
        });
      });
    }

    return {
      totalEarning,
      todayEarning,
      projectedEarning,
      rangeEarning,
      avgPerCompleted,
      completedCount: completedJobs.length,
      series: daySeries
    };
  }, [adminDateWindow.end, adminDateWindow.start, adminJobs, adminRange]);

  const adminUserMetrics = useMemo(() => {
    const users = Array.isArray(adminUsers) ? adminUsers : [];
    const filtered = users.filter((member) => {
      const date = new Date(member?.createdAt);
      if (Number.isNaN(date.getTime())) return false;
      return date >= adminDateWindow.start && date <= adminDateWindow.end;
    });
    const today = new Date();
    const activeUsers = users.filter((member) => String(member?.status || '').toUpperCase() === 'ACTIVE').length;
    const deletedUsers = users.filter((member) => String(member?.status || '').toUpperCase() === 'DELETED').length;
    const adminCount = users.filter((member) => String(member?.role || '').toUpperCase() === 'ADMIN').length;
    const posters = users.filter((member) => String(member?.userMode || '').toUpperCase() === 'JOB_POSTER').length;
    const pickers = users.filter((member) => String(member?.userMode || '').toUpperCase() === 'JOB_PICKER').length;
    const todayJoined = users.filter((member) => {
      const date = new Date(member?.createdAt);
      return !Number.isNaN(date.getTime()) && isSameDay(date, today);
    }).length;

    const monthPoints = [];
    const monthMap = {};
    const anchor = new Date();
    anchor.setDate(1);
    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date(anchor.getFullYear(), anchor.getMonth() - index, 1);
      const key = getMonthKey(date);
      monthMap[key] = monthPoints.length;
      monthPoints.push({ key, label: getShortMonthLabel(date), value: 0 });
    }
    users.forEach((member) => {
      const key = getMonthKey(member?.createdAt);
      const idx = monthMap[key];
      if (idx === undefined) return;
      monthPoints[idx].value += 1;
    });

    const activeRate = users.length ? Math.round((activeUsers / users.length) * 100) : 0;

    return {
      totalUsers: users.length,
      activeUsers,
      deletedUsers,
      adminCount,
      posters,
      pickers,
      todayJoined,
      filteredCount: filtered.length,
      activeRate,
      monthPoints
    };
  }, [adminDateWindow.end, adminDateWindow.start, adminUsers]);

  const animateBars = (animatedList, count) => {
    animatedList.forEach((animatedValue, index) => {
      animatedValue.stopAnimation();
      animatedValue.setValue(0);
      if (index >= count) return;
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 640,
        delay: index * 58,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false
      }).start();
    });
  };

  useEffect(() => {
    if (!isAdminDashboard) return;
    adminEarningsChartAnim.setValue(0);
    Animated.timing(adminEarningsChartAnim, {
      toValue: 1,
      duration: 580,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [adminEarningMetrics.series, adminEarningsChartAnim, adminRange, isAdminDashboard]);

  useEffect(() => {
    if (!isAdminDashboard) return;
    animateBars(adminJobsBarAnims, adminJobMetrics.monthPoints.length);
  }, [adminJobMetrics.monthPoints, adminJobsBarAnims, adminRange, isAdminDashboard]);

  useEffect(() => {
    if (!isAdminDashboard) return;
    animateBars(adminUsersBarAnims, adminUserMetrics.monthPoints.length);
  }, [adminRange, adminUserMetrics.monthPoints, adminUsersBarAnims, isAdminDashboard]);

  const adminEarningMax = useMemo(
    () => Math.max(...adminEarningMetrics.series.map((item) => Number(item.value) || 0), 1),
    [adminEarningMetrics.series]
  );
  const adminEarningsChartMax = useMemo(() => {
    const rounded = Math.ceil(adminEarningMax / 1000) * 1000;
    return Math.max(rounded, 1000);
  }, [adminEarningMax]);
  const adminEarningsPeakIndex = useMemo(() => {
    let maxValue = -1;
    let maxIndex = 0;
    adminEarningMetrics.series.forEach((item, index) => {
      const value = Number(item?.value || 0);
      if (value > maxValue) {
        maxValue = value;
        maxIndex = index;
      }
    });
    return maxIndex;
  }, [adminEarningMetrics.series]);
  const adminJobsMax = useMemo(
    () => Math.max(...adminJobMetrics.monthPoints.map((item) => Number(item.total) || 0), 1),
    [adminJobMetrics.monthPoints]
  );
  const adminUsersMax = useMemo(
    () => Math.max(...adminUserMetrics.monthPoints.map((item) => Number(item.value) || 0), 1),
    [adminUserMetrics.monthPoints]
  );

  const activeDay = analytics.days[selectedIndex] || analytics.days[0];
  const nowLabel = useMemo(
    () =>
      new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }),
    []
  );

  const formatThousandsLabel = (value) => `${(Math.max(Number(value) || 0, 0) / 1000).toFixed(1)}k`;

  const renderAdminEarningsGraph = (keyPrefix) => {
    const width = Math.max(adminEarningsChartWidth, 300);
    const height = 220;
    const padLeft = 8;
    const padRight = 40;
    const padTop = 16;
    const padBottom = 36;
    const graphW = width - padLeft - padRight;
    const graphH = height - padTop - padBottom;
    const series = adminEarningMetrics.series || [];
    const maxDiv = Math.max(adminEarningsChartMax, 1);
    const points = series.map((item, idx) => {
      const x = padLeft + (graphW * idx) / Math.max(series.length - 1, 1);
      const y = padTop + (1 - (Number(item?.value || 0) / maxDiv)) * graphH;
      return { x, y, value: Number(item?.value || 0), label: item?.label, key: item?.key };
    });
    const linePath = buildMonotonePath(points);
    const first = points[0] || { x: padLeft, y: height - padBottom };
    const last = points[points.length - 1] || first;
    const areaPath = `${linePath} L ${last.x} ${height - padBottom} L ${first.x} ${height - padBottom} Z`;

    return (
      <View style={styles.adminThemeGraphMain} onLayout={(event) => setAdminEarningsChartWidth(event.nativeEvent.layout.width)}>
        <Animated.View
          style={[
            styles.adminThemeGraphCanvasWrap,
            {
              opacity: adminEarningsChartAnim,
              transform: [
                {
                  translateY: adminEarningsChartAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0]
                  })
                }
              ]
            }
          ]}
        >
          <Svg width={width} height={height} style={styles.adminThemeGraphSvg}>
            <Defs>
              <SvgLinearGradient id={`${keyPrefix}-earn-area`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={themedBarColor} stopOpacity="0.28" />
                <Stop offset="100%" stopColor={themedBarColor} stopOpacity="0.02" />
              </SvgLinearGradient>
              <SvgLinearGradient id={`${keyPrefix}-earn-line`} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor={shiftHexColor(themedBarColor, 8) || themedBarColor} stopOpacity="0.9" />
                <Stop offset="100%" stopColor={shiftHexColor(themedBarColor, -6) || themedBarColor} stopOpacity="1" />
              </SvgLinearGradient>
            </Defs>

            {[0, 1, 2].map((idx) => {
              const y = padTop + (graphH * idx) / 2;
              return (
                <Path
                  key={`${keyPrefix}-grid-${idx}`}
                  d={`M ${padLeft} ${y} L ${width - padRight} ${y}`}
                  stroke="#D6DCE5"
                  strokeWidth={1}
                  strokeDasharray="4,6"
                />
              );
            })}

            <Path d={areaPath} fill={`url(#${keyPrefix}-earn-area)`} />
            <Path d={linePath} stroke={`url(#${keyPrefix}-earn-line)`} strokeWidth={3} fill="none" />
            {points.map((point, idx) => {
              const isPeak = idx === adminEarningsPeakIndex && point.value > 0;
              return (
                <Circle
                  key={`${keyPrefix}-dot-${point.key}`}
                  cx={point.x}
                  cy={point.y}
                  r={isPeak ? 5.6 : 4}
                  fill={isPeak ? themedBarColor : '#FFFFFF'}
                  stroke={themedBarColor}
                  strokeWidth={2}
                />
              );
            })}
          </Svg>

          <View style={styles.adminThemeGraphYAxisWrap}>
            {[3, 2, 1].map((level) => (
              <Text key={`${keyPrefix}-scale-${level}`} style={styles.adminThemeGraphScaleText}>
                {formatThousandsLabel((adminEarningsChartMax * level) / 3)}
              </Text>
            ))}
          </View>

          <View style={styles.adminThemeGraphXRow}>
            {series.map((item) => (
              <Text key={`${keyPrefix}-x-${item.key}`} style={styles.adminThemeGraphBarLabel}>
                {item.label}
              </Text>
            ))}
          </View>
        </Animated.View>
      </View>
    );
  };

  const closePeriodDropdown = () => {
    setShowPeriodDropdown(false);
  };

  const togglePeriodDropdown = () => {
    if (showPeriodDropdown) {
      closePeriodDropdown();
      return;
    }

    if (typeof periodTriggerRef.current?.measureInWindow === 'function') {
      periodTriggerRef.current.measureInWindow((x, y, width, height) => {
        setPeriodDropdownAnchor({ x, y, width, height });
        setShowPeriodDropdown(true);
      });
      return;
    }

    setPeriodDropdownAnchor(null);
    setShowPeriodDropdown(true);
  };

  const periodDropdownPosition = periodDropdownAnchor
    ? {
        top: periodDropdownAnchor.y + periodDropdownAnchor.height + 6,
        left: Math.max(12, periodDropdownAnchor.x + periodDropdownAnchor.width - 104)
      }
    : {
        top: 96,
        right: 12
      };

  return (
    <>
      <ScrollView
        style={styles.dashboardHeaderOnlyWrap}
        contentContainerStyle={styles.dashboardHeaderOnlyContent}
        stickyHeaderIndices={[0]}
      >
        <View style={styles.dashboardHeaderShell}>
          <View style={styles.dashboardTopHeader}>
            <View style={styles.dashboardTopLeft}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.dashboardProfileImage} />
              ) : (
                <View style={styles.dashboardProfileFallback}>
                  <Text style={styles.dashboardProfileFallbackText}>{fallbackLetter}</Text>
                </View>
              )}

              <View style={styles.dashboardTopMeta}>
                <Text style={styles.dashboardWelcomeText}>Welcome back</Text>
                <Text style={styles.dashboardNameText} numberOfLines={1}>
                  {displayName}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => {
                ringBell();
                onOpenNotifications?.();
              }}
              style={styles.dashboardNotificationBtn}
            >
              <Animated.View style={{ transform: [{ rotate: bellRotate }] }}>
                <Ionicons
                  name={isBellActive ? 'notifications' : 'notifications-outline'}
                  size={19}
                  color={colors.textMain}
                />
              </Animated.View>
              {unreadNotificationCount > 0 ? (
                <View style={styles.dashboardNotificationDot}>
                  <Text style={styles.dashboardNotificationDotText}>
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        </View>

      {isUserDashboard ? (
        <>
          <Animated.View
            style={{
              opacity: profitAnim,
              transform: [
                {
                  translateY: profitAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0]
                  })
                }
              ]
            }}
          >
            <LinearGradient
              colors={profitGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.dashboardUserProfitCard}
            >
              <View style={styles.dashboardUserProfitGlowA} />
              <View style={styles.dashboardUserProfitGlowB} />
              <Text style={styles.dashboardUserProfitCardLabel}>Profit amount</Text>
              <Text style={styles.dashboardUserProfitCardAmount}>{formatCurrency(analytics.totalEarned)}</Text>
              <View style={styles.dashboardUserProfitCardTrendRow}>
                <Text style={styles.dashboardUserProfitCardTrendBadge}>{`${analytics.trendPercent >= 0 ? '+' : ''}${analytics.trendPercent}%`}</Text>
                <Text style={styles.dashboardUserProfitCardTrendText}>From the previous week</Text>
              </View>

              <View
                style={styles.dashboardUserProfitChartWrap}
                onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}
              >
                <Svg width={chart.width} height={chart.height}>
                  <Defs>
                    <SvgLinearGradient id="profitAreaFade" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.28" />
                      <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.02" />
                    </SvgLinearGradient>
                  </Defs>

                  <Path d={chart.areaPath} fill="url(#profitAreaFade)" />
                  <Path d={chart.linePath} stroke="#FFFFFF" strokeWidth={2.2} fill="none" />

                  {chart.points.map((point, idx) => (
                    <Circle
                      key={`point-${analytics.days[idx].key}`}
                      cx={point.x}
                      cy={point.y}
                      r={idx === selectedIndex ? 4.6 : 2.8}
                      fill="#FFFFFF"
                      opacity={idx === selectedIndex ? 1 : 0.85}
                    />
                  ))}
                </Svg>

                {chart.points.map((point, idx) => (
                  <Pressable
                    key={`tap-${analytics.days[idx].key}`}
                    style={[
                      styles.dashboardUserProfitPointTap,
                      {
                        left: point.x - 16,
                        top: point.y - 16
                      }
                    ]}
                    onPress={() => setSelectedIndex(idx)}
                  />
                ))}
              </View>

              <View style={styles.dashboardUserProfitTooltip}>
                <Text style={styles.dashboardUserProfitTooltipDate}>{`${activeDay?.shortLabel || 'Mon'} • ${activeDay?.fullDate || ''}`}</Text>
                <Text style={styles.dashboardUserProfitTooltipAmount}>{formatCurrency(activeDay?.amount || 0)}</Text>
              </View>
            </LinearGradient>
          </Animated.View>

          <View style={styles.dashboardSalesCard}>
            <View style={styles.dashboardSalesHeaderRow}>
              <View>
                <Text style={styles.dashboardSalesTitle}>Sales Statistics</Text>
                <Text style={styles.dashboardSalesTotal}>Total Earned: {formatCurrency(earningsTotalForPeriod)}</Text>
              </View>
              <View ref={periodTriggerRef} collapsable={false} style={styles.dashboardSalesPeriodWrap}>
                <Pressable
                  style={styles.dashboardSalesDropdownTrigger}
                  onPress={togglePeriodDropdown}
                >
                  <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
                  <Text style={styles.dashboardSalesDropdownTriggerText}>{getPeriodLabel(earnPeriod)}</Text>
                  <Ionicons
                    name={showPeriodDropdown ? 'chevron-up' : 'chevron-down'}
                    size={13}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>
            </View>

            <View style={styles.dashboardSalesGraphWrap} onLayout={(event) => setStatsChartWidth(event.nativeEvent.layout.width)}>
              <Svg width={earningsGraph.width} height={earningsGraph.height}>
                {earningsGraph.yTicks.map((tick, idx) => (
                  <Path
                    key={`y-${idx}`}
                    d={`M 28 ${tick.y} L ${earningsGraph.width - 10} ${tick.y}`}
                    stroke={hexToRgba(colors?.textSecondary, 0.24)}
                    strokeDasharray="4,6"
                    strokeWidth={1}
                  />
                ))}

                <Defs>
                  <SvgLinearGradient id={salesGradientId} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={statsLineColor} stopOpacity={0.24} />
                    <Stop offset="100%" stopColor={statsLineColor} stopOpacity={0.02} />
                  </SvgLinearGradient>
                </Defs>

                <Path d={earningsGraph.areaPath} fill={`url(#${salesGradientId})`} />
                <Path d={earningsGraph.path} stroke={statsLineColor} strokeWidth={2.6} fill="none" />
              </Svg>

              <View style={styles.dashboardSalesYAxisWrap}>
                {earningsGraph.yTicks.map((tick, idx) => (
                  <Text key={`yt-${idx}`} style={styles.dashboardSalesAxisText}>
                    {compactAmount(tick.value)}
                  </Text>
                ))}
              </View>

              <View style={styles.dashboardSalesXAxisWrap}>
                {earningsStatsSeries.map((item, idx) => (
                  <Text key={`x-${item.label}-${idx}`} style={styles.dashboardSalesAxisText}>
                    {item.showLabel ? item.label : ''}
                  </Text>
                ))}
              </View>
            </View>
          </View>

          <Animated.View
            style={[
              styles.dashboardTypeFilterRow,
              {
                opacity: filterAnim,
                transform: [
                  {
                    translateY: filterAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 0]
                    })
                  }
                ]
              }
            ]}
          >
            {[
              { key: 'ALL', label: 'All', icon: 'apps-outline' },
              { key: 'ONE_TIME', label: 'One Time', icon: 'flash-outline' },
              { key: 'PART_TIME', label: 'Part Time', icon: 'timer-outline' },
              { key: 'FULL_TIME', label: 'Full Time', icon: 'briefcase-outline' }
            ].map((item) => (
              <Pressable
                key={item.key}
                style={[styles.dashboardTypeFilterChip, selectedJobType === item.key && styles.dashboardTypeFilterChipActive]}
                onPress={() => setSelectedJobType(item.key)}
              >
                <Ionicons
                  name={item.icon}
                  size={13}
                  color={selectedJobType === item.key ? colors.primary : colors.textSecondary}
                  style={styles.dashboardTypeFilterChipIcon}
                />
                <Text
                  style={[
                    styles.dashboardTypeFilterChipText,
                    selectedJobType === item.key && styles.dashboardTypeFilterChipTextActive
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </Animated.View>

          <View style={styles.dashboardStatusMiniGrid}>
            {[
              {
                label: 'Completed Jobs',
                value: statusCards.COMPLETED,
                icon: 'checkmark-done-outline',
                iconColor: '#0284C7',
                tone: ['#F0F9FF', '#E0F2FE']
              },
              {
                label: 'In Progress',
                value: statusCards.IN_PROGRESS,
                icon: 'time-outline',
                iconColor: '#0F766E',
                tone: ['#ECFEFF', '#CCFBF1']
              },
              {
                label: 'Cancelled Jobs',
                value: statusCards.CANCELLED,
                icon: 'close-outline',
                iconColor: '#DC2626',
                tone: ['#FEF2F2', '#FEE2E2']
              },
              {
                label: 'Open Jobs',
                value: statusCards.OPEN,
                icon: 'briefcase-outline',
                iconColor: '#CA8A04',
                tone: ['#FFFBEB', '#FEF3C7']
              }
            ].map((card, idx) => (
              <Animated.View
                key={card.label}
                style={[
                  styles.dashboardStatusMiniCardWrap,
                  {
                    opacity: statAnims[idx],
                    transform: [
                      {
                        translateY: statAnims[idx].interpolate({
                          inputRange: [0, 1],
                          outputRange: [18, 0]
                        })
                      },
                      {
                        scale: statAnims[idx].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.96, 1]
                        })
                      }
                    ]
                  }
                ]}
              >
                <LinearGradient colors={card.tone} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dashboardStatusMiniCard}>
                  <View style={styles.dashboardStatusMiniHead}>
                    <View style={styles.dashboardStatusMiniIcon}>
                      <Ionicons name={card.icon} size={13} color={card.iconColor} />
                    </View>
                    <Text style={styles.dashboardStatusMiniLabel}>{card.label}</Text>
                  </View>
                  <Text style={styles.dashboardStatusMiniValue}>{card.value}</Text>
                  <Text style={styles.dashboardStatusMiniMeta}>Update: {nowLabel}</Text>
                </LinearGradient>
              </Animated.View>
            ))}
          </View>
        </>
      ) : isAdminDashboard ? (
        <Animated.View
          style={[
            styles.adminOverviewWrap,
            {
              opacity: adminFadeAnim,
              transform: [
                {
                  translateY: adminFadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0]
                  })
                }
              ]
            }
          ]}
        >
          <View style={styles.adminOverviewFilterRow}>
            {ADMIN_RANGE_OPTIONS.map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.adminOverviewFilterChip,
                  adminRange === option && styles.adminOverviewFilterChipActive
                ]}
                onPress={() => setAdminRange(option)}
              >
                <Text
                  style={[
                    styles.adminOverviewFilterChipText,
                    adminRange === option && styles.adminOverviewFilterChipTextActive
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>

          {adminPage === 'overview' ? (
            <>
              <LinearGradient
                colors={['#0F766E', '#0EA5A4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.adminOverviewHero}
              >
                <Text style={styles.adminOverviewHeroLabel}>Admin Analytics</Text>
                <Text style={styles.adminOverviewHeroTitle}>Platform Overview</Text>
                <Text style={styles.adminOverviewHeroSub}>
                  {`${adminRange} window • ${adminJobMetrics.filteredCount} jobs • ${adminUserMetrics.filteredCount} users`}
                </Text>
              </LinearGradient>

              <View style={styles.adminOverviewSectionCard}>
                <View style={styles.adminOverviewSectionHead}>
                  <Text style={styles.adminOverviewSectionTitle}>Jobs</Text>
                  <Pressable style={styles.adminOverviewViewBtn} onPress={() => setAdminPage('jobs')}>
                    <Text style={styles.adminOverviewViewBtnText}>View All</Text>
                  </Pressable>
                </View>
                <View style={styles.adminOverviewKpiRow}>
                  <View style={styles.adminOverviewKpiPill}>
                    <Text style={styles.adminOverviewKpiLabel}>Total</Text>
                    <Text style={styles.adminOverviewKpiValue}>{adminJobMetrics.totalJobs}</Text>
                  </View>
                  <View style={styles.adminOverviewKpiPill}>
                    <Text style={styles.adminOverviewKpiLabel}>Pending</Text>
                    <Text style={styles.adminOverviewKpiValue}>{adminJobMetrics.pendingJobs}</Text>
                  </View>
                  <View style={styles.adminOverviewKpiPill}>
                    <Text style={styles.adminOverviewKpiLabel}>Completed</Text>
                    <Text style={styles.adminOverviewKpiValue}>{adminJobMetrics.completedJobs}</Text>
                  </View>
                </View>
                <View style={styles.adminOverviewStatusList}>
                  {[
                    { key: 'OPEN', label: 'Open', color: '#0369A1' },
                    { key: 'IN_PROGRESS', label: 'In Progress', color: '#0F766E' },
                    { key: 'COMPLETED', label: 'Completed', color: '#166534' },
                    { key: 'CANCELLED', label: 'Cancelled', color: '#B91C1C' }
                  ].map((item) => {
                    const value = adminJobMetrics.allCounts[item.key] || 0;
                    const ratio = adminJobMetrics.totalJobs ? Math.max(value / adminJobMetrics.totalJobs, 0.04) : 0.04;
                    return (
                      <View key={item.key} style={styles.adminOverviewStatusRow}>
                        <Text style={styles.adminOverviewStatusLabel}>{item.label}</Text>
                        <Text style={styles.adminOverviewStatusValue}>{value}</Text>
                        <View style={styles.adminOverviewStatusTrack}>
                          <View style={[styles.adminOverviewStatusFill, { width: `${ratio * 100}%`, backgroundColor: item.color }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

              <View style={styles.adminOverviewSectionCard}>
                <View style={styles.adminOverviewSectionHead}>
                  <Text style={styles.adminOverviewSectionTitle}>Earnings</Text>
                  <Pressable style={styles.adminOverviewViewBtn} onPress={() => setAdminPage('earnings')}>
                    <Text style={styles.adminOverviewViewBtnText}>View All</Text>
                  </Pressable>
                </View>
                <View style={styles.adminOverviewKpiRow}>
                  <View style={styles.adminOverviewKpiPill}>
                    <Text style={styles.adminOverviewKpiLabel}>Total</Text>
                    <Text style={styles.adminOverviewKpiValue}>{formatCurrency(adminEarningMetrics.totalEarning)}</Text>
                  </View>
                  <View style={styles.adminOverviewKpiPill}>
                    <Text style={styles.adminOverviewKpiLabel}>Today</Text>
                    <Text style={styles.adminOverviewKpiValue}>{formatCurrency(adminEarningMetrics.todayEarning)}</Text>
                  </View>
                  <View style={styles.adminOverviewKpiPill}>
                    <Text style={styles.adminOverviewKpiLabel}>Projected</Text>
                    <Text style={styles.adminOverviewKpiValue}>{formatCurrency(adminEarningMetrics.projectedEarning)}</Text>
                  </View>
                </View>
                <View style={styles.adminOverviewBarRow}>
                  {renderAdminEarningsGraph('overview')}
                </View>
              </View>

              <View style={styles.adminOverviewSectionCard}>
                <View style={styles.adminOverviewSectionHead}>
                  <Text style={styles.adminOverviewSectionTitle}>Users</Text>
                  <Pressable style={styles.adminOverviewViewBtn} onPress={() => setAdminPage('users')}>
                    <Text style={styles.adminOverviewViewBtnText}>View All</Text>
                  </Pressable>
                </View>
                <View style={styles.adminOverviewKpiRow}>
                  <View style={styles.adminOverviewKpiPill}>
                    <Text style={styles.adminOverviewKpiLabel}>Total</Text>
                    <Text style={styles.adminOverviewKpiValue}>{adminUserMetrics.totalUsers}</Text>
                  </View>
                  <View style={styles.adminOverviewKpiPill}>
                    <Text style={styles.adminOverviewKpiLabel}>Active</Text>
                    <Text style={styles.adminOverviewKpiValue}>{adminUserMetrics.activeUsers}</Text>
                  </View>
                  <View style={styles.adminOverviewKpiPill}>
                    <Text style={styles.adminOverviewKpiLabel}>Others</Text>
                    <Text style={styles.adminOverviewKpiValue}>{adminUserMetrics.deletedUsers + adminUserMetrics.adminCount}</Text>
                  </View>
                </View>
                <View style={styles.adminOverviewDualBar}>
                  <View style={styles.adminOverviewDualTrack}>
                    <View
                      style={[
                        styles.adminOverviewDualFill,
                        { width: `${adminUserMetrics.activeRate}%`, backgroundColor: '#0F766E' }
                      ]}
                    />
                  </View>
                  <Text style={styles.adminOverviewDualLabel}>{`Active rate ${adminUserMetrics.activeRate}%`}</Text>
                </View>
              </View>
            </>
          ) : null}

          {adminPage !== 'overview' ? (
            <View style={styles.adminDetailsCard}>
              <View style={styles.adminDetailsHead}>
                <Pressable style={styles.adminDetailsBackBtn} onPress={() => setAdminPage('overview')}>
                  <Ionicons name="chevron-back" size={16} color={colors.primary} />
                  <Text style={styles.adminDetailsBackText}>Back</Text>
                </Pressable>
                <Text style={styles.adminDetailsTitle}>
                  {adminPage === 'jobs' ? 'Jobs Analytics' : adminPage === 'earnings' ? 'Earnings Analytics' : 'Users Analytics'}
                </Text>
                <Pressable
                  style={styles.adminDetailsRefreshBtn}
                  onPress={() => {
                    if (adminPage === 'users') {
                      onRefreshAdminUsers?.();
                    } else {
                      onRefreshAdminJobs?.();
                    }
                  }}
                >
                  <Ionicons name="refresh-outline" size={14} color={colors.primary} />
                </Pressable>
              </View>

              {adminPage === 'jobs' ? (
                <>
                  <View style={styles.adminDetailsFilterRow}>
                    {['ALL', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((filter) => (
                      <Pressable
                        key={filter}
                        style={[
                          styles.adminDetailsFilterChip,
                          adminJobStatusFilter === filter && styles.adminDetailsFilterChipActive
                        ]}
                        onPress={() => setAdminJobStatusFilter(filter)}
                      >
                        <Text
                          style={[
                            styles.adminDetailsFilterChipText,
                            adminJobStatusFilter === filter && styles.adminDetailsFilterChipTextActive
                          ]}
                        >
                          {filter === 'IN_PROGRESS' ? 'IN PROGRESS' : filter}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.adminOverviewKpiRow}>
                    <View style={styles.adminOverviewKpiPill}>
                      <Text style={styles.adminOverviewKpiLabel}>Total Jobs</Text>
                      <Text style={styles.adminOverviewKpiValue}>{adminJobMetrics.totalJobs}</Text>
                    </View>
                    <View style={styles.adminOverviewKpiPill}>
                      <Text style={styles.adminOverviewKpiLabel}>Pending Jobs</Text>
                      <Text style={styles.adminOverviewKpiValue}>{adminJobMetrics.pendingJobs}</Text>
                    </View>
                    <View style={styles.adminOverviewKpiPill}>
                      <Text style={styles.adminOverviewKpiLabel}>Completed Jobs</Text>
                      <Text style={styles.adminOverviewKpiValue}>{adminJobMetrics.completedJobs}</Text>
                    </View>
                  </View>
                  <View style={styles.adminDetailsBarsWrap}>
                    {adminJobMetrics.monthPoints.map((item, idx) => {
                      const totalHeight = 16 + ((Number(item.total) || 0) / adminJobsMax) * 86;
                      const completedHeight = 10 + ((Number(item.completed) || 0) / adminJobsMax) * 76;
                      const totalAnimatedHeight = adminJobsBarAnims[idx].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, totalHeight]
                      });
                      const completedAnimatedHeight = adminJobsBarAnims[idx].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, completedHeight]
                      });
                      return (
                        <View key={item.key} style={styles.adminDetailsBarMonthCol}>
                          <View style={styles.adminDetailsBarMonthTrack}>
                            <Animated.View
                              style={[
                                styles.adminDetailsBarMonthFill,
                                styles.adminDetailsBarMonthFillTotal,
                                { height: totalAnimatedHeight }
                              ]}
                            />
                            <Animated.View
                              style={[
                                styles.adminDetailsBarMonthFill,
                                styles.adminDetailsBarMonthFillCompleted,
                                { height: completedAnimatedHeight }
                              ]}
                            />
                          </View>
                          <Text style={styles.adminDetailsAxisText}>{item.label}</Text>
                        </View>
                      );
                    })}
                  </View>
                  <View style={styles.adminOverviewStatusList}>
                    {[
                      { key: 'OPEN', label: 'Open', color: '#0369A1' },
                      { key: 'IN_PROGRESS', label: 'In Progress', color: '#0F766E' },
                      { key: 'COMPLETED', label: 'Completed', color: '#166534' },
                      { key: 'CANCELLED', label: 'Cancelled', color: '#B91C1C' }
                    ]
                      .filter((item) => adminJobStatusFilter === 'ALL' || adminJobStatusFilter === item.key)
                      .map((item) => {
                        const value = adminJobMetrics.allCounts[item.key] || 0;
                        const ratio = adminJobMetrics.totalJobs ? Math.max(value / adminJobMetrics.totalJobs, 0.04) : 0.04;
                        return (
                          <View key={item.key} style={styles.adminOverviewStatusRow}>
                            <Text style={styles.adminOverviewStatusLabel}>{item.label}</Text>
                            <Text style={styles.adminOverviewStatusValue}>{value}</Text>
                            <View style={styles.adminOverviewStatusTrack}>
                              <View style={[styles.adminOverviewStatusFill, { width: `${ratio * 100}%`, backgroundColor: item.color }]} />
                            </View>
                          </View>
                        );
                      })}
                  </View>
                </>
              ) : null}

              {adminPage === 'earnings' ? (
                <>
                  <View style={styles.adminDetailsFilterRow}>
                    {['ALL', 'COMPLETED', 'PROJECTED'].map((filter) => (
                      <Pressable
                        key={filter}
                        style={[
                          styles.adminDetailsFilterChip,
                          adminEarningFilter === filter && styles.adminDetailsFilterChipActive
                        ]}
                        onPress={() => setAdminEarningFilter(filter)}
                      >
                        <Text
                          style={[
                            styles.adminDetailsFilterChipText,
                            adminEarningFilter === filter && styles.adminDetailsFilterChipTextActive
                          ]}
                        >
                          {filter}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.adminOverviewKpiRow}>
                    {[
                      { label: 'Total', value: adminEarningMetrics.totalEarning, key: 'COMPLETED' },
                      { label: 'Today', value: adminEarningMetrics.todayEarning, key: 'COMPLETED' },
                      { label: 'Projected', value: adminEarningMetrics.projectedEarning, key: 'PROJECTED' }
                    ]
                      .filter((item) => adminEarningFilter === 'ALL' || adminEarningFilter === item.key)
                      .map((item) => (
                        <View key={item.label} style={styles.adminOverviewKpiPill}>
                          <Text style={styles.adminOverviewKpiLabel}>{item.label}</Text>
                          <Text style={styles.adminOverviewKpiValue}>{formatCurrency(item.value)}</Text>
                        </View>
                      ))}
                  </View>
                  <View style={styles.adminOverviewBarRow}>
                    {renderAdminEarningsGraph('details')}
                  </View>
                  <View style={styles.adminOverviewKpiRow}>
                    <View style={styles.adminOverviewKpiPill}>
                      <Text style={styles.adminOverviewKpiLabel}>In {adminRange}</Text>
                      <Text style={styles.adminOverviewKpiValue}>{formatCurrency(adminEarningMetrics.rangeEarning)}</Text>
                    </View>
                    <View style={styles.adminOverviewKpiPill}>
                      <Text style={styles.adminOverviewKpiLabel}>Avg / Completed</Text>
                      <Text style={styles.adminOverviewKpiValue}>{formatCurrency(adminEarningMetrics.avgPerCompleted)}</Text>
                    </View>
                    <View style={styles.adminOverviewKpiPill}>
                      <Text style={styles.adminOverviewKpiLabel}>Completed Jobs</Text>
                      <Text style={styles.adminOverviewKpiValue}>{adminEarningMetrics.completedCount}</Text>
                    </View>
                  </View>
                </>
              ) : null}

              {adminPage === 'users' ? (
                <>
                  <View style={styles.adminDetailsFilterRow}>
                    {['ALL', 'ACTIVE', 'DELETED', 'JOB_PICKER', 'JOB_POSTER'].map((filter) => (
                      <Pressable
                        key={filter}
                        style={[
                          styles.adminDetailsFilterChip,
                          adminUserFilter === filter && styles.adminDetailsFilterChipActive
                        ]}
                        onPress={() => setAdminUserFilter(filter)}
                      >
                        <Text
                          style={[
                            styles.adminDetailsFilterChipText,
                            adminUserFilter === filter && styles.adminDetailsFilterChipTextActive
                          ]}
                        >
                          {filter === 'JOB_PICKER' ? 'PICKER' : filter === 'JOB_POSTER' ? 'POSTER' : filter}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.adminOverviewKpiRow}>
                    {[
                      { label: 'Total Users', value: adminUserMetrics.totalUsers, key: 'ALL' },
                      { label: 'Active Users', value: adminUserMetrics.activeUsers, key: 'ACTIVE' },
                      { label: 'Other Users', value: adminUserMetrics.deletedUsers + adminUserMetrics.adminCount, key: 'DELETED' },
                      { label: 'Pickers', value: adminUserMetrics.pickers, key: 'JOB_PICKER' },
                      { label: 'Posters', value: adminUserMetrics.posters, key: 'JOB_POSTER' }
                    ]
                      .filter((item) => adminUserFilter === 'ALL' || adminUserFilter === item.key)
                      .slice(0, 3)
                      .map((item) => (
                        <View key={item.label} style={styles.adminOverviewKpiPill}>
                          <Text style={styles.adminOverviewKpiLabel}>{item.label}</Text>
                          <Text style={styles.adminOverviewKpiValue}>{item.value}</Text>
                        </View>
                      ))}
                  </View>
                  <View style={styles.adminDetailsBarsWrap}>
                    {adminUserMetrics.monthPoints.map((item, idx) => {
                      const height = 16 + ((Number(item.value) || 0) / adminUsersMax) * 86;
                      const animatedHeight = adminUsersBarAnims[idx].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, height]
                      });
                      return (
                        <View key={item.key} style={styles.adminDetailsBarMonthCol}>
                          <View style={styles.adminDetailsBarMonthTrack}>
                            <Animated.View
                              style={[
                                styles.adminDetailsBarMonthFill,
                                styles.adminDetailsBarMonthFillUsers,
                                { height: animatedHeight }
                              ]}
                            />
                          </View>
                          <Text style={styles.adminDetailsAxisText}>{item.label}</Text>
                        </View>
                      );
                    })}
                  </View>
                  <View style={styles.adminOverviewStatusList}>
                    {[
                      { key: 'ACTIVE', label: 'Active Users', value: adminUserMetrics.activeUsers, color: '#0F766E' },
                      { key: 'DELETED', label: 'Deleted Users', value: adminUserMetrics.deletedUsers, color: '#B91C1C' },
                      { key: 'JOB_PICKER', label: 'Job Pickers', value: adminUserMetrics.pickers, color: '#0369A1' },
                      { key: 'JOB_POSTER', label: 'Job Posters', value: adminUserMetrics.posters, color: '#7C3AED' }
                    ]
                      .filter((item) => adminUserFilter === 'ALL' || adminUserFilter === item.key)
                      .map((item) => {
                        const ratio = adminUserMetrics.totalUsers ? Math.max(item.value / adminUserMetrics.totalUsers, 0.04) : 0.04;
                        return (
                          <View key={item.key} style={styles.adminOverviewStatusRow}>
                            <Text style={styles.adminOverviewStatusLabel}>{item.label}</Text>
                            <Text style={styles.adminOverviewStatusValue}>{item.value}</Text>
                            <View style={styles.adminOverviewStatusTrack}>
                              <View style={[styles.adminOverviewStatusFill, { width: `${ratio * 100}%`, backgroundColor: item.color }]} />
                            </View>
                          </View>
                        );
                      })}
                  </View>
                  <Text style={styles.adminDetailsFootText}>{`Joined today: ${adminUserMetrics.todayJoined} • Active rate: ${adminUserMetrics.activeRate}%`}</Text>
                </>
              ) : null}
            </View>
          ) : null}
        </Animated.View>
      ) : null}
      </ScrollView>

      <Modal visible={showPeriodDropdown} transparent animationType="none" onRequestClose={closePeriodDropdown}>
        <View style={styles.dashboardDropdownModalRoot}>
          <Pressable style={styles.dashboardDropdownModalBackdrop} onPress={closePeriodDropdown} />
          <View pointerEvents="box-none" style={styles.dashboardDropdownModalOverlay}>
            <View style={[styles.dashboardSalesDropdownMenu, styles.dashboardSalesDropdownMenuFloating, periodDropdownPosition]}>
              {PERIOD_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  style={[
                    styles.dashboardSalesDropdownItem,
                    earnPeriod === option && styles.dashboardSalesDropdownItemActive
                  ]}
                  onPress={() => {
                    setEarnPeriod(option);
                    closePeriodDropdown();
                  }}
                >
                  <Text
                    style={[
                      styles.dashboardSalesDropdownItemText,
                      earnPeriod === option && styles.dashboardSalesDropdownItemTextActive
                    ]}
                  >
                    {getPeriodLabel(option)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
