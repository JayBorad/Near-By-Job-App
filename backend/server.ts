import http from 'node:http';
import { Server } from 'socket.io';
import app from './src/app.js';
import env from './src/config/env.js';
import { setupChatSocket } from './src/sockets/chat.socket.js';

const server = http.createServer(app);
const LOCAL_DEV_ORIGIN_PATTERN = /^https?:\/\/(?:localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3})(?::\d+)?$/;
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
  'http://127.0.0.1:19006'
];

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        env.clientUrl === '*' ||
        socketAllowedOrigins.includes(origin) ||
        (env.nodeEnv !== 'production' && LOCAL_DEV_ORIGIN_PATTERN.test(origin))
      ) {
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
