import express from 'express';
import * as controller from './notification.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import { notificationIdParamValidator } from './notification.validator.js';

const router = express.Router();

router.get(
  '/',
  authenticate,
  authorizeRoles('USER', 'ADMIN'),
  controller.getMyNotifications
);

router.patch(
  '/read-all',
  authenticate,
  authorizeRoles('USER', 'ADMIN'),
  controller.markAllNotificationsAsRead
);

router.patch(
  '/:id/read',
  authenticate,
  authorizeRoles('USER', 'ADMIN'),
  notificationIdParamValidator,
  validate,
  controller.markNotificationAsRead
);

router.delete(
  '/delete-all',
  authenticate,
  authorizeRoles('USER', 'ADMIN'),
  controller.deleteAllNotifications
);

router.delete(
  '/:id',
  authenticate,
  authorizeRoles('USER', 'ADMIN'),
  notificationIdParamValidator,
  validate,
  controller.deleteNotification
);

export default router;
