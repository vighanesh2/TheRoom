import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui';
import {
  acceptFriendRequest,
  declineFriendRequest,
  getFriendStatus,
  sendFriendRequest,
} from '@/lib/api/friends';
import { useAuth } from '@/lib/auth';
import { colors, radius, spacing, typography } from '@/constants/theme';
import type { FriendStatus, RoomMember } from '@/lib/types/database';

type ProfileSheetProps = {
  member: RoomMember | null;
  visible: boolean;
  onClose: () => void;
};

export function ProfileSheet({ member, visible, onClose }: ProfileSheetProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [friendStatus, setFriendStatus] = useState<FriendStatus>('none');
  const [requestId, setRequestId] = useState<string | undefined>();
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!member || !user || !visible) return;

    setLoadingStatus(true);
    getFriendStatus(user.id, member.user_id)
      .then(({ status, requestId: id }) => {
        setFriendStatus(status);
        setRequestId(id);
      })
      .catch(() => {
        setFriendStatus('none');
        setRequestId(undefined);
      })
      .finally(() => setLoadingStatus(false));
  }, [member, user, visible]);

  if (!member) return null;

  const handleSendRequest = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const status = await sendFriendRequest(user.id, member.user_id);
      setFriendStatus(status);
      if (status === 'friends') {
        Alert.alert('Connected', `You and ${member.display_name} are now friends.`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send request';
      Alert.alert('Error', message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!user || !requestId) return;
    setActionLoading(true);
    try {
      await acceptFriendRequest(requestId, user.id);
      setFriendStatus('friends');
      Alert.alert('Connected', `You and ${member.display_name} are now friends.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to accept request';
      Alert.alert('Error', message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!user || !requestId) return;
    setActionLoading(true);
    try {
      await declineFriendRequest(requestId, user.id);
      setFriendStatus('none');
      setRequestId(undefined);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to decline request';
      Alert.alert('Error', message);
    } finally {
      setActionLoading(false);
    }
  };

  const renderFriendAction = () => {
    if (!user || friendStatus === 'self') return null;

    if (loadingStatus) {
      return (
        <View style={styles.friendAction}>
          <ActivityIndicator color={colors.accent} />
        </View>
      );
    }

    if (friendStatus === 'friends') {
      return (
        <View style={styles.friendsBadge}>
          <Ionicons name="heart" size={16} color={colors.accent} />
          <Text style={styles.friendsText}>Friends</Text>
        </View>
      );
    }

    if (friendStatus === 'pending_sent') {
      return (
        <View style={styles.pendingBadge}>
          <Ionicons name="time-outline" size={16} color={colors.textMuted} />
          <Text style={styles.pendingText}>Request sent</Text>
        </View>
      );
    }

    if (friendStatus === 'pending_received') {
      return (
        <View style={styles.requestActions}>
          <Button
            title="Accept"
            onPress={handleAccept}
            loading={actionLoading}
            style={styles.acceptBtn}
          />
          <Button
            title="Decline"
            variant="secondary"
            onPress={handleDecline}
            disabled={actionLoading}
            style={styles.declineBtn}
          />
        </View>
      );
    }

    return (
      <Button
        title="Add friend"
        onPress={handleSendRequest}
        loading={actionLoading}
        style={styles.addFriendBtn}
      />
    );
  };

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

        {renderFriendAction()}
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
    gap: spacing.sm,
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
  friendAction: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  addFriendBtn: {
    marginBottom: spacing.xs,
  },
  requestActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  acceptBtn: {
    flex: 1,
  },
  declineBtn: {
    flex: 1,
  },
  friendsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accentSoft,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.xs,
  },
  friendsText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.xs,
  },
  pendingText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  qrContainer: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
