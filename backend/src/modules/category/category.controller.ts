import asyncHandler from '../../utils/asyncHandler.js';
import * as service from './category.service.js';

export const createCategory = asyncHandler(async (req, res) => {
  const result = await service.createCategory(req.user.id, req.body);
  return res.status(201).json({ success: true, message: 'Category submitted for approval', data: result });
});

export const getApprovedCategories = asyncHandler(async (_req, res) => {
  const result = await service.getApprovedCategories(_req.query);
  return res.status(200).json({ success: true, data: result });
});

export const getMyCategories = asyncHandler(async (req, res) => {
  const result = await service.getMyCategories(req.user.id, req.query);
  return res.status(200).json({ success: true, data: result });
});

export const updateCategoryStatus = asyncHandler(async (req, res) => {
  const result = await service.updateCategoryStatus(req.params.id, req.user.id, req.body.status);
  return res.status(200).json({ success: true, message: `Category ${req.body.status.toLowerCase()}`, data: result });
});
