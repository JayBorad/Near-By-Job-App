import React from 'react';
import { AdminUsersPage } from '../tabScreens';

export function UsersTab({ adminUsers, isAdminUsersLoading, onRefreshAdminUsers, onSaveUserDetails, onSaveUserAvatar, styles, colors }) {
  return (
    <AdminUsersPage
      users={adminUsers}
      isLoading={isAdminUsersLoading}
      onRefresh={onRefreshAdminUsers}
      onSaveUserDetails={onSaveUserDetails}
      onSaveUserAvatar={onSaveUserAvatar}
      styles={styles}
      colors={colors}
    />
  );
}
