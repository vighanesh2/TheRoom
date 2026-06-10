import { format, parseISO } from 'date-fns';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

import { AttendeeCard } from '@/components/AttendeeCard';
import { AvatarStack } from '@/components/Avatar';
import { ProfileSheet } from '@/components/ProfileSheet';
import { Button, GradientHero } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { getMembership, getRoomById, getRoomMembers } from '@/lib/api/rooms';
import { useAuth } from '@/lib/auth';
import type { Room, RoomMember } from '@/lib/types/database';

export default function RoomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<RoomMember | null>(null);

  const loadData = useCallback(async () => {
    if (!id || !user) return;

    try {
      const [roomData, membersData, membership] = await Promise.all([
        getRoomById(id),
        getRoomMembers(id),
        getMembership(id, user.id),
      ]);

      if (!roomData) {
        Alert.alert('Not found', 'This room does not exist.');
        router.back();
        return;
      }

      if (!membership) {
        router.replace(`/(main)/profile-setup/${id}`);
        return;
      }

      setRoom(roomData);
      setMembers(membersData);
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
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const date = format(parseISO(room.starts_at), 'EEEE, MMMM d');
  const time = format(parseISO(room.starts_at), 'h:mm a');
  const isHost = user?.id === room.host_id;

  return (
    <View style={styles.container}>
      <ScrollView bounces={false}>
        <GradientHero
          coverType={room.cover_type === 'image' ? 'gradient' : room.cover_type}
          coverValue={room.cover_type === 'image' ? 'lavender' : room.cover_value}
          height={280}>
          {room.cover_type === 'image' && (
            <Image
              source={{ uri: room.cover_value }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          )}
          <View style={[styles.heroContent, { paddingTop: insets.top + spacing.sm }]}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backText}>← Back</Text>
            </Pressable>
          </View>
        </GradientHero>

        <View style={styles.body}>
          <Text style={styles.title}>{room.title}</Text>
          <Text style={styles.date}>
            {date} · {time}
          </Text>
          {room.location ? (
            <Text style={styles.location}>📍 {room.location}</Text>
          ) : null}
          {room.description ? (
            <Text style={styles.description}>{room.description}</Text>
          ) : null}

          <Pressable
            style={styles.peopleCard}
            onPress={() => router.push(`/(main)/room/people/${room.id}`)}>
            <View style={styles.peopleHeader}>
              <Text style={styles.peopleTitle}>
                {members.length} {members.length === 1 ? 'person' : 'people'} in the room
              </Text>
              <Text style={styles.seeAll}>See all →</Text>
            </View>
            <AvatarStack members={members} max={5} size={40} />
          </Pressable>

          <Text style={styles.sectionTitle}>Attendees</Text>
          {members.slice(0, 5).map((member) => (
            <AttendeeCard
              key={member.id}
              member={member}
              onPress={() => setSelectedMember(member)}
            />
          ))}

          {isHost && (
            <Button
              title="Share Room"
              variant="secondary"
              onPress={() => router.push(`/(main)/room/preview/${room.id}`)}
              style={styles.shareButton}
            />
          )}
        </View>
      </ScrollView>

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
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  heroContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  backText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  body: {
    padding: spacing.lg,
    marginTop: -spacing.lg,
  },
  title: {
    ...typography.hero,
    fontSize: 28,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  date: {
    ...typography.subtitle,
    fontSize: 16,
    color: colors.accent,
    marginBottom: spacing.sm,
  },
  location: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  peopleCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  peopleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  peopleTitle: {
    ...typography.subtitle,
    fontSize: 16,
    color: colors.text,
  },
  seeAll: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '600',
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  shareButton: {
    marginTop: spacing.lg,
  },
});
