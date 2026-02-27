import prisma from '../../config/prisma.js';
import ApiError from '../../utils/ApiError.js';

const getJobContext = async (jobId) => {
  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      deletedAt: null
    }
  });

  if (!job) {
    throw new ApiError(404, 'Job not found');
  }

  return job;
};

const isAcceptedApplicant = async (jobId, userId) => {
  const application = await prisma.jobApplication.findFirst({
    where: {
      jobId,
      applicantId: userId,
      status: 'ACCEPTED'
    }
  });

  return Boolean(application);
};

export const validateChatParticipants = async (jobId, senderId, receiverId) => {
  const job = await getJobContext(jobId);

  const senderIsOwner = job.createdBy === senderId;
  const receiverIsOwner = job.createdBy === receiverId;

  if (!senderIsOwner && !receiverIsOwner) {
    throw new ApiError(403, 'Chat allowed only with job owner');
  }

  const applicantId = senderIsOwner ? receiverId : senderId;
  const accepted = await isAcceptedApplicant(jobId, applicantId);

  if (!accepted) {
    throw new ApiError(403, 'Chat allowed only with accepted applicant');
  }

  return job;
};

export const getMessagesByJob = async (jobId, userId) => {
  const job = await getJobContext(jobId);

  if (job.createdBy === userId) {
    return prisma.chatMessage.findMany({
      where: { jobId },
      orderBy: { createdAt: 'asc' }
    });
  }

  const accepted = await isAcceptedApplicant(jobId, userId);
  if (!accepted) {
    throw new ApiError(403, 'Not authorized to view this chat');
  }

  return prisma.chatMessage.findMany({
    where: {
      jobId,
      OR: [
        { senderId: job.createdBy, receiverId: userId },
        { senderId: userId, receiverId: job.createdBy }
      ]
    },
    orderBy: { createdAt: 'asc' }
  });
};

export const createMessage = async ({ jobId, senderId, receiverId, message }) => {
  await validateChatParticipants(jobId, senderId, receiverId);

  return prisma.chatMessage.create({
    data: {
      jobId,
      senderId,
      receiverId,
      message
    }
  });
};
