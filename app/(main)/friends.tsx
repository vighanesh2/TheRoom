import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { Avatar } from '@/components/Avatar';
import { RoomsBackground } from '@/components/home/RoomsBackground';
import {
  acceptFriendRequest,
  declineFriendRequest,
  getFriendCount,
  getFriendNotifications,
  getPendingFriendRequests,
  markNotificationsRead,
} from '@/lib/api/friends';
import { useAuth } from '@/lib/auth';
import { useTabBarInset } from '@/lib/hooks/useTabBarInset';
import type { FriendNotificationWithDetails, FriendRequestWithProfile } from '@/lib/types/database';

const NAVY = '#12121F';
const PURPLE = '#7C3AED';
const MUTED = '#6B7280';

function RequestRow({
  request,
  onAccept,
  onDecline,
  loading,
}: {
  request: FriendRequestWithProfile;
  onAccept: () => void;
  onDecline: () => void;
  loading: boolean;
}) {
  const name = request.requester.full_name ?? 'Someone';

  return (
    <View style={styles.requestRow}>
      <Avatar name={name} uri={request.requester.avatar_url} size={48} />
      <View style={styles.requestInfo}>
        <Text style={styles.requestName}>{name}</Text>
        <Text style={styles.requestSub}>Wants to connect with you</Text>
      </View>
      <View style={styles.requestActions}>
        <Pressable
          onPress={onAccept}
          disabled={loading}
          style={({ pressed }) => [styles.acceptBtn, pressed && styles.pressed]}>
          <Text style={styles.acceptText}>Accept</Text>
        </Pressable>
        <Pressable
          onPress={onDecline}
          disabled={loading}
          style={({ pressed }) => [styles.declineBtn, pressed && styles.pressed]}>
          <Ionicons name="close" size={18} color={MUTED} />
        </Pressable>
      </View>
    </View>
  );
}

function NotificationRow({
  notification,
  onPress,
}: {
  notification: FriendNotificationWithDetails;
  onPress: () => void;
}) {
  const schedule = notification.room?.starts_at
    ? format(parseISO(notification.room.starts_at), 'MMM d • h:mm a')
    : '';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.notifRow, pressed && styles.pressed]}>
      <Avatar
        name={notification.friend.display_name}
        uri={notification.friend.avatar_url}
        size={44}
      />
      <View style={styles.notifInfo}>
        <Text style={styles.notifTitle}>
          {notification.friend.display_name} is at {notification.room?.title ?? 'an event'}
        </Text>
        {schedule ? <Text style={styles.notifSub}>{schedule}</Text> : null}
      </View>
      {!notification.read_at ? <View style={styles.unreadDot} /> : null}
      <Ionicons name="chevron-forward" size={16} color="#C4C4CF" />
    </Pressable>
  );
}

export default function FriendsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();
  const { user } = useAuth();

  const [requests, setRequests] = useState<FriendRequestWithProfile[]>([]);
  const [notifications, setNotifications] = useState<FriendNotificationWithDetails[]>([]);
  const [friendCount, setFriendCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      const [pending, notifs, count] = await Promise.all([
        getPendingFriendRequests(user.id),
        getFriendNotifications(user.id),
        getFriendCount(user.id),
      ]);
      setRequests(pending);
      setNotifications(notifs);
      setFriendCount(count);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load friends';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData])
  );

  const handleAccept = async (requestId: string) => {
    if (!user) return;
    setActionId(requestId);
    try {
      await acceptFriendRequest(requestId, user.id);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to accept request';
      Alert.alert('Error', message);
    } finally {
      setActionId(null);
    }
  };

  const handleDecline = async (requestId: string) => {
    if (!user) return;
    setActionId(requestId);
    try {
      await declineFriendRequest(requestId, user.id);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to decline request';
      Alert.alert('Error', message);
    } finally {
      setActionId(null);
    }
  };

  const openNotification = async (notification: FriendNotificationWithDetails) => {
    if (!user) return;

    if (!notification.read_at) {
      try {
        await markNotificationsRead(user.id, [notification.id]);
      } catch {
        // Continue navigation even if marking fails.
      }
    }

    router.push(`/(main)/room/${notification.room_id}`);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <RoomsBackground />
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <RoomsBackground />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 8, paddingBottom: tabBarInset },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
            <Ionicons name="arrow-back" size={20} color={NAVY} />
          </Pressable>
          <Text style={styles.title}>Friends</Text>
          <View style={styles.countPill}>
            <Text style={styles.countText}>{friendCount}</Text>
          </View>
        </View>

        {requests.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Friend requests</Text>
            {requests.map((request) => (
              <RequestRow
                key={request.id}
                request={request}
                onAccept={() => handleAccept(request.id)}
                onDecline={() => handleDecline(request.id)}
                loading={actionId === request.id}
              />
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>At the same event</Text>
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onPress={() => openNotification(notification)}
              />
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="notifications-outline" size={24} color={PURPLE} />
              <Text style={styles.emptyTitle}>No alerts yet</Text>
              <Text style={styles.emptySub}>
                When you and a friend join the same event, you&apos;ll both get notified here.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F4F8',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 28,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: NAVY,
  },
  countPill: {
    backgroundColor: '#EDE8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  countText: {
    fontSize: 14,
    fontWeight: '700',
    color: PURPLE,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    gap: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '600',
    color: NAVY,
  },
  requestSub: {
    fontSize: 13,
    color: MUTED,
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  acceptBtn: {
    backgroundColor: PURPLE,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  acceptText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  declineBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F5F4F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    gap: 12,
  },
  notifInfo: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: NAVY,
    lineHeight: 20,
  },
  notifSub: {
    fontSize: 12,
    color: MUTED,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PURPLE,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F5',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: NAVY,
  },
  emptySub: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.85,
  },
});
