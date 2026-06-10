import * as Clipboard from 'expo-clipboard';
import { format, parseISO } from 'date-fns';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { QRCodeDisplay } from '@/components/ProfileSheet';
import { Button, GradientHero } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { getRoomById } from '@/lib/api/rooms';
import { getJoinUrl } from '@/lib/utils/room-code';
import type { Room } from '@/lib/types/database';

export default function RoomPreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      setLoading(true);
      getRoomById(id)
        .then(setRoom)
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Failed to load room';
          Alert.alert('Error', message);
        })
        .finally(() => setLoading(false));
    }, [id])
  );

  if (loading || !room) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const joinUrl = getJoinUrl(room.invite_code);
  const date = format(parseISO(room.starts_at), 'EEEE, MMMM d · h:mm a');

  const copyLink = async () => {
    await Clipboard.setStringAsync(joinUrl);
    Alert.alert('Copied!', 'Join link copied to clipboard.');
  };

  const shareLink = async () => {
    await Share.share({
      message: `Join my room "${room.title}" on The Room!\n\n${joinUrl}\n\nOr use code: ${room.invite_code}`,
      url: joinUrl,
    });
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingBottom: insets.bottom + spacing.lg },
      ]}>
      <GradientHero
        coverType={room.cover_type === 'image' ? 'gradient' : room.cover_type}
        coverValue={room.cover_type === 'image' ? 'lavender' : room.cover_value}
        height={160}>
        {room.cover_type === 'image' && (
          <Image source={{ uri: room.cover_value }} style={StyleSheet.absoluteFill} contentFit="cover" />
        )}
      </GradientHero>

      <View style={styles.content}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.title}>Room created!</Text>
        <Text style={styles.subtitle}>{room.title}</Text>
        <Text style={styles.date}>{date}</Text>

        <View style={styles.qrSection}>
          <QRCodeDisplay url={joinUrl} size={200} />
          <Text style={styles.code}>Code: {room.invite_code}</Text>
          <Text style={styles.link} numberOfLines={2}>
            {joinUrl}
          </Text>
        </View>

        <Button title="Copy Link" onPress={copyLink} style={styles.button} />
        <Button title="Share" variant="secondary" onPress={shareLink} style={styles.button} />
        <Button
          title="Go to Room"
          variant="ghost"
          onPress={() => router.replace(`/(main)/room/${room.id}`)}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 40,
    marginBottom: spacing.sm,
    marginTop: -spacing.lg,
  },
  title: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.subtitle,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  date: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  qrSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.lg,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  code: {
    ...typography.subtitle,
    color: colors.text,
    marginTop: spacing.md,
    letterSpacing: 2,
  },
  link: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    marginBottom: spacing.sm,
  },
});
