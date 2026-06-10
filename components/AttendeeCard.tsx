import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { colors, radius, shadows, spacing, typography } from '@/constants/theme';
import type { RoomMember } from '@/lib/types/database';

type AttendeeCardProps = {
  member: RoomMember;
  onPress: () => void;
};

export function AttendeeCard({ member, onPress }: AttendeeCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <Avatar name={member.display_name} uri={member.avatar_url} size={52} />
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{member.display_name}</Text>
          {member.role === 'host' && (
            <View style={styles.hostBadge}>
              <Text style={styles.hostText}>Host</Text>
            </View>
          )}
        </View>
        {member.headline ? (
          <Text style={styles.headline} numberOfLines={1}>
            {member.headline}
          </Text>
        ) : null}
        {member.building ? (
          <Text style={styles.building} numberOfLines={1}>
            🔨 {member.building}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.9,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  name: {
    ...typography.subtitle,
    fontSize: 16,
    color: colors.text,
  },
  hostBadge: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  hostText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
  },
  headline: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  building: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
