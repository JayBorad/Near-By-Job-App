import express from 'express';
import * as controller from './job.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/role.middleware.js';
import { authorizeUserModes } from '../../middleware/user-mode.middleware.js';
import { ensureJobOwner } from '../../middleware/ownership.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import {
  createJobValidator,
  updateJobValidator,
  jobIdValidator,
  nearbyJobsValidator
} from './job.validator.js';

const router = express.Router();

router.get('/', controller.getAllJobs);
router.get('/nearby', nearbyJobsValidator, validate, controller.findNearbyJobs);
router.get('/:id', jobIdValidator, validate, controller.getJobById);
router.post(
  '/',
  authenticate,
  authorizeRoles('USER', 'ADMIN'),
  authorizeUserModes('JOB_POSTER'),
  createJobValidator,
  validate,
  controller.createJob
);
router.patch(
  '/:id',
  authenticate,
  authorizeRoles('USER', 'ADMIN'),
  authorizeUserModes('JOB_POSTER'),
  updateJobValidator,
  validate,
  ensureJobOwner,
  controller.updateJob
);
router.delete(
  '/:id',
  authenticate,
  authorizeRoles('USER', 'ADMIN'),
  authorizeUserModes('JOB_POSTER'),
  jobIdValidator,
  validate,
  ensureJobOwner,
  controller.deleteJob
);

export default router;
