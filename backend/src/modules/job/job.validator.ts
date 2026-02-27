import { body, param, query } from 'express-validator';

export const createJobValidator = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('categoryId').isUUID().withMessage('Valid categoryId is required'),
  body('budget').isFloat({ gt: 0 }).withMessage('Budget must be greater than 0'),
  body('jobType').isIn(['ONE_TIME', 'PART_TIME', 'FULL_TIME']).withMessage('Invalid job type'),
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('dueDate').isISO8601().toDate().withMessage('Valid dueDate is required')
];

export const updateJobValidator = [
  param('id').isUUID().withMessage('Invalid job id'),
  body('title').optional().trim().notEmpty(),
  body('description').optional().trim().notEmpty(),
  body('budget').optional().isFloat({ gt: 0 }),
  body('jobType').optional().isIn(['ONE_TIME', 'PART_TIME', 'FULL_TIME']),
  body('latitude').optional().isFloat({ min: -90, max: 90 }),
  body('longitude').optional().isFloat({ min: -180, max: 180 }),
  body('address').optional().trim().notEmpty(),
  body('status').optional().isIn(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  body('dueDate').optional().isISO8601().toDate()
];

export const jobIdValidator = [param('id').isUUID().withMessage('Invalid job id')];

export const nearbyJobsValidator = [
  query('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
  query('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
  query('radiusKm').optional().isFloat({ gt: 0, lt: 1000 }).withMessage('radiusKm must be between 0 and 1000')
];
