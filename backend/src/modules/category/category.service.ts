import prisma from '../../config/prisma.js';
import ApiError from '../../utils/ApiError.js';
import { CategoryStatus } from '@prisma/client';

const isMissingDescriptionColumnError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('does not exist') &&
    (message.includes('category.description') || message.includes('column `description`'))
  );
};

export const createCategory = async (userId, payload) => {
  try {
    return await prisma.category.create({
      data: {
        name: payload.name,
        description: payload.description || null,
        status: 'PENDING',
        createdBy: userId
      }
    });
  } catch (error) {
    if (isMissingDescriptionColumnError(error)) {
      const fallback = await prisma.category.create({
        data: {
          name: payload.name,
          status: 'PENDING',
          createdBy: userId
        }
      });
      return { ...fallback, description: null };
    }
    throw error;
  }
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
            username: true
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
            username: true
          }
        }
      }
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

  return prisma.category.update({
    where: { id: categoryId },
    data: {
      status,
      approvedBy: adminId
    }
  });
};
