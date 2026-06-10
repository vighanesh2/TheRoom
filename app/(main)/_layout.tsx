import { DMSerifDisplay_400Regular, useFonts } from '@expo-google-fonts/dm-serif-display';
import { Fredoka_600SemiBold } from '@expo-google-fonts/fredoka';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '@/lib/auth';

export default function MainLayout() {
  const { session, loading } = useAuth();
  const [fontsLoaded] = useFonts({
    DMSerifDisplay_400Regular,
    Fredoka_600SemiBold,
  });

  if (loading || !fontsLoaded) {
    return (
      <View style={styles.loading}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#7C3AED',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabLabel,
          tabBarBackground: () => <View style={styles.tabBarBg} />,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Rooms',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: 'Join',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="key-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'person-circle' : 'person-circle-outline'}
                size={size + 2}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen name="enter-code" options={{ href: null }} />
        <Tabs.Screen name="create-room" options={{ href: null }} />
        <Tabs.Screen name="room" options={{ href: null }} />
        <Tabs.Screen name="profile-setup" options={{ href: null }} />
        <Tabs.Screen name="friends" options={{ href: null }} />
        <Tabs.Screen name="edit-profile" options={{ href: null }} />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F4F8',
  },
  tabBar: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F5',
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingTop: 8,
    elevation: 0,
  },
  tabBarBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: Platform.OS === 'ios' ? 0 : 8,
  },
});
