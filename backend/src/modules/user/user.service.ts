import prisma from '../../config/prisma.js';
import { supabaseAdmin } from '../../config/supabase.js';
import ApiError from '../../utils/ApiError.js';
import { parsePagination } from '../../utils/pagination.js';
import { Prisma } from '@prisma/client';

const AVATAR_BUCKET = 'avatars';
let isAvatarBucketChecked = false;
const SUPPORTED_AVATAR_TYPES = new Set([
  'png',
  'jpg',
  'jpeg',
  'webp',
  'heic',
  'heif',
  'dng',
  'gif',
  'bmp',
  'tiff',
  'avif'
]);

const userSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  phone: true,
  age: true,
  gender: true,
  address: true,
  avatar: true,
  bio: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true
};

const ensureAvatarBucket = async () => {
  if (isAvatarBucketChecked) return;

  const { data, error } = await supabaseAdmin.storage.getBucket(AVATAR_BUCKET);
  if (error && !error.message.toLowerCase().includes('not found')) {
    throw new ApiError(500, `Unable to verify avatar storage bucket: ${error.message}`);
  }

  if (!data) {
    const { error: createError } = await supabaseAdmin.storage.createBucket(AVATAR_BUCKET, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024
    });

    if (createError && !createError.message.toLowerCase().includes('already')) {
      throw new ApiError(500, `Unable to create avatar storage bucket: ${createError.message}`);
    }
  }
  if (data && !data.public) {
    const { error: updateBucketError } = await supabaseAdmin.storage.updateBucket(AVATAR_BUCKET, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024
    });

    if (updateBucketError) {
      throw new ApiError(500, `Unable to update avatar bucket visibility: ${updateBucketError.message}`);
    }
  }

  isAvatarBucketChecked = true;
};

const getAvatarPathFromPublicUrl = (avatarUrl) => {
  if (!avatarUrl || typeof avatarUrl !== 'string') return null;
  const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
  const markerIndex = avatarUrl.indexOf(marker);
  if (markerIndex === -1) return null;
  return avatarUrl.slice(markerIndex + marker.length);
};

export const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect
  });

  if (!user || user.status === 'DELETED') {
    throw new ApiError(404, 'User not found');
  }

  return user;
};

export const updateProfile = async (userId, payload) => {
  if ('email' in payload) {
    throw new ApiError(400, 'Email cannot be updated from profile');
  }

  if (payload.phone) {
    const normalizedPhone = String(payload.phone).trim();
    const existingPhoneUser = await prisma.user.findFirst({
      where: {
        phone: normalizedPhone,
        id: { not: userId }
      }
    });

    if (existingPhoneUser) {
      throw new ApiError(409, 'Phone number is already registered');
    }

    payload.phone = normalizedPhone;
  }

  if (payload.username) {
    const normalizedUsername = String(payload.username).trim().toLowerCase();
    const existingUsernameUser = await prisma.user.findFirst({
      where: {
        username: normalizedUsername,
        id: { not: userId }
      }
    });

    if (existingUsernameUser) {
      throw new ApiError(409, 'Username is already taken');
    }

    payload.username = normalizedUsername;
  }

  if ('age' in payload) {
    if (payload.age === '' || payload.age === null) {
      payload.age = null;
    } else {
      payload.age = Number(payload.age);
    }
  }

  if ('gender' in payload && (payload.gender === '' || payload.gender === null)) {
    payload.gender = null;
  }

  try {
    return prisma.user.update({
      where: { id: userId },
      data: payload,
      select: userSelect
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ApiError(409, 'Email or phone already exists');
    }
    throw err;
  }
};

export const updateAvatar = async (userId, payload) => {
  const { avatarData, avatarUrl, resetAvatar } = payload;

  const providedCount = Number(Boolean(avatarData)) + Number(Boolean(avatarUrl)) + Number(Boolean(resetAvatar));
  if (providedCount !== 1) {
    throw new ApiError(400, 'Provide exactly one of avatarData, avatarUrl, or resetAvatar');
  }

  let nextAvatarUrl = resetAvatar ? null : avatarUrl;

  if (avatarData) {
    const matches = String(avatarData).match(/^data:image\/([a-z0-9.+-]+);base64,(.+)$/i);
    if (!matches) {
      throw new ApiError(400, 'Invalid avatar image format');
    }

    const mimeSubtype = matches[1].toLowerCase();
    const imageType = mimeSubtype === 'jpeg' ? 'jpg' : mimeSubtype;
    if (!SUPPORTED_AVATAR_TYPES.has(imageType)) {
      throw new ApiError(400, `Unsupported avatar format: ${imageType}`);
    }
    const base64Part = matches[2];
    const fileBuffer = Buffer.from(base64Part, 'base64');
    const fileSize = fileBuffer.byteLength;

    if (fileSize > 5 * 1024 * 1024) {
      throw new ApiError(413, 'Avatar image must be smaller than 5MB');
    }

    await ensureAvatarBucket();

    const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${imageType}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .upload(filePath, fileBuffer, {
        contentType: imageType === 'jpg' ? 'image/jpeg' : `image/${imageType}`,
        upsert: true
      });

    if (uploadError) {
      throw new ApiError(500, `Failed to upload avatar: ${uploadError.message}`);
    }

    const { data: publicData } = supabaseAdmin.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);
    nextAvatarUrl = publicData.publicUrl;
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatar: true }
  });

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { avatar: nextAvatarUrl || null },
    select: userSelect
  });

  const oldAvatarPath = getAvatarPathFromPublicUrl(currentUser?.avatar);
  const newAvatarPath = getAvatarPathFromPublicUrl(updatedUser.avatar);
  if (oldAvatarPath && oldAvatarPath !== newAvatarPath) {
    await supabaseAdmin.storage.from(AVATAR_BUCKET).remove([oldAvatarPath]);
  }

  return updatedUser;
};

export const softDeleteAccount = async (userId) => {
  await prisma.user.update({
    where: { id: userId },
    data: { status: 'DELETED' }
  });

  return { message: 'Account soft-deleted successfully' };
};

export const getAllUsers = async (query) => {
  const { page, limit, skip } = parsePagination(query);
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: {},
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        age: true,
        gender: true,
        address: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    }),
    prisma.user.count()
  ]);

  return {
    users,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};
