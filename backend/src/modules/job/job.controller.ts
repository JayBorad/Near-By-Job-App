import asyncHandler from '../../utils/asyncHandler.js';
import * as service from './job.service.js';

export const createJob = asyncHandler(async (req, res) => {
  const result = await service.createJob(req.user.id, req.body);
  return res.status(201).json({ success: true, message: 'Job created successfully', data: result });
});

export const updateJob = asyncHandler(async (req, res) => {
  const result = await service.updateJob(req.params.id, req.body);
  return res.status(200).json({ success: true, message: 'Job updated successfully', data: result });
});

export const deleteJob = asyncHandler(async (req, res) => {
  const result = await service.softDeleteJob(req.params.id);
  return res.status(200).json({ success: true, data: result });
});

export const getAllJobs = asyncHandler(async (req, res) => {
  const result = await service.getAllJobs(req.query);
  return res.status(200).json({ success: true, data: result });
});

export const getJobById = asyncHandler(async (req, res) => {
  const result = await service.getJobById(req.params.id);
  return res.status(200).json({ success: true, data: result });
});

export const findNearbyJobs = asyncHandler(async (req, res) => {
  const result = await service.findNearbyJobs(req.query);
  return res.status(200).json({ success: true, data: result });
});
