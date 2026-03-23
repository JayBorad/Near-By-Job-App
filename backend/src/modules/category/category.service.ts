import prisma from '../../config/prisma.js';
import ApiError from '../../utils/ApiError.js';
import { CategoryStatus, Prisma } from '@prisma/client';
import { createNotification, createNotificationsBulk } from '../notification/notification.service.js';

const isMissingDescriptionColumnError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('does not exist') &&
    (message.includes('category.description') || message.includes('column `description`'))
  );
};

export const createCategory = async (userId, userRole, payload) => {
  const normalizedName = String(payload?.name || '')
    .trim()
    .replace(/\s+/g, ' ');

  const existing = await prisma.category.findFirst({
    where: {
      name: {
        equals: normalizedName,
        mode: 'insensitive'
      }
    },
    select: { id: true, name: true }
  });

  if (existing) {
    throw new ApiError(409, 'Category name already exists');
  }

  let createdCategory = null;
  try {
    createdCategory = await prisma.category.create({
      data: {
        name: normalizedName,
        description: payload.description || null,
        status: 'PENDING',
        createdBy: userId
      }
    });
  } catch (error) {
    if (isMissingDescriptionColumnError(error)) {
      const fallback = await prisma.category.create({
        data: {
          name: normalizedName,
          status: 'PENDING',
          createdBy: userId
        }
      });
      createdCategory = { ...fallback, description: null };
    } else {
      throw error;
    }
  }

  if (String(userRole || '').toUpperCase() !== 'ADMIN') {
    const admins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        status: 'ACTIVE'
      },
      select: {
        id: true
      }
    });

    try {
      await createNotificationsBulk(
        admins.map((admin) => ({
          userId: admin.id,
          type: 'ADMIN_JOB_UPDATED',
          title: 'Category pending review',
          description: `A new category "${createdCategory.name}" is waiting for approval.`,
          icon: 'layers-outline',
          actionPage: 'ADMIN_CATEGORIES'
        }))
      );
    } catch (_error) {
      // Notification delivery should not block category creation.
    }
  }

  return createdCategory;
};

export const getApprovedCategories = async (query) => {
  const q = String(query?.q || '').trim();
  try {
    return await prisma.category.findMany({
      where: {
        status: 'APPROVED',
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } }
              ]
            }
          : {})
      },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true
          }
        }
      }
    });
  } catch (error) {
    if (!isMissingDescriptionColumnError(error)) throw error;
    const fallback = await prisma.category.findMany({
      where: {
        status: 'APPROVED',
        ...(q
          ? {
              name: { contains: q, mode: 'insensitive' }
            }
          : {})
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        createdBy: true,
        approvedBy: true,
        createdAt: true,
        updatedAt: true,
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true
          }
        }
      }
    });
    return fallback.map((item) => ({ ...item, description: null }));
  }
};

export const getAllCategories = async (query) => {
  const status = String(query?.status || '').trim().toUpperCase();
  const q = String(query?.q || '').trim();
  const where: Prisma.CategoryWhereInput = {
    ...(status && status !== 'ALL' ? { status: status as CategoryStatus } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { description: { contains: q, mode: 'insensitive' as const } }
          ]
        }
      : {})
  };

  try {
    return await prisma.category.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true
          }
        },
        approver: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    if (!isMissingDescriptionColumnError(error)) throw error;
    const fallbackWhere: Prisma.CategoryWhereInput = {
      ...(status && status !== 'ALL' ? { status: status as CategoryStatus } : {}),
      ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {})
    };
    const fallback = await prisma.category.findMany({
      where: fallbackWhere,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true
          }
        },
        approver: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return fallback.map((item) => ({ ...item, description: null }));
  }
};

export const getMyCategories = async (userId, query) => {
  const status = String(query?.status || '').trim();
  const q = String(query?.q || '').trim();

  try {
    return await prisma.category.findMany({
      where: {
        createdBy: userId,
        ...(status ? { status: status as CategoryStatus } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } }
              ]
            }
          : {})
      },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    if (!isMissingDescriptionColumnError(error)) throw error;
    const fallback = await prisma.category.findMany({
      where: {
        createdBy: userId,
        ...(status ? { status: status as CategoryStatus } : {}),
        ...(q
          ? {
              name: { contains: q, mode: 'insensitive' }
            }
          : {})
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        createdBy: true,
        approvedBy: true,
        createdAt: true,
        updatedAt: true
      }
    });
    return fallback.map((item) => ({ ...item, description: null }));
  }
};

export const updateCategoryStatus = async (categoryId, adminId, status) => {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  const normalizedStatus = String(status || '').toUpperCase();
  const previousStatus = String(category.status || '').toUpperCase();
  const updated = await prisma.category.update({
    where: { id: categoryId },
    data: {
      status,
      approvedBy: status === 'APPROVED' || status === 'REJECTED' ? adminId : null
    }
  });

  if (previousStatus !== normalizedStatus) {
    try {
      await createNotification({
        userId: category.createdBy,
        type: 'JOB_UPDATED',
        title: 'Category status updated',
        description: `Your category "${category.name}" is now ${normalizedStatus}.`,
        icon: normalizedStatus === 'APPROVED' ? 'checkmark-circle-outline' : normalizedStatus === 'REJECTED' ? 'close-circle-outline' : 'time-outline',
        actionPage: 'MY_CATEGORIES'
      });
    } catch (_error) {
      // Notification delivery should not block category status updates.
    }
  }

  return updated;
};

export const updateCategory = async (categoryId, payload) => {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: {
      id: true,
      name: true
    }
  });

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  const updates: { name?: string; description?: string | null } = {};

  if (payload?.name !== undefined) {
    const normalizedName = String(payload.name || '')
      .trim()
      .replace(/\s+/g, ' ');

    if (!normalizedName) {
      throw new ApiError(400, 'Category name cannot be empty');
    }

    const duplicate = await prisma.category.findFirst({
      where: {
        id: { not: categoryId },
        name: {
          equals: normalizedName,
          mode: 'insensitive'
        }
      },
      select: { id: true }
    });

    if (duplicate) {
      throw new ApiError(409, 'Category name already exists');
    }

    updates.name = normalizedName;
  }

  if (payload?.description !== undefined) {
    const normalizedDescription = String(payload.description || '').trim();
    updates.description = normalizedDescription || null;
  }

  if (!Object.keys(updates).length) {
    throw new ApiError(400, 'Nothing to update');
  }

  try {
    return await prisma.category.update({
      where: { id: categoryId },
      data: updates
    });
  } catch (error) {
    if (isMissingDescriptionColumnError(error) && updates.description !== undefined) {
      const { description: _description, ...fallbackUpdates } = updates;
      if (!Object.keys(fallbackUpdates).length) {
        return { ...category, description: null };
      }
      const fallback = await prisma.category.update({
        where: { id: categoryId },
        data: fallbackUpdates
      });
      return { ...fallback, description: null };
    }
    throw error;
  }
};

export const deleteCategory = async (categoryId) => {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: {
      id: true,
      name: true
    }
  });

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  const linkedJobsCount = await prisma.job.count({
    where: { categoryId }
  });
  if (linkedJobsCount > 0) {
    throw new ApiError(409, 'Cannot delete category because it is used by existing jobs');
  }

  try {
    await prisma.category.delete({
      where: { id: categoryId }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      throw new ApiError(409, 'Cannot delete category because it is used by existing jobs');
    }
    throw error;
  }

  return category;
};
