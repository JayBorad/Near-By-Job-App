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

const hasAppliedToJob = async (jobId, userId) => {
  const application = await prisma.jobApplication.findFirst({
    where: {
      jobId,
      applicantId: userId
    },
    select: { id: true }
  });

  return Boolean(application);
};

export const validateChatParticipants = async (jobId, senderId, receiverId, senderRole = 'USER') => {
  const job = await getJobContext(jobId);

  if (senderRole === 'ADMIN') {
    if (receiverId === job.createdBy) return job;
    const isApplicant = await hasAppliedToJob(jobId, receiverId);
    if (!isApplicant) {
      throw new ApiError(403, 'Admin can only chat with job owner or job applicants');
    }
    return job;
  }

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

export const getMessagesByJob = async (jobId, userId, userRole = 'USER', peerId) => {
  const job = await getJobContext(jobId);

  if (userRole === 'ADMIN') {
    if (!peerId) {
      throw new ApiError(400, 'peerId is required for admin chat');
    }
    const peerIsOwner = peerId === job.createdBy;
    if (!peerIsOwner) {
      const isApplicant = await hasAppliedToJob(jobId, peerId);
      if (!isApplicant) {
        throw new ApiError(403, 'Admin can only view chats with job owner or applicants');
      }
    }

    return prisma.chatMessage.findMany({
      where: {
        jobId,
        OR: [
          { senderId: userId, receiverId: peerId },
          { senderId: peerId, receiverId: userId }
        ]
      },
      orderBy: { createdAt: 'asc' }
    });
  }

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

export const createMessage = async ({ jobId, senderId, receiverId, message, senderRole = 'USER' }) => {
  await validateChatParticipants(jobId, senderId, receiverId, senderRole);

  return prisma.chatMessage.create({
    data: {
      jobId,
      senderId,
      receiverId,
      message
    }
  });
};

export const getConversationsByUser = async (userId) => {
  const messages = await prisma.chatMessage.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }]
    },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          status: true
        }
      },
      sender: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
          userMode: true
        }
      },
      receiver: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
          userMode: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const conversationsMap = new Map();

  messages.forEach((message) => {
    const isSentByMe = message.senderId === userId;
    const peer = isSentByMe ? message.receiver : message.sender;
    const conversationKey = `${message.jobId}:${peer.id}`;
    const current = conversationsMap.get(conversationKey);
    const isUnreadForMe = message.receiverId === userId && message.status !== 'SEEN';

    if (!current) {
      conversationsMap.set(conversationKey, {
        job: message.job,
        peer,
        lastMessage: {
          id: message.id,
          message: message.message,
          createdAt: message.createdAt,
          senderId: message.senderId,
          receiverId: message.receiverId,
          status: message.status
        },
        unreadCount: isUnreadForMe ? 1 : 0
      });
      return;
    }

    if (isUnreadForMe) {
      current.unreadCount += 1;
    }
  });

  return Array.from(conversationsMap.values()).sort(
    (a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
  );
};

export const markMessagesDelivered = async ({ jobId, receiverId }) => {
  const pending = await prisma.chatMessage.findMany({
    where: {
      jobId,
      receiverId,
      status: 'SENT'
    },
    select: { id: true }
  });

  if (!pending.length) return [];

  const now = new Date();
  await prisma.chatMessage.updateMany({
    where: {
      id: { in: pending.map((item) => item.id) }
    },
    data: {
      status: 'DELIVERED',
      deliveredAt: now
    }
  });

  return pending.map((item) => item.id);
};

export const markMessagesSeen = async ({ jobId, viewerId }) => {
  const unread = await prisma.chatMessage.findMany({
    where: {
      jobId,
      receiverId: viewerId,
      status: { in: ['SENT', 'DELIVERED'] }
    },
    select: { id: true }
  });

  if (!unread.length) return [];

  const now = new Date();
  await prisma.chatMessage.updateMany({
    where: {
      id: { in: unread.map((item) => item.id) }
    },
    data: {
      status: 'SEEN',
      deliveredAt: now,
      seenAt: now
    }
  });

  return unread.map((item) => item.id);
};
