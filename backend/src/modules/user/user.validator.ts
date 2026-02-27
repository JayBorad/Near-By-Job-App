import { body } from 'express-validator';

export const updateProfileValidator = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9._]+$/)
    .withMessage('Username can only contain letters, numbers, dots, and underscores'),
  body('phone').optional().trim().notEmpty().withMessage('Phone cannot be empty'),
  body('avatar').optional().isURL().withMessage('Avatar must be a valid URL'),
  body('bio').optional().isString().isLength({ max: 500 }).withMessage('Bio max length is 500'),
  body('age')
    .optional({ values: 'falsy' })
    .isInt({ min: 13, max: 120 })
    .withMessage('Age must be between 13 and 120'),
  body('gender')
    .optional()
    .isIn(['MALE', 'FEMALE', 'OTHER'])
    .withMessage('Gender must be MALE, FEMALE or OTHER'),
  body('address').optional().isString().isLength({ max: 250 }).withMessage('Address max length is 250')
];

export const updateAvatarValidator = [
  body('avatarData')
    .optional()
    .isString()
    .matches(/^data:image\/([a-z0-9.+-]+);base64,/i)
    .withMessage('avatarData must be a valid base64 image data URL'),
  body('avatarUrl')
    .optional()
    .isURL({ require_protocol: true, require_tld: false })
    .withMessage('avatarUrl must be a valid URL'),
  body('resetAvatar')
    .optional()
    .isBoolean()
    .withMessage('resetAvatar must be boolean')
];
