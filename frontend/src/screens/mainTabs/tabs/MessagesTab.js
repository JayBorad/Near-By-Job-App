import React from 'react';
import { View } from 'react-native';
import { MyApplicationsPage } from '../tabScreens';
import { PageCard } from '../components/SharedBlocks';

export function MessagesTab({
  userRole,
  userMode,
  myApplications,
  isMyApplicationsLoading,
  onRefreshMyApplications,
  onOpenChatWithJobPoster,
  styles,
  colors
}) {
  const title = userRole === 'ADMIN' ? 'Reports' : userMode === 'JOB_POSTER' ? 'Applicants' : 'Applications';
  const subtitle =
    userRole === 'ADMIN'
      ? 'Review system reports and escalations.'
      : userMode === 'JOB_POSTER'
        ? 'Review applicants and communication from pickers.'
        : 'Track all jobs you picked and their latest status.';

  if (userRole !== 'ADMIN' && userMode === 'JOB_PICKER') {
    return (
      <MyApplicationsPage
        applications={myApplications}
        isLoading={isMyApplicationsLoading}
        onRefresh={onRefreshMyApplications}
        onOpenChat={onOpenChatWithJobPoster}
        styles={styles}
        colors={colors}
      />
    );
  }

  return (
    <View style={styles.centerPage}>
      <PageCard title={title} subtitle={subtitle} icon="chatbubble-ellipses" styles={styles} colors={colors} />
    </View>
  );
}
