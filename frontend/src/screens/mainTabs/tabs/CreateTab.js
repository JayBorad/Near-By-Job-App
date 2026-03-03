import React from 'react';
import { View } from 'react-native';
import { AdminModerationPage, CreateJobPage } from '../tabScreens';
import { PageCard } from '../components/SharedBlocks';

export function CreateTab({
  userRole,
  userMode,
  token,
  adminJobs,
  isAdminPanelLoading,
  onRefreshAdminJobs,
  jobForm,
  setJobForm,
  approvedCategoryOptions,
  onCreateJob,
  onValidationError,
  isCreatingJob,
  styles,
  colors
}) {
  if (userRole === 'ADMIN') {
    return (
      <AdminModerationPage jobs={adminJobs} isLoading={isAdminPanelLoading} onRefresh={onRefreshAdminJobs} styles={styles} colors={colors} />
    );
  }

  if (userMode !== 'JOB_POSTER') {
    return (
      <View style={styles.centerPage}>
        <PageCard
          title="Job Picker Mode"
          subtitle="Switch to Job Poster mode from profile if you want to create jobs."
          icon="swap-horizontal"
          styles={styles}
          colors={colors}
        />
      </View>
    );
  }

  return (
    <CreateJobPage
      userRole={userRole}
      token={token}
      jobForm={jobForm}
      setJobForm={setJobForm}
      approvedCategoryOptions={approvedCategoryOptions}
      onCreateJob={onCreateJob}
      onValidationError={onValidationError}
      isCreatingJob={isCreatingJob}
      styles={styles}
      colors={colors}
    />
  );
}
