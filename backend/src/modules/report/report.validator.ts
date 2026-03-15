import { body, param, query } from 'express-validator';

const REPORT_STATUSES = ['PENDING', 'IN_REVIEW', 'RESOLVED', 'REJECTED'];

export const createReportValidator = [
  body('title')
    .isString()
    .trim()
    .isLength({ min: 3, max: 120 })
    .withMessage('title must be 3-120 characters long'),
  body('description')
    .isString()
    .trim()
    .isLength({ min: 5, max: 2000 })
    .withMessage('description must be 5-2000 characters long'),
  body('imageData')
    .optional()
    .isString()
    .matches(/^data:image\/([a-z0-9.+-]+);base64,/i)
    .withMessage('imageData must be a valid base64 image data URL')
];

export const getReportsAdminValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('q').optional().isString().trim(),
  query('status')
    .optional()
    .isIn(['ALL', ...REPORT_STATUSES])
    .withMessage(`status must be one of ALL, ${REPORT_STATUSES.join(', ')}`)
];

export const reportIdParamValidator = [param('id').isUUID().withMessage('Valid report id is required')];

export const updateReportStatusValidator = [
  ...reportIdParamValidator,
  body('status').isIn(REPORT_STATUSES).withMessage(`status must be one of ${REPORT_STATUSES.join(', ')}`)
];
