import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Button, Input, SectionLabel } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { joinRoom, uploadAvatar } from '@/lib/api/rooms';
import { useAuth } from '@/lib/auth';

export default function ProfileSetupScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? ''
  );
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [headline, setHeadline] = useState('');
  const [building, setBuilding] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [canHelpWith, setCanHelpWith] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [loading, setLoading] = useState(false);

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleJoin = async () => {
    if (!user || !roomId) return;

    if (!displayName.trim()) {
      Alert.alert('Name required', 'Tell us what to call you in this room.');
      return;
    }

    setLoading(true);
    try {
      let avatarUrl: string | undefined;
      if (avatarUri) {
        avatarUrl = await uploadAvatar(user.id, avatarUri);
      }

      await joinRoom(roomId, user.id, {
        display_name: displayName.trim(),
        avatar_url: avatarUrl,
        headline: headline.trim() || undefined,
        building: building.trim() || undefined,
        looking_for: lookingFor.trim() || undefined,
        can_help_with: canHelpWith.trim() || undefined,
        linkedin_url: linkedin.trim() || undefined,
      });

      router.replace(`/(main)/room/${roomId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to join room';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#EDE9FE', '#FAFAFA']} style={styles.gradient}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg },
          ]}
          keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Set up your profile</Text>
          <Text style={styles.subtitle}>
            Help others know what you're building and how you can connect.
          </Text>

          <Pressable onPress={pickAvatar} style={styles.avatarSection}>
            <Avatar name={displayName || '?'} uri={avatarUri} size={88} />
            <Text style={styles.avatarHint}>Tap to add photo</Text>
          </Pressable>

          <SectionLabel>Basics</SectionLabel>
          <Input
            placeholder="Your name *"
            value={displayName}
            onChangeText={setDisplayName}
            style={styles.input}
          />
          <Input
            placeholder="One-line headline"
            value={headline}
            onChangeText={setHeadline}
            style={styles.input}
          />

          <SectionLabel>What you're building</SectionLabel>
          <Input
            placeholder="e.g. AI tool for designers"
            value={building}
            onChangeText={setBuilding}
            style={styles.input}
          />

          <SectionLabel>What you're looking for</SectionLabel>
          <Input
            placeholder="e.g. Co-founder, feedback, intros"
            value={lookingFor}
            onChangeText={setLookingFor}
            style={styles.input}
          />

          <SectionLabel>What you can help with</SectionLabel>
          <Input
            placeholder="e.g. Growth, design, fundraising"
            value={canHelpWith}
            onChangeText={setCanHelpWith}
            style={styles.input}
          />

          <SectionLabel>LinkedIn (optional)</SectionLabel>
          <Input
            placeholder="linkedin.com/in/you"
            value={linkedin}
            onChangeText={setLinkedin}
            autoCapitalize="none"
            style={styles.input}
          />

          <Button title="Join Room" onPress={handleJoin} loading={loading} style={styles.submit} />
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
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatarHint: {
    ...typography.caption,
    color: colors.accent,
    marginTop: spacing.sm,
    fontWeight: '600',
  },
  input: {
    marginBottom: spacing.md,
  },
  submit: {
    marginTop: spacing.md,
  },
});
