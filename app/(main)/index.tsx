import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { RoomCard } from '@/components/RoomCard';
import { Button } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import { getMyRooms } from '@/lib/api/rooms';
import { useAuth } from '@/lib/auth';
import type { RoomWithMemberCount } from '@/lib/types/database';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [rooms, setRooms] = useState<RoomWithMemberCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRooms = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getMyRooms(user.id);
      setRooms(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load rooms';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadRooms();
    }, [loadRooms])
  );

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to sign out';
      Alert.alert('Error', message);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#EDE9FE', '#FAFAFA']}
        style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Hey there 👋</Text>
            <Text style={styles.title}>Your Rooms</Text>
          </View>
          <Pressable onPress={handleSignOut} style={styles.signOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>

        <Button
          title="✨ Create Room"
          onPress={() => router.push('/(main)/create-room')}
          style={styles.createButton}
        />
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadRooms();
              }}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🏠</Text>
              <Text style={styles.emptyTitle}>No rooms yet</Text>
              <Text style={styles.emptyText}>
                Create your first room and invite builders to join.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <RoomCard
              room={item}
              onPress={() => router.push(`/(main)/room/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  greeting: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  title: {
    ...typography.hero,
    fontSize: 28,
    color: colors.text,
  },
  signOut: {
    padding: spacing.sm,
  },
  signOutText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  createButton: {
    marginTop: spacing.sm,
  },
  list: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.subtitle,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
