import { format, parseISO } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Button, GradientHero } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import { getRoomByInviteCode } from '@/lib/api/rooms';
import { useAuth } from '@/lib/auth';
import type { Room } from '@/lib/types/database';

export default function JoinRoomScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!code) return;

      setLoading(true);
      getRoomByInviteCode(code)
        .then(async (roomData) => {
          if (!roomData) {
            Alert.alert('Invalid code', 'This room link is not valid.');
            router.back();
            return;
          }

          setRoom(roomData);

          if (user) {
            router.replace(`/(main)/room/${roomData.id}`);
            return;
          }
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Failed to find room';
          Alert.alert('Error', message);
        })
        .finally(() => setLoading(false));
    }, [code, user, router])
  );

  const handleJoin = () => {
    if (!room) return;

    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to join this room.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.replace('/(auth)/login') },
      ]);
      return;
    }

    router.replace(`/(main)/profile-setup/${room.id}`);
  };

  if (loading || !room) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const date = format(parseISO(room.starts_at), 'EEEE, MMMM d · h:mm a');

  return (
    <View style={styles.container}>
      <GradientHero
        coverType={room.cover_type === 'image' ? 'gradient' : room.cover_type}
        coverValue={room.cover_type === 'image' ? 'lavender' : room.cover_value}
        height={200}
      />

      <View style={styles.content}>
        <Text style={styles.invite}>You're invited</Text>
        <Text style={styles.title}>{room.title}</Text>
        <Text style={styles.date}>{date}</Text>
        {room.location ? (
          <Text style={styles.location}>📍 {room.location}</Text>
        ) : null}
        {room.description ? (
          <Text style={styles.description}>{room.description}</Text>
        ) : null}

        <Button title="Join Room" onPress={handleJoin} style={styles.button} />
        <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
      </View>
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
  content: {
    padding: spacing.lg,
  },
  invite: {
    ...typography.label,
    color: colors.accent,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.sm,
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
  button: {
    marginBottom: spacing.sm,
  },
});
