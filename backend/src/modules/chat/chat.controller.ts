import asyncHandler from '../../utils/asyncHandler.js';
import { getMessagesByJob as getMessagesByJobService } from './chat.service.js';

export const getMessagesByJob = asyncHandler(async (req, res) => {
  const result = await getMessagesByJobService(req.params.jobId, req.user.id);
  return res.status(200).json({ success: true, data: result });
});
