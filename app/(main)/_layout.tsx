import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

export default function MainLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="index" options={{ title: 'The Room', headerShown: false }} />
      <Stack.Screen name="create-room" options={{ title: 'Create Room' }} />
      <Stack.Screen name="room/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="room/preview/[id]" options={{ title: 'Share Room', presentation: 'modal' }} />
      <Stack.Screen name="room/people/[id]" options={{ title: 'People' }} />
      <Stack.Screen name="profile-setup/[roomId]" options={{ title: 'Your Profile', headerShown: false }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
