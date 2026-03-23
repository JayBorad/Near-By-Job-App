import React from 'react';
import {
  AdminCategoriesPage,
  CategoryPage,
  ProfilePage,
  ReportsPage,
  ReviewsPage,
  SettingsPage,
  UserModePage
} from '../tabScreens';

export function SettingsTab({
  settingsPage,
  user,
  userRole,
  themeMode,
  setThemeMode,
  onOpenProfile,
  onOpenMode,
  onBackFromProfile,
  onBackFromMode,
  onBackFromCategories,
  onRequestLogout,
  onOpenAvatarOptions,
  onOpenAvatarPreview,
  onSaveProfile,
  onChangeMode,
  onOpenCategories,
  onOpenReviews,
  onOpenReports,
  onBackFromReviews,
  onBackFromReports,
  reports,
  isReportsLoading,
  onRefreshReports,
  onCreateReport,
  isSavingProfile,
  isChangingMode,
  isUploadingAvatar,
  categoriesTab,
  setCategoriesTab,
  categorySearch,
  setCategorySearch,
  categoryFilter,
  setCategoryFilter,
  allCategories,
  myCategories,
  isCategoryLoading,
  hasFetchedCategoriesOnce,
  onRefreshCategories,
  adminCategories,
  isAdminPanelLoading,
  onRefreshAdminCategories,
  adminCategorySearch,
  setAdminCategorySearch,
  adminCategoryFilter,
  setAdminCategoryFilter,
  adminCategoryDraft,
  setAdminCategoryDraft,
  onCreateAdminCategory,
  onUpdateAdminCategory,
  onUpdateAdminCategoryStatus,
  onDeleteAdminCategory,
  myReceivedReviews,
  isMyReceivedReviewsLoading,
  onRefreshMyReceivedReviews,
  styles,
  colors
}) {
  if (settingsPage === 'profile') {
    return (
      <ProfilePage
        user={user}
        onBack={onBackFromProfile}
        onOpenAvatarOptions={onOpenAvatarOptions}
        onOpenAvatarPreview={onOpenAvatarPreview}
        onSaveProfile={onSaveProfile}
        isSavingProfile={isSavingProfile}
        isUploadingAvatar={isUploadingAvatar}
        styles={styles}
        colors={colors}
      />
    );
  }

  if (settingsPage === 'mode' && userRole !== 'ADMIN') {
    return (
      <UserModePage
        user={user}
        onBack={onBackFromMode}
        onChangeMode={onChangeMode}
        isChangingMode={isChangingMode}
        styles={styles}
        colors={colors}
      />
    );
  }

  if (settingsPage === 'categories') {
    if (userRole === 'ADMIN') {
      return (
        <AdminCategoriesPage
          onBack={onBackFromCategories}
          categories={adminCategories}
          isLoading={isAdminPanelLoading}
          onRefresh={onRefreshAdminCategories}
          categorySearch={adminCategorySearch}
          setCategorySearch={setAdminCategorySearch}
          categoryFilter={adminCategoryFilter}
          setCategoryFilter={setAdminCategoryFilter}
          categoryDraft={adminCategoryDraft}
          setCategoryDraft={setAdminCategoryDraft}
          onCreateCategory={onCreateAdminCategory}
          onUpdateCategory={onUpdateAdminCategory}
          onUpdateCategoryStatus={onUpdateAdminCategoryStatus}
          onDeleteCategory={onDeleteAdminCategory}
          styles={styles}
          colors={colors}
        />
      );
    }

    return (
      <CategoryPage
        categoriesTab={categoriesTab}
        setCategoriesTab={setCategoriesTab}
        categorySearch={categorySearch}
        setCategorySearch={setCategorySearch}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        allCategories={allCategories}
        myCategories={myCategories}
        isLoading={isCategoryLoading}
        hasFetchedOnce={hasFetchedCategoriesOnce}
        onBack={onBackFromCategories}
        onRefresh={onRefreshCategories}
        styles={styles}
        colors={colors}
      />
    );
  }

  if (settingsPage === 'reviews' && userRole !== 'ADMIN') {
    return (
      <ReviewsPage
        reviewsData={myReceivedReviews}
        isLoading={isMyReceivedReviewsLoading}
        onBack={onBackFromReviews}
        onRefresh={onRefreshMyReceivedReviews}
        styles={styles}
        colors={colors}
      />
    );
  }

  if (settingsPage === 'reports' && userRole !== 'ADMIN') {
    return (
      <ReportsPage
        reports={reports}
        isLoading={isReportsLoading}
        onBack={onBackFromReports}
        onRefresh={onRefreshReports}
        onCreateReport={onCreateReport}
        styles={styles}
        colors={colors}
      />
    );
  }

  return (
    <SettingsPage
      user={user}
      themeMode={themeMode}
      setThemeMode={setThemeMode}
      onOpenProfile={onOpenProfile}
      onOpenMode={onOpenMode}
      onOpenCategories={onOpenCategories}
      onOpenReviews={onOpenReviews}
      onOpenReports={onOpenReports}
      onRequestLogout={onRequestLogout}
      styles={styles}
      colors={colors}
    />
  );
}
