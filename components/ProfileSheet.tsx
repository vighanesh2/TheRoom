import { Image } from 'expo-image';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import type { RoomMember } from '@/lib/types/database';

type ProfileSheetProps = {
  member: RoomMember | null;
  visible: boolean;
  onClose: () => void;
};

export function ProfileSheet({ member, visible, onClose }: ProfileSheetProps) {
  const insets = useSafeAreaInsets();

  if (!member) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.handle} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Avatar name={member.display_name} uri={member.avatar_url} size={80} />
            <Text style={styles.name}>{member.display_name}</Text>
            {member.role === 'host' && (
              <View style={styles.hostBadge}>
                <Text style={styles.hostText}>Host</Text>
              </View>
            )}
            {member.headline ? (
              <Text style={styles.headline}>{member.headline}</Text>
            ) : null}
          </View>

          {member.building ? (
            <View style={styles.section}>
              <Text style={styles.label}>Building</Text>
              <Text style={styles.value}>{member.building}</Text>
            </View>
          ) : null}

          {member.looking_for ? (
            <View style={styles.section}>
              <Text style={styles.label}>Looking for</Text>
              <Text style={styles.value}>{member.looking_for}</Text>
            </View>
          ) : null}

          {member.can_help_with ? (
            <View style={styles.section}>
              <Text style={styles.label}>Can help with</Text>
              <Text style={styles.value}>{member.can_help_with}</Text>
            </View>
          ) : null}

          {member.linkedin_url ? (
            <View style={styles.section}>
              <Text style={styles.label}>LinkedIn</Text>
              <Text style={styles.link}>{member.linkedin_url}</Text>
            </View>
          ) : null}
        </ScrollView>
        <Button title="Close" variant="secondary" onPress={onClose} />
      </View>
    </Modal>
  );
}

type QRCodeDisplayProps = {
  url: string;
  size?: number;
};

export function QRCodeDisplay({ url, size = 200 }: QRCodeDisplayProps) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&margin=12`;

  return (
    <View style={styles.qrContainer}>
      <Image source={{ uri: qrUrl }} style={{ width: size, height: size }} contentFit="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  name: {
    ...typography.title,
    color: colors.text,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  hostBadge: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
  },
  hostText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
  },
  headline: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  value: {
    ...typography.body,
    color: colors.text,
  },
  link: {
    ...typography.body,
    color: colors.accent,
  },
  qrContainer: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
