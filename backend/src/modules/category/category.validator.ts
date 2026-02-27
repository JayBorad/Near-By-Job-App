import { body, param, query } from 'express-validator';

export const createCategoryValidator = [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 300 })
    .withMessage('Description max length is 300')
];

export const updateCategoryStatusValidator = [
  param('id').isUUID().withMessage('Category id must be a UUID'),
  body('status')
    .isIn(['APPROVED', 'REJECTED'])
    .withMessage('Status must be APPROVED or REJECTED')
];

export const getMyCategoriesValidator = [
  query('status')
    .optional()
    .isIn(['PENDING', 'APPROVED', 'REJECTED'])
    .withMessage('Status must be PENDING, APPROVED or REJECTED'),
  query('q')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Search query max length is 100')
];

export const getApprovedCategoriesValidator = [
  query('q')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Search query max length is 100')
];
