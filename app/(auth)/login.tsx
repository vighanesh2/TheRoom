import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthHero } from '@/components/auth/AuthHero';
import { GlassBackground } from '@/components/auth/GlassBackground';
import { useAuth } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

const CARD_RADIUS = 52;
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type AuthMode = 'signin' | 'signup';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const slideY = useSharedValue(SCREEN_HEIGHT * 0.55);
  const opacity = useSharedValue(0);

  const isSignIn = mode === 'signin';

  useEffect(() => {
    slideY.value = withTiming(0, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
    opacity.value = withTiming(1, {
      duration: 500,
      easing: Easing.out(Easing.quad),
    });
  }, [slideY, opacity]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }],
    opacity: opacity.value,
  }));

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing info', 'Please enter email and password.');
      return;
    }

    if (!isSupabaseConfigured()) {
      Alert.alert(
        'Supabase not configured',
        'Copy .env.example to .env and add your Supabase URL and anon key.'
      );
      return;
    }

    setLoading(true);
    try {
      if (isSignIn) {
        await signIn(email.trim(), password);
        router.replace('/(main)');
      } else {
        const signedIn = await signUp(
          email.trim(),
          password,
          fullName.trim() || email.split('@')[0]
        );
        if (signedIn) {
          router.replace('/(main)');
        } else {
          Alert.alert('Welcome!', 'Check your email to confirm your account, then sign in.');
          setMode('signin');
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <GlassBackground />

      <View style={[styles.content, { paddingTop: insets.top + 12 }]}>
        {!keyboardOpen && (
          <View style={styles.hero}>
            <AuthHero />
            <Text style={styles.heroTitle}>
              {isSignIn ? "Let's get you\nsigned in!" : "Let's create\nyour account!"}
            </Text>
          </View>
        )}

        <View style={styles.cardContainer}>
          <Animated.View
            style={[
              styles.card,
              keyboardOpen && styles.cardKeyboardOpen,
              cardStyle,
            ]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets
              style={styles.scrollView}
              contentContainerStyle={[
                styles.cardContent,
                {
                  paddingTop: keyboardOpen ? 20 : 28,
                  paddingBottom: keyboardOpen ? 16 : insets.bottom + 24,
                },
              ]}>
              <View style={styles.toggle}>
                <Pressable
                  onPress={() => setMode('signin')}
                  style={[styles.toggleItem, isSignIn && styles.toggleItemActive]}>
                  <Text style={[styles.toggleText, isSignIn && styles.toggleTextActive]}>
                    Sign In
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setMode('signup')}
                  style={[styles.toggleItem, !isSignIn && styles.toggleItemActive]}>
                  <Text style={[styles.toggleText, !isSignIn && styles.toggleTextActive]}>
                    Sign Up
                  </Text>
                </Pressable>
              </View>

              {!isSignIn && (
                <View style={styles.field}>
                  <Text style={styles.label}>Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Your name"
                    placeholderTextColor="#A3A3A3"
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                  />
                </View>
              )}

              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor="#A3A3A3"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.input, styles.inputFlex]}
                    placeholder="Password"
                    placeholderTextColor="#A3A3A3"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                  />
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={12}
                    style={styles.showButton}>
                    <Text style={styles.showText}>{showPassword ? 'Hide' : 'Show'}</Text>
                  </Pressable>
                </View>
              </View>

              {isSignIn && (
                <Pressable
                  onPress={() =>
                    Alert.alert(
                      'Reset password',
                      'Password reset will be available soon. For now, create a new account or contact support.'
                    )
                  }>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </Pressable>
              )}

              <Pressable
                style={({ pressed }) => [styles.submit, pressed && styles.submitPressed]}
                onPress={handleSubmit}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitText}>{isSignIn ? 'Sign In' : 'Sign Up'}</Text>
                )}
              </Pressable>
            </ScrollView>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#08080e',
  },
  content: {
    flex: 1,
  },
  hero: {
    paddingHorizontal: 24,
    alignItems: 'center',
    paddingBottom: 28,
  },
  heroTitle: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 30,
    color: '#FFF8F0',
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 38,
    marginTop: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
  },
  cardContainer: {
    flex: 1,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: CARD_RADIUS,
    borderTopRightRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderBottomWidth: 0,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
    overflow: 'hidden',
  },
  cardKeyboardOpen: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  scrollView: {
    flex: 1,
  },
  cardContent: {
    paddingHorizontal: 28,
    paddingTop: 28,
    flexGrow: 1,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F2',
    borderRadius: 16,
    padding: 4,
    marginBottom: 28,
  },
  toggleItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  toggleItemActive: {
    backgroundColor: '#000000',
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#737373',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#737373',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F2F2F2',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  inputFlex: {
    flex: 1,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  showButton: {
    paddingHorizontal: 8,
    paddingVertical: 16,
  },
  showText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#737373',
  },
  forgotText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  submit: {
    backgroundColor: '#000000',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    minHeight: 56,
  },
  submitPressed: {
    opacity: 0.85,
  },
  submitText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
