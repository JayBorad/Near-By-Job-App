import express from 'express';
import * as controller from './report.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import {
  createReportValidator,
  getReportsAdminValidator,
  reportIdParamValidator,
  updateReportStatusValidator
} from './report.validator.js';

const router = express.Router();

router.post('/', authenticate, authorizeRoles('USER'), createReportValidator, validate, controller.createReport);
router.get('/mine', authenticate, authorizeRoles('USER'), controller.getMyReports);
router.get('/', authenticate, authorizeRoles('ADMIN'), getReportsAdminValidator, validate, controller.getAllReports);
router.get('/:id', authenticate, authorizeRoles('USER', 'ADMIN'), reportIdParamValidator, validate, controller.getReportById);
router.patch(
  '/:id/status',
  authenticate,
  authorizeRoles('ADMIN'),
  updateReportStatusValidator,
  validate,
  controller.updateReportStatus
);

export default router;
