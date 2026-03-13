import prisma from '../../config/prisma.js';
import ApiError from '../../utils/ApiError.js';
import { emitNotificationToUser } from '../../sockets/chat.socket.js';

const getDefaultNotificationIcon = (type) => {
  const normalized = String(type || '').toUpperCase();
  if (normalized === 'JOB_APPLIED') return 'briefcase-outline';
  if (normalized === 'APPLICATION_ACCEPTED') return 'checkmark-circle';
  if (normalized === 'APPLICATION_REJECTED') return 'close-circle';
  if (normalized === 'JOB_UPDATED') return 'create-outline';
  if (normalized === 'JOB_CANCELLED') return 'alert-circle';
  if (normalized === 'ADMIN_JOB_UPDATED') return 'shield-checkmark-outline';
  return 'notifications';
};

const isMissingNotificationTableError = (error) => {
  const message = String(error?.message || '');
  return error?.code === 'P2021' || message.includes('public.Notification') || message.includes('relation "Notification" does not exist');
};

const mapNotification = (item) => ({
  id: item.id,
  userId: item.userId,
  type: item.type,
  title: item.title,
  description: item.description,
  icon: item.icon,
  isRead: item.isRead,
  readAt: item.readAt,
  actionPage: item.actionPage,
  jobId: item.jobId,
  applicationId: item.applicationId,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt
});

export const createNotification = async ({
  userId,
  type,
  title,
  description,
  icon = null,
  actionPage = null,
  jobId = null,
  applicationId = null
}) => {
  if (!userId || !type || !title || !description) return null;
  try {
    const created = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        description,
        icon: icon || getDefaultNotificationIcon(type),
        actionPage,
        jobId,
        applicationId
      }
    });
    const payload = mapNotification(created);
    emitNotificationToUser(userId, payload);
    return payload;
  } catch (error) {
    if (isMissingNotificationTableError(error)) {
      return null;
    }
    throw error;
  }
};

export const createNotificationsBulk = async (records = []) => {
  const uniqueByUserAndKey = new Map();
  records.forEach((record) => {
    if (!record?.userId || !record?.type || !record?.title || !record?.description) return;
    const dedupeKey = `${record.userId}:${record.type}:${record.jobId || ''}:${record.applicationId || ''}`;
    if (!uniqueByUserAndKey.has(dedupeKey)) {
      uniqueByUserAndKey.set(dedupeKey, record);
    }
  });

  const items = Array.from(uniqueByUserAndKey.values());
  const created = [];
  for (const item of items) {
    // Keep insert order deterministic so latest are emitted in user-facing order.
    // eslint-disable-next-line no-await-in-loop
    const row = await createNotification(item);
    if (row) created.push(row);
  }
  return created;
};

export const getMyNotifications = async (userId) => {
  let rows = [];
  try {
    rows = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    if (isMissingNotificationTableError(error)) {
      return [];
    }
    throw error;
  }

  return rows.map(mapNotification);
};

export const markNotificationAsRead = async (userId, notificationId) => {
  const target = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId
    }
  });
  if (!target) {
    throw new ApiError(404, 'Notification not found');
  }

  if (target.isRead) return mapNotification(target);

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: {
      isRead: true,
      readAt: new Date()
    }
  });
  return mapNotification(updated);
};

export const markAllNotificationsAsRead = async (userId) => {
  const now = new Date();
  await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false
    },
    data: {
      isRead: true,
      readAt: now
    }
  });

  return { success: true };
};

export const deleteNotification = async (userId, notificationId) => {
  const target = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId
    }
  });
  if (!target) {
    throw new ApiError(404, 'Notification not found');
  }

  await prisma.notification.delete({ where: { id: notificationId } });
  return { success: true };
};

export const deleteAllNotifications = async (userId) => {
  await prisma.notification.deleteMany({
    where: { userId }
  });
  return { success: true };
};
