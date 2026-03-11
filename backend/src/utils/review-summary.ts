import prisma from '../config/prisma.js';

export const isMissingReviewTableError = (error) => {
  const code = String(error?.code || '');
  const table = String(error?.meta?.table || '');
  const message = String(error?.message || '');
  return (
    code === 'P2021' &&
    (table.includes('Review') || message.toLowerCase().includes('table `public.review` does not exist'))
  );
};

const normalizeAverage = (value) => {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Number(numeric.toFixed(2));
};

export const emptyReviewSummary = {
  averageRating: null,
  totalReviews: 0
};

export const getReviewSummaryMapForUsers = async (userIds) => {
  const uniqueIds = Array.from(new Set((Array.isArray(userIds) ? userIds : []).filter(Boolean)));
  const summaryMap = new Map();

  if (!uniqueIds.length) return summaryMap;

  let reviews = [];
  try {
    reviews = await prisma.review.findMany({
      where: {
        revieweeId: { in: uniqueIds }
      },
      select: {
        revieweeId: true,
        rating: true
      }
    });
  } catch (error) {
    // Backward compatibility: allow APIs to work before the review migration is applied.
    if (isMissingReviewTableError(error)) {
      return summaryMap;
    }
    throw error;
  }

  const totalsMap = new Map();
  reviews.forEach((row) => {
    const key = row.revieweeId;
    const current = totalsMap.get(key) || { sum: 0, count: 0 };
    const rating = Number(row.rating);
    totalsMap.set(key, {
      sum: current.sum + (Number.isFinite(rating) ? rating : 0),
      count: current.count + 1
    });
  });

  totalsMap.forEach((value, key) => {
    summaryMap.set(key, {
      averageRating: value.count ? normalizeAverage(value.sum / value.count) : null,
      totalReviews: Number(value.count || 0)
    });
  });

  return summaryMap;
};

export const withUserReviewSummary = async (user) => {
  if (!user?.id) {
    return {
      ...(user || {}),
      ratingSummary: { ...emptyReviewSummary }
    };
  }

  const summaryMap = await getReviewSummaryMapForUsers([user.id]);
  return {
    ...user,
    ratingSummary: summaryMap.get(user.id) || { ...emptyReviewSummary }
  };
};

export const withUsersReviewSummary = async (users) => {
  const list = Array.isArray(users) ? users : [];
  const summaryMap = await getReviewSummaryMapForUsers(list.map((item) => item?.id));

  return list.map((item) => ({
    ...item,
    ratingSummary: summaryMap.get(item?.id) || { ...emptyReviewSummary }
  }));
};
