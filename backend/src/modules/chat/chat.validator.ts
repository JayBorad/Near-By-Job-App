import { param } from 'express-validator';

export const jobIdParamValidator = [param('jobId').isUUID().withMessage('Valid job id is required')];
