import express from 'express';
import * as controller from './chat.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import { jobIdParamValidator } from './chat.validator.js';

const router = express.Router();

router.get('/job/:jobId', authenticate, jobIdParamValidator, validate, controller.getMessagesByJob);

export default router;
