import { param, query } from 'express-validator';

export const jobIdParamValidator = [param('jobId').isUUID().withMessage('Valid job id is required')];

export const chatQueryValidator = [
  query('peerId').optional().isUUID().withMessage('peerId must be a valid UUID')
];
