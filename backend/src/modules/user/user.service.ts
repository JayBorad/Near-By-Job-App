import prisma from '../../config/prisma.js';
import { supabaseAdmin } from '../../config/supabase.js';
import ApiError from '../../utils/ApiError.js';
import { parsePagination } from '../../utils/pagination.js';
import { Prisma, Role, UserMode, UserStatus } from '@prisma/client';

const ALLOWED_ROLES = new Set([Role.USER, Role.ADMIN]);
const ALLOWED_USER_MODES = new Set([UserMode.JOB_PICKER, UserMode.JOB_POSTER]);
const ALLOWED_USER_STATUS = new Set([UserStatus.ACTIVE, UserStatus.DELETED]);

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
  userMode: true,
  status: true,
  createdAt: true,
  updatedAt: true
};

const adminJobSelect = {
  id: true,
  title: true,
  description: true,
  requiredWorkers: true,
  budget: true,
  jobType: true,
  latitude: true,
  longitude: true,
  address: true,
  status: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      id: true,
      name: true,
      status: true
    }
  },
  owner: {
    select: {
      id: true,
      name: true,
      email: true
    }
  }
} satisfies Prisma.JobSelect;

const adminUserSelect = {
  ...userSelect,
  jobs: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: adminJobSelect
  },
  applications: {
    where: {
      status: 'ACCEPTED',
      job: { deletedAt: null }
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      job: {
        select: adminJobSelect
      }
    }
  }
} satisfies Prisma.UserSelect;

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
  if ('userMode' in payload) {
    const normalizedMode = String(payload.userMode || '').trim().toUpperCase();
    if (!ALLOWED_USER_MODES.has(normalizedMode as UserMode)) {
      throw new ApiError(400, 'Invalid user mode');
    }
    payload.userMode = normalizedMode as UserMode;
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

const updateAvatarForUser = async (userId, payload) => {
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
    select: { id: true, status: true, avatar: true }
  });
  if (!currentUser || currentUser.status === 'DELETED') {
    throw new ApiError(404, 'User not found');
  }

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

export const updateAvatar = async (userId, payload) => updateAvatarForUser(userId, payload);

export const updateUserAvatarByAdmin = async (_adminId, userId, payload) =>
  updateAvatarForUser(userId, payload);

export const softDeleteAccount = async (userId) => {
  await prisma.user.update({
    where: { id: userId },
    data: { status: 'DELETED' }
  });

  return { message: 'Account soft-deleted successfully' };
};

export const getAllUsers = async (query) => {
  const { page, limit, skip } = parsePagination(query);
  const searchText = String(query?.q || '').trim();
  const roleFilter = String(query?.role || '').trim().toUpperCase();
  const statusFilter = String(query?.status || '').trim().toUpperCase();
  const modeFilter = String(query?.mode || '').trim().toUpperCase();
  const where: Prisma.UserWhereInput = {};

  if (ALLOWED_ROLES.has(roleFilter as Role)) {
    where.role = roleFilter as Role;
  }
  if (ALLOWED_USER_STATUS.has(statusFilter as UserStatus)) {
    where.status = statusFilter as UserStatus;
  }
  if (ALLOWED_USER_MODES.has(modeFilter as UserMode)) {
    where.userMode = modeFilter as UserMode;
  }
  if (searchText) {
    where.OR = [
      { name: { contains: searchText, mode: Prisma.QueryMode.insensitive } },
      { username: { contains: searchText, mode: Prisma.QueryMode.insensitive } },
      { email: { contains: searchText, mode: Prisma.QueryMode.insensitive } }
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: adminUserSelect
    }),
    prisma.user.count({ where })
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

export const updateUserAccess = async (adminId, userId, payload) => {
  if (adminId === userId) {
    throw new ApiError(400, 'Admin cannot modify own role or status from this endpoint');
  }

  const data: Prisma.UserUpdateInput = {};
  if (payload.role) data.role = payload.role;
  if (payload.userMode) data.userMode = payload.userMode;
  if (payload.status) data.status = payload.status;

  if (!Object.keys(data).length) {
    throw new ApiError(400, 'At least one of role, userMode or status is required');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, status: true }
  });
  if (!user || user.status === 'DELETED') {
    throw new ApiError(404, 'User not found');
  }

  return prisma.user.update({
    where: { id: userId },
    data,
    select: userSelect
  });
};

export const updateUserByAdmin = async (adminId, userId, payload) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, status: true }
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const data: Prisma.UserUpdateInput = {};

  if ('name' in payload) data.name = String(payload.name || '').trim();
  if ('username' in payload) {
    const normalizedUsername = String(payload.username || '').trim().toLowerCase();
    const existingUsernameUser = await prisma.user.findFirst({
      where: {
        username: normalizedUsername,
        id: { not: userId }
      }
    });
    if (existingUsernameUser) {
      throw new ApiError(409, 'Username is already taken');
    }
    data.username = normalizedUsername;
  }
  if ('phone' in payload) {
    const normalizedPhone = String(payload.phone || '').trim();
    const existingPhoneUser = await prisma.user.findFirst({
      where: {
        phone: normalizedPhone,
        id: { not: userId }
      }
    });
    if (existingPhoneUser) {
      throw new ApiError(409, 'Phone number is already registered');
    }
    data.phone = normalizedPhone;
  }
  if ('age' in payload) data.age = payload.age ? Number(payload.age) : null;
  if ('gender' in payload) data.gender = payload.gender || null;
  if ('address' in payload) data.address = String(payload.address || '').trim();
  if ('bio' in payload) data.bio = String(payload.bio || '').trim();

  if ('role' in payload) {
    if (adminId === userId) {
      throw new ApiError(400, 'Admin cannot change own role from this endpoint');
    }
    data.role = payload.role;
  }
  if ('userMode' in payload) {
    data.userMode = payload.userMode;
  }
  if ('status' in payload) {
    if (adminId === userId) {
      throw new ApiError(400, 'Admin cannot change own status from this endpoint');
    }
    data.status = payload.status;
  }

  if (!Object.keys(data).length) {
    throw new ApiError(400, 'No valid fields provided for update');
  }

  return prisma.user.update({
    where: { id: userId },
    data,
    select: adminUserSelect
  });
};
