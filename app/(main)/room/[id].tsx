import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { Avatar, AvatarStack } from '@/components/Avatar';
import { RoomsBackground } from '@/components/home/RoomsBackground';
import { ProfileSheet } from '@/components/ProfileSheet';
import { getGradientColors } from '@/constants/gradients';
import { getMembership, getRoomById, getRoomMembers, joinRoomWithSavedProfile } from '@/lib/api/rooms';
import { getFriendsInRoom } from '@/lib/api/friends';
import { useAuth } from '@/lib/auth';
import { useTabBarInset } from '@/lib/hooks/useTabBarInset';
import type { FriendInRoom, Room, RoomMember } from '@/lib/types/database';
import { isRoomLive } from '@/lib/utils/room-status';
import { rankMembersForMeet } from '@/lib/utils/member-match';
import {
  DEFAULT_COVER_TEXT_COLOR,
  coverMetaColor,
  getCoverOverlay,
  normalizeCoverTextColor,
} from '@/lib/utils/cover';

const NAVY = '#12121F';
const PURPLE = '#7C3AED';
const MUTED = '#6B7280';
const STICKY_ACTION_HEIGHT = 72;

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  return `${parts[0]} ${parts[1][0]}.`;
}

function expectBullets(description: string | null): string[] {
  if (!description?.trim()) {
    return [
      'Meet founders, builders, and creators in the room',
      'Share what you are building and who you want to meet',
      'Connect privately with people already inside',
    ];
  }

  const lines = description
    .split(/\n|•|·/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.length > 0 ? lines.slice(0, 4) : [description.trim()];
}

function MetaLine({
  icon,
  text,
  color,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
  color: string;
}) {
  return (
    <View style={styles.metaLine}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.metaText, { color }]}>{text}</Text>
    </View>
  );
}

function SectionCard({
  icon,
  iconColor,
  iconBg,
  title,
  onViewAll,
  children,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  iconBg: string;
  title: string;
  onViewAll?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View style={[styles.sectionIcon, { backgroundColor: iconBg }]}>
            <Ionicons name={icon} size={18} color={iconColor} />
          </View>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {onViewAll ? (
          <Pressable onPress={onViewAll} hitSlop={8}>
            <Text style={styles.viewAll}>View all</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export default function RoomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();
  const { user } = useAuth();

  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [myMembership, setMyMembership] = useState<RoomMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [selectedMember, setSelectedMember] = useState<RoomMember | null>(null);
  const [friendsInRoom, setFriendsInRoom] = useState<FriendInRoom[]>([]);

  const loadData = useCallback(async () => {
    if (!id) return;

    try {
      const [roomData, membersData] = await Promise.all([getRoomById(id), getRoomMembers(id)]);

      if (!roomData) {
        Alert.alert('Not found', 'This room does not exist.');
        router.back();
        return;
      }

      let membership = false;
      let membershipRecord: RoomMember | null = null;
      if (user) {
        const member = await getMembership(id, user.id);
        membership = !!member;
        membershipRecord = member;
      }

      setRoom(roomData);
      setMembers(membersData);
      setIsMember(membership);
      setMyMembership(membershipRecord);

      if (user && membership) {
        const friends = await getFriendsInRoom(id, user.id, membersData);
        setFriendsInRoom(friends);
      } else {
        setFriendsInRoom([]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load room';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }, [id, user, router]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData])
  );

  if (loading || !room) {
    return (
      <View style={styles.center}>
        <RoomsBackground />
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  const isHost = user?.id === room.host_id;
  const live = isRoomLive(room.starts_at);
  const schedule = format(parseISO(room.starts_at), 'MMM d, yyyy · h:mm a');
  const host = members.find((m) => m.role === 'host');
  const hostName = host?.display_name ?? 'The host';
  const memberCount = members.length;
  const coverValue = room.cover_type === 'image' ? 'midnight' : room.cover_value;
  const coverTextColor = normalizeCoverTextColor(room.cover_text_color ?? DEFAULT_COVER_TEXT_COLOR);
  const coverSecondary = coverMetaColor(coverTextColor);
  const coverOverlay = getCoverOverlay(
    coverTextColor,
    room.cover_type,
    room.cover_type === 'gradient' ? room.cover_value : undefined
  );
  const bullets = expectBullets(room.description);
  const meetSuggestions = rankMembersForMeet(members, user?.id, myMembership, 4);
  const activityItems = members
    .filter((m) => m.looking_for)
    .slice(0, 3)
    .map((m) => ({
      id: m.id,
      member: m,
      text: `${shortName(m.display_name)} is looking for ${m.looking_for}`,
      time: formatDistanceToNow(parseISO(m.joined_at), { addSuffix: true }),
    }));

  const scrollBottom = tabBarInset + STICKY_ACTION_HEIGHT;

  const goToShare = () => {
    router.push(`/(main)/room/preview/${room.id}`);
  };

  const handleJoin = async () => {
    if (!user || !room) {
      if (!user) {
        Alert.alert('Sign in required', 'Please sign in to join this room.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.replace('/(auth)/login') },
        ]);
      }
      return;
    }

    if (isHost) {
      goToShare();
      return;
    }

    if (isMember) {
      router.push(`/(main)/room/people/${room.id}`);
      return;
    }

    setJoining(true);
    try {
      const joined = await joinRoomWithSavedProfile(room.id, user.id);
      if (joined) {
        setIsMember(true);
        await loadData();
        const friends = await getFriendsInRoom(room.id, user.id);
        if (friends.length > 0) {
          const names = friends.map((f) => f.display_name).join(', ');
          Alert.alert(
            'Friends here',
            `${names} ${friends.length === 1 ? 'is' : 'are'} also at this event.`
          );
        }
        return;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to join room';
      Alert.alert('Error', message);
      return;
    } finally {
      setJoining(false);
    }

    router.push(`/(main)/profile-setup/${room.id}`);
  };

  const shareRoom = async () => {
    await Share.share({
      message: `Join "${room.title}" on The Room!\n\nUse code: ${room.invite_code}`,
    });
  };

  return (
    <View style={styles.container}>
      <RoomsBackground />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scrollBottom }}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
            <Ionicons name="arrow-back" size={20} color={NAVY} />
          </Pressable>
          <View style={styles.topActions}>
            <Pressable onPress={shareRoom} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
              <Ionicons name="share-outline" size={20} color={NAVY} />
            </Pressable>
          </View>
        </View>

        <View style={styles.heroCard}>
          {room.cover_type === 'image' ? (
            <Image source={{ uri: room.cover_value }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : room.cover_type === 'color' ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: room.cover_value }]} />
          ) : (
            <LinearGradient
              colors={getGradientColors(coverValue)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          <LinearGradient
            colors={[...coverOverlay]}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.portalArt} pointerEvents="none">
            <View style={styles.portalArch}>
              <LinearGradient colors={['#DDD4FF', '#F0EBFF', '#FFFFFF']} style={styles.portalFill} />
              <View style={styles.portalGlow} />
            </View>
          </View>

          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.livePillText}>{live ? 'LIVE' : 'UPCOMING'}</Text>
          </View>

          <View style={styles.heroBody}>
            <Text style={[styles.heroTitle, { color: coverTextColor }]}>{room.title}</Text>
            {room.description ? (
              <Text style={[styles.heroDesc, { color: coverSecondary }]}>{room.description}</Text>
            ) : null}

            <View style={styles.metaList}>
              <MetaLine icon="calendar-outline" text={schedule} color={coverSecondary} />
              {room.location ? (
                <MetaLine icon="location-outline" text={room.location} color={coverSecondary} />
              ) : null}
              <MetaLine icon="person-outline" text={`Hosted by ${hostName}`} color={coverSecondary} />
              <MetaLine
                icon="people-outline"
                text={`${memberCount} ${memberCount === 1 ? 'person is' : 'people are'} in`}
                color={coverSecondary}
              />
            </View>

            <View style={styles.heroFooter}>
              {memberCount > 0 ? (
                <AvatarStack
                  members={members}
                  size={34}
                  max={4}
                  borderColor="rgba(255,255,255,0.9)"
                />
              ) : (
                <View />
              )}
              <Pressable
                onPress={handleJoin}
                style={({ pressed }) => [styles.heroJoinBtn, pressed && styles.pressed]}>
                <Text style={styles.heroJoinText}>
                  {isHost ? 'Share code' : isMember ? 'Open Room' : 'Join Room'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={NAVY} />
              </Pressable>
            </View>

            <Pressable onPress={() => router.push(`/(main)/room/people/${room.id}`)}>
              <Text style={[styles.guestPreview, { color: coverSecondary }]}>View guest preview</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.content}>
          {isMember && friendsInRoom.length > 0 ? (
            <Pressable
              onPress={() => router.push('/(main)/friends')}
              style={({ pressed }) => [styles.friendsBanner, pressed && styles.pressed]}>
              <View style={styles.friendsBannerIcon}>
                <Ionicons name="heart" size={18} color={PURPLE} />
              </View>
              <View style={styles.friendsBannerCopy}>
                <Text style={styles.friendsBannerTitle}>
                  {friendsInRoom.length === 1
                    ? `${friendsInRoom[0].display_name} is here too`
                    : `${friendsInRoom.length} friends are here`}
                </Text>
                <Text style={styles.friendsBannerSub}>Tap to view friend alerts</Text>
              </View>
              <AvatarStack
                members={friendsInRoom.map((friend) => ({
                  display_name: friend.display_name,
                  avatar_url: friend.avatar_url,
                }))}
                size={28}
                max={3}
              />
            </Pressable>
          ) : null}

          {isHost ? (
            <>
              <Pressable onPress={goToShare} style={({ pressed }) => [styles.hostShareCard, pressed && styles.pressed]}>
                <View style={styles.hostShareIcon}>
                  <Ionicons name="key-outline" size={22} color={PURPLE} />
                </View>
                <View style={styles.hostShareCopy}>
                  <Text style={styles.hostShareTitle}>Share your room</Text>
                  <Text style={styles.hostShareSub}>
                    Room code <Text style={styles.hostShareCode}>{room.invite_code}</Text>
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={PURPLE} />
              </Pressable>
              <Pressable
                onPress={() => router.push(`/(main)/room/edit/${room.id}`)}
                style={({ pressed }) => [styles.hostEditLink, pressed && styles.pressed]}>
                <Ionicons name="create-outline" size={16} color={PURPLE} />
                <Text style={styles.hostEditText}>Edit room details</Text>
              </Pressable>
            </>
          ) : null}

          <SectionCard icon="enter-outline" iconColor={PURPLE} iconBg="#F3F0FA" title="What to expect">
            <View style={styles.bulletList}>
              {bullets.map((bullet) => (
                <View key={bullet} style={styles.bulletRow}>
                  <Ionicons name="checkmark-circle" size={18} color={PURPLE} />
                  <Text style={styles.bulletText}>{bullet}</Text>
                </View>
              ))}
            </View>
          </SectionCard>

          <SectionCard
            icon="grid-outline"
            iconColor={PURPLE}
            iconBg="#F3F0FA"
            title="Who's here"
            onViewAll={() => router.push(`/(main)/room/people/${room.id}`)}>
            {members.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.whoScroll}>
                {members.slice(0, 8).map((member) => (
                  <Pressable
                    key={member.id}
                    onPress={() => setSelectedMember(member)}
                    style={({ pressed }) => [styles.whoCard, pressed && styles.pressed]}>
                    <Avatar name={member.display_name} uri={member.avatar_url} size={52} />
                    <Text style={styles.whoName} numberOfLines={1}>
                      {shortName(member.display_name)}
                    </Text>
                    <Text
                      style={[styles.whoRole, member.role === 'host' && styles.whoRoleHost]}
                      numberOfLines={1}>
                      {member.role === 'host' ? 'Host' : member.headline || member.building || 'Attendee'}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.emptyCopy}>No guests yet. Be the first to join.</Text>
            )}
          </SectionCard>

          <SectionCard
            icon="hand-left-outline"
            iconColor="#EA580C"
            iconBg="#FFF7ED"
            title="People you may want to meet"
            onViewAll={() => router.push(`/(main)/room/people/${room.id}`)}>
            {meetSuggestions.length > 0 ? (
              <View style={styles.meetList}>
                {meetSuggestions.map(({ member, reason, score }) => (
                  <Pressable
                    key={member.id}
                    onPress={() => setSelectedMember(member)}
                    style={({ pressed }) => [styles.meetRow, pressed && styles.pressed]}>
                    <Avatar name={member.display_name} uri={member.avatar_url} size={44} />
                    <View style={styles.meetInfo}>
                      <Text style={styles.meetName}>{member.display_name}</Text>
                      <Text style={styles.meetSub} numberOfLines={1}>
                        {member.headline || member.building || 'In the room'}
                      </Text>
                      <Text
                        style={[styles.meetMatch, score >= 2 && styles.meetMatchStrong]}
                        numberOfLines={1}>
                        {reason}
                      </Text>
                      {member.building ? (
                        <View style={styles.tagPill}>
                          <Text style={styles.tagPillText}>{member.building}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#C4C4CF" />
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyCopy}>Profiles will appear here as people join.</Text>
            )}
          </SectionCard>

          <SectionCard
            icon="pulse-outline"
            iconColor="#059669"
            iconBg="#ECFDF5"
            title="Room activity"
            onViewAll={() => router.push(`/(main)/room/people/${room.id}`)}>
            {activityItems.length > 0 ? (
              <View style={styles.activityList}>
                {activityItems.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => setSelectedMember(item.member)}
                    style={({ pressed }) => [styles.activityRow, pressed && styles.pressed]}>
                    <Avatar name={item.member.display_name} uri={item.member.avatar_url} size={36} />
                    <View style={styles.activityCopy}>
                      <Text style={styles.activityText}>{item.text}</Text>
                      <Text style={styles.activityTime}>{item.time}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyCopy}>Activity updates will show up here.</Text>
            )}
          </SectionCard>

          <View style={styles.privacyCard}>
            <View style={styles.privacyIcon}>
              <Ionicons name="lock-closed-outline" size={18} color={PURPLE} />
            </View>
            <Text style={styles.privacyText}>
              Only people in this room can see your profile. Your info stays private and secure.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.stickyBar, { bottom: tabBarInset - 16, paddingHorizontal: 20 }]}>
        <Pressable
          onPress={handleJoin}
          style={({ pressed }) => [styles.stickyBtn, pressed && styles.pressed]}>
          <Text style={styles.stickyBtnText}>
            {isHost ? 'Share code' : isMember ? 'Open Room' : 'Join Room'}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      <ProfileSheet
        member={selectedMember}
        visible={!!selectedMember}
        onClose={() => setSelectedMember(null)}
      />
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
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
  },
  heroCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    overflow: 'hidden',
    minHeight: 380,
    marginBottom: 18,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
  portalArt: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '40%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portalArch: {
    width: 88,
    height: 120,
    borderTopLeftRadius: 44,
    borderTopRightRadius: 44,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.65)',
    borderBottomWidth: 0,
  },
  portalFill: {
    flex: 1,
  },
  portalGlow: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 14,
  },
  livePill: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FBBF24',
  },
  livePillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroBody: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 18,
    minHeight: 380,
  },
  heroTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 30,
    lineHeight: 36,
    marginBottom: 8,
    paddingRight: 80,
  },
  heroDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    paddingRight: 60,
  },
  metaList: {
    gap: 6,
    marginBottom: 14,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '500',
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  heroJoinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  heroJoinText: {
    color: NAVY,
    fontSize: 14,
    fontWeight: '700',
  },
  guestPreview: {
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  content: {
    paddingHorizontal: 20,
    gap: 14,
  },
  friendsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#EDE8FF',
    padding: 14,
  },
  friendsBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F0FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendsBannerCopy: {
    flex: 1,
  },
  friendsBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: NAVY,
  },
  friendsBannerSub: {
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
  },
  hostShareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#EDE8FF',
    padding: 14,
  },
  hostShareIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F0FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostShareCopy: {
    flex: 1,
  },
  hostShareTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 2,
  },
  hostShareSub: {
    fontSize: 13,
    color: MUTED,
    lineHeight: 18,
  },
  hostShareCode: {
    fontWeight: '800',
    color: PURPLE,
    letterSpacing: 1,
  },
  hostEditLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
    paddingVertical: 8,
  },
  hostEditText: {
    fontSize: 14,
    fontWeight: '600',
    color: PURPLE,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 20,
    color: NAVY,
    flexShrink: 1,
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '600',
    color: PURPLE,
  },
  bulletList: {
    gap: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: NAVY,
  },
  whoScroll: {
    gap: 12,
    paddingRight: 8,
  },
  whoCard: {
    width: 84,
    alignItems: 'center',
    gap: 6,
  },
  whoName: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY,
    textAlign: 'center',
  },
  whoRole: {
    fontSize: 11,
    color: MUTED,
    textAlign: 'center',
  },
  whoRoleHost: {
    color: PURPLE,
    fontWeight: '600',
  },
  meetList: {
    gap: 10,
  },
  meetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  meetInfo: {
    flex: 1,
    gap: 2,
  },
  meetName: {
    fontSize: 15,
    fontWeight: '700',
    color: NAVY,
  },
  meetSub: {
    fontSize: 12,
    color: MUTED,
  },
  meetMatch: {
    fontSize: 12,
    color: MUTED,
    fontWeight: '500',
  },
  meetMatchStrong: {
    color: PURPLE,
    fontWeight: '600',
  },
  tagPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F0FA',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
  },
  tagPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: PURPLE,
  },
  activityList: {
    gap: 12,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  activityCopy: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    lineHeight: 19,
    color: NAVY,
  },
  activityTime: {
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
  },
  emptyCopy: {
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    padding: 14,
    marginBottom: 8,
  },
  privacyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F0FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: MUTED,
  },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  stickyBtn: {
    backgroundColor: NAVY,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  stickyBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
});
