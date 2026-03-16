import http from 'node:http';
import { Server } from 'socket.io';
import app from './src/app.js';
import env from './src/config/env.js';
import { setupChatSocket } from './src/sockets/chat.socket.js';

const server = http.createServer(app);
const parsedClientOrigins = String(env.clientUrl || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const socketAllowedOrigins = [
  ...parsedClientOrigins,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:19006',
  'http://127.0.0.1:19006',
  'http://192.168.31.157:8081',
  'http://192.168.31.157:19006'
];

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (env.clientUrl === '*' || socketAllowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Socket CORS blocked for origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true
  }
});

setupChatSocket(io);

server.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});
