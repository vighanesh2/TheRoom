import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button, Input, SectionLabel } from '@/components/ui';
import { COLOR_PRESETS, GRADIENT_PRESETS } from '@/constants/gradients';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { createRoom, uploadCoverImage } from '@/lib/api/rooms';
import { useAuth } from '@/lib/auth';
import type { CoverType, Privacy } from '@/lib/types/database';

export default function CreateRoomScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [coverType, setCoverType] = useState<CoverType>('gradient');
  const [coverValue, setCoverValue] = useState('lavender');
  const [coverImageUri, setCoverImageUri] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState<Privacy>('public');
  const [loading, setLoading] = useState(false);

  const pickCoverImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setCoverImageUri(result.assets[0].uri);
      setCoverType('image');
      setCoverValue(result.assets[0].uri);
    }
  };

  const handleCreate = async () => {
    if (!user) return;

    if (!title.trim()) {
      Alert.alert('Missing title', 'Give your room a name.');
      return;
    }

    if (!dateStr.trim() || !timeStr.trim()) {
      Alert.alert('Missing date/time', 'When is this room happening?');
      return;
    }

    const startsAt = new Date(`${dateStr}T${timeStr}`);
    if (Number.isNaN(startsAt.getTime())) {
      Alert.alert('Invalid date', 'Use YYYY-MM-DD for date and HH:MM for time.');
      return;
    }

    setLoading(true);
    try {
      let finalCoverValue = coverValue;

      if (coverType === 'image' && coverImageUri && user) {
        finalCoverValue = await uploadCoverImage(user.id, coverImageUri);
      }

      const room = await createRoom(
        user.id,
        {
          title,
          description,
          starts_at: startsAt,
          location,
          cover_type: coverType,
          cover_value: finalCoverValue,
          privacy,
        },
        {
          display_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Host',
        }
      );

      router.replace(`/(main)/room/preview/${room.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create room';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled">
        <SectionLabel>Room details</SectionLabel>
        <Input
          placeholder="Room title"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
        />
        <Input
          placeholder="Description (optional)"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          style={[styles.input, styles.textArea]}
        />
        <Input
          placeholder="Location (optional)"
          value={location}
          onChangeText={setLocation}
          style={styles.input}
        />

        <SectionLabel>Date & time</SectionLabel>
        <View style={styles.row}>
          <Input
            placeholder="YYYY-MM-DD"
            value={dateStr}
            onChangeText={setDateStr}
            style={[styles.input, styles.halfInput]}
          />
          <Input
            placeholder="HH:MM"
            value={timeStr}
            onChangeText={setTimeStr}
            style={[styles.input, styles.halfInput]}
          />
        </View>

        <SectionLabel>Cover</SectionLabel>
        <View style={styles.coverTabs}>
          {(['gradient', 'color', 'image'] as CoverType[]).map((type) => (
            <Pressable
              key={type}
              onPress={() => {
                setCoverType(type);
                if (type === 'gradient') setCoverValue('lavender');
                if (type === 'color') setCoverValue(COLOR_PRESETS[0]);
              }}
              style={[styles.coverTab, coverType === type && styles.coverTabActive]}>
              <Text
                style={[
                  styles.coverTabText,
                  coverType === type && styles.coverTabTextActive,
                ]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {coverType === 'gradient' && (
          <View style={styles.presetGrid}>
            {GRADIENT_PRESETS.map((preset) => (
              <Pressable
                key={preset.id}
                onPress={() => setCoverValue(preset.id)}
                style={[
                  styles.gradientSwatch,
                  coverValue === preset.id && styles.swatchSelected,
                ]}>
                <View
                  style={[
                    styles.gradientInner,
                    {
                      backgroundColor: preset.colors[0],
                    },
                  ]}
                />
              </Pressable>
            ))}
          </View>
        )}

        {coverType === 'color' && (
          <View style={styles.presetGrid}>
            {COLOR_PRESETS.map((color) => (
              <Pressable
                key={color}
                onPress={() => setCoverValue(color)}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: color },
                  coverValue === color && styles.swatchSelected,
                ]}
              />
            ))}
          </View>
        )}

        {coverType === 'image' && (
          <Pressable onPress={pickCoverImage} style={styles.imagePicker}>
            {coverImageUri ? (
              <Image source={{ uri: coverImageUri }} style={styles.coverPreview} />
            ) : (
              <Text style={styles.imagePickerText}>Tap to choose cover image</Text>
            )}
          </Pressable>
        )}

        <SectionLabel>Privacy</SectionLabel>
        <View style={styles.privacyRow}>
          {(['public', 'private'] as Privacy[]).map((option) => (
            <Pressable
              key={option}
              onPress={() => setPrivacy(option)}
              style={[styles.privacyOption, privacy === option && styles.privacyActive]}>
              <Text
                style={[
                  styles.privacyText,
                  privacy === option && styles.privacyTextActive,
                ]}>
                {option === 'public' ? '🔗 Public link' : '🔒 Private invite'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Button
          title="Create Room"
          onPress={handleCreate}
          loading={loading}
          style={styles.submit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  input: {
    marginBottom: spacing.md,
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfInput: {
    flex: 1,
  },
  coverTabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  coverTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  coverTabActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  coverTabText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  coverTabTextActive: {
    color: colors.accent,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  gradientSwatch: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    padding: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  gradientInner: {
    flex: 1,
    borderRadius: radius.sm,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: {
    borderColor: colors.accent,
  },
  imagePicker: {
    height: 140,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  coverPreview: {
    width: '100%',
    height: '100%',
  },
  imagePickerText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  privacyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  privacyOption: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  privacyActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  privacyText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  privacyTextActive: {
    color: colors.accent,
  },
  submit: {
    marginTop: spacing.md,
  },
});
