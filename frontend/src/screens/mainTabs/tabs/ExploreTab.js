import React from 'react';
import { MyJobDetailsPage, MyJobsPage, PickerJobsPage } from '../tabScreens';

export function ExploreTab({
  userMode,
  myJobs,
  myJobsPage,
  isMyJobsLoading,
  onRefreshMyJobs,
  onOpenMyJob,
  selectedMyJob,
  selectedMyJobApplications,
  isSelectedMyJobApplicationsLoading,
  isUpdatingJobApplicationStatus,
  onBackFromMyJobDetail,
  onRefreshSelectedMyJobApplications,
  onApproveJobApplication,
  onRejectJobApplication,
  onEditMyJob,
  onOpenChatWithApplicant,
  pickerJobs,
  isPickerJobsLoading,
  onRefreshPickerJobs,
  onApplyJob,
  isApplyingJob,
  styles,
  colors
}) {
  if (userMode === 'JOB_POSTER') {
    if (myJobsPage === 'detail' && selectedMyJob) {
      return (
        <MyJobDetailsPage
          job={selectedMyJob}
          applications={selectedMyJobApplications}
          isLoadingApplications={isSelectedMyJobApplicationsLoading}
          isUpdatingApplicationStatus={isUpdatingJobApplicationStatus}
          onBack={onBackFromMyJobDetail}
          onRefreshApplications={onRefreshSelectedMyJobApplications}
          onApproveApplication={onApproveJobApplication}
          onRejectApplication={onRejectJobApplication}
          onEditJob={() => onEditMyJob(selectedMyJob)}
          onOpenChatWithApplicant={(application) =>
            onOpenChatWithApplicant({
              job: selectedMyJob,
              applicant: application?.applicant
            })
          }
          styles={styles}
          colors={colors}
        />
      );
    }

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
