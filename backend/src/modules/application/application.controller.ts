import asyncHandler from '../../utils/asyncHandler.js';
import * as service from './application.service.js';

export const applyJob = asyncHandler(async (req, res) => {
  const result = await service.applyJob(req.user.id, req.body.jobId);
  return res.status(201).json({ success: true, message: 'Applied successfully', data: result });
});

export const acceptApplication = asyncHandler(async (req, res) => {
  const result = await service.updateApplicationStatus(req.user.id, req.params.id, 'ACCEPTED');
  return res.status(200).json({ success: true, message: 'Application accepted', data: result });
});

export const rejectApplication = asyncHandler(async (req, res) => {
  const result = await service.updateApplicationStatus(req.user.id, req.params.id, 'REJECTED');
  return res.status(200).json({ success: true, message: 'Application rejected', data: result });
});

export const getApplicationsByJob = asyncHandler(async (req, res) => {
  const result = await service.getApplicationsByJob(req.user.id, req.params.jobId);
  return res.status(200).json({ success: true, data: result });
});

export const getAppliedJobsByUser = asyncHandler(async (req, res) => {
  const result = await service.getAppliedJobsByUser(req.user.id);
  return res.status(200).json({ success: true, data: result });
});
