import express from 'express';
import * as controller from './application.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import {
  applyJobValidator,
  applicationIdValidator,
  jobIdParamValidator
} from './application.validator.js';

const router = express.Router();

router.post('/', authenticate, authorizeRoles('JOB_PICKER'), applyJobValidator, validate, controller.applyJob);
router.patch(
  '/:id/accept',
  authenticate,
  authorizeRoles('JOB_POSTER', 'ADMIN'),
  applicationIdValidator,
  validate,
  controller.acceptApplication
);
router.patch(
  '/:id/reject',
  authenticate,
  authorizeRoles('JOB_POSTER', 'ADMIN'),
  applicationIdValidator,
  validate,
  controller.rejectApplication
);
router.get(
  '/job/:jobId',
  authenticate,
  authorizeRoles('JOB_POSTER', 'ADMIN'),
  jobIdParamValidator,
  validate,
  controller.getApplicationsByJob
);
router.get('/me', authenticate, authorizeRoles('JOB_PICKER'), controller.getAppliedJobsByUser);

export default router;
