import React from 'react';
import { DashboardTab } from './DashboardTab';
import { UsersTab } from './UsersTab';
import { ExploreTab } from './ExploreTab';
import { CreateTab } from './CreateTab';
import { MessagesTab } from './MessagesTab';
import { SettingsTab } from './SettingsTab';

export function PageContent(props) {
  const {
    tabKey,
    userRole
  } = props;

  if (tabKey === 'dashboard') {
    return <DashboardTab {...props} />;
  }

  if (tabKey === 'users' && userRole === 'ADMIN') {
    return <UsersTab {...props} />;
  }

  if (tabKey === 'explore') {
    return <ExploreTab {...props} />;
  }

  if (tabKey === 'create') {
    return <CreateTab {...props} />;
  }

  if (tabKey === 'messages') {
    return <MessagesTab {...props} />;
  }

  return <SettingsTab {...props} />;
}
