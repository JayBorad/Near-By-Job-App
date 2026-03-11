import React from 'react';
import { AdminUsersPage } from '../tabScreens';

export function UsersTab({
  adminUsers,
  isAdminUsersLoading,
  onRefreshAdminUsers,
  onGetUserReviews,
  selectedAdminUserId,
  onAdminUserDetailOpened,
  onExitAdminUserDetails,
  onSaveUserDetails,
  onSaveUserAvatar,
  styles,
  colors
}) {
  return (
    <AdminUsersPage
      users={adminUsers}
      isLoading={isAdminUsersLoading}
      onRefresh={onRefreshAdminUsers}
      onGetUserReviews={onGetUserReviews}
      selectedUserId={selectedAdminUserId}
      onSelectedUserHandled={onAdminUserDetailOpened}
      onExitUserDetails={onExitAdminUserDetails}
      onSaveUserDetails={onSaveUserDetails}
      onSaveUserAvatar={onSaveUserAvatar}
      styles={styles}
      colors={colors}
    />
  );
}
