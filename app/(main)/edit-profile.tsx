import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { RoomsBackground } from '@/components/home/RoomsBackground';
import { getSavedJoinProfile, updateMembershipProfile } from '@/lib/api/profile';
import { uploadAvatar } from '@/lib/api/rooms';
import { useAuth } from '@/lib/auth';
import { useTabBarInset } from '@/lib/hooks/useTabBarInset';

const NAVY = '#12121F';
const PURPLE = '#7C3AED';
const MUTED = '#6B7280';

const INPUT_PROPS = {
  placeholderTextColor: MUTED,
  selectionColor: PURPLE,
  autoCorrect: false,
  autoCapitalize: 'sentences' as const,
};

function FieldInput({ style, ...props }: React.ComponentProps<typeof TextInput>) {
  return <TextInput {...INPUT_PROPS} {...props} style={[styles.rowInput, style]} />;
}

function FormRow({
  icon,
  label,
  children,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.formRow}>
      <View style={styles.formIcon}>
        <Ionicons name={icon} size={18} color={PURPLE} />
      </View>
      <View style={styles.formBody}>
        <Text style={styles.formLabel}>{label}</Text>
        {children}
      </View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function isLocalImageUri(uri: string): boolean {
  return !/^https?:\/\//i.test(uri);
}

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();
  const { user } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [headline, setHeadline] = useState('');
  const [building, setBuilding] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [canHelpWith, setCanHelpWith] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    if (!user) {
      setBootstrapping(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const saved = await getSavedJoinProfile(user.id);
        if (cancelled) return;

        if (saved) {
          setDisplayName(saved.display_name);
          setAvatarUrl(saved.avatar_url ?? null);
          setHeadline(saved.headline ?? '');
          setBuilding(saved.building ?? '');
          setLookingFor(saved.looking_for ?? '');
          setCanHelpWith(saved.can_help_with ?? '');
          setLinkedin(saved.linkedin_url ?? '');
        } else {
          setDisplayName(
            (user.user_metadata?.full_name as string | undefined) ??
              user.email?.split('@')[0] ??
              ''
          );
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load profile';
        Alert.alert('Error', message);
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      setAvatarUrl(null);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (!displayName.trim()) {
      Alert.alert('Name required', 'Tell us what to call you in rooms.');
      return;
    }

    setLoading(true);
    try {
      let resolvedAvatarUrl: string | undefined;
      if (avatarUri && isLocalImageUri(avatarUri)) {
        resolvedAvatarUrl = await uploadAvatar(user.id, avatarUri);
      } else if (avatarUri) {
        resolvedAvatarUrl = avatarUri;
      } else if (avatarUrl) {
        resolvedAvatarUrl = avatarUrl;
      }

      await updateMembershipProfile(user.id, {
        display_name: displayName.trim(),
        avatar_url: resolvedAvatarUrl,
        headline: headline.trim() || undefined,
        building: building.trim() || undefined,
        looking_for: lookingFor.trim() || undefined,
        can_help_with: canHelpWith.trim() || undefined,
        linkedin_url: linkedin.trim() || undefined,
      });

      router.back();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save profile';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  if (bootstrapping) {
    return (
      <View style={styles.container}>
        <RoomsBackground />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={PURPLE} />
        </View>
      </View>
    );
  }

  const avatarPreview = avatarUri ?? avatarUrl;
  const hasPhoto = !!avatarPreview;

  return (
    <View style={styles.container}>
      <RoomsBackground />
      <LinearGradient
        colors={['#EDE8FF', '#F5F2FF', '#F8F7FC', 'transparent']}
        locations={[0, 0.35, 0.6, 1]}
        style={styles.headerGlow}
        pointerEvents="none"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 8, paddingBottom: tabBarInset },
          ]}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
            <Ionicons name="arrow-back" size={20} color={NAVY} />
          </Pressable>

          <Text style={styles.title}>Edit profile</Text>
          <Text style={styles.sub}>
            Updates apply to every room you&apos;ve joined, so people always see your latest info.
          </Text>

          <Pressable onPress={pickAvatar} style={({ pressed }) => [styles.avatarCard, pressed && styles.pressed]}>
            <View style={styles.avatarWrap}>
              <Avatar name={displayName || '?'} uri={avatarPreview} size={96} />
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </View>
            </View>
            <Text style={styles.avatarTitle}>{hasPhoto ? 'Change photo' : 'Add your photo'}</Text>
          </Pressable>

          <Text style={styles.sectionLabel}>About you</Text>
          <View style={styles.formCard}>
            <FormRow icon="person-outline" label="Your name *">
              <FieldInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="How should we introduce you?"
                autoCapitalize="words"
              />
            </FormRow>
            <Divider />
            <FormRow icon="chatbubble-outline" label="One-liner">
              <FieldInput
                value={headline}
                onChangeText={setHeadline}
                placeholder="What you do in one line"
              />
            </FormRow>
            <Divider />
            <FormRow icon="hammer-outline" label="What I'm building">
              <FieldInput
                value={building}
                onChangeText={setBuilding}
                placeholder="e.g. AI tool for designers"
              />
            </FormRow>
            <Divider />
            <FormRow icon="search-outline" label="Looking for">
              <FieldInput
                value={lookingFor}
                onChangeText={setLookingFor}
                placeholder="e.g. Co-founder, feedback, intros"
              />
            </FormRow>
            <Divider />
            <FormRow icon="hand-left-outline" label="Can help with">
              <FieldInput
                value={canHelpWith}
                onChangeText={setCanHelpWith}
                placeholder="e.g. Growth, design, fundraising"
              />
            </FormRow>
            <Divider />
            <FormRow icon="logo-linkedin" label="LinkedIn">
              <FieldInput
                value={linkedin}
                onChangeText={setLinkedin}
                placeholder="linkedin.com/in/you"
                autoCapitalize="none"
              />
            </FormRow>
          </View>

          <Pressable
            onPress={handleSave}
            disabled={loading || !displayName.trim()}
            style={({ pressed }) => [
              styles.saveBtn,
              (!displayName.trim() || loading) && styles.saveBtnDisabled,
              pressed && displayName.trim() && !loading && styles.pressed,
            ]}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.saveBtnText}>Save changes</Text>
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F4F8',
  },
  flex: {
    flex: 1,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  scroll: {
    paddingHorizontal: 20,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 34,
    lineHeight: 42,
    color: NAVY,
    marginBottom: 8,
  },
  sub: {
    color: MUTED,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  avatarCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PURPLE,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: NAVY,
  },
  sectionLabel: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 20,
    color: NAVY,
    marginTop: 20,
    marginBottom: 12,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    overflow: 'hidden',
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  formIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F0FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  formBody: {
    flex: 1,
    minWidth: 0,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: MUTED,
    marginBottom: 6,
  },
  rowInput: {
    fontSize: 15,
    color: NAVY,
    padding: 0,
    minHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 62,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PURPLE,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 24,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
});
