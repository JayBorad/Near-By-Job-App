import { resolveUserFromToken } from '../middleware/auth.middleware.js';
import {
  createMessage,
  markMessagesDelivered,
  markMessagesSeen,
  validateChatParticipants
} from '../modules/chat/chat.service.js';

const connectedUsers = new Map();

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

export const setupChatSocket = (io) => {
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
      const seenIds = await markMessagesSeen({ jobId, viewerId: currentUserId });
      if (seenIds.length) {
        io.to(jobId).emit('message_status_updated', {
          messageIds: seenIds,
          status: 'SEEN'
        });
      }
      if (ack) ack({ success: true, data: { online: isUserOnline(peerId) } });
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
