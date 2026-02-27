import express from 'express';
import * as controller from './category.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import {
  createCategoryValidator,
  getApprovedCategoriesValidator,
  getMyCategoriesValidator,
  updateCategoryStatusValidator
} from './category.validator.js';

const router = express.Router();

router.post('/', authenticate, createCategoryValidator, validate, controller.createCategory);
router.get('/approved', getApprovedCategoriesValidator, validate, controller.getApprovedCategories);
router.get('/mine', authenticate, getMyCategoriesValidator, validate, controller.getMyCategories);
router.patch(
  '/:id/status',
  authenticate,
  authorizeRoles('ADMIN'),
  updateCategoryStatusValidator,
  validate,
  controller.updateCategoryStatus
);

export default router;
