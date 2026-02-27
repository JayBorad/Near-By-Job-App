import http from 'node:http';
import { Server } from 'socket.io';
import app from './src/app.js';
import env from './src/config/env.js';
import { setupChatSocket } from './src/sockets/chat.socket.js';

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.clientUrl === '*' ? true : env.clientUrl,
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

setupChatSocket(io);

server.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});
