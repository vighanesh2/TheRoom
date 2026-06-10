import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { format, parseISO } from 'date-fns';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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

import { AvatarStack } from '@/components/Avatar';
import { RoomsBackground } from '@/components/home/RoomsBackground';
import { getGradientColors } from '@/constants/gradients';
import { getRoomById, getRoomMembers } from '@/lib/api/rooms';
import { useAuth } from '@/lib/auth';
import { useTabBarInset } from '@/lib/hooks/useTabBarInset';
import type { Room, RoomMember } from '@/lib/types/database';
import {
  DEFAULT_COVER_TEXT_COLOR,
  coverMetaColor,
  getCoverOverlay,
  normalizeCoverTextColor,
} from '@/lib/utils/cover';
import { isRoomLive } from '@/lib/utils/room-status';

const NAVY = '#12121F';
const PURPLE = '#7C3AED';
const MUTED = '#6B7280';

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

function StatCard({
  icon,
  iconColor,
  iconBg,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  iconBg: string;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function HostTool({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.hostTool, pressed && styles.pressed]}>
      <View style={styles.hostToolIcon}>
        <Ionicons name={icon} size={20} color={PURPLE} />
      </View>
      <Text style={styles.hostToolLabel}>{label}</Text>
    </Pressable>
  );
}

export default function RoomPreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();
  const { user } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      setLoading(true);
      Promise.all([getRoomById(id), getRoomMembers(id)])
        .then(([roomData, membersData]) => {
          setRoom(roomData);
          setMembers(membersData ?? []);
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Failed to load room';
          Alert.alert('Error', message);
        })
        .finally(() => setLoading(false));
    }, [id])
  );

  useEffect(() => {
    if (!loading && room && user && user.id !== room.host_id) {
      router.replace(`/(main)/room/${room.id}`);
    }
  }, [loading, room, user, router]);

  if (loading || !room) {
    return (
      <View style={styles.center}>
        <RoomsBackground />
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  const isHost = user?.id === room.host_id;
  if (!isHost) {
    return (
      <View style={styles.center}>
        <RoomsBackground />
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  const live = isRoomLive(room.starts_at);
  const memberCount = members.length;
  const schedule = format(parseISO(room.starts_at), 'MMM d, yyyy · h:mm a');
  const coverValue = room.cover_type === 'image' ? 'midnight' : room.cover_value;
  const coverTextColor = normalizeCoverTextColor(room.cover_text_color ?? DEFAULT_COVER_TEXT_COLOR);
  const coverSecondary = coverMetaColor(coverTextColor);
  const coverOverlay = getCoverOverlay(
    coverTextColor,
    room.cover_type,
    room.cover_type === 'gradient' ? room.cover_value : undefined
  );
  const memberPreview = members.map((m) => ({
    display_name: m.display_name,
    avatar_url: m.avatar_url,
  }));

  const copyCode = async () => {
    await Clipboard.setStringAsync(room.invite_code);
    Alert.alert('Copied!', 'Room code copied to clipboard.');
  };

  const shareCode = async () => {
    await Share.share({
      message: `Join my room "${room.title}" on The Room!\n\nUse code: ${room.invite_code}`,
    });
  };

  const showMenu = () => {
    Alert.alert('Room options', undefined, [
      { text: 'Copy room code', onPress: copyCode },
      { text: 'Share code', onPress: shareCode },
      { text: 'View room', onPress: () => router.replace(`/(main)/room/${room.id}`) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.container}>
      <RoomsBackground />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8, paddingBottom: tabBarInset }]}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.replace('/(main)')}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
            <Ionicons name="arrow-back" size={20} color={NAVY} />
          </Pressable>
          <Text style={styles.topTitle}>Room created</Text>
          <Pressable onPress={showMenu} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
            <Ionicons name="ellipsis-horizontal" size={20} color={NAVY} />
          </Pressable>
        </View>

        <Text style={styles.headline}>🎉 Your room is ready!</Text>
        <Text style={styles.subhead}>
          Share your room code with guests so they can join in the app.
        </Text>

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
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.livePillText}>{live ? 'LIVE ROOM' : 'UPCOMING'}</Text>
          </View>

          <View style={styles.heroBody}>
            <Text style={[styles.heroTitle, { color: coverTextColor }]}>{room.title}</Text>
            <View style={styles.metaList}>
              <MetaLine icon="calendar-outline" text={schedule} color={coverSecondary} />
              {room.location ? (
                <MetaLine icon="location-outline" text={room.location} color={coverSecondary} />
              ) : null}
              <MetaLine icon="people-outline" text={`${memberCount} people inside`} color={coverSecondary} />
            </View>

            <View style={styles.heroFooter}>
              {memberCount > 0 ? (
                <AvatarStack members={memberPreview} size={32} borderColor="#FFFFFF" max={4} />
              ) : (
                <View style={styles.emptyAvatarHint} />
              )}
              <Pressable
                onPress={() => router.replace(`/(main)/room/${room.id}`)}
                style={({ pressed }) => [styles.viewRoomBtn, pressed && styles.pressed]}>
                <Text style={styles.viewRoomText}>View Room</Text>
                <Ionicons name="chevron-forward" size={16} color={NAVY} />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.shareCard}>
          <Text style={styles.shareTitle}>Room invite code</Text>
          <Text style={styles.shareSub}>Guests tap Join on the home screen and enter this code.</Text>

          <Pressable onPress={copyCode} style={styles.codeField}>
            <View style={styles.codeFieldCopy}>
              <Text style={styles.codeFieldLabel}>Room code</Text>
              <Text style={styles.codeFieldValue}>{room.invite_code}</Text>
            </View>
            <Ionicons name="copy-outline" size={18} color={PURPLE} />
          </Pressable>

          <Pressable
            onPress={shareCode}
            style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]}>
            <Ionicons name="share-outline" size={18} color="#FFFFFF" />
            <Text style={styles.shareBtnText}>Share code</Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <StatCard icon="people-outline" iconColor={PURPLE} iconBg="#F3F0FA" label="People inside" value={memberCount} />
          <StatCard icon="checkmark-circle-outline" iconColor="#EA580C" iconBg="#FFF7ED" label="Checked in" value={0} />
          <StatCard icon="eye-outline" iconColor="#059669" iconBg="#ECFDF5" label="Profile views" value={0} />
          <StatCard icon="chatbubble-ellipses-outline" iconColor="#CA8A04" iconBg="#FEFCE8" label="Intro requests" value={0} />
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Who&apos;s in the room</Text>
            {memberCount > 0 ? (
              <Pressable onPress={() => router.push(`/(main)/room/people/${room.id}`)}>
                <Text style={styles.viewAll}>View all</Text>
              </Pressable>
            ) : null}
          </View>

          {memberCount > 0 ? (
            <View style={styles.membersRow}>
              <AvatarStack members={memberPreview} size={44} borderColor="#FFFFFF" max={5} />
            </View>
          ) : (
            <View style={styles.emptyMembers}>
              <View style={styles.emptyAvatarRow}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={[styles.emptyAvatar, i > 0 && styles.emptyAvatarOverlap]} />
                ))}
              </View>
              <Text style={styles.emptyTitle}>No one has joined yet.</Text>
              <Text style={styles.emptySub}>Share your room code to bring people in.</Text>
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Host tools</Text>
          <View style={styles.hostToolsRow}>
            <HostTool
              icon="create-outline"
              label="Edit Room"
              onPress={() => router.push(`/(main)/room/edit/${room.id}`)}
            />
            <HostTool
              icon="people-outline"
              label="Manage Guests"
              onPress={() => router.push(`/(main)/room/people/${room.id}`)}
            />
          </View>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
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
  topTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 22,
    color: NAVY,
  },
  headline: {
    fontSize: 22,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 6,
  },
  subhead: {
    fontSize: 15,
    lineHeight: 22,
    color: MUTED,
    marginBottom: 18,
  },
  heroCard: {
    borderRadius: 24,
    overflow: 'hidden',
    minHeight: 260,
    marginBottom: 16,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
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
    minHeight: 260,
  },
  heroTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 28,
    lineHeight: 34,
    marginBottom: 10,
  },
  metaList: {
    gap: 6,
    marginBottom: 16,
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
  },
  emptyAvatarHint: {
    width: 1,
  },
  viewRoomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  viewRoomText: {
    color: NAVY,
    fontSize: 14,
    fontWeight: '700',
  },
  shareCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    padding: 16,
    marginBottom: 16,
  },
  shareTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 4,
  },
  shareSub: {
    fontSize: 12,
    color: MUTED,
    lineHeight: 17,
    marginBottom: 10,
  },
  codeField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: '#F3F0FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDE8FF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  codeFieldCopy: {
    flex: 1,
  },
  codeFieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: MUTED,
    marginBottom: 2,
  },
  codeFieldValue: {
    fontSize: 18,
    fontWeight: '800',
    color: NAVY,
    letterSpacing: 3,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: NAVY,
    borderRadius: 12,
    paddingVertical: 12,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 13,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 20,
    color: NAVY,
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '600',
    color: PURPLE,
  },
  membersRow: {
    alignItems: 'flex-start',
  },
  emptyMembers: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  emptyAvatarRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  emptyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EDE8FF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  emptyAvatarOverlap: {
    marginLeft: -12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 19,
  },
  hostToolsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  hostTool: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  hostToolIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F3F0FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostToolLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: NAVY,
    textAlign: 'center',
    lineHeight: 14,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
});
