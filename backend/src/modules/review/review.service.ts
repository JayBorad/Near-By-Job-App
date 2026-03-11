import prisma from '../../config/prisma.js';
import ApiError from '../../utils/ApiError.js';
import { emptyReviewSummary } from '../../utils/review-summary.js';

const normalizeComment = (comment) => {
  if (comment === undefined || comment === null) return null;
  const trimmed = String(comment).trim();
  return trimmed ? trimmed : null;
};

export const createOrUpdateReview = async (reviewerId, reviewerRole, reviewerMode, payload) => {
  const job = await prisma.job.findFirst({
    where: {
      id: payload.jobId,
      deletedAt: null
    },
    select: {
      id: true,
      status: true,
      createdBy: true
    }
  });

  if (!job) {
    throw new ApiError(404, 'Job not found');
  }

  if (job.status !== 'COMPLETED') {
    throw new ApiError(400, 'Review can only be submitted after the job is completed');
  }

  const isAdmin = reviewerRole === 'ADMIN';
  if (!isAdmin && reviewerMode !== 'JOB_POSTER') {
    throw new ApiError(403, 'Only job poster can submit reviews');
  }

  if (!isAdmin && job.createdBy !== reviewerId) {
    throw new ApiError(403, 'Only job owner can submit review for this job');
  }

  if (payload.revieweeId === reviewerId) {
    throw new ApiError(400, 'You cannot review yourself');
  }

  const application = await prisma.jobApplication.findFirst({
    where: {
      jobId: payload.jobId,
      applicantId: payload.revieweeId,
      status: 'ACCEPTED'
    },
    select: {
      id: true
    }
  });

  if (!application) {
    throw new ApiError(400, 'Only accepted job picker can be reviewed');
  }

  const reviewee = await prisma.user.findFirst({
    where: {
      id: payload.revieweeId,
      status: 'ACTIVE'
    },
    select: { id: true }
  });

  if (!reviewee) {
    throw new ApiError(404, 'Reviewee user not found');
  }

  return prisma.review.upsert({
    where: {
      jobId_reviewerId_revieweeId: {
        jobId: payload.jobId,
        reviewerId,
        revieweeId: payload.revieweeId
      }
    },
    create: {
      jobId: payload.jobId,
      reviewerId,
      revieweeId: payload.revieweeId,
      rating: Number(payload.rating),
      comment: normalizeComment(payload.comment)
    },
    update: {
      rating: Number(payload.rating),
      comment: normalizeComment(payload.comment)
    },
    include: {
      reviewer: {
        select: {
          id: true,
          name: true,
          avatar: true,
          role: true,
          userMode: true
        }
      },
      reviewee: {
        select: {
          id: true,
          name: true,
          avatar: true
        }
      },
      job: {
        select: {
          id: true,
          title: true,
          status: true
        }
      }
    }
  });
};

const getRatingSummary = async (revieweeId) => {
  const aggregate = await prisma.review.aggregate({
    where: { revieweeId },
    _avg: { rating: true },
    _count: { _all: true }
  });

  const rawAverage = aggregate?._avg?.rating;
  const averageRating = rawAverage === null || rawAverage === undefined ? null : Number(Number(rawAverage).toFixed(2));
  const totalReviews = Number(aggregate?._count?._all || 0);

  return {
    averageRating,
    totalReviews
  };
};

export const getReviewsReceivedByUser = async (requesterId, requesterRole, revieweeId) => {
  const isAdmin = requesterRole === 'ADMIN';
  if (!isAdmin && requesterId !== revieweeId) {
    throw new ApiError(403, 'You can only view your own received reviews');
  }

  const reviewee = await prisma.user.findFirst({
    where: { id: revieweeId, status: 'ACTIVE' },
    select: { id: true, name: true }
  });

  if (!reviewee) {
    throw new ApiError(404, 'User not found');
  }

  const [reviews, summary, distributionRows] = await Promise.all([
    prisma.review.findMany({
      where: { revieweeId },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
            userMode: true
          }
        },
        job: {
          select: {
            id: true,
            title: true,
            status: true,
            dueDate: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    getRatingSummary(revieweeId),
    prisma.review.groupBy({
      by: ['rating'],
      where: { revieweeId },
      _count: { _all: true }
    })
  ]);

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  distributionRows.forEach((row) => {
    const ratingKey = Number(row.rating);
    if (distribution[ratingKey] !== undefined) {
      distribution[ratingKey] = Number(row?._count?._all || 0);
    }
  });

  return {
    reviewee,
    summary: summary || { ...emptyReviewSummary },
    distribution,
    reviews
  };
};
