import { Fredoka_600SemiBold, useFonts } from '@expo-google-fonts/fredoka';
import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '@/lib/auth';

export default function AuthLayout() {
  const { session, loading } = useAuth();
  const [fontsLoaded] = useFonts({
    Fredoka_600SemiBold,
  });

  if (loading || !fontsLoaded) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(main)" />;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#08080e' } }}>
        <Stack.Screen name="login" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050508',
  },
});
