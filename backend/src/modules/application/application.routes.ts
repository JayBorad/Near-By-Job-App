import express from 'express';
import * as controller from './application.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import {
  applyJobValidator,
  applicationIdValidator,
  jobIdParamValidator
} from './application.validator.js';

const router = express.Router();

router.post('/', authenticate, applyJobValidator, validate, controller.applyJob);
router.patch('/:id/accept', authenticate, applicationIdValidator, validate, controller.acceptApplication);
router.patch('/:id/reject', authenticate, applicationIdValidator, validate, controller.rejectApplication);
router.get('/job/:jobId', authenticate, jobIdParamValidator, validate, controller.getApplicationsByJob);
router.get('/me', authenticate, controller.getAppliedJobsByUser);

export default router;
