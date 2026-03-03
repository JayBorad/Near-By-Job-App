import React from 'react';
import { View } from 'react-native';
import { PageCard } from '../components/SharedBlocks';

export function DashboardTab({ userRole, userMode, styles, colors }) {
  const dashboardSubtitle =
    userRole === 'ADMIN'
      ? 'Control users, categories, and platform operations from one place.'
      : userMode === 'JOB_POSTER'
        ? 'Track your posted jobs and manage applicants faster.'
        : 'Browse jobs near you and manage your applications.';

  return (
    <View style={styles.centerPage}>
      <PageCard title="Dashboard" subtitle={dashboardSubtitle} icon="grid" styles={styles} colors={colors} />
    </View>
  );
}
