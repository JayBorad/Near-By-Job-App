import express from 'express';
import * as controller from './application.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/role.middleware.js';
import { authorizeUserModes } from '../../middleware/user-mode.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import {
  applyJobValidator,
  applicationIdValidator,
  jobIdParamValidator
} from './application.validator.js';

const router = express.Router();

router.post(
  '/',
  authenticate,
  authorizeRoles('USER', 'ADMIN'),
  authorizeUserModes('JOB_PICKER'),
  applyJobValidator,
  validate,
  controller.applyJob
);
router.patch(
  '/:id/accept',
  authenticate,
  authorizeRoles('USER', 'ADMIN'),
  authorizeUserModes('JOB_POSTER'),
  applicationIdValidator,
  validate,
  controller.acceptApplication
);
router.patch(
  '/:id/reject',
  authenticate,
  authorizeRoles('USER', 'ADMIN'),
  authorizeUserModes('JOB_POSTER'),
  applicationIdValidator,
  validate,
  controller.rejectApplication
);
router.get(
  '/job/:jobId',
  authenticate,
  authorizeRoles('USER', 'ADMIN'),
  authorizeUserModes('JOB_POSTER', 'JOB_PICKER'),
  jobIdParamValidator,
  validate,
  controller.getApplicationsByJob
);
router.get(
  '/me',
  authenticate,
  authorizeRoles('USER', 'ADMIN'),
  authorizeUserModes('JOB_PICKER', 'JOB_POSTER'),
  controller.getAppliedJobsByUser
);

export default router;
