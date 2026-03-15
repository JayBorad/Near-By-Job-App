import asyncHandler from '../../utils/asyncHandler.js';
import * as service from './report.service.js';

export const createReport = asyncHandler(async (req, res) => {
  const result = await service.createReport(req.user.id, req.body);
  return res.status(201).json({ success: true, message: 'Report submitted successfully', data: result });
});

export const getMyReports = asyncHandler(async (req, res) => {
  const result = await service.getMyReports(req.user.id);
  return res.status(200).json({ success: true, data: result });
});

export const getAllReports = asyncHandler(async (req, res) => {
  const result = await service.getAllReports(req.query);
  return res.status(200).json({ success: true, data: result });
});

export const getReportById = asyncHandler(async (req, res) => {
  const result = await service.getReportById(req.user.id, req.user.role, req.params.id);
  return res.status(200).json({ success: true, data: result });
});

export const updateReportStatus = asyncHandler(async (req, res) => {
  const result = await service.updateReportStatus(req.user.id, req.params.id, req.body.status);
  return res.status(200).json({ success: true, message: 'Report status updated', data: result });
});
