import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Input } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

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
      if (mode === 'signup') {
        const signedIn = await signUp(email.trim(), password, fullName.trim() || email.split('@')[0]);
        if (signedIn) {
          router.replace('/(main)');
        } else {
          Alert.alert('Welcome!', 'Check your email to confirm your account, then sign in.');
          setMode('signin');
        }
      } else {
        await signIn(email.trim(), password);
        router.replace('/(main)');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#FAFAFA', '#EDE9FE', '#FCE7F3']}
      style={styles.gradient}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.lg },
          ]}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.logo}>The Room</Text>
            <Text style={styles.tagline}>
              Gather builders. Share what you're making. Find your people.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </Text>

            {mode === 'signup' && (
              <Input
                placeholder="Your name"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                style={styles.input}
              />
            )}

            <Input
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              style={styles.input}
            />

            <Input
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              style={styles.input}
            />

            <Button
              title={mode === 'signin' ? 'Sign In' : 'Sign Up'}
              onPress={handleSubmit}
              loading={loading}
              style={styles.submit}
            />

            <Button
              title={
                mode === 'signin'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'
              }
              variant="ghost"
              onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    marginBottom: spacing.xxl,
  },
  logo: {
    ...typography.hero,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    maxWidth: 320,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.lg,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 4,
  },
  formTitle: {
    ...typography.subtitle,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  input: {
    marginBottom: spacing.md,
  },
  submit: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
});
