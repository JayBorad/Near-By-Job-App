import { resolveUserFromToken } from '../middleware/auth.middleware.js';
import {
  createMessage,
  markMessagesDelivered,
  markMessagesSeen,
  validateChatParticipants
} from '../modules/chat/chat.service.js';
import { createNotification } from '../modules/notification/notification.service.js';

const connectedUsers = new Map();
let ioRef = null;

const addConnectedUserSocket = (userId, socketId) => {
  const existing = connectedUsers.get(userId) || new Set();
  existing.add(socketId);
  connectedUsers.set(userId, existing);
};

const removeConnectedUserSocket = (userId, socketId) => {
  const existing = connectedUsers.get(userId);
  if (!existing) return;
  existing.delete(socketId);
  if (!existing.size) {
    connectedUsers.delete(userId);
  } else {
    connectedUsers.set(userId, existing);
  }
};

const isUserOnline = (userId) => {
  const existing = connectedUsers.get(userId);
  return Boolean(existing && existing.size);
};

const isUserInActiveConversation = (io, userId, jobId, peerId) => {
  if (!userId || !jobId || !peerId) return false;
  const socketIds = Array.from(connectedUsers.get(userId) || []);
  return socketIds.some((socketId) => {
    const socket = io.sockets.sockets.get(socketId);
    const activeChat = socket?.data?.activeChat;
    return Boolean(activeChat?.jobId === jobId && activeChat?.peerId === peerId);
  });
};

export const emitNotificationToUser = (userId, notification) => {
  if (!userId || !notification || !ioRef) return;
  const socketIds = Array.from(connectedUsers.get(userId) || []);
  socketIds.forEach((socketId) => {
    ioRef.to(socketId).emit('notification_created', notification);
  });
};

const emitChatAlertToUser = (userId, payload) => {
  if (!userId || !payload || !ioRef) return;
  const socketIds = Array.from(connectedUsers.get(userId) || []);
  socketIds.forEach((socketId) => {
    ioRef.to(socketId).emit('chat_message_alert', payload);
  });
};

export const setupChatSocket = (io) => {
  ioRef = io;
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Missing auth token'));
      }

      const user = await resolveUserFromToken(token);
      socket.user = user;
      return next();
    } catch (_error) {
      return next(new Error('Unauthorized socket connection'));
    }
  });

  io.on('connection', (socket) => {
    const currentUserId = socket.user.id;
    const currentUserRole = socket.user.role;
    addConnectedUserSocket(currentUserId, socket.id);

    socket.on('join_job_room', async ({ jobId, peerId }, ack) => {
      if (!jobId || !peerId) {
        if (ack) ack({ success: false, message: 'jobId and peerId are required' });
        return;
      }
      try {
        await validateChatParticipants(jobId, currentUserId, peerId, currentUserRole);
      } catch (error) {
        if (ack) ack({ success: false, message: error.message });
        return;
      }
      socket.join(jobId);
      socket.data.activeChat = { jobId, peerId };
      const seenIds = await markMessagesSeen({ jobId, viewerId: currentUserId });
      if (seenIds.length) {
        io.to(jobId).emit('message_status_updated', {
          messageIds: seenIds,
          status: 'SEEN'
        });
      }
      if (ack) ack({ success: true, data: { online: isUserOnline(peerId) } });
    });

    socket.on('leave_job_room', ({ jobId }, ack) => {
      if (!jobId) {
        if (ack) ack({ success: false, message: 'jobId is required' });
        return;
      }
      if (socket?.data?.activeChat?.jobId === jobId) {
        socket.data.activeChat = null;
      }
      socket.leave(jobId);
      if (ack) ack({ success: true });
    });

    socket.on('check_user_online', ({ userId }, ack) => {
      if (!ack) return;
      ack({ success: true, data: { online: isUserOnline(userId) } });
    });

    socket.on('typing_start', async ({ jobId, receiverId }) => {
      if (!jobId || !receiverId) return;
      try {
        await validateChatParticipants(jobId, currentUserId, receiverId, currentUserRole);
      } catch (_error) {
        return;
      }
      io.to(jobId).emit('typing', { jobId, userId: currentUserId, isTyping: true });
    });

    socket.on('typing_stop', async ({ jobId, receiverId }) => {
      if (!jobId || !receiverId) return;
      try {
        await validateChatParticipants(jobId, currentUserId, receiverId, currentUserRole);
      } catch (_error) {
        return;
      }
      io.to(jobId).emit('typing', { jobId, userId: currentUserId, isTyping: false });
    });

    socket.on('mark_seen', async ({ jobId, peerId }, ack) => {
      if (!jobId || !peerId) {
        if (ack) ack({ success: false, message: 'jobId and peerId are required' });
        return;
      }
      try {
        await validateChatParticipants(jobId, currentUserId, peerId, currentUserRole);
        const seenIds = await markMessagesSeen({ jobId, viewerId: currentUserId });
        if (seenIds.length) {
          io.to(jobId).emit('message_status_updated', {
            messageIds: seenIds,
            status: 'SEEN'
          });
        }
        if (ack) ack({ success: true });
      } catch (error) {
        if (ack) ack({ success: false, message: error.message });
      }
    });

    socket.on('send_message', async (payload, ack) => {
      try {
        const message = await createMessage({
          jobId: payload.jobId,
          senderId: currentUserId,
          receiverId: payload.receiverId,
          message: payload.message,
          senderRole: currentUserRole
        });

        io.to(payload.jobId).emit('new_message', message);

        if (!isUserInActiveConversation(io, payload.receiverId, payload.jobId, currentUserId)) {
          const senderName = socket.user?.name || socket.user?.username || 'User';
          const alertPayload = {
            id: `rt-${message.id}`,
            userId: payload.receiverId,
            type: 'CHAT_MESSAGE',
            title: `${senderName} sent you a message`,
            description: String(payload?.message || '').trim() || 'Open chat to reply.',
            icon: 'chatbubble-ellipses-outline',
            isRead: false,
            actionPage: 'MESSAGES',
            jobId: payload.jobId,
            applicationId: currentUserId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            localOnly: true
          };
          let storedNotificationId = null;
          try {
            const createdNotification = await createNotification({
              userId: payload.receiverId,
              type: 'CHAT_MESSAGE',
              title: alertPayload.title,
              description: alertPayload.description,
              icon: 'chatbubble-ellipses-outline',
              actionPage: 'MESSAGES',
              jobId: payload.jobId,
              applicationId: currentUserId
            });
            storedNotificationId = createdNotification?.id || null;
          } catch (_error) {
            // Notification failures must not block chat message delivery.
          }
          if (!storedNotificationId) {
            emitChatAlertToUser(payload.receiverId, alertPayload);
          }
        }

        if (isUserOnline(payload.receiverId)) {
          const deliveredIds = await markMessagesDelivered({
            jobId: payload.jobId,
            receiverId: payload.receiverId
          });
          if (deliveredIds.length) {
            io.to(payload.jobId).emit('message_status_updated', {
              messageIds: deliveredIds,
              status: 'DELIVERED'
            });
          }
        }

        if (ack) ack({ success: true, data: message });
      } catch (error) {
        if (ack) ack({ success: false, message: error.message });
      }
    });

    socket.on('disconnect', () => {
      removeConnectedUserSocket(currentUserId, socket.id);
    });
  });
};
