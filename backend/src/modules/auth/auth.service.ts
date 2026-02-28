import prisma from '../../config/prisma.js';
import { supabase, supabaseAdmin } from '../../config/supabase.js';
import ApiError from '../../utils/ApiError.js';
import { Prisma, Role } from '@prisma/client';

const normalizeUsername = (input) =>
  String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30);

const baseUsernameFromEmail = (email) => {
  const localPart = String(email || '').split('@')[0] || 'user';
  const normalized = normalizeUsername(localPart);
  return normalized || 'user';
};

const makeUniqueUsername = async (requested, email) => {
  const base = normalizeUsername(requested) || baseUsernameFromEmail(email);
  let candidate = base;
  let index = 1;
  while (true) {
    const exists = await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } });
    if (!exists) return candidate;
    index += 1;
    candidate = `${base.slice(0, Math.max(1, 30 - String(index).length - 1))}_${index}`;
  }
};

export const signUp = async (payload) => {
  const { name, username, email, password, phone, redirectTo } = payload;
  const requestedRole = String(payload?.role || 'JOB_PICKER').toUpperCase();
  const normalizedRole = requestedRole === Role.JOB_POSTER ? Role.JOB_POSTER : Role.JOB_PICKER;
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedName = String(name || '').trim();
  const normalizedPhone = String(phone || '').trim();
  const normalizedUsername = normalizeUsername(username);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    throw new ApiError(400, 'Please provide a valid email address');
  }

  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    throw new ApiError(409, 'Email is already registered');
  }

  const existingPhone = await prisma.user.findUnique({ where: { phone: normalizedPhone } });
  if (existingPhone) {
    throw new ApiError(409, 'Phone number is already registered');
  }

  if (normalizedUsername) {
    const existingUsername = await prisma.user.findUnique({ where: { username: normalizedUsername } });
    if (existingUsername) {
      throw new ApiError(409, 'Username is already taken');
    }
  }

  const finalUsername = await makeUniqueUsername(normalizedUsername, normalizedEmail);

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: { name: normalizedName, phone: normalizedPhone, username: finalUsername, role: normalizedRole },
      ...(redirectTo ? { emailRedirectTo: redirectTo } : {})
    }
  });

  if (error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('rate limit')) {
      throw new ApiError(
        429,
        'Signup email rate limit exceeded. Please wait a few minutes or use a different email, then try again.'
      );
    }
    throw new ApiError(400, error.message);
  }

  if (!data.user?.id) {
    throw new ApiError(500, 'Unable to create user in Supabase Auth');
  }

  let user;
  try {
    user = await prisma.user.create({
      data: {
        supabaseAuthId: data.user.id,
        name: normalizedName,
        username: finalUsername,
        email: normalizedEmail,
        phone: normalizedPhone,
        role: normalizedRole
      }
    });
  } catch (err) {
    // Supabase auth user is created first; if DB write fails, remove auth user to avoid partial signup state.
    await supabaseAdmin.auth.admin.deleteUser(data.user.id).catch(() => null);

    const rawMessage = String((err as any)?.message || '').toLowerCase();
    if (
      rawMessage.includes('invalid input value for enum') &&
      rawMessage.includes('role')
    ) {
      throw new ApiError(
        500,
        'Signup failed because database role migration is pending. Run Prisma migration and try again.'
      );
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ApiError(409, 'Email or phone already exists');
    }
    throw err;
  }

  return {
    user,
    session: data.session
  };
};

export const signIn = async ({ identifier, email, password }) => {
  const rawIdentifier = String(identifier || email || '').trim();
  const normalizedIdentifier = rawIdentifier.toLowerCase();
  if (!normalizedIdentifier) {
    throw new ApiError(400, 'Email or username is required');
  }

  let loginEmail = normalizedIdentifier;
  if (!normalizedIdentifier.includes('@')) {
    const userByUsername = await prisma.user.findUnique({
      where: { username: normalizeUsername(normalizedIdentifier) },
      select: { email: true, status: true }
    });
    if (!userByUsername || userByUsername.status === 'DELETED') {
      throw new ApiError(401, 'Invalid credentials');
    }
    loginEmail = userByUsername.email;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });

  if (error || !data.session) {
    throw new ApiError(401, error?.message || 'Invalid credentials');
  }

  if (!data.user?.email_confirmed_at) {
    throw new ApiError(403, 'Please confirm your email before logging in');
  }

  const user = await prisma.user.findUnique({
    where: { supabaseAuthId: data.user.id },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      phone: true,
      age: true,
      gender: true,
      address: true,
      bio: true,
      avatar: true,
      role: true,
      status: true
    }
  });

  if (!user || user.status === 'DELETED') {
    throw new ApiError(401, 'User account is not active');
  }

  return {
    user,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresIn: data.session.expires_in
  };
};

export const forgotPassword = async ({ email, redirectTo }) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo
  });

  if (error) {
    throw new ApiError(400, error.message);
  }

  return { message: 'Password reset link has been sent if the email exists' };
};

export const refreshTokenSession = async ({ refreshToken }) => {
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken
  });

  if (error || !data.session || !data.user?.id) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({
    where: { supabaseAuthId: data.user.id },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      phone: true,
      age: true,
      gender: true,
      address: true,
      bio: true,
      avatar: true,
      role: true,
      status: true
    }
  });

  if (!user || user.status === 'DELETED') {
    throw new ApiError(401, 'User account is not active');
  }

  return {
    user,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresIn: data.session.expires_in
  };
};

export const updatePassword = async ({ token, password }) => {
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user?.id) {
    throw new ApiError(401, 'Invalid or expired reset token');
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
    password
  });

  if (updateError) {
    throw new ApiError(400, updateError.message);
  }

  return { message: 'Password updated successfully' };
};

export const getOAuthUrl = async (provider, redirectTo) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo }
  });

  if (error) {
    throw new ApiError(400, error.message);
  }

  return { url: data.url };
};

export const syncUserFromToken = async (payload) => {
  const authUser = payload;
  let user = await prisma.user.findUnique({ where: { supabaseAuthId: authUser.sub } });

  if (!user) {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(authUser.sub);
    if (error || !data.user) {
      throw new ApiError(404, 'Auth user not found in Supabase');
    }

    user = await prisma.user.create({
      data: {
        supabaseAuthId: data.user.id,
        name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
        username: await makeUniqueUsername(data.user.user_metadata?.username || '', data.user.email),
        email: data.user.email,
        phone: data.user.phone || 'N/A',
        avatar: data.user.user_metadata?.avatar_url || null,
        role: Role.JOB_PICKER
      }
    });
  }

  return user;
};
