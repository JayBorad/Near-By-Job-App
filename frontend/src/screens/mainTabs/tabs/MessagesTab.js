import React, { useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminListState } from '../../../components/AdminListState';

export function MessagesTab({
  userRole,
  chatConversations,
  isChatConversationsLoading,
  onRefreshChatConversations,
  onOpenChatConversation,
  adminReports = [],
  isAdminReportsLoading,
  onRefreshAdminReports,
  onUpdateAdminReportStatus,
  styles,
  colors
}) {
  if (userRole !== 'ADMIN') {
    return (
      <View style={styles.settingsScreen}>
        <View style={styles.settingsNav}>
          <View style={styles.settingsNavRight} />
          <Text style={styles.settingsNavTitle}>Chats</Text>
          <View style={styles.settingsNavRight}>
            <Pressable style={styles.settingsNavIconBtn} onPress={onRefreshChatConversations}>
              <Ionicons name="refresh-outline" size={18} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
          {isChatConversationsLoading ? (
            <AdminListState mode="loading" title="Loading chats..." subtitle="Please wait..." colors={colors} />
          ) : chatConversations.length ? (
            chatConversations.map((item) => {
              const unreadCount = Number(item?.unreadCount || 0);
              const hasUnread = unreadCount > 0;
              const preview = String(item?.lastMessage?.message || '').trim() || 'Open conversation';
              const lastTime = item?.lastMessage?.createdAt
                ? new Date(item.lastMessage.createdAt).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })
                : '';
              return (
                <Pressable
                  key={`${item?.job?.id}-${item?.peer?.id}`}
                  style={[styles.myJobCard, hasUnread ? styles.chatConversationUnreadCard : null]}
                  onPress={() => onOpenChatConversation(item)}
                >
                  <View style={styles.myJobHead}>
                    <Text style={styles.myJobTitle} numberOfLines={1}>
                      {item?.peer?.name || item?.peer?.username || 'User'}
                    </Text>
                    {lastTime ? <Text style={styles.chatConversationTime}>{lastTime}</Text> : null}
                  </View>
                  <Text style={styles.myJobDescription} numberOfLines={1}>
                    {item?.job?.title || 'Job Chat'}
                  </Text>
                  <View style={styles.chatConversationFooter}>
                    <Text
                      style={[styles.chatConversationPreview, hasUnread ? styles.chatConversationPreviewUnread : null]}
                      numberOfLines={1}
                    >
                      {preview}
                    </Text>
                    {hasUnread ? (
                      <View style={styles.chatConversationBadge}>
                        <Text style={styles.chatConversationBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              );
            })
          ) : (
            <AdminListState
              mode="empty"
              title="No chats yet"
              subtitle="When someone sends you a message, it will appear here."
              colors={colors}
            />
          )}
        </ScrollView>
      </View>
    );
  }

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchText, setSearchText] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState(null);

  const statusOptions = ['ALL', 'PENDING', 'IN_REVIEW', 'RESOLVED', 'REJECTED'];
  const toneByStatus = (status) => {
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'RESOLVED') return { bg: '#DCFCE7', text: '#166534' };
    if (normalized === 'REJECTED') return { bg: '#FEE2E2', text: '#991B1B' };
    if (normalized === 'IN_REVIEW') return { bg: '#DBEAFE', text: '#1D4ED8' };
    return { bg: colors.primarySoft, text: colors.primary };
  };

  const filteredReports = useMemo(() => {
    const keyword = String(searchText || '').trim().toLowerCase();
    return (Array.isArray(adminReports) ? adminReports : []).filter((item) => {
      const status = String(item?.status || '').toUpperCase();
      if (statusFilter !== 'ALL' && status !== statusFilter) return false;
      if (!keyword) return true;
      const title = String(item?.title || '').toLowerCase();
      const description = String(item?.description || '').toLowerCase();
      return title.includes(keyword) || description.includes(keyword);
    });
  }, [adminReports, searchText, statusFilter]);

  const refreshReports = () => onRefreshAdminReports?.({ status: statusFilter, q: searchText });

  const changeStatus = async ({ reportId, status }) => {
    if (!reportId || !status || isUpdatingStatus) return;
    try {
      setIsUpdatingStatus(true);
      const changed = await onUpdateAdminReportStatus?.(reportId, status);
      if (changed) {
        setSelectedReport((prev) =>
          prev && prev.id === reportId
            ? {
                ...prev,
                status
              }
            : prev
        );
      }
      setPendingStatusChange(null);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <View style={styles.settingsScreen}>
      <View style={styles.settingsNav}>
        <View style={styles.settingsNavRight} />
        <Text style={styles.settingsNavTitle}>Reports</Text>
        <View style={styles.settingsNavRight}>
          <Pressable style={styles.settingsNavIconBtn} onPress={refreshReports}>
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.reportAdminToolbar}>
        <View style={styles.categorySearchWrap}>
          <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search reports..."
            placeholderTextColor={colors.textSecondary}
            style={styles.categorySearchInput}
          />
        </View>
        <Pressable style={styles.categoryFilterIconBtn} onPress={() => setShowFilterModal(true)}>
          <Ionicons name="filter-outline" size={18} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        {isAdminReportsLoading ? (
          <AdminListState mode="loading" title="Loading reports..." subtitle="Please wait..." colors={colors} />
        ) : filteredReports.length ? (
          filteredReports.map((item) => {
            const tone = toneByStatus(item?.status);
            return (
              <Pressable key={item.id} style={styles.reportCard} onPress={() => setSelectedReport(item)}>
                <View style={styles.reportCardHead}>
                  <Text style={styles.reportCardTitle} numberOfLines={1}>
                    {item?.title || 'Untitled report'}
                  </Text>
                  <View style={[styles.reportStatusPill, { backgroundColor: tone.bg }]}>
                    <Text style={[styles.reportStatusPillText, { color: tone.text }]}>
                      {String(item?.status || 'PENDING').replace('_', ' ')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.reportCardDescription} numberOfLines={1}>
                  {item?.description || '-'}
                </Text>
                <Text style={styles.reportCardMeta}>
                  {item?.createdAt ? new Date(item.createdAt).toLocaleString('en-GB') : ''}
                </Text>
              </Pressable>
            );
          })
        ) : (
          <AdminListState
            mode="empty"
            title="No reports submitted"
            subtitle="Reports from users will appear here once submitted."
            colors={colors}
            emptySource={require('../../../../assets/lottie/no-result-found.json')}
          />
        )}
      </ScrollView>

      <Modal visible={showFilterModal} transparent animationType="fade" onRequestClose={() => setShowFilterModal(false)}>
        <Pressable style={styles.filterBackdrop} onPress={() => setShowFilterModal(false)}>
          <Pressable style={styles.categoryFilterModal} onPress={() => {}}>
            <Text style={styles.optionTitle}>Filter Reports</Text>
            <Text style={styles.categoryFilterHint}>Choose status</Text>
            {statusOptions.map((option) => (
              <Pressable
                key={option}
                style={[styles.categoryFilterOption, statusFilter === option && styles.categoryFilterOptionActive]}
                onPress={() => {
                  setStatusFilter(option);
                  setShowFilterModal(false);
                }}
              >
                <Text style={[styles.categoryFilterOptionText, statusFilter === option && styles.categoryFilterOptionTextActive]}>
                  {option.replace('_', ' ')}
                </Text>
                {statusFilter === option ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={Boolean(selectedReport)} transparent animationType="fade" onRequestClose={() => setSelectedReport(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.reportDetailModal}>
            <View style={styles.reportDetailHeader}>
              <View style={styles.reportDetailHeadingWrap}>
                <View style={styles.reportDetailHeadingIcon}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.primary} />
                </View>
                <Text style={styles.reportDetailTitle} numberOfLines={2}>
                  {selectedReport?.title || ''}
                </Text>
              </View>
              <Pressable style={styles.reportDetailCloseBtn} onPress={() => setSelectedReport(null)}>
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.reportDetailStatusRow}>
              <View style={[styles.reportStatusPill, { backgroundColor: toneByStatus(selectedReport?.status).bg }]}>
                <Text style={[styles.reportStatusPillText, { color: toneByStatus(selectedReport?.status).text }]}>
                  {String(selectedReport?.status || 'PENDING').replace('_', ' ')}
                </Text>
              </View>
            </View>

            <Text style={styles.reportDetailDescription}>{selectedReport?.description || '-'}</Text>
            {selectedReport?.imageUrl ? (
              <Image source={{ uri: selectedReport.imageUrl }} style={styles.reportDetailImage} resizeMode="cover" />
            ) : null}
            <Text style={styles.reportDetailMeta}>
              Date: {selectedReport?.createdAt ? new Date(selectedReport.createdAt).toLocaleString('en-GB') : '-'}
            </Text>
            <Text style={styles.reportDetailMeta}>
              User: {selectedReport?.creator?.name || selectedReport?.creator?.username || selectedReport?.creator?.email || '-'}
            </Text>
            <View style={styles.reportStatusButtonsRow}>
              {statusOptions
                .filter((option) => option !== 'ALL')
                .map((option) => (
                  <Pressable
                    key={option}
                    style={[
                      styles.reportStatusActionBtn,
                      String(selectedReport?.status || '').toUpperCase() === option
                        ? styles.reportStatusActionBtnActive
                        : null
                    ]}
                    onPress={() => {
                      if (String(selectedReport?.status || '').toUpperCase() === option) return;
                      setPendingStatusChange({
                        reportId: selectedReport.id,
                        reportTitle: selectedReport.title || 'Report',
                        fromStatus: String(selectedReport?.status || 'PENDING').toUpperCase(),
                        toStatus: option
                      });
                    }}
                    disabled={isUpdatingStatus}
                  >
                    <Text
                      style={[
                        styles.reportStatusActionBtnText,
                        String(selectedReport?.status || '').toUpperCase() === option
                          ? styles.reportStatusActionBtnTextActive
                          : null
                      ]}
                    >
                      {option.replace('_', ' ')}
                    </Text>
                  </Pressable>
                ))}
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(pendingStatusChange)}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingStatusChange(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.reportConfirmModal}>
            <Text style={styles.optionTitle}>Confirm Status Change</Text>
            <Text style={styles.categoryFilterHint} numberOfLines={3}>
              {`Change "${pendingStatusChange?.reportTitle || 'this report'}" from ${String(
                pendingStatusChange?.fromStatus || ''
              ).replace('_', ' ')} to ${String(pendingStatusChange?.toStatus || '').replace('_', ' ')}?`}
            </Text>
            <View style={styles.optionActionsRow}>
              <Pressable
                style={[styles.optionCancel, styles.optionActionBtn]}
                onPress={() => setPendingStatusChange(null)}
                disabled={isUpdatingStatus}
              >
                <Text style={styles.optionCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtnPrimary, styles.optionActionBtn, isUpdatingStatus ? styles.modalBtnDisabled : null]}
                onPress={() => changeStatus({ reportId: pendingStatusChange?.reportId, status: pendingStatusChange?.toStatus })}
                disabled={isUpdatingStatus}
              >
                <Text style={styles.modalBtnPrimaryText}>{isUpdatingStatus ? 'Updating...' : 'Confirm'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
