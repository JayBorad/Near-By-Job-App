import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminListState } from '../../../components/AdminListState';
import { PageCard } from '../components/SharedBlocks';

export function MessagesTab({
  userRole,
  chatConversations,
  isChatConversationsLoading,
  onRefreshChatConversations,
  onOpenChatConversation,
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

  return (
    <View style={styles.centerPage}>
      <PageCard
        title="Reports"
        subtitle="Review system reports and escalations."
        icon="chatbubble-ellipses"
        styles={styles}
        colors={colors}
      />
    </View>
  );
}
