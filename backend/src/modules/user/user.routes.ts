import express from 'express';
import * as controller from './user.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import { updateAvatarValidator, updateProfileValidator } from './user.validator.js';

const router = express.Router();

router.get('/me', authenticate, controller.getProfile);
router.patch('/me', authenticate, updateProfileValidator, validate, controller.updateProfile);
router.patch('/me/avatar', authenticate, updateAvatarValidator, validate, controller.updateAvatar);
router.delete('/me', authenticate, controller.softDeleteAccount);
router.get('/', authenticate, authorizeRoles('ADMIN'), controller.getAllUsers);

export default router;
