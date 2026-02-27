import express from 'express';
import * as controller from './auth.controller.js';
import { validate } from '../../middleware/validation.middleware.js';
import {
  signUpValidator,
  signInValidator,
  forgotPasswordValidator,
  updatePasswordValidator,
  oauthValidator,
  refreshTokenValidator
} from './auth.validator.js';

const router = express.Router();

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Sign up with email/password using Supabase Auth
 */
router.post('/signup', signUpValidator, validate, controller.signUp);
router.post('/signin', signInValidator, validate, controller.signIn);
router.post('/forgot-password', forgotPasswordValidator, validate, controller.forgotPassword);
router.post('/refresh-token', refreshTokenValidator, validate, controller.refreshToken);
router.post('/update-password', updatePasswordValidator, validate, controller.updatePassword);
router.post('/oauth/google', oauthValidator, validate, controller.oauthGoogle);
router.post('/oauth/apple', oauthValidator, validate, controller.oauthApple);

export default router;
