import { JobStatus, Prisma } from '@prisma/client';
import prisma from '../../config/prisma.js';
import ApiError from '../../utils/ApiError.js';
import { parsePagination } from '../../utils/pagination.js';
import { getReviewSummaryMapForUsers } from '../../utils/review-summary.js';
import { emptyApplicationStats, getApplicationStatsMapForJobs } from '../../utils/application-stats.js';
import { createNotificationsBulk } from '../notification/notification.service.js';

const JOB_WORK_MODE_VALUES = ['REMOTE', 'HYBRID', 'ONSITE'] as const;

const isBrokenJobLocationTriggerError = (error) =>
  String(error?.message || '').toLowerCase().includes('column `new` does not exist') ||
  String(error?.message || '').toLowerCase().includes('column "new" does not exist');

const repairJobLocationTrigger = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION set_job_location() RETURNS trigger AS $$
    BEGIN
      NEW.location := ST_SetSRID(
        ST_MakePoint(NEW.longitude::double precision, NEW.latitude::double precision),
        4326
      )::geography;
      NEW."updatedAt" := CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await prisma.$executeRawUnsafe(`
    DROP TRIGGER IF EXISTS trg_job_set_location ON "Job";
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_job_set_location
    BEFORE INSERT OR UPDATE OF latitude, longitude
    ON "Job"
    FOR EACH ROW
    EXECUTE FUNCTION set_job_location();
  `);
};

const ensureCategoryApproved = async (categoryId) => {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, status: 'APPROVED' }
  });

  if (!category) {
    throw new ApiError(400, 'Category is not approved or does not exist');
  }
};

export const createJob = async (userId, payload) => {
  await ensureCategoryApproved(payload.categoryId);
  const fallbackDueDate = new Date();
  fallbackDueDate.setDate(fallbackDueDate.getDate() + 7);

  const createData = {
    title: payload.title,
    description: payload.description,
    requiredWorkers: Number.isFinite(Number(payload.requiredWorkers))
      ? Math.max(1, Math.floor(Number(payload.requiredWorkers)))
      : 1,
    categoryId: payload.categoryId,
    budget: new Prisma.Decimal(payload.budget),
    budgetType: payload.budgetType || 'TOTAL',
    jobType: payload.jobType,
    workMode: payload.workMode || 'ONSITE',
    latitude: new Prisma.Decimal(payload.latitude),
    longitude: new Prisma.Decimal(payload.longitude),
    address: payload.address,
    dueDate: payload.dueDate || fallbackDueDate,
    createdBy: userId
  };

  try {
    return await prisma.job.create({ data: createData });
  } catch (error) {
    if (!isBrokenJobLocationTriggerError(error)) throw error;
    await repairJobLocationTrigger();
    return prisma.job.create({ data: createData });
  }
};

export const updateJob = async (jobId, payload, actor: { id?: string; role?: string } = {}) => {
  const previous = await prisma.job.findUnique({
    where: { id: jobId }
  });
  if (!previous || previous.deletedAt) {
    throw new ApiError(404, 'Job not found');
  }

  if (payload.categoryId) {
    await ensureCategoryApproved(payload.categoryId);
  }

  const updateData = { ...payload };
  if (payload.requiredWorkers !== undefined) {
    const normalizedRequiredWorkers = Math.floor(Number(payload.requiredWorkers));
    if (!Number.isFinite(normalizedRequiredWorkers) || normalizedRequiredWorkers < 1) {
      throw new ApiError(400, 'requiredWorkers must be greater than or equal to 1');
    }
    updateData.requiredWorkers = normalizedRequiredWorkers;
  }
  if (payload.budget !== undefined) updateData.budget = new Prisma.Decimal(payload.budget);
  if (payload.budgetType !== undefined) updateData.budgetType = payload.budgetType;
  if (payload.latitude !== undefined) updateData.latitude = new Prisma.Decimal(payload.latitude);
  if (payload.longitude !== undefined) updateData.longitude = new Prisma.Decimal(payload.longitude);

  let updated;
  try {
    updated = await prisma.job.update({
      where: { id: jobId },
      data: updateData
    });
  } catch (error) {
    if (!isBrokenJobLocationTriggerError(error)) throw error;
    await repairJobLocationTrigger();
    updated = await prisma.job.update({
      where: { id: jobId },
      data: updateData
    });
  }

  const actorRole = String(actor?.role || '').toUpperCase();
  const actorId = actor?.id || null;
  const isAdminAction = actorRole === 'ADMIN';
  const currentStatus = String(updated?.status || previous?.status || 'OPEN').toUpperCase();
  const shouldNotifyPickers = currentStatus !== 'COMPLETED';
  const title = currentStatus === 'CANCELLED'
    ? (isAdminAction ? 'Admin cancelled a job' : 'Job cancelled')
    : (isAdminAction ? 'Admin updated a job' : 'Job updated');

  const descriptionForPicker = currentStatus === 'CANCELLED'
    ? `The job "${updated.title}" was cancelled.`
    : `The job "${updated.title}" was updated.`;

  const jobApplications = shouldNotifyPickers
    ? await prisma.jobApplication.findMany({
        where: {
          jobId: updated.id,
          status: { in: ['PENDING', 'ACCEPTED'] }
        },
        select: { applicantId: true }
      })
    : [];

  const recipientIds = new Set(jobApplications.map((item) => item.applicantId));
  const records = [];

  if (isAdminAction && updated.createdBy) {
    records.push({
      userId: updated.createdBy,
      type: currentStatus === 'CANCELLED' ? 'JOB_CANCELLED' : 'ADMIN_JOB_UPDATED',
      title,
      description: `Admin updated your job "${updated.title}".`,
      icon: currentStatus === 'CANCELLED' ? 'close-circle-outline' : 'settings-outline',
      actionPage: 'JOB_DETAILS',
      jobId: updated.id
    });
  }

  if (shouldNotifyPickers) {
    recipientIds.forEach((userId) => {
      if (!userId) return;
      if (actorId && userId === actorId) return;
      records.push({
        userId,
        type: currentStatus === 'CANCELLED' ? 'JOB_CANCELLED' : (isAdminAction ? 'ADMIN_JOB_UPDATED' : 'JOB_UPDATED'),
        title,
        description: descriptionForPicker,
        icon: currentStatus === 'CANCELLED' ? 'alert-circle-outline' : 'refresh-outline',
        actionPage: 'MY_APPLICATIONS',
        jobId: updated.id
      });
    });
  }

  if (records.length) {
    await createNotificationsBulk(records);
  }

  return updated;
};

export const softDeleteJob = async (jobId, actor: { id?: string; role?: string } = {}) => {
  const previous = await prisma.job.findUnique({
    where: { id: jobId }
  });
  if (!previous || previous.deletedAt) {
    throw new ApiError(404, 'Job not found');
  }

  const updated = await prisma.job.update({
    where: { id: jobId },
    data: {
      deletedAt: new Date(),
      status: 'CANCELLED'
    }
  });

  const actorRole = String(actor?.role || '').toUpperCase();
  const actorId = actor?.id || null;
  const isAdminAction = actorRole === 'ADMIN';

  const activeApplications = await prisma.jobApplication.findMany({
    where: {
      jobId,
      status: { in: ['PENDING', 'ACCEPTED'] }
    },
    select: { applicantId: true }
  });

  const records = [];
  if (isAdminAction && previous.createdBy) {
    records.push({
      userId: previous.createdBy,
      type: 'JOB_CANCELLED',
      title: 'Admin cancelled a job',
      description: `Admin cancelled your job "${previous.title}".`,
      icon: 'close-circle-outline',
      actionPage: 'JOB_DETAILS',
      jobId
    });
  }

  activeApplications.forEach((item) => {
    if (!item?.applicantId) return;
    if (actorId && item.applicantId === actorId) return;
    records.push({
      userId: item.applicantId,
      type: 'JOB_CANCELLED',
      title: 'Job cancelled',
      description: `The job "${previous.title}" was cancelled.`,
      icon: 'alert-circle-outline',
      actionPage: 'MY_APPLICATIONS',
      jobId
    });
  });

  if (records.length) {
    await createNotificationsBulk(records);
  }

  return { message: 'Job soft-deleted successfully', job: updated };
};

export const getAllJobs = async (query) => {
  const { page, limit, skip } = parsePagination(query);
  const requestedStatus = String(query?.status || '').trim().toUpperCase();
  const requestedWorkMode = String(query?.workMode || '').trim().toUpperCase();
  const statusFilter: Prisma.JobWhereInput =
    requestedStatus === 'ALL'
      ? {}
      : requestedStatus && Object.values(JobStatus).includes(requestedStatus as JobStatus)
        ? { status: requestedStatus as JobStatus }
        : { status: 'OPEN' };
  const workModeFilter: Prisma.JobWhereInput =
    requestedWorkMode === 'ALL' || !requestedWorkMode
      ? {}
      : JOB_WORK_MODE_VALUES.includes(requestedWorkMode as (typeof JOB_WORK_MODE_VALUES)[number])
        ? { workMode: requestedWorkMode as (typeof JOB_WORK_MODE_VALUES)[number] }
        : {};

  const where = {
    deletedAt: null,
    ...statusFilter,
    ...workModeFilter
  };

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      include: {
        category: true,
        owner: { select: { id: true, name: true, email: true } }
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.job.count({ where })
  ]);
  const ownerRatingMap = await getReviewSummaryMapForUsers(jobs.map((item) => item?.owner?.id));
  const applicationStatsMap = await getApplicationStatsMapForJobs(jobs.map((item) => item?.id));
  const jobsWithOwnerRating = jobs.map((job) => ({
    ...job,
    applicationStats: applicationStatsMap.get(job?.id) || { ...emptyApplicationStats },
    owner: {
      ...job.owner,
      ratingSummary: ownerRatingMap.get(job?.owner?.id) || { averageRating: null, totalReviews: 0 }
    }
  }));

  return {
    jobs: jobsWithOwnerRating,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};

export const getJobById = async (jobId) => {
  const job = await prisma.job.findFirst({
    where: { id: jobId, deletedAt: null },
    include: {
      category: true,
      owner: { select: { id: true, name: true, email: true } }
    }
  });

  if (!job) {
    throw new ApiError(404, 'Job not found');
  }

  const ownerRatingMap = await getReviewSummaryMapForUsers([job?.owner?.id]);
  const applicationStatsMap = await getApplicationStatsMapForJobs([job?.id]);
  return {
    ...job,
    applicationStats: applicationStatsMap.get(job?.id) || { ...emptyApplicationStats },
    owner: {
      ...job.owner,
      ratingSummary: ownerRatingMap.get(job?.owner?.id) || { averageRating: null, totalReviews: 0 }
    }
  };
};

export const findNearbyJobs = async ({ latitude, longitude, radiusKm = 10 }) => {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const radiusMeters = Number(radiusKm) * 1000;

  return prisma.$queryRaw`
    SELECT
      j.*,
      ST_Distance(
        j."location",
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
      ) AS "distanceMeters"
    FROM "Job" j
    WHERE j."deletedAt" IS NULL
      AND j."status" = 'OPEN'
      AND ST_DWithin(
        j."location",
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radiusMeters}
      )
    ORDER BY "distanceMeters" ASC
  `;
};
