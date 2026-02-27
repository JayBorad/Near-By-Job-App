import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma.js';
import ApiError from '../../utils/ApiError.js';
import { parsePagination } from '../../utils/pagination.js';

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

  return prisma.job.create({
    data: {
      title: payload.title,
      description: payload.description,
      categoryId: payload.categoryId,
      budget: new Prisma.Decimal(payload.budget),
      jobType: payload.jobType,
      latitude: new Prisma.Decimal(payload.latitude),
      longitude: new Prisma.Decimal(payload.longitude),
      address: payload.address,
      dueDate: payload.dueDate,
      createdBy: userId
    }
  });
};

export const updateJob = async (jobId, payload) => {
  if (payload.categoryId) {
    await ensureCategoryApproved(payload.categoryId);
  }

  const updateData = { ...payload };
  if (payload.budget !== undefined) updateData.budget = new Prisma.Decimal(payload.budget);
  if (payload.latitude !== undefined) updateData.latitude = new Prisma.Decimal(payload.latitude);
  if (payload.longitude !== undefined) updateData.longitude = new Prisma.Decimal(payload.longitude);

  return prisma.job.update({
    where: { id: jobId },
    data: updateData
  });
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

  const where = {
    deletedAt: null,
    ...(query.status ? { status: query.status } : { status: 'OPEN' })
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
