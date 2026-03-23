import { body, param, query } from 'express-validator';

export const createCategoryValidator = [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  body('description')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Description max length is 500')
];

export const updateCategoryStatusValidator = [
  param('id').isUUID().withMessage('Category id must be a UUID'),
  body('status')
    .isIn(['PENDING', 'APPROVED', 'REJECTED'])
    .withMessage('Status must be PENDING, APPROVED or REJECTED')
];

export const updateCategoryValidator = [
  param('id').isUUID().withMessage('Category id must be a UUID'),
  body()
    .custom((_, { req }) => req.body?.name !== undefined || req.body?.description !== undefined)
    .withMessage('At least one field is required: name or description'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Category name cannot be empty'),
  body('description')
    .optional({ nullable: true })
    .trim()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Description max length is 500')
];

export const deleteCategoryValidator = [
  param('id').isUUID().withMessage('Category id must be a UUID')
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

export const getAllCategoriesValidator = [
  query('status')
    .optional()
    .isIn(['ALL', 'PENDING', 'APPROVED', 'REJECTED'])
    .withMessage('Status must be ALL, PENDING, APPROVED or REJECTED'),
  query('q')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Search query max length is 100')
];
