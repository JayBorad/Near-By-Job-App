import { resolveUserFromToken } from '../middleware/auth.middleware.js';
import { createMessage } from '../modules/chat/chat.service.js';

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
    socket.on('join_job_room', async ({ jobId }) => {
      if (!jobId) return;
      socket.join(jobId);
    });

    socket.on('send_message', async (payload, ack) => {
      try {
        const message = await createMessage({
          jobId: payload.jobId,
          senderId: socket.user.id,
          receiverId: payload.receiverId,
          message: payload.message
        });

        io.to(payload.jobId).emit('new_message', message);
        if (ack) ack({ success: true, data: message });
      } catch (error) {
        if (ack) ack({ success: false, message: error.message });
      }
    });
  });
};
