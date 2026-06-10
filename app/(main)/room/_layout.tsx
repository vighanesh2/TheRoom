import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';

export default function RoomLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0c0c14' },
        headerTintColor: '#FFF8F0',
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="[id]" options={{ headerShown: false, presentation: 'card' }} />
      <Stack.Screen name="preview/[id]" options={{ headerShown: false, presentation: 'card' }} />
      <Stack.Screen name="edit/[id]" options={{ headerShown: false, presentation: 'card' }} />
      <Stack.Screen name="people/[id]" options={{ headerShown: false, presentation: 'card' }} />
    </Stack>
  );
}
