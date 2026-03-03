import ApiError from '../utils/ApiError.js';

export const authorizeUserModes = (...modes: Array<'JOB_PICKER' | 'JOB_POSTER'>) => (req, _res, next) => {
  if (!req.user) {
    return next(new ApiError(401, 'Authentication required'));
  }

  // Admin can access mode-gated endpoints.
  if (req.user.role === 'ADMIN') {
    return next();
  }

  if (!modes.includes(req.user.userMode)) {
    return next(new ApiError(403, 'Insufficient permissions for current mode'));
  }

  return next();
};
