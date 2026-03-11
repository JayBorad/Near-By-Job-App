import asyncHandler from '../../utils/asyncHandler.js';
import * as service from './review.service.js';

export const createOrUpdateReview = asyncHandler(async (req, res) => {
  const result = await service.createOrUpdateReview(req.user.id, req.user.role, req.user.userMode, req.body);
  return res.status(201).json({ success: true, message: 'Review submitted successfully', data: result });
});

export const getMyReceivedReviews = asyncHandler(async (req, res) => {
  const result = await service.getReviewsReceivedByUser(req.user.id, req.user.role, req.user.id);
  return res.status(200).json({ success: true, data: result });
});

export const getUserReceivedReviews = asyncHandler(async (req, res) => {
  const result = await service.getReviewsReceivedByUser(req.user.id, req.user.role, req.params.userId);
  return res.status(200).json({ success: true, data: result });
});
