import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AttendeeCard } from '@/components/AttendeeCard';
import { ProfileSheet } from '@/components/ProfileSheet';
import { colors, spacing } from '@/constants/theme';
import { getRoomMembers } from '@/lib/api/rooms';
import type { RoomMember } from '@/lib/types/database';

export default function PeopleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<RoomMember | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      setLoading(true);
      getRoomMembers(id)
        .then(setMembers)
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Failed to load people';
          Alert.alert('Error', message);
        })
        .finally(() => setLoading(false));
    }, [id])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <AttendeeCard member={item} onPress={() => setSelectedMember(item)} />
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
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.lg,
  },
});
