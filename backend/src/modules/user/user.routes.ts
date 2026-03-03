import express from 'express';
import * as controller from './user.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import {
  updateAvatarValidator,
  updateProfileValidator,
  updateUserAvatarByAdminValidator,
  updateUserAccessValidator,
  updateUserByAdminValidator
} from './user.validator.js';

const router = express.Router();

router.get('/me', authenticate, controller.getProfile);
router.patch('/me', authenticate, updateProfileValidator, validate, controller.updateProfile);
router.patch('/me/avatar', authenticate, updateAvatarValidator, validate, controller.updateAvatar);
router.delete('/me', authenticate, controller.softDeleteAccount);
router.get('/', authenticate, authorizeRoles('ADMIN'), controller.getAllUsers);
router.patch('/:id/avatar', authenticate, authorizeRoles('ADMIN'), updateUserAvatarByAdminValidator, validate, controller.updateUserAvatarByAdmin);
router.patch('/:id', authenticate, authorizeRoles('ADMIN'), updateUserByAdminValidator, validate, controller.updateUserByAdmin);
router.patch('/:id/access', authenticate, authorizeRoles('ADMIN'), updateUserAccessValidator, validate, controller.updateUserAccess);

export default router;
