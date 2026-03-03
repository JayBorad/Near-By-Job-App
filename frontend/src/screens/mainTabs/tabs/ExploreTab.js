import React from 'react';
import { MyJobsPage, PickerJobsPage } from '../tabScreens';

export function ExploreTab({
  userMode,
  myJobs,
  isMyJobsLoading,
  onRefreshMyJobs,
  onOpenMyJob,
  pickerJobs,
  isPickerJobsLoading,
  onRefreshPickerJobs,
  onApplyJob,
  isApplyingJob,
  styles,
  colors
}) {
  if (userMode === 'JOB_POSTER') {
    return (
      <MyJobsPage
        jobs={myJobs}
        isLoading={isMyJobsLoading}
        onRefresh={onRefreshMyJobs}
        onOpenJob={onOpenMyJob}
        styles={styles}
        colors={colors}
      />
    );
  }

  return (
    <PickerJobsPage
      jobs={pickerJobs}
      isLoading={isPickerJobsLoading}
      onRefresh={onRefreshPickerJobs}
      onApplyJob={onApplyJob}
      isApplying={isApplyingJob}
      styles={styles}
      colors={colors}
    />
  );
}
