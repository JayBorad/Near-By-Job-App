import { body, param } from 'express-validator';

export const applyJobValidator = [
  body('jobId').isUUID().withMessage('Valid jobId is required')
];

export const applicationIdValidator = [param('id').isUUID().withMessage('Valid application id is required')];

export const jobIdParamValidator = [param('jobId').isUUID().withMessage('Valid jobId is required')];
