import { body } from 'express-validator';

export const signUpValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9._]+$/)
    .withMessage('Username can only contain letters, numbers, dots, and underscores'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('role')
    .optional()
    .isIn(['JOB_POSTER', 'JOB_PICKER'])
    .withMessage('role must be JOB_POSTER or JOB_PICKER'),
  body('redirectTo')
    .optional()
    .isURL({ require_protocol: true, require_tld: false })
    .withMessage('redirectTo must be a valid URL')
];

export const signInValidator = [
  body('identifier')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Identifier cannot be empty'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

export const forgotPasswordValidator = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail()
];

export const updatePasswordValidator = [
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
];

export const refreshTokenValidator = [
  body('refreshToken').trim().notEmpty().withMessage('refreshToken is required')
];

export const oauthValidator = [
  body('redirectTo')
    .optional()
    .isURL({ require_protocol: true, require_tld: false })
    .withMessage('redirectTo must be a valid URL')
];
