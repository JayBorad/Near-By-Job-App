import express from 'express';
import * as controller from './review.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/role.middleware.js';
import { authorizeUserModes } from '../../middleware/user-mode.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import { createReviewValidator, userIdParamValidator } from './review.validator.js';

const router = express.Router();

router.post(
  '/',
  authenticate,
  authorizeRoles('USER', 'ADMIN'),
  authorizeUserModes('JOB_POSTER', 'JOB_PICKER'),
  createReviewValidator,
  validate,
  controller.createOrUpdateReview
);

router.get(
  '/received/me',
  authenticate,
  authorizeRoles('USER', 'ADMIN'),
  authorizeUserModes('JOB_POSTER', 'JOB_PICKER'),
  controller.getMyReceivedReviews
);

router.get(
  '/received/:userId',
  authenticate,
  authorizeRoles('USER', 'ADMIN'),
  authorizeUserModes('JOB_POSTER', 'JOB_PICKER'),
  userIdParamValidator,
  validate,
  controller.getUserReceivedReviews
);

export default router;
