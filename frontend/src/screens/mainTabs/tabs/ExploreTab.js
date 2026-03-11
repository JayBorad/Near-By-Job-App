import React from 'react';
import { MyApplicationsPage, MyJobDetailsPage, MyJobsPage, PickerJobsPage } from '../tabScreens';

export function ExploreTab({
  userMode,
  pickerExplorePage,
  onOpenPickerApplications,
  onBackFromPickerApplications,
  myJobs,
  myJobsPage,
  isMyJobsLoading,
  onRefreshMyJobs,
  onOpenMyJob,
  selectedMyJob,
  selectedMyJobApplications,
  isSelectedMyJobApplicationsLoading,
  isUpdatingJobApplicationStatus,
  isSubmittingReview,
  isUpdatingJobStatus,
  onBackFromMyJobDetail,
  onRefreshSelectedMyJobApplications,
  onApproveJobApplication,
  onRejectJobApplication,
  onSubmitReview,
  onChangeJobStatus,
  onEditMyJob,
  onOpenChatWithApplicant,
  pickerJobs,
  isPickerJobsLoading,
  onRefreshPickerJobs,
  myApplications,
  isMyApplicationsLoading,
  onRefreshMyApplications,
  onOpenChatWithJobPoster,
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
          isSubmittingReview={isSubmittingReview}
          isUpdatingJobStatus={isUpdatingJobStatus}
          onBack={onBackFromMyJobDetail}
          onRefreshApplications={onRefreshSelectedMyJobApplications}
          onApproveApplication={onApproveJobApplication}
          onRejectApplication={onRejectJobApplication}
          onSubmitReview={onSubmitReview}
          onChangeJobStatus={onChangeJobStatus}
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

  if (pickerExplorePage === 'applications') {
    return (
      <MyApplicationsPage
        applications={myApplications}
        isLoading={isMyApplicationsLoading}
        onRefresh={onRefreshMyApplications}
        onOpenChat={onOpenChatWithJobPoster}
        onBack={onBackFromPickerApplications}
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
      onOpenMyApplications={onOpenPickerApplications}
      onApplyJob={onApplyJob}
      isApplying={isApplyingJob}
      styles={styles}
      colors={colors}
    />
  );
}
