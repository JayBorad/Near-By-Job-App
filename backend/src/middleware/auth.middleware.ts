import { createRemoteJWKSet, jwtVerify } from 'jose';
import env from '../config/env.js';
import prisma from '../config/prisma.js';
import ApiError from '../utils/ApiError.js';
import { syncUserFromToken } from '../modules/auth/auth.service.js';

const jwks = createRemoteJWKSet(new URL(`${env.supabaseUrl}/auth/v1/.well-known/jwks.json`));

export const verifySupabaseToken = async (token) => {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: `${env.supabaseUrl}/auth/v1`,
    audience: env.supabaseJwtAudience
  });

  return payload;
};

export const resolveUserFromToken = async (token) => {
  const payload = await verifySupabaseToken(token);
  const syncedUser = await syncUserFromToken(payload);

  if (syncedUser.status === 'DELETED') {
    throw new ApiError(401, 'User account is not active');
  }

  return {
    id: syncedUser.id,
    role: syncedUser.role,
    supabaseAuthId: syncedUser.supabaseAuthId,
    email: syncedUser.email
  };
};

export const authenticate = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new ApiError(401, 'Authorization token is required'));
    }

    const token = authHeader.split(' ')[1];
    const user = await resolveUserFromToken(token);

    const existing = await prisma.user.findUnique({ where: { id: user.id } });
    if (!existing || existing.status === 'DELETED') {
      return next(new ApiError(401, 'User account is not active'));
    }

    req.user = user;
    return next();
  } catch (_error) {
    return next(new ApiError(401, 'Invalid or expired token'));
  }
};
