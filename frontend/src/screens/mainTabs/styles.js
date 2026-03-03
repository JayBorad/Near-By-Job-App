import { Platform, StatusBar, StyleSheet } from 'react-native';

export const TAB_BAR_HEIGHT = 74;
export const TAB_BAR_SHADOW_SPACE = 8;
export const TOP_SAFE_PADDING = Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight || 0) + 10;
const TILE_SIZE = 256;

export const lightTheme = {
  background: '#F5F7FB',
  surface: '#FFFFFF',
  primary: '#0F766E',
  primarySoft: '#DFF4F2',
  textMain: '#111827',
  textSecondary: '#6B7280',
  border: '#D1D5DB',
  iconInactive: '#94A3B8',
  danger: '#DC2626',
  pageSubtitle: '#64748B',
  sheet: '#F8FAFC'
};

export const darkTheme = {
  background: '#0B1220',
  surface: '#111A2E',
  primary: '#2DD4BF',
  primarySoft: '#133332',
  textMain: '#F8FAFC',
  textSecondary: '#94A3B8',
  border: '#263247',
  iconInactive: '#64748B',
  danger: '#EF4444',
  pageSubtitle: '#A5B4C8',
  sheet: '#17233A'
};

export const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background
    },
    pageWrap: {
      flex: 1,
      alignItems: 'stretch',
      paddingBottom: TAB_BAR_HEIGHT + TAB_BAR_SHADOW_SPACE
    },
    centerPage: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 22
    },
    pageCard: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      paddingVertical: 32,
      paddingHorizontal: 20,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.18,
      shadowRadius: 14,
      elevation: 6
    },
    pageIconWrap: {
      width: 62,
      height: 62,
      borderRadius: 31,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16
    },
    pageTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.textMain,
      marginBottom: 8
    },
    pageSubtitle: {
      fontSize: 15,
      color: colors.pageSubtitle,
      textAlign: 'center',
      lineHeight: 22
    },
    tabBarOuter: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center'
    },
    tabBar: {
      width: '100%',
      backgroundColor: colors.surface,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      borderTopWidth: 1,
      borderColor: colors.border,
      height: TAB_BAR_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingTop: 6,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 12
    },
    tabSlot: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center'
    },
    tabLabel: {
      marginTop: 4,
      fontSize: 11,
      fontWeight: '600',
      color: colors.iconInactive
    },
    tabLabelActive: {
      color: colors.primary
    },
    centerBtn: {
      position: 'absolute',
      top: -22,
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.28,
      shadowRadius: 10,
      elevation: 14,
      borderWidth: 3,
      borderColor: colors.surface
    },
    settingsScreen: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: TOP_SAFE_PADDING
    },
    scrollBody: {
      flexGrow: 1,
      paddingBottom: 24
    },
    settingsNav: {
      height: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10
    },
    settingsNavTitle: {
      fontSize: 19,
      fontWeight: '800',
      color: colors.textMain
    },
    settingsNavRight: {
      width: 74
    },
    settingsNavIconBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-end'
    },
    settingsBackBtn: {
      width: 74,
      flexDirection: 'row',
      alignItems: 'center'
    },
    settingsBackText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 14
    },
    settingsHeaderCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 12
    },
    settingsHeaderInfo: {
      marginLeft: 10,
      flex: 1
    },
    settingsHeaderName: {
      color: colors.textMain,
      fontWeight: '700',
      fontSize: 15
    },
    settingsHeaderEmail: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 2
    },
    settingsRolePill: {
      marginTop: 6,
      alignSelf: 'flex-start',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.primary,
      color: colors.primary,
      fontSize: 11,
      fontWeight: '800',
      paddingHorizontal: 8,
      paddingVertical: 2
    },
    themeSwitchWrap: {
      flexDirection: 'row',
      backgroundColor: colors.sheet,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 6,
      marginBottom: 12
    },
    themePill: {
      flex: 1,
      height: 36,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row'
    },
    themePillActive: {
      backgroundColor: colors.primary
    },
    themePillText: {
      marginLeft: 6,
      color: colors.iconInactive,
      fontWeight: '700',
      fontSize: 12
    },
    themePillTextActive: {
      color: '#FFFFFF'
    },
    settingsGroup: {
      backgroundColor: colors.sheet,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden'
    },
    settingRow: {
      minHeight: 58,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center'
    },
    settingIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10
    },
    settingTitle: {
      color: colors.textMain,
      fontWeight: '700',
      fontSize: 13
    },
    settingSubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 1
    },
    logoutBtn: {
      marginTop: 14,
      height: 44,
      backgroundColor: colors.danger,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row'
    },
    logoutBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
      marginLeft: 8
    },
    profileHero: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 16,
      paddingHorizontal: 14,
      alignItems: 'center',
      marginBottom: 12
    },
    avatarWrap: {
      alignItems: 'center',
      justifyContent: 'center'
    },
    avatarBadge: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.primary,
      borderWidth: 2,
      borderColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center'
    },
    profileName: {
      marginTop: 14,
      fontSize: 22,
      fontWeight: '800',
      color: colors.textMain,
      textAlign: 'center'
    },
    profileEmail: {
      marginTop: 6,
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center'
    },
    profileHint: {
      marginTop: 8,
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center'
    },
    profileEditCard: {
      backgroundColor: colors.sheet,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12
    },
    profileSectionTitle: {
      color: colors.textMain,
      fontWeight: '800',
      fontSize: 14,
      marginBottom: 10
    },
    profileInputWrap: {
      marginBottom: 14
    },
    profileInputLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 6
    },
    profileInput: {
      height: 44,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      color: colors.textMain,
      fontSize: 14
    },
    profileReadOnly: {
      justifyContent: 'center'
    },
    profileReadOnlyText: {
      color: colors.textSecondary,
      fontSize: 14
    },
    profilePhoneRow: {
      flexDirection: 'row',
      alignItems: 'center'
    },
    profileCodeBtn: {
      width: 74,
      height: 44,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8
    },
    profileCodeText: {
      color: colors.textMain,
      fontWeight: '700'
    },
    profilePhoneInput: {
      flex: 1,
      height: 44,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      color: colors.textMain,
      fontSize: 14
    },
    genderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between'
    },
    genderPill: {
      flex: 1,
      height: 38,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 6
    },
    genderPillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary
    },
    genderPillText: {
      color: colors.textMain,
      fontWeight: '700',
      fontSize: 12
    },
    genderPillTextActive: {
      color: '#FFFFFF'
    },
    profileMultiline: {
      height: undefined,
      minHeight: 96,
      textAlignVertical: 'top',
      paddingTop: 12,
      paddingBottom: 10
    },
    profileSaveBtn: {
      marginTop: 8,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row'
    },
    profileSaveBtnText: {
      marginLeft: 8,
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 14
    },
    codeSheet: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      maxHeight: '70%'
    },
    codeSearchInput: {
      height: 40,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 10,
      color: colors.textMain,
      marginBottom: 8
    },
    codeScroll: {
      maxHeight: 320
    },
    codeRow: {
      minHeight: 42,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    codeRowSelected: {
      backgroundColor: colors.primarySoft
    },
    codeRowName: {
      color: colors.textMain,
      fontSize: 13
    },
    codeRowCode: {
      color: colors.primary,
      fontWeight: '700'
    },
    profileInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      minHeight: 54,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border
    },
    profileInfoLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '600'
    },
    profileInfoValue: {
      fontSize: 13,
      color: colors.textMain,
      fontWeight: '700',
      textTransform: 'capitalize'
    },
    categoryTabWrap: {
      flexDirection: 'row',
      backgroundColor: colors.sheet,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 5,
      marginBottom: 10
    },
    categoryTabBtn: {
      flex: 1,
      height: 34,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center'
    },
    categoryTabBtnActive: {
      backgroundColor: colors.primary
    },
    categoryTabText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700'
    },
    categoryTabTextActive: {
      color: '#FFFFFF'
    },
    categorySearchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10
    },
    categorySearchWrap: {
      flex: 1,
      height: 42,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10
    },
    categorySearchInput: {
      flex: 1,
      marginLeft: 6,
      color: colors.textMain,
      fontSize: 14
    },
    categoryFilterIconBtn: {
      marginLeft: 0,
      width: 42,
      height: 42,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center'
    },
    categoryFilterModal: {
      width: 280,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 12,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.18,
      shadowRadius: 14,
      elevation: 12
    },
    filterBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(2, 6, 23, 0.5)',
      alignItems: 'flex-end',
      justifyContent: 'flex-start',
      paddingHorizontal: 16,
      paddingTop: TOP_SAFE_PADDING + 118
    },
    categoryFilterHint: {
      marginTop: 2,
      marginBottom: 10,
      color: colors.textSecondary,
      fontSize: 12
    },
    categoryFilterOption: {
      height: 44,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.sheet,
      marginBottom: 8,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 10,
      flexDirection: 'row'
    },
    categoryFilterOptionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft
    },
    categoryFilterOptionText: {
      marginLeft: 8,
      color: colors.textMain,
      fontWeight: '700',
      fontSize: 13
    },
    categoryFilterOptionLeft: {
      flexDirection: 'row',
      alignItems: 'center'
    },
    categoryFilterOptionTextActive: {
      color: colors.primary
    },
    categoryFilterScroll: {
      maxHeight: 38,
      marginBottom: 10
    },
    categoryFilterPill: {
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8
    },
    categoryFilterPillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary
    },
    categoryFilterText: {
      color: colors.textMain,
      fontSize: 12,
      fontWeight: '700'
    },
    categoryFilterTextActive: {
      color: '#FFFFFF'
    },
    categoryCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      padding: 12,
      marginBottom: 10
    },
    categoryCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    categoryName: {
      color: colors.textMain,
      fontWeight: '800',
      fontSize: 15,
      flex: 1,
      marginRight: 10
    },
    categoryDescription: {
      marginTop: 6,
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 18
    },
    categoryStatusBadge: {
      height: 24,
      borderRadius: 12,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center'
    },
    categoryStatusPending: {
      backgroundColor: '#FEF3C7'
    },
    categoryStatusApproved: {
      backgroundColor: '#D1FAE5'
    },
    categoryStatusRejected: {
      backgroundColor: '#FEE2E2'
    },
    categoryStatusText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#0F172A'
    },
    categoryEmptyCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      paddingVertical: 24,
      alignItems: 'center'
    },
    categoryEmptyText: {
      marginTop: 8,
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '700'
    },
    centerLoaderWrap: {
      minHeight: 180,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 20
    },
    adminUserCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      backgroundColor: colors.surface,
      padding: 12,
      marginBottom: 10
    },
    adminUserHead: {
      marginBottom: 10
    },
    adminUserName: {
      color: colors.textMain,
      fontWeight: '800',
      fontSize: 15
    },
    adminUserMeta: {
      marginTop: 4,
      color: colors.textSecondary,
      fontSize: 12
    },
    adminControlRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 10
    },
    adminChip: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      backgroundColor: colors.sheet
    },
    adminChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft
    },
    adminChipText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700'
    },
    adminChipTextActive: {
      color: colors.primary
    },
    adminStatusRow: {
      flexDirection: 'row',
      gap: 8
    },
    adminStatusBtn: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      backgroundColor: colors.sheet
    },
    adminStatusBtnActive: {
      borderColor: '#059669',
      backgroundColor: '#D1FAE5'
    },
    adminStatusBtnDanger: {
      borderColor: '#DC2626',
      backgroundColor: '#FEE2E2'
    },
    adminStatusText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700'
    },
    adminStatusTextActive: {
      color: '#047857'
    },
    adminStatusTextDanger: {
      color: '#B91C1C'
    },
    adminUserCardNew: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      backgroundColor: colors.surface,
      padding: 14,
      marginBottom: 10
    },
    adminUserToolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8
    },
    adminUserSearchWrap: {
      flex: 1,
      height: 44,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10
    },
    adminUserFilterBtn: {
      marginLeft: 8,
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center'
    },
    adminUserFilterBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary
    },
    adminUserFilterBtnText: {
      marginLeft: 5,
      color: colors.primary,
      fontSize: 12,
      fontWeight: '800'
    },
    adminUserFilterBtnTextActive: {
      color: '#FFFFFF'
    },
    adminUserFilterBadge: {
      marginLeft: 7,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.28)',
      paddingHorizontal: 4
    },
    adminUserFilterBadgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '800'
    },
    adminUserAppliedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: 10
    },
    adminUserAppliedChip: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 8
    },
    adminUserAppliedLabel: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '700'
    },
    adminUserAppliedValue: {
      marginTop: 2,
      color: colors.textMain,
      fontSize: 12,
      fontWeight: '800'
    },
    adminFilterSheet: {
      width: '100%',
      maxWidth: 420,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14
    },
    adminFilterHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10
    },
    adminFilterLabel: {
      marginBottom: 6,
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700'
    },
    adminFilterWrap: {
      marginBottom: 10,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8
    },
    adminUserCardLead: {
      flexDirection: 'row',
      alignItems: 'center'
    },
    adminUserCardBody: {
      flex: 1,
      marginLeft: 10
    },
    adminUserCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    adminUserCardName: {
      flex: 1,
      marginRight: 8,
      color: colors.textMain,
      fontWeight: '800',
      fontSize: 15
    },
    adminUserCardEmail: {
      marginTop: 5,
      color: colors.textSecondary,
      fontSize: 13
    },
    adminUserCardTags: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8
    },
    adminUserTag: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: colors.primarySoft
    },
    adminUserTagText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '800'
    },
    adminUserDetailHero: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      backgroundColor: colors.surface,
      padding: 16,
      marginBottom: 10,
      alignItems: 'center'
    },
    adminUserDetailName: {
      color: colors.textMain,
      fontSize: 20,
      fontWeight: '800'
    },
    adminUserDetailEmail: {
      marginTop: 6,
      color: colors.textSecondary,
      fontSize: 14
    },
    adminUserDetailCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      backgroundColor: colors.surface,
      padding: 14,
      marginBottom: 10
    },
    adminReadOnlyWrap: {
      justifyContent: 'center',
      backgroundColor: colors.sheet
    },
    adminReadOnlyText: {
      color: colors.textSecondary,
      fontSize: 14
    },
    adminPanelTabs: {
      flexDirection: 'row',
      marginBottom: 10,
      gap: 8
    },
    adminPanelTabBtn: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.sheet,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10
    },
    adminPanelTabBtnActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft
    },
    adminPanelTabText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700'
    },
    adminPanelTabTextActive: {
      color: colors.primary
    },
    adminJobCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      backgroundColor: colors.surface,
      padding: 14,
      marginBottom: 10
    },
    adminJobTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    adminJobTitle: {
      color: colors.textMain,
      fontWeight: '800',
      fontSize: 15,
      flex: 1,
      marginRight: 10
    },
    adminJobMeta: {
      marginTop: 4,
      color: colors.textSecondary,
      fontSize: 12
    },
    adminJobStatusPill: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: colors.primarySoft
    },
    adminJobStatusText: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: '800'
    },
    adminJobBottomRow: {
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    adminJobBudget: {
      color: colors.textMain,
      fontSize: 14,
      fontWeight: '800'
    },
    adminJobDetailModal: {
      width: '100%',
      maxWidth: 420,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14
    },
    adminJobDetailHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8
    },
    adminJobDetailTitle: {
      flex: 1,
      marginRight: 8,
      color: colors.textMain,
      fontSize: 18,
      fontWeight: '800'
    },
    adminJobDetailDescription: {
      marginBottom: 8,
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 19
    },
    adminJobDetailGrid: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.sheet,
      padding: 10,
      marginBottom: 10
    },
    myJobCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      padding: 12,
      marginBottom: 10
    },
    myJobsHeroCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      backgroundColor: colors.surface,
      padding: 14,
      marginBottom: 12
    },
    myJobsHeroTitle: {
      color: colors.textMain,
      fontSize: 18,
      fontWeight: '800'
    },
    myJobsHeroSubtitle: {
      marginTop: 4,
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 18
    },
    myJobsStatsRow: {
      marginTop: 12,
      flexDirection: 'row',
      gap: 8
    },
    myJobsStatChip: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.sheet,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10
    },
    myJobsStatValue: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: '800'
    },
    myJobsStatLabel: {
      marginTop: 2,
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '700'
    },
    myJobHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    myJobTitle: {
      flex: 1,
      marginRight: 8,
      color: colors.textMain,
      fontWeight: '800',
      fontSize: 15
    },
    myJobDescription: {
      marginTop: 4,
      color: colors.textSecondary,
      fontSize: 12
    },
    myJobStatusPill: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: colors.primarySoft
    },
    myJobStatusPillText: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: '800'
    },
    myJobMeta: {
      marginTop: 4,
      color: colors.textSecondary,
      fontSize: 12
    },
    myJobMetaRow: {
      marginTop: 8,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6
    },
    myJobMetaRowSection: {
      marginTop: 6,
      marginBottom: 2,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6
    },
    myJobMetaPill: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      backgroundColor: colors.sheet,
      paddingHorizontal: 8,
      paddingVertical: 5,
      flexDirection: 'row',
      alignItems: 'center'
    },
    myJobMetaPillText: {
      marginLeft: 4,
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '700'
    },
    myJobOpenRow: {
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    myJobOpenText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700'
    },
    myJobDetailModal: {
      width: '100%',
      maxWidth: 380,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14
    },
    myJobDetailHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6
    },
    myJobDetailTitle: {
      flex: 1,
      marginRight: 8,
      color: colors.textMain,
      fontSize: 17,
      fontWeight: '800'
    },
    myJobDetailDescription: {
      marginBottom: 6,
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 19
    },
    myJobInfoCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.sheet,
      padding: 10,
      marginTop: 4,
      marginBottom: 4
    },
    myJobEditIconBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.sheet
    },
    myJobEditModal: {
      width: '100%',
      maxWidth: 420,
      maxHeight: '88%',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14
    },
    editMapModalCard: {
      width: '100%',
      maxWidth: 520,
      maxHeight: '90%',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 12
    },
    editMapHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10
    },
    editMapTitle: {
      color: colors.textMain,
      fontSize: 16,
      fontWeight: '800'
    },
    editMapCancelBtn: {
      height: 36,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.sheet,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center'
    },
    editMapCancelText: {
      marginLeft: 4,
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700'
    },
    editMapNativeContainer: {
      flex: 0,
      width: '100%',
      minHeight: 300,
      height: 300
    },
    editMapBackdropMobile: {
      justifyContent: 'center',
      paddingHorizontal: 6,
      paddingBottom: 0
    },
    editMapMeta: {
      marginTop: -2,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.sheet,
      paddingHorizontal: 10,
      paddingVertical: 5
    },
    editMapMetaText: {
      marginLeft: 6,
      color: colors.textMain,
      fontSize: 12,
      fontWeight: '700'
    },
    editMapCoordsWrap: {
      marginTop: 8
    },
    jobEditCategoryRow: {
      paddingBottom: 8
    },
    jobMapCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.sheet,
      padding: 10,
      marginTop: 8,
      marginBottom: 6
    },
    jobMapCardHead: {
      flexDirection: 'row',
      alignItems: 'center'
    },
    jobMapCardTitle: {
      marginLeft: 6,
      color: colors.textMain,
      fontSize: 13,
      fontWeight: '700'
    },
    jobMapImageWrap: {
      marginTop: 8,
      borderRadius: 10,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface
    },
    jobMapImage: {
      width: '100%',
      height: 150
    },
    jobMapOpenBtn: {
      position: 'absolute',
      right: 8,
      bottom: 8,
      borderRadius: 999,
      backgroundColor: colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 6,
      flexDirection: 'row',
      alignItems: 'center'
    },
    jobMapOpenBtnText: {
      marginLeft: 4,
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700'
    },
    jobMapEmpty: {
      marginTop: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      height: 90,
      alignItems: 'center',
      justifyContent: 'center'
    },
    jobMapEmptyText: {
      marginTop: 4,
      color: colors.textSecondary,
      fontSize: 12
    },
    jobMapAddressText: {
      marginTop: 8,
      color: colors.textMain,
      fontSize: 12,
      fontWeight: '600'
    },
    jobMapCoordsText: {
      marginTop: 2,
      color: colors.textSecondary,
      fontSize: 11
    },
    adminCreateCategoryCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      backgroundColor: colors.surface,
      padding: 14,
      marginBottom: 10
    },
    adminSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8
    },
    adminCreateCategoryTitle: {
      color: colors.textMain,
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 0
    },
    adminCategoryToolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10
    },
    adminCategoryCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      backgroundColor: colors.surface,
      padding: 12,
      marginBottom: 10
    },
    adminCategoryTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    adminCategoryNameWrap: {
      flex: 1,
      marginRight: 10
    },
    adminCategoryName: {
      color: colors.textMain,
      fontWeight: '800',
      fontSize: 14,
      maxWidth: '100%'
    },
    adminCategoryDescriptionOneLine: {
      marginTop: 4,
      color: colors.textSecondary,
      fontSize: 12
    },
    adminCategoryDescription: {
      marginTop: 8,
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 18
    },
    adminCategoryDropdownBtn: {
      minWidth: 98,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.sheet,
      paddingHorizontal: 8,
      paddingVertical: 6,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6
    },
    adminCategoryDropdownText: {
      color: colors.textMain,
      fontSize: 11,
      fontWeight: '800'
    },
    adminCategoryActions: {
      flexDirection: 'row',
      marginTop: 10,
      gap: 8
    },
    adminCategoryActionBtn: {
      flex: 1,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 9
    },
    adminCategoryApproveBtn: {
      backgroundColor: '#059669'
    },
    adminCategoryRejectBtn: {
      backgroundColor: '#DC2626'
    },
    adminCategoryActionText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700'
    },
    categorySkeletonCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      padding: 12,
      marginBottom: 10
    },
    categorySkeletonTitle: {
      width: '48%',
      height: 14,
      borderRadius: 7,
      backgroundColor: colors.primarySoft
    },
    categorySkeletonLine: {
      marginTop: 10,
      width: '100%',
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primarySoft
    },
    categorySkeletonLineShort: {
      width: '72%'
    },
    categoryDetailModal: {
      width: '100%',
      maxWidth: 380,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14
    },
    categoryDetailTitle: {
      color: colors.textMain,
      fontSize: 18,
      fontWeight: '800'
    },
    categoryDetailDescription: {
      marginTop: 8,
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20
    },
    categoryDetailStatusWrap: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    categoryDetailStatusLabel: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '700'
    },
    categoryFab: {
      position: 'absolute',
      right: 18,
      bottom: TAB_BAR_HEIGHT + 16,
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 10
    },
    createJobCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      backgroundColor: colors.surface,
      padding: 14
    },
    createJobCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10
    },
    createJobCardIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10
    },
    createJobCardHeaderText: {
      flex: 1
    },
    createFieldLabel: {
      color: colors.textMain,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 6
    },
    createFieldInput: {
      height: 42,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.sheet,
      color: colors.textMain,
      paddingHorizontal: 10,
      marginBottom: 10
    },
    createFieldInputError: {
      borderColor: '#DC2626'
    },
    createFieldInputErrorWrap: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#DC2626',
      padding: 6,
      marginBottom: 8
    },
    createFieldErrorText: {
      color: '#DC2626',
      fontSize: 12,
      marginTop: -4,
      marginBottom: 8,
      fontWeight: '600'
    },
    createFieldArea: {
      minHeight: 78,
      height: undefined,
      textAlignVertical: 'top',
      paddingTop: 10
    },
    createFieldSelect: {
      height: 42,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.sheet,
      paddingHorizontal: 10,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8
    },
    createFieldSelectText: {
      flex: 1,
      color: colors.textMain,
      fontSize: 13,
      fontWeight: '600'
    },
    createDropdown: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.surface,
      marginBottom: 10,
      overflow: 'hidden'
    },
    createDropdownItem: {
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border
    },
    createDropdownItemText: {
      color: colors.textMain,
      fontSize: 13
    },
    createPillRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 10
    },
    createPill: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.sheet,
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 12,
      marginRight: 8,
      marginBottom: 8
    },
    createPillActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft
    },
    createPillError: {
      borderColor: '#DC2626'
    },
    createPillText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700'
    },
    createPillTextActive: {
      color: colors.primary
    },
    createLocationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 2
    },
    createLocationInput: {
      flex: 1,
      marginBottom: 0,
      marginRight: 8
    },
    createMapBtn: {
      height: 42,
      borderRadius: 10,
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6
    },
    createMapBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700'
    },
    createMapSelectedWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primarySoft,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 9,
      marginBottom: 8
    },
    createMapSelectedText: {
      marginLeft: 8,
      color: colors.textMain,
      fontSize: 12,
      fontWeight: '600'
    },
    createMapHeaderWrap: {
      borderBottomWidth: 1,
      borderBottomColor: '#0B5F59',
      backgroundColor: '#0F766E',
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 10,
      marginHorizontal: -16
    },
    createMapHeaderTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8
    },
    createMapHeaderMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5
    },
    createMapHeaderMetaText: {
      marginLeft: 6,
      color: '#E6FFFA',
      fontSize: 12,
      fontWeight: '700'
    },
    createMapHeaderTitle: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800'
    },
    createMapHeaderBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 40,
      paddingHorizontal: 10
    },
    createMapHeaderBtnLeft: {
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.06)'
    },
    createMapHeaderBtnRight: {
      minWidth: 94,
      justifyContent: 'center'
    },
    createMapHeaderBtnText: {
      marginLeft: 4,
      color: '#D1FAE5',
      fontSize: 13,
      fontWeight: '700'
    },
    createMapHeaderBtnPrimary: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#0EA5A2',
      borderRadius: 18,
      paddingHorizontal: 10,
      paddingVertical: 7
    },
    createMapHeaderBtnPrimaryText: {
      marginLeft: 4,
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800'
    },
    datePickerBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(2, 6, 23, 0.35)',
      justifyContent: 'flex-end'
    },
    datePickerCard: {
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingTop: 8,
      paddingBottom: 16,
      paddingHorizontal: 10
    },
    datePickerDoneBtn: {
      alignSelf: 'flex-end',
      marginTop: 4,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.primary
    },
    datePickerDoneText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800'
    },
    createMapFullWrap: {
      flex: 1,
      padding: 12,
      backgroundColor: colors.background
    },
    createMapSearchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8
    },
    createMapSearchInputWrap: {
      flex: 1,
      height: 42,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10
    },
    createMapSearchInput: {
      flex: 1,
      marginLeft: 8,
      color: colors.textMain,
      fontSize: 13
    },
    createMapSearchBtn: {
      width: 42,
      height: 42,
      borderRadius: 12,
      marginLeft: 8,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center'
    },
    createMapResultsCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      marginBottom: 8,
      maxHeight: 180
    },
    createMapResultItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border
    },
    createMapResultTextWrap: {
      marginLeft: 8,
      flex: 1
    },
    createMapResultTitle: {
      color: colors.textMain,
      fontSize: 13,
      fontWeight: '700'
    },
    createMapResultSub: {
      marginTop: 2,
      color: colors.textSecondary,
      fontSize: 11
    },
    createMapNativeContainer: {
      flex: 1,
      minHeight: 360,
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface
    },
    createMapNativePressable: {
      flex: 1
    },
    createMapTilesCanvas: {
      flex: 1,
      backgroundColor: '#E5E7EB'
    },
    createMapTileImage: {
      position: 'absolute',
      width: TILE_SIZE,
      height: TILE_SIZE
    },
    createMapNativeCrosshair: {
      position: 'absolute',
      left: '50%',
      top: '50%',
      marginLeft: -11,
      marginTop: -22
    },
    createMapNativeHint: {
      position: 'absolute',
      top: 10,
      alignSelf: 'center',
      backgroundColor: 'rgba(15, 23, 42, 0.72)',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5
    },
    createMapNativeHintText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700'
    },
    createMapNativeControls: {
      position: 'absolute',
      right: 10,
      bottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.92)',
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: colors.border
    },
    createMapZoomBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface
    },
    createMapZoomText: {
      marginHorizontal: 10,
      color: colors.textMain,
      fontSize: 12,
      fontWeight: '700'
    },
    createMapWebOnlyWrap: {
      flex: 1
    },
    createMapNativeFull: {
      width: '100%',
      height: '100%'
    },
    createMapCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.sheet,
      padding: 10,
      marginBottom: 10
    },
    createMapNative: {
      width: '100%',
      height: 260,
      borderRadius: 10
    },
    createMapWebFrame: {
      width: '100%',
      height: 220,
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: 8
    },
    createMapWebCoords: {
      flexDirection: 'row'
    },
    createMapCoordInput: {
      flex: 1,
      marginBottom: 0,
      marginRight: 8
    },
    createMapActionRow: {
      marginTop: 10,
      flexDirection: 'row'
    },
    createSubmitBtn: {
      height: 46,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      marginTop: 8
    },
    createSubmitBtnDisabled: {
      opacity: 0.6
    },
    createSubmitBtnText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 14
    },
    categoryCreateCard: {
      width: '100%',
      maxWidth: 380,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14
    },
    jobCreateCard: {
      width: '100%',
      maxWidth: 420,
      maxHeight: '88%',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14
    },
    jobCreateForm: {
      marginTop: 4
    },
    jobFieldLabel: {
      color: colors.textMain,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 6
    },
    jobChipRow: {
      paddingBottom: 8
    },
    jobTypeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 8
    },
    jobChip: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.sheet,
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 12,
      marginRight: 8,
      marginBottom: 8
    },
    jobChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft
    },
    jobChipText: {
      color: colors.textSecondary,
      fontWeight: '700',
      fontSize: 12
    },
    jobChipTextActive: {
      color: colors.primary
    },
    jobEmptyHintWrap: {
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 12
    },
    jobEmptyHint: {
      color: colors.textSecondary,
      fontSize: 12
    },
    jobMapBox: {
      height: 180,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.sheet,
      marginBottom: 8,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center'
    },
    jobMapGridLineHorizontal: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: '50%',
      height: 1,
      backgroundColor: colors.border
    },
    jobMapGridLineVertical: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: '50%',
      width: 1,
      backgroundColor: colors.border
    },
    jobMapHint: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600'
    },
    jobMapMarker: {
      position: 'absolute',
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: '#FFFFFF',
      backgroundColor: colors.primary
    },
    jobMapCoords: {
      color: colors.textSecondary,
      fontSize: 12,
      marginBottom: 8
    },
    categoryCreateHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10
    },
    categoryCreateIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10
    },
    categoryCreateHeaderText: {
      flex: 1
    },
    categoryCreateInput: {
      height: 42,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.sheet,
      color: colors.textMain,
      paddingHorizontal: 10,
      marginBottom: 8
    },
    categoryCreateDescription: {
      minHeight: 74,
      height: undefined,
      textAlignVertical: 'top',
      paddingTop: 10
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(2, 6, 23, 0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24
    },
    previewBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(2, 6, 23, 0.75)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20
    },
    previewCard: {
      width: '100%',
      maxWidth: 420,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 16
    },
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    previewTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textMain
    },
    previewClose: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.sheet
    },
    previewAvatarWrap: {
      marginTop: 14,
      alignItems: 'center'
    },
    previewName: {
      marginTop: 14,
      fontSize: 20,
      fontWeight: '800',
      color: colors.textMain,
      textAlign: 'center'
    },
    previewEmail: {
      marginTop: 4,
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center'
    },
    previewEditBtn: {
      marginTop: 14,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center'
    },
    previewEditText: {
      marginLeft: 8,
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 14
    },
    modalCard: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 18,
      paddingVertical: 20,
      alignItems: 'center'
    },
    optionCard: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 14
    },
    optionTop: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10
    },
    optionAvatarMini: {
      marginRight: 10
    },
    optionTopContent: {
      flex: 1
    },
    avatarSheet: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 14
    },
    cropCard: {
      width: '100%',
      maxWidth: 420,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 16
    },
    cropAreaWrap: {
      marginTop: 12,
      height: 320,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: '#0F172A',
      position: 'relative'
    },
    zoomRow: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    zoomLabel: {
      color: colors.textSecondary,
      fontWeight: '700',
      fontSize: 13
    },
    zoomButtons: {
      flexDirection: 'row',
      alignItems: 'center'
    },
    zoomBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.sheet,
      alignItems: 'center',
      justifyContent: 'center'
    },
    zoomBtnText: {
      color: colors.textMain,
      fontWeight: '800',
      fontSize: 18,
      marginTop: -1
    },
    zoomValue: {
      minWidth: 48,
      textAlign: 'center',
      color: colors.textMain,
      fontWeight: '700',
      fontSize: 13
    },
    optionTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.textMain
    },
    optionSubtitle: {
      marginTop: 2,
      color: colors.textSecondary,
      fontSize: 12
    },
    optionModal: {
      width: '100%',
      maxWidth: 360,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14
    },
    optionMessage: {
      marginTop: 8,
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 20
    },
    optionActionsRow: {
      marginTop: 12,
      flexDirection: 'row',
      gap: 8
    },
    optionActionBtn: {
      flex: 1,
      height: 42,
      marginTop: 0,
      marginLeft: 0,
      marginRight: 0
    },
    optionRow: {
      height: 46,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.sheet,
      marginBottom: 8,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center'
    },
    optionLabel: {
      marginLeft: 10,
      fontSize: 14,
      fontWeight: '700',
      color: colors.textMain
    },
    optionCancel: {
      marginTop: 6,
      height: 42,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center'
    },
    optionCancelText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSecondary
    },
    staticAvatarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between'
    },
    staticAvatarItem: {
      width: '31%',
      aspectRatio: 1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
      padding: 6,
      backgroundColor: colors.sheet
    },
    staticAvatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 10
    },
    modalTitle: {
      marginTop: 10,
      fontSize: 20,
      fontWeight: '800',
      color: colors.textMain
    },
    modalSubtitle: {
      marginTop: 6,
      textAlign: 'center',
      color: colors.textSecondary,
      lineHeight: 20,
      fontSize: 13
    },
    modalActions: {
      marginTop: 16,
      width: '100%',
      flexDirection: 'row'
    },
    modalBtnSecondary: {
      flex: 1,
      height: 42,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8
    },
    modalBtnSecondaryText: {
      color: colors.textSecondary,
      fontWeight: '700'
    },
    modalBtnDanger: {
      flex: 1,
      height: 42,
      borderRadius: 10,
      backgroundColor: colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8
    },
    modalBtnDangerText: {
      color: '#FFFFFF',
      fontWeight: '700'
    },
    modalBtnPrimary: {
      flex: 1,
      height: 42,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8
    },
    modalBtnPrimaryInline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6
    },
    modalBtnPrimaryText: {
      color: '#FFFFFF',
      fontWeight: '700'
    },
    modalBtnDisabled: {
      opacity: 0.6
    }
  });
