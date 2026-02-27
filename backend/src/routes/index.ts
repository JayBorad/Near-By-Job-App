import express from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import userRoutes from '../modules/user/user.routes.js';
import categoryRoutes from '../modules/category/category.routes.js';
import jobRoutes from '../modules/job/job.routes.js';
import applicationRoutes from '../modules/application/application.routes.js';
import chatRoutes from '../modules/chat/chat.routes.js';

const router = express.Router();

router.get('/health', (_req, res) => {
  return res.status(200).json({ success: true, message: 'API is healthy' });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/jobs', jobRoutes);
router.use('/applications', applicationRoutes);
router.use('/chats', chatRoutes);

export default router;
