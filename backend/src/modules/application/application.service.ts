import prisma from '../../config/prisma.js';
import ApiError from '../../utils/ApiError.js';
import { getReviewSummaryMapForUsers, isMissingReviewTableError } from '../../utils/review-summary.js';
import { emptyApplicationStats, getApplicationStatsMapForJobs } from '../../utils/application-stats.js';
import { createNotification } from '../notification/notification.service.js';

export const applyJob = async (userId, jobId) => {
  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      deletedAt: null,
      status: 'OPEN'
    }
  });

  if (!job) {
    throw new ApiError(404, 'Open job not found');
  }

  if (job.createdBy === userId) {
    throw new ApiError(400, 'Job owner cannot apply to own job');
  }

  const acceptedCount = await prisma.jobApplication.count({
    where: {
      jobId,
      status: 'ACCEPTED'
    }
  });
  const requiredWorkers = Math.max(1, Number(job.requiredWorkers || 1));
  if (acceptedCount >= requiredWorkers) {
    throw new ApiError(400, 'This job has reached required approved workers');
  }

  const existing = await prisma.jobApplication.findUnique({
    where: {
      jobId_applicantId: {
        jobId,
        applicantId: userId
      }
    }
  });

  if (existing) {
    throw new ApiError(409, 'You already applied to this job');
  }

  const createdApplication = await prisma.jobApplication.create({
    data: {
      jobId,
      applicantId: userId
    }
  });

  let applicantName = 'A job picker';
  try {
    const applicant = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });
    if (applicant?.name) applicantName = applicant.name;
  } catch (_error) {
    // Best-effort name resolution.
  }

  await createNotification({
    userId: job.createdBy,
    type: 'JOB_APPLIED',
    title: 'New job application',
    description: `${applicantName} applied for "${job.title}".`,
    icon: 'briefcase-outline',
    actionPage: 'JOB_DETAILS',
    jobId: job.id,
    applicationId: createdApplication.id
  });

  return createdApplication;
};

export const updateApplicationStatus = async (ownerId, ownerRole, applicationId, status) => {
  const application = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    include: { job: true }
  });

  if (!application) {
    throw new ApiError(404, 'Application not found');
  }

  if (ownerRole !== 'ADMIN' && application.job.createdBy !== ownerId) {
    throw new ApiError(403, 'Only job owner can update application status');
  }

  if (application.status !== 'PENDING') {
    throw new ApiError(400, 'Only pending applications can be updated');
  }

  if (status === 'ACCEPTED') {
    const updated = await prisma.$transaction(async (tx) => {
      const acceptedCount = await tx.jobApplication.count({
        where: {
          jobId: application.jobId,
          status: 'ACCEPTED'
        }
      });
      const requiredWorkers = Math.max(1, Number(application.job.requiredWorkers || 1));
      if (acceptedCount >= requiredWorkers) {
        throw new ApiError(400, 'Required workers already approved for this job');
      }

      const updated = await tx.jobApplication.update({
        where: { id: applicationId },
        data: { status: 'ACCEPTED' }
      });

      const totalAccepted = acceptedCount + 1;
      await tx.job.update({
        where: { id: application.jobId },
        data: {
          status: totalAccepted >= requiredWorkers ? 'IN_PROGRESS' : application.job.status
        }
      });

      return updated;
    });

    await createNotification({
      userId: application.applicantId,
      type: 'APPLICATION_ACCEPTED',
      title: 'Application accepted',
      description: `Your application for "${application.job.title}" was accepted.`,
      icon: 'checkmark-circle-outline',
      actionPage: 'MY_APPLICATIONS',
      jobId: application.jobId,
      applicationId: application.id
    });
    return updated;
  }

  const updated = await prisma.jobApplication.update({
    where: { id: applicationId },
    data: { status }
  });

  await createNotification({
    userId: application.applicantId,
    type: 'APPLICATION_REJECTED',
    title: 'Application status updated',
    description: `Your application for "${application.job.title}" was ${status.toLowerCase()}.`,
    icon: status === 'REJECTED' ? 'close-circle-outline' : 'information-circle-outline',
    actionPage: 'MY_APPLICATIONS',
    jobId: application.jobId,
    applicationId: application.id
  });

  return updated;
};

export const getApplicationsByJob = async (ownerId, ownerRole, jobId) => {
  const job = await prisma.job.findFirst({ where: { id: jobId, deletedAt: null } });
  if (!job) {
    throw new ApiError(404, 'Job not found');
  }

  if (ownerRole !== 'ADMIN' && job.createdBy !== ownerId) {
    throw new ApiError(403, 'Only job owner can view applications');
  }

  const applications = await prisma.jobApplication.findMany({
    where: { jobId },
    include: {
      applicant: {
        select: { id: true, name: true, email: true, phone: true, avatar: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const applicantIds = applications.map((item) => item?.applicant?.id).filter(Boolean);
  const applicantRatingMap = await getReviewSummaryMapForUsers(applicantIds);

  let ownerReviews = [];
  try {
    ownerReviews = await prisma.review.findMany({
      where: {
        jobId,
        reviewerId: job.createdBy
      },
      select: {
        id: true,
        revieweeId: true,
        rating: true,
        comment: true,
        createdAt: true,
        updatedAt: true
      }
    });
  } catch (error) {
    if (!isMissingReviewTableError(error)) throw error;
  }
  const ownerReviewMap = new Map(ownerReviews.map((item) => [item.revieweeId, item]));

  return applications.map((application) => ({
    ...application,
    applicant: {
      ...application.applicant,
      ratingSummary: applicantRatingMap.get(application?.applicant?.id) || { averageRating: null, totalReviews: 0 }
    },
    ownerReview: ownerReviewMap.get(application?.applicant?.id) || null
  }));
};

export const getAppliedJobsByUser = async (userId) => {
  const applications = await prisma.jobApplication.findMany({
    where: { applicantId: userId },
    include: {
      job: {
        include: {
          category: true,
          owner: { select: { id: true, name: true, email: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const ownerIds = applications.map((item) => item?.job?.owner?.id).filter(Boolean);
  const jobIds = applications.map((item) => item?.job?.id).filter(Boolean);
  const ownerRatingMap = await getReviewSummaryMapForUsers(ownerIds);
  const applicationStatsMap = await getApplicationStatsMapForJobs(jobIds);

  return applications.map((application) => ({
    ...application,
    job: {
      ...application.job,
      applicationStats: applicationStatsMap.get(application?.job?.id) || { ...emptyApplicationStats },
      owner: {
        ...application.job.owner,
        ratingSummary: ownerRatingMap.get(application?.job?.owner?.id) || { averageRating: null, totalReviews: 0 }
      }
    }
  }));
};
