import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Path, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';

const WEB_SAFE_NATIVE_DRIVER = Platform.OS !== 'web';
const DAY_MS = 24 * 60 * 60 * 1000;
const PERIOD_OPTIONS = ['DAY', 'MONTH', 'YEAR'];

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

export function DashboardTab({ user, userRole, myApplications, styles, colors }) {
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

  const activeDay = analytics.days[selectedIndex] || analytics.days[0];
  const isUserDashboard = String(userRole || '').toUpperCase() === 'USER';
  const nowLabel = useMemo(
    () =>
      new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }),
    []
  );

  return (
    <ScrollView style={styles.dashboardHeaderOnlyWrap} contentContainerStyle={styles.dashboardHeaderOnlyContent}>
      {showPeriodDropdown ? <Pressable style={styles.dashboardGlobalDismissLayer} onPress={() => setShowPeriodDropdown(false)} /> : null}
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

          <Pressable onPress={ringBell} style={styles.dashboardNotificationBtn}>
            <Animated.View style={{ transform: [{ rotate: bellRotate }] }}>
              <Ionicons
                name={isBellActive ? 'notifications' : 'notifications-outline'}
                size={19}
                color={colors.textMain}
              />
            </Animated.View>
            <View style={styles.dashboardNotificationDot} />
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
              <View style={styles.dashboardSalesPeriodWrap}>
                <Pressable
                  style={styles.dashboardSalesDropdownTrigger}
                  onPress={() => setShowPeriodDropdown((prev) => !prev)}
                >
                  <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
                  <Text style={styles.dashboardSalesDropdownTriggerText}>
                    {earnPeriod === 'DAY' ? 'Daily' : earnPeriod === 'MONTH' ? 'Monthly' : 'Yearly'}
                  </Text>
                  <Ionicons
                    name={showPeriodDropdown ? 'chevron-up' : 'chevron-down'}
                    size={13}
                    color={colors.textSecondary}
                  />
                </Pressable>
                {showPeriodDropdown ? (
                  <View style={styles.dashboardSalesDropdownMenu}>
                    {PERIOD_OPTIONS.map((option) => (
                      <Pressable
                        key={option}
                        style={[
                          styles.dashboardSalesDropdownItem,
                          earnPeriod === option && styles.dashboardSalesDropdownItemActive
                        ]}
                        onPress={() => {
                          setEarnPeriod(option);
                          setShowPeriodDropdown(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.dashboardSalesDropdownItemText,
                            earnPeriod === option && styles.dashboardSalesDropdownItemTextActive
                          ]}
                        >
                          {option === 'DAY' ? 'Daily' : option === 'MONTH' ? 'Monthly' : 'Yearly'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
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
                  <SvgLinearGradient id="salesArea" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={hexToRgba(statsLineColor, 0.24)} />
                    <Stop offset="100%" stopColor={hexToRgba(statsLineColor, 0.02)} />
                  </SvgLinearGradient>
                </Defs>

                <Path d={earningsGraph.areaPath} fill="url(#salesArea)" />
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
      ) : null}
    </ScrollView>
  );
}
