import asyncHandler from '../../utils/asyncHandler.js';
import { getConversationsByUser as getConversationsByUserService, getMessagesByJob as getMessagesByJobService } from './chat.service.js';

export const getMessagesByJob = asyncHandler(async (req, res) => {
  const result = await getMessagesByJobService(req.params.jobId, req.user.id, req.user.role, req.query.peerId);
  return res.status(200).json({ success: true, data: result });
});

export const getConversationsByUser = asyncHandler(async (req, res) => {
  const result = await getConversationsByUserService(req.user.id);
  return res.status(200).json({ success: true, data: result });
});
