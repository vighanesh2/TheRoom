import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';

import { Avatar } from '@/components/Avatar';
import { getGradientColors } from '@/constants/gradients';
import { getMyRooms } from '@/lib/api/rooms';
import { getLatestMembershipProfile, getUserProfile } from '@/lib/api/profile';
import { getFriendCount, getPendingFriendRequests, getUnreadNotificationCount } from '@/lib/api/friends';
import { useAuth } from '@/lib/auth';
import { useTabBarInset } from '@/lib/hooks/useTabBarInset';
import type { Profile, RoomMember, RoomWithMemberCount } from '@/lib/types/database';
import { isRoomLive } from '@/lib/utils/room-status';

const NAVY = '#12121F';
const PURPLE = '#7C3AED';
const MUTED = '#6B7280';

function toHandle(name: string, email?: string | null): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '') || email?.split('@')[0] || 'guest';
  return `@${base}`;
}

function formatLinkedIn(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
}

function InfoRow({
  label,
  value,
  linkedIn,
}: {
  label: string;
  value?: string | null;
  linkedIn?: boolean;
}) {
  const display = value?.trim() || 'Add details';

  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      {linkedIn && value ? (
        <Pressable onPress={() => Linking.openURL(value)} style={styles.linkedinRow}>
          <Ionicons name="logo-linkedin" size={16} color="#0A66C2" />
          <Text style={styles.linkedinText} numberOfLines={1}>
            {formatLinkedIn(value)}
          </Text>
        </Pressable>
      ) : (
        <Text style={[styles.infoValue, !value && styles.infoPlaceholder]} numberOfLines={2}>
          {display}
        </Text>
      )}
    </View>
  );
}

function StatItem({
  icon,
  value,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: number;
  label: string;
}) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={16} color={PURPLE} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MyRoomCard({ room, onPress }: { room: RoomWithMemberCount; onPress: () => void }) {
  const live = isRoomLive(room.starts_at);
  const schedule = format(parseISO(room.starts_at), 'MMM d • h:mm a');

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.roomCard, pressed && styles.pressed]}>
      {room.cover_type === 'image' ? (
        <Image source={{ uri: room.cover_value }} style={styles.roomThumb} contentFit="cover" />
      ) : room.cover_type === 'color' ? (
        <View style={[styles.roomThumb, { backgroundColor: room.cover_value }]} />
      ) : (
        <LinearGradient colors={getGradientColors(room.cover_value)} style={styles.roomThumb} />
      )}
      <Text style={styles.roomTitle} numberOfLines={2}>
        {room.title}
      </Text>
      <View style={styles.roomMetaRow}>
        <View style={[styles.roomDot, live && styles.roomDotLive]} />
        <Text style={styles.roomMeta}>{schedule}</Text>
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();
  const { user, signOut } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [membership, setMembership] = useState<RoomMember | null>(null);
  const [rooms, setRooms] = useState<RoomWithMemberCount[]>([]);
  const [friendCount, setFriendCount] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!user) return;

    try {
      const [profileData, membershipData, roomsData, friends, requests, alerts] = await Promise.all([
        getUserProfile(user.id),
        getLatestMembershipProfile(user.id),
        getMyRooms(user.id),
        getFriendCount(user.id),
        getPendingFriendRequests(user.id),
        getUnreadNotificationCount(user.id),
      ]);

      setProfile(profileData);
      setMembership(membershipData);
      setRooms(roomsData);
      setFriendCount(friends);
      setPendingRequests(requests.length);
      setUnreadAlerts(alerts);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load profile';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadProfile();
    }, [loadProfile])
  );

  const fullName =
    profile?.full_name ??
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split('@')[0] ??
    'Guest';

  const avatarUrl = profile?.avatar_url ?? membership?.avatar_url ?? null;
  const handle = toHandle(fullName, user?.email);
  const roomsJoined = rooms.length;
  const peopleMet = rooms.reduce((sum, room) => sum + Math.max(room.member_count - 1, 0), 0);

  const openSettings = () => {
    Alert.alert('Settings', undefined, [
      { text: 'Sign out', style: 'destructive', onPress: handleSignOut },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to sign out';
      Alert.alert('Error', message);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <LinearGradient
          colors={['#EDE8FF', '#F8F7FB', '#F5F4F8']}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#EDE8FF', '#F5F2FF', '#F8F7FB', '#F5F4F8']}
        locations={[0, 0.25, 0.45, 1]}
        style={styles.headerGradient}
        pointerEvents="none"
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8, paddingBottom: tabBarInset }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View style={styles.topSpacer} />
          <View style={styles.topActions}>
            <Pressable onPress={openSettings} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
              <Ionicons name="settings-outline" size={20} color={NAVY} />
            </Pressable>
          </View>
        </View>

        <View style={styles.identity}>
          <View style={styles.avatarWrap}>
            <Avatar name={fullName} uri={avatarUrl} size={108} />
            <View style={styles.avatarBadge}>
              <Ionicons name="home" size={12} color={PURPLE} />
            </View>
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.name}>{fullName}</Text>
          </View>
          <Text style={styles.handle}>{handle}</Text>

          <View style={styles.rolePill}>
            <Ionicons name="diamond-outline" size={12} color="#EA580C" />
            <Text style={styles.roleText}>Builder</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <Text style={styles.infoCardTitle}>Room profile</Text>
            <Pressable
              onPress={() => router.push('/(main)/edit-profile')}
              style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}>
              <Ionicons name="create-outline" size={14} color={PURPLE} />
              <Text style={styles.editBtnText}>Edit</Text>
            </Pressable>
          </View>
          <View style={styles.infoCardBody}>
            <InfoRow label="One-liner" value={membership?.headline} />
            <View style={styles.infoDivider} />
            <InfoRow label="What I'm building" value={membership?.building} />
            <View style={styles.infoDivider} />
            <InfoRow label="What I'm looking for" value={membership?.looking_for} />
            <View style={styles.infoDivider} />
            <InfoRow label="What I can help with" value={membership?.can_help_with} />
            <View style={styles.infoDivider} />
            <InfoRow label="LinkedIn" value={membership?.linkedin_url} linkedIn />
          </View>
        </View>

        <View style={styles.statsCard}>
          <StatItem icon="home-outline" value={roomsJoined} label="Rooms joined" />
          <StatItem icon="people-outline" value={peopleMet} label="People met" />
          <StatItem icon="heart-outline" value={friendCount} label="Friends" />
          <StatItem icon="chatbubble-ellipses-outline" value={0} label="Intros made" />
        </View>

        <Pressable
          onPress={() => router.push('/(main)/friends')}
          style={({ pressed }) => [styles.friendsCard, pressed && styles.pressed]}>
          <View style={styles.friendsCardIcon}>
            <Ionicons name="people" size={20} color={PURPLE} />
          </View>
          <View style={styles.friendsCardCopy}>
            <Text style={styles.friendsCardTitle}>Friends & alerts</Text>
            <Text style={styles.friendsCardSub}>
              {pendingRequests > 0
                ? `${pendingRequests} pending request${pendingRequests === 1 ? '' : 's'}`
                : unreadAlerts > 0
                  ? `${unreadAlerts} friend${unreadAlerts === 1 ? '' : 's'} at your events`
                  : 'Requests and same-event alerts'}
            </Text>
          </View>
          {pendingRequests + unreadAlerts > 0 ? (
            <View style={styles.friendsBadge}>
              <Text style={styles.friendsBadgeText}>{pendingRequests + unreadAlerts}</Text>
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={18} color="#C4C4CF" />
          )}
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My rooms</Text>
          {rooms.length > 0 ? (
            <Pressable onPress={() => router.push('/(main)')}>
              <Text style={styles.viewAll}>View all</Text>
            </Pressable>
          ) : null}
        </View>

        {rooms.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.roomsScroll}>
            {rooms.map((room) => (
              <MyRoomCard
                key={room.id}
                room={room}
                onPress={() =>
                  router.push(
                    room.host_id === user?.id
                      ? `/(main)/room/preview/${room.id}`
                      : `/(main)/room/${room.id}`
                  )
                }
              />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyRooms}>
            <Text style={styles.emptyRoomsText}>No rooms yet. Join or create one to get started.</Text>
          </View>
        )}

        <LinearGradient
          colors={['#EDE8FF', '#E0E7FF', '#F5F3FF']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.ctaBanner}>
          <View style={styles.ctaCopy}>
            <Text style={styles.ctaTitle}>Create your own room</Text>
            <Text style={styles.ctaSub}>Host an event and build your room&apos;s network.</Text>
            <Pressable
              onPress={() => router.push('/(main)/create-room')}
              style={({ pressed }) => [styles.ctaBtn, pressed && styles.pressed]}>
              <Text style={styles.ctaBtnText}>Create Room</Text>
            </Pressable>
          </View>
          <View style={styles.portalArt} pointerEvents="none">
            <View style={styles.portalArch}>
              <LinearGradient colors={['#DDD4FF', '#F0EBFF', '#FFFFFF']} style={styles.portalFill} />
              <View style={styles.portalGlow} />
            </View>
          </View>
        </LinearGradient>
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
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
  },
  scroll: {
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  topSpacer: {
    width: 88,
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
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
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  identity: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 14,
  },
  avatarBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#EDE8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 28,
    color: NAVY,
  },
  handle: {
    fontSize: 15,
    color: MUTED,
    marginTop: 4,
    marginBottom: 10,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  roleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EA580C',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    marginBottom: 14,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: PURPLE,
  },
  infoCardBody: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoLabel: {
    width: 118,
    fontSize: 12,
    fontWeight: '600',
    color: MUTED,
    lineHeight: 16,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    color: NAVY,
    fontWeight: '500',
  },
  infoPlaceholder: {
    color: '#C4C4CF',
    fontWeight: '400',
  },
  linkedinRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  linkedinText: {
    flex: 1,
    fontSize: 14,
    color: '#0A66C2',
    fontWeight: '600',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: NAVY,
  },
  statLabel: {
    fontSize: 10,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 13,
  },
  friendsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  friendsCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EDE8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendsCardCopy: {
    flex: 1,
  },
  friendsCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: NAVY,
  },
  friendsCardSub: {
    fontSize: 13,
    color: MUTED,
    marginTop: 2,
  },
  friendsBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  friendsBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 22,
    color: NAVY,
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '600',
    color: PURPLE,
  },
  roomsScroll: {
    gap: 12,
    paddingBottom: 4,
    marginBottom: 18,
  },
  roomCard: {
    width: 148,
  },
  roomThumb: {
    width: 148,
    height: 92,
    borderRadius: 16,
    marginBottom: 8,
    overflow: 'hidden',
  },
  roomTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY,
    lineHeight: 18,
    marginBottom: 4,
  },
  roomMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roomDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  roomDotLive: {
    backgroundColor: '#22C55E',
  },
  roomMeta: {
    fontSize: 12,
    color: MUTED,
  },
  emptyRooms: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    padding: 16,
    marginBottom: 18,
  },
  emptyRoomsText: {
    fontSize: 14,
    color: MUTED,
    lineHeight: 20,
  },
  ctaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    marginBottom: 8,
    overflow: 'hidden',
  },
  ctaCopy: {
    flex: 1,
    paddingRight: 8,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 4,
  },
  ctaSub: {
    fontSize: 13,
    color: MUTED,
    lineHeight: 18,
    marginBottom: 12,
  },
  ctaBtn: {
    alignSelf: 'flex-start',
    backgroundColor: NAVY,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  ctaBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  portalArt: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portalArch: {
    width: 56,
    height: 76,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(124,58,237,0.25)',
    borderBottomWidth: 0,
  },
  portalFill: {
    flex: 1,
  },
  portalGlow: {
    position: 'absolute',
    bottom: 0,
    left: 10,
    right: 10,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
});
