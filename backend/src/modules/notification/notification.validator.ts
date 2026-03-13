import { param } from 'express-validator';

export const notificationIdParamValidator = [param('id').isUUID().withMessage('Valid notification id is required')];
