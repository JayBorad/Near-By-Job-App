import prisma from '../config/prisma.js';
import ApiError from '../utils/ApiError.js';

export const ensureJobOwner = async (req, _res, next) => {
  try {
    const jobId = req.params.id || req.params.jobId;
    if (!jobId) {
      return next(new ApiError(400, 'Job id is required'));
    }

    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        deletedAt: null
      }
    });

    if (!job) {
      return next(new ApiError(404, 'Job not found'));
    }

    if (job.createdBy !== req.user.id) {
      return next(new ApiError(403, 'Only job owner can perform this action'));
    }

    req.job = job;
    return next();
  } catch (error) {
    return next(error);
  }
};
