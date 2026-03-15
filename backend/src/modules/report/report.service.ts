import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma.js';
import { supabaseAdmin } from '../../config/supabase.js';
import ApiError from '../../utils/ApiError.js';
import { parsePagination } from '../../utils/pagination.js';

const REPORT_BUCKET = 'reports';
let isReportBucketChecked = false;
const REPORT_STATUSES = new Set(['PENDING', 'IN_REVIEW', 'RESOLVED', 'REJECTED']);
const SUPPORTED_REPORT_TYPES = new Set([
  'png',
  'jpg',
  'jpeg',
  'webp',
  'heic',
  'heif',
  'dng',
  'gif',
  'bmp',
  'tiff',
  'avif'
]);

const reportSelect = {
  id: true,
  title: true,
  description: true,
  imageUrl: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
  createdBy: true,
  reviewedBy: true,
  creator: {
    select: {
      id: true,
      name: true,
      username: true,
      email: true
    }
  },
  reviewer: {
    select: {
      id: true,
      name: true,
      username: true,
      email: true
    }
  }
} satisfies Prisma.ReportSelect;

const ensureReportBucket = async () => {
  if (isReportBucketChecked) return;

  const { data, error } = await supabaseAdmin.storage.getBucket(REPORT_BUCKET);
  if (error && !String(error.message || '').toLowerCase().includes('not found')) {
    throw new ApiError(500, `Unable to verify report storage bucket: ${error.message}`);
  }

  if (!data) {
    const { error: createError } = await supabaseAdmin.storage.createBucket(REPORT_BUCKET, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024
    });

    if (createError && !String(createError.message || '').toLowerCase().includes('already')) {
      throw new ApiError(500, `Unable to create report storage bucket: ${createError.message}`);
    }
  }

  if (data && !data.public) {
    const { error: updateBucketError } = await supabaseAdmin.storage.updateBucket(REPORT_BUCKET, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024
    });

    if (updateBucketError) {
      throw new ApiError(500, `Unable to update report bucket visibility: ${updateBucketError.message}`);
    }
  }

  isReportBucketChecked = true;
};

const uploadReportImage = async (userId, imageData) => {
  const matches = String(imageData || '').match(/^data:image\/([a-z0-9.+-]+);base64,(.+)$/i);
  if (!matches) {
    throw new ApiError(400, 'Invalid report image format');
  }

  const mimeSubtype = String(matches[1] || '').toLowerCase();
  const imageType = mimeSubtype === 'jpeg' ? 'jpg' : mimeSubtype;
  if (!SUPPORTED_REPORT_TYPES.has(imageType)) {
    throw new ApiError(400, `Unsupported report image format: ${imageType}`);
  }

  const fileBuffer = Buffer.from(matches[2], 'base64');
  if (fileBuffer.byteLength > 5 * 1024 * 1024) {
    throw new ApiError(413, 'Report image must be smaller than 5MB');
  }

  await ensureReportBucket();

  const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${imageType}`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from(REPORT_BUCKET)
    .upload(filePath, fileBuffer, {
      contentType: imageType === 'jpg' ? 'image/jpeg' : `image/${imageType}`,
      upsert: true
    });

  if (uploadError) {
    throw new ApiError(500, `Failed to upload report image: ${uploadError.message}`);
  }

  const { data: publicData } = supabaseAdmin.storage.from(REPORT_BUCKET).getPublicUrl(filePath);
  return publicData.publicUrl;
};

export const createReport = async (userId, payload) => {
  const title = String(payload?.title || '').trim().replace(/\s+/g, ' ');
  const description = String(payload?.description || '').trim();
  const imageUrl = payload?.imageData ? await uploadReportImage(userId, payload.imageData) : null;

  return prisma.report.create({
    data: {
      title,
      description,
      imageUrl,
      status: 'PENDING',
      createdBy: userId
    },
    select: reportSelect
  });
};

export const getMyReports = async (userId) =>
  prisma.report.findMany({
    where: { createdBy: userId },
    select: reportSelect,
    orderBy: { createdAt: 'desc' }
  });

export const getAllReports = async (query) => {
  const { page, limit, skip } = parsePagination(query);
  const searchText = String(query?.q || '').trim();
  const statusFilter = String(query?.status || '').trim().toUpperCase();

  const where: Prisma.ReportWhereInput = {
    ...(statusFilter && statusFilter !== 'ALL' && REPORT_STATUSES.has(statusFilter)
      ? { status: statusFilter as Prisma.ReportScalarWhereInput['status'] }
      : {}),
    ...(searchText
      ? {
          OR: [
            { title: { contains: searchText, mode: 'insensitive' as const } },
            { description: { contains: searchText, mode: 'insensitive' as const } }
          ]
        }
      : {})
  };

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      skip,
      take: limit,
      select: reportSelect,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.report.count({ where })
  ]);

  return {
    reports,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};

export const getReportById = async (requesterId, requesterRole, reportId) => {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: reportSelect
  });

  if (!report) {
    throw new ApiError(404, 'Report not found');
  }

  if (requesterRole !== 'ADMIN' && report.createdBy !== requesterId) {
    throw new ApiError(403, 'You can only view your own reports');
  }

  return report;
};

export const updateReportStatus = async (adminId, reportId, status) => {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: { id: true }
  });

  if (!report) {
    throw new ApiError(404, 'Report not found');
  }

  return prisma.report.update({
    where: { id: reportId },
    data: {
      status,
      reviewedBy: adminId,
      reviewedAt: new Date()
    },
    select: reportSelect
  });
};
