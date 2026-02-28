import asyncHandler from '../../utils/asyncHandler.js';
import * as service from './user.service.js';

export const getProfile = asyncHandler(async (req, res) => {
  const result = await service.getProfile(req.user.id);
  return res.status(200).json({ success: true, data: result });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const result = await service.updateProfile(req.user.id, req.body);
  return res.status(200).json({ success: true, message: 'Profile updated', data: result });
});

export const updateAvatar = asyncHandler(async (req, res) => {
  const result = await service.updateAvatar(req.user.id, req.body);
  return res.status(200).json({ success: true, message: 'Avatar updated', data: result });
});

export const softDeleteAccount = asyncHandler(async (req, res) => {
  const result = await service.softDeleteAccount(req.user.id);
  return res.status(200).json({ success: true, data: result });
});

export const getAllUsers = asyncHandler(async (req, res) => {
  const result = await service.getAllUsers(req.query);
  return res.status(200).json({ success: true, data: result });
});

export const updateUserAccess = asyncHandler(async (req, res) => {
  const result = await service.updateUserAccess(req.user.id, req.params.id, req.body);
  return res.status(200).json({ success: true, message: 'User access updated', data: result });
});
