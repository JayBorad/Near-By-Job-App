import prisma from '../../config/prisma.js';
import ApiError from '../../utils/ApiError.js';

export const applyJob = async (userId, jobId) => {
  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      deletedAt: null,
      status: 'OPEN'
    }
  });

  if (!job) {
    throw new ApiError(404, 'Open job not found');
  }

  if (job.createdBy === userId) {
    throw new ApiError(400, 'Job owner cannot apply to own job');
  }

  const existing = await prisma.jobApplication.findUnique({
    where: {
      jobId_applicantId: {
        jobId,
        applicantId: userId
      }
    }
  });

  if (existing) {
    throw new ApiError(409, 'You already applied to this job');
  }

  return prisma.jobApplication.create({
    data: {
      jobId,
      applicantId: userId
    }
  });
};

export const updateApplicationStatus = async (ownerId, ownerRole, applicationId, status) => {
  const application = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    include: { job: true }
  });

  if (!application) {
    throw new ApiError(404, 'Application not found');
  }

  if (ownerRole !== 'ADMIN' && application.job.createdBy !== ownerId) {
    throw new ApiError(403, 'Only job owner can update application status');
  }

  if (application.status !== 'PENDING') {
    throw new ApiError(400, 'Only pending applications can be updated');
  }

  if (status === 'ACCEPTED') {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.jobApplication.update({
        where: { id: applicationId },
        data: { status: 'ACCEPTED' }
      });

      await tx.job.update({
        where: { id: application.jobId },
        data: { status: 'IN_PROGRESS' }
      });

      return updated;
    });
  }

  return prisma.jobApplication.update({
    where: { id: applicationId },
    data: { status }
  });
};

export const getApplicationsByJob = async (ownerId, ownerRole, jobId) => {
  const job = await prisma.job.findFirst({ where: { id: jobId, deletedAt: null } });
  if (!job) {
    throw new ApiError(404, 'Job not found');
  }

  if (ownerRole !== 'ADMIN' && job.createdBy !== ownerId) {
    throw new ApiError(403, 'Only job owner can view applications');
  }

  return prisma.jobApplication.findMany({
    where: { jobId },
    include: {
      applicant: {
        select: { id: true, name: true, email: true, phone: true, avatar: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

export const getAppliedJobsByUser = async (userId) => {
  return prisma.jobApplication.findMany({
    where: { applicantId: userId },
    include: {
      job: {
        include: {
          category: true,
          owner: { select: { id: true, name: true, email: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};
