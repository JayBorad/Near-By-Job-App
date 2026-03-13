import asyncHandler from '../../utils/asyncHandler.js';
import * as service from './notification.service.js';

export const getMyNotifications = asyncHandler(async (req, res) => {
  const result = await service.getMyNotifications(req.user.id);
  return res.status(200).json({ success: true, data: result });
});

export const markNotificationAsRead = asyncHandler(async (req, res) => {
  const result = await service.markNotificationAsRead(req.user.id, req.params.id);
  return res.status(200).json({ success: true, data: result });
});

export const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const result = await service.markAllNotificationsAsRead(req.user.id);
  return res.status(200).json({ success: true, data: result });
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const result = await service.deleteNotification(req.user.id, req.params.id);
  return res.status(200).json({ success: true, data: result });
});

export const deleteAllNotifications = asyncHandler(async (req, res) => {
  const result = await service.deleteAllNotifications(req.user.id);
  return res.status(200).json({ success: true, data: result });
});
