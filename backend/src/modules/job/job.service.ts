import { JobStatus, Prisma } from '@prisma/client';
import prisma from '../../config/prisma.js';
import ApiError from '../../utils/ApiError.js';
import { parsePagination } from '../../utils/pagination.js';

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
    categoryId: payload.categoryId,
    budget: new Prisma.Decimal(payload.budget),
    jobType: payload.jobType,
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

export const updateJob = async (jobId, payload) => {
  if (payload.categoryId) {
    await ensureCategoryApproved(payload.categoryId);
  }

  const updateData = { ...payload };
  if (payload.budget !== undefined) updateData.budget = new Prisma.Decimal(payload.budget);
  if (payload.latitude !== undefined) updateData.latitude = new Prisma.Decimal(payload.latitude);
  if (payload.longitude !== undefined) updateData.longitude = new Prisma.Decimal(payload.longitude);

  try {
    return await prisma.job.update({
      where: { id: jobId },
      data: updateData
    });
  } catch (error) {
    if (!isBrokenJobLocationTriggerError(error)) throw error;
    await repairJobLocationTrigger();
    return prisma.job.update({
      where: { id: jobId },
      data: updateData
    });
  }
};

export const softDeleteJob = async (jobId) => {
  await prisma.job.update({
    where: { id: jobId },
    data: {
      deletedAt: new Date(),
      status: 'CANCELLED'
    }
  });

  return { message: 'Job soft-deleted successfully' };
};

export const getAllJobs = async (query) => {
  const { page, limit, skip } = parsePagination(query);
  const requestedStatus = String(query?.status || '').trim().toUpperCase();
  const statusFilter: Prisma.JobWhereInput =
    requestedStatus === 'ALL'
      ? {}
      : requestedStatus && Object.values(JobStatus).includes(requestedStatus as JobStatus)
        ? { status: requestedStatus as JobStatus }
        : { status: 'OPEN' };

  const where = {
    deletedAt: null,
    ...statusFilter
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

  return {
    jobs,
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

  return job;
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
