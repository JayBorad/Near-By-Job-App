import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import routes from './routes/index.js';
import swaggerSpec from './config/swagger.js';
import { errorHandler } from './middleware/error.middleware.js';
import notFound from './middleware/notFound.middleware.js';
import env from './config/env.js';

const app = express();
const LOCAL_DEV_ORIGIN_PATTERN = /^https?:\/\/(?:localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3})(?::\d+)?$/;

app.use(helmet());
const allowedOrigins = [
  env.clientUrl,
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:19006',
  'http://127.0.0.1:19006'
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        env.clientUrl === '*' ||
        allowedOrigins.includes(origin) ||
        (env.nodeEnv !== 'production' && LOCAL_DEV_ORIGIN_PATTERN.test(origin))
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
