import { body, param } from 'express-validator';

export const createReviewValidator = [
  body('jobId').isUUID().withMessage('Valid jobId is required'),
  body('revieweeId').isUUID().withMessage('Valid revieweeId is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('rating must be between 1 and 5'),
  body('comment')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 500 })
    .withMessage('comment must be at most 500 characters')
];

export const userIdParamValidator = [param('userId').isUUID().withMessage('Valid userId is required')];
