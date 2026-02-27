import * as authService from './auth.service.js';
import asyncHandler from '../../utils/asyncHandler.js';

export const signUp = asyncHandler(async (req, res) => {
  const result = await authService.signUp(req.body);
  return res.status(201).json({ success: true, message: 'User signed up', data: result });
});

export const signIn = asyncHandler(async (req, res) => {
  const result = await authService.signIn(req.body);
  return res.status(200).json({ success: true, message: 'Login successful', data: result });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword({
    email: req.body.email,
    redirectTo: req.body.redirectTo
  });

  return res.status(200).json({ success: true, data: result });
});

export const refreshToken = asyncHandler(async (req, res) => {
  const result = await authService.refreshTokenSession({
    refreshToken: req.body.refreshToken
  });

  return res.status(200).json({
    success: true,
    message: 'Session refreshed successfully',
    data: result
  });
});

export const updatePassword = asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authorization token is required'
    });
  }

  const token = authHeader.slice(7);
  const result = await authService.updatePassword({
    token,
    password: req.body.password
  });

  return res.status(200).json({ success: true, data: result });
});

export const oauthGoogle = asyncHandler(async (req, res) => {
  const result = await authService.getOAuthUrl('google', req.body.redirectTo);
  return res.status(200).json({ success: true, data: result });
});

export const oauthApple = asyncHandler(async (req, res) => {
  const result = await authService.getOAuthUrl('apple', req.body.redirectTo);
  return res.status(200).json({ success: true, data: result });
});
