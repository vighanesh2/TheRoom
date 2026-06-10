import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import {
  ActiveRoomCard,
  EnterRoomCard,
  HomeHeader,
  homeHeaderHeight,
  HostCard,
  roomCardProps,
  SectionHeader,
  UpcomingRoomCard,
} from '@/components/home';
import { RoomsBackground } from '@/components/home/RoomsBackground';
import { getMyRooms } from '@/lib/api/rooms';
import { getLatestMembershipProfile, getUserProfile } from '@/lib/api/profile';
import { useAuth } from '@/lib/auth';
import { useTabBarInset } from '@/lib/hooks/useTabBarInset';
import { categorizeRooms, formatRoomSchedule } from '@/lib/utils/room-status';
import type { RoomWithMemberCount } from '@/lib/types/database';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<RoomWithMemberCount[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const headerHeight = homeHeaderHeight(insets.top);

  const loadRooms = useCallback(async () => {
    if (!user) return;
    try {
      const [data, profile, membership] = await Promise.all([
        getMyRooms(user.id),
        getUserProfile(user.id),
        getLatestMembershipProfile(user.id),
      ]);
      setRooms(data);
      setAvatarUrl(membership?.avatar_url ?? profile?.avatar_url ?? null);
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

  const { active, upcoming } = categorizeRooms(rooms);

  const profileName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split('@')[0] ??
    'You';

  const goEnterCode = () => router.push('/(main)/enter-code');
  const goCreate = () => router.push('/(main)/create-room');
  const goProfile = () => router.push('/(main)/profile');

  const openRoom = (room: RoomWithMemberCount) => {
    if (room.host_id === user?.id) {
      router.push(`/(main)/room/preview/${room.id}`);
      return;
    }
    router.push(`/(main)/room/${room.id}`);
  };

  const handleEnter = (room: RoomWithMemberCount) => {
    openRoom(room);
  };

  const handleView = (room: RoomWithMemberCount) => {
    openRoom(room);
  };

  return (
    <View style={styles.container}>
      <RoomsBackground />

      <HomeHeader
        name={profileName}
        avatarUri={avatarUrl}
        onProfilePress={goProfile}
        scrollY={scrollY}
        topInset={insets.top}
      />

      <Animated.ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: headerHeight, paddingBottom: tabBarInset },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadRooms();
            }}
            tintColor="#7C3AED"
            progressViewOffset={headerHeight}
          />
        }>
        <Text style={styles.tagline}>Know who's in the room.</Text>
        <EnterRoomCard onEnterCode={goEnterCode} />

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#7C3AED" />
          </View>
        ) : (
          <>
            {active.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader title="Active now" live onViewAll={() => {}} />
                {active.map((room) => (
                  <ActiveRoomCard
                    key={room.id}
                    {...roomCardProps(room)}
                    onEnter={() => handleEnter(room)}
                  />
                ))}
              </View>
            ) : null}

            <View style={styles.section}>
              <SectionHeader title="Upcoming rooms" onViewAll={() => {}} />
              {upcoming.length > 0 ? (
                upcoming.map((room) => (
                  <UpcomingRoomCard
                    key={room.id}
                    {...roomCardProps(room)}
                    schedule={formatRoomSchedule(room.starts_at)}
                    onPress={() => handleView(room)}
                  />
                ))
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No upcoming rooms yet</Text>
                  <Text style={styles.emptySub}>
                    Enter an invite code to join an event.
                  </Text>
                </View>
              )}
            </View>

            <HostCard onCreate={goCreate} />
          </>
        )}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F4F8',
  },
  scroll: {
    paddingHorizontal: 20,
  },
  tagline: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 20,
    textAlign: "left",
    alignSelf: "flex-start",
  },
  section: {
    marginBottom: 26,
  },
  loader: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    padding: 18,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#12121F',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
  },
});
