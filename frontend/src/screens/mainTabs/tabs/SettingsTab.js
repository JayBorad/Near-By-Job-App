import React from 'react';
import { AdminCategoriesPage, CategoryPage, ProfilePage, SettingsPage, UserModePage } from '../tabScreens';

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
  onUpdateAdminCategoryStatus,
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
          onUpdateCategoryStatus={onUpdateAdminCategoryStatus}
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

  return (
    <SettingsPage
      user={user}
      themeMode={themeMode}
      setThemeMode={setThemeMode}
      onOpenProfile={onOpenProfile}
      onOpenMode={onOpenMode}
      onOpenCategories={onOpenCategories}
      onRequestLogout={onRequestLogout}
      styles={styles}
      colors={colors}
    />
  );
}
