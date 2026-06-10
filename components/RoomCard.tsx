import { format, parseISO } from 'date-fns';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AvatarStack } from '@/components/Avatar';
import { GradientHero } from '@/components/ui';
import { colors, radius, shadows, spacing, typography } from '@/constants/theme';
import type { RoomWithMemberCount } from '@/lib/types/database';

type RoomCardProps = {
  room: RoomWithMemberCount;
  onPress: () => void;
};

export function RoomCard({ room, onPress }: RoomCardProps) {
  const date = format(parseISO(room.starts_at), 'EEE, MMM d · h:mm a');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.heroWrap}>
        {room.cover_type === 'image' ? (
          <Image source={{ uri: room.cover_value }} style={styles.heroImage} contentFit="cover" />
        ) : (
          <GradientHero coverType={room.cover_type} coverValue={room.cover_value} height={120}>
            <View style={styles.heroOverlay} />
          </GradientHero>
        )}
        {room.cover_type === 'image' && <View style={styles.heroOverlay} />}
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {room.title}
        </Text>
        <Text style={styles.date}>{date}</Text>
        {room.location ? (
          <Text style={styles.location} numberOfLines={1}>
            📍 {room.location}
          </Text>
        ) : null}
        <View style={styles.footer}>
          {room.members_preview && room.members_preview.length > 0 ? (
            <AvatarStack members={room.members_preview} />
          ) : null}
          <Text style={styles.count}>
            {room.member_count} {room.member_count === 1 ? 'person' : 'people'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  heroWrap: {
    height: 120,
    overflow: 'hidden',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: 120,
  },
  heroOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  content: {
    padding: spacing.md,
  },
  title: {
    ...typography.subtitle,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  date: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  location: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  count: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
