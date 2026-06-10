import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { Avatar } from '@/components/Avatar';
import { RoomsBackground } from '@/components/home/RoomsBackground';
import { ProfileSheet } from '@/components/ProfileSheet';
import { getRoomById, getRoomMembers } from '@/lib/api/rooms';
import { useTabBarInset } from '@/lib/hooks/useTabBarInset';
import type { Room, RoomMember } from '@/lib/types/database';

const NAVY = '#12121F';
const PURPLE = '#7C3AED';
const MUTED = '#6B7280';

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  return `${parts[0]} ${parts[1][0]}.`;
}

function PersonRow({
  member,
  onPress,
}: {
  member: RoomMember;
  onPress: () => void;
}) {
  const roleLabel =
    member.role === 'host'
      ? 'Host'
      : member.headline || member.building || 'Attendee';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.personRow, pressed && styles.pressed]}>
      <Avatar name={member.display_name} uri={member.avatar_url} size={52} />
      <View style={styles.personInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.personName}>{shortName(member.display_name)}</Text>
          {member.role === 'host' ? (
            <View style={styles.hostPill}>
              <Text style={styles.hostPillText}>Host</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.personRole} numberOfLines={1}>
          {roleLabel}
        </Text>
        {member.building ? (
          <View style={styles.tagPill}>
            <Text style={styles.tagPillText} numberOfLines={1}>
              {member.building}
            </Text>
          </View>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#C4C4CF" />
    </Pressable>
  );
}

export default function PeopleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();

  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<RoomMember | null>(null);

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
          const message = err instanceof Error ? err.message : 'Failed to load people';
          Alert.alert('Error', message);
        })
        .finally(() => setLoading(false));
    }, [id])
  );

  const hosts = members.filter((m) => m.role === 'host');
  const guests = members.filter((m) => m.role !== 'host');

  if (loading) {
    return (
      <View style={styles.center}>
        <RoomsBackground />
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  const listHeader = (
    <View style={styles.listHeader}>
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
        <Ionicons name="arrow-back" size={20} color={NAVY} />
      </Pressable>

      <View style={styles.titleBlock}>
        <Text style={styles.title}>Who&apos;s in the room</Text>
        {room?.title ? (
          <Text style={styles.roomName} numberOfLines={1}>
            {room.title}
          </Text>
        ) : null}
      </View>

      <View style={styles.countPill}>
        <Text style={styles.countText}>{members.length}</Text>
      </View>
    </View>
  );

  const emptyState = (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Ionicons name="people-outline" size={28} color={PURPLE} />
      </View>
      <Text style={styles.emptyTitle}>No one here yet</Text>
      <Text style={styles.emptySub}>Share your room code to bring people in.</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <RoomsBackground />

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            {listHeader}
            {members.length > 0 ? (
              <View style={styles.sectionMeta}>
                <Text style={styles.sectionLabel}>
                  {hosts.length > 0 ? `${hosts.length} host · ${guests.length} guests` : `${members.length} people`}
                </Text>
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={emptyState}
        contentContainerStyle={[
          styles.list,
          { paddingTop: insets.top + 8, paddingBottom: tabBarInset },
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <PersonRow member={item} onPress={() => setSelectedMember(item)} />
        )}
      />

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
  list: {
    paddingHorizontal: 20,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
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
  titleBlock: {
    flex: 1,
    paddingTop: 2,
  },
  title: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 28,
    lineHeight: 34,
    color: NAVY,
  },
  roomName: {
    fontSize: 14,
    color: MUTED,
    marginTop: 4,
  },
  countPill: {
    minWidth: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F0FA',
    borderWidth: 1,
    borderColor: '#EDE8FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  countText: {
    fontSize: 16,
    fontWeight: '800',
    color: PURPLE,
  },
  sectionMeta: {
    marginBottom: 16,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    padding: 14,
    marginBottom: 10,
  },
  personInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  personName: {
    fontSize: 16,
    fontWeight: '700',
    color: NAVY,
  },
  hostPill: {
    backgroundColor: '#FFF7ED',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  hostPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EA580C',
    textTransform: 'uppercase',
  },
  personRole: {
    fontSize: 13,
    color: MUTED,
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
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    padding: 28,
    marginTop: 24,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F3F0FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
});
