import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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

import { RoomsBackground } from '@/components/home/RoomsBackground';
import { createRoom, getRoomById, updateRoom, uploadCoverImage } from '@/lib/api/rooms';
import { useAuth } from '@/lib/auth';
import { useTabBarInset } from '@/lib/hooks/useTabBarInset';
import type { CoverType, Privacy } from '@/lib/types/database';
import { getCurrentLocationLabel } from '@/lib/utils/location';
import {
  COVER_TEXT_COLORS,
  DEFAULT_COVER_TEXT_COLOR,
  getCoverOverlay,
  isLightCoverText,
} from '@/lib/utils/cover';
import { searchPlaces, type PlaceSuggestion } from '@/lib/utils/places';

const NAVY = '#12121F';
const PURPLE = '#7C3AED';
const MUTED = '#6B7280';

export const DEFAULT_COVER_GRADIENT = 'midnight';

const COVER_OPTIONS = [
  { id: 'midnight', colors: ['#1E1B4B', '#312E81', '#4338CA'] as const },
  { id: 'lavender', colors: ['#EDE8FF', '#F5F2FF', '#FFFFFF'] as const },
  { id: 'peach', colors: ['#FFE8D6', '#FFF5EB', '#FFFFFF'] as const },
  { id: 'sky', colors: ['#DBEAFE', '#EFF6FF', '#FFFFFF'] as const },
];

const VIBE_TAGS = ['Builders', 'AI', 'Startup', 'Hackathon', 'Founder', 'Design'];

const INPUT_PROPS = {
  placeholderTextColor: MUTED,
  selectionColor: PURPLE,
  autoCorrect: false,
  autoCapitalize: 'sentences' as const,
};

function defaultStartsAt() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(19, 0, 0, 0);
  d.setSeconds(0, 0);
  return d;
}

function FieldInput({
  style,
  ...props
}: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      {...INPUT_PROPS}
      {...props}
      style={[styles.rowInput, style]}
    />
  );
}

export function RoomFormScreen({ roomId }: { roomId?: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();
  const { user } = useAuth();
  const isEdit = !!roomId;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startsAt, setStartsAt] = useState(defaultStartsAt);
  const [iosPickerOpen, setIosPickerOpen] = useState(false);
  const [androidPickerMode, setAndroidPickerMode] = useState<'date' | 'time' | null>(null);
  const [coverStyle, setCoverStyle] = useState<CoverType>('gradient');
  const [coverValue, setCoverValue] = useState(DEFAULT_COVER_GRADIENT);
  const [coverImageUri, setCoverImageUri] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [coverTextColor, setCoverTextColor] = useState(DEFAULT_COVER_TEXT_COLOR);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [privacy, setPrivacy] = useState<Privacy>('private');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Builders', 'AI']);
  const [loading, setLoading] = useState(false);
  const [loadingRoom, setLoadingRoom] = useState(isEdit);
  const [locating, setLocating] = useState(false);
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [showPlaceSuggestions, setShowPlaceSuggestions] = useState(false);
  const skipPlaceSearchRef = useRef(false);
  const placeSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const previewTitle = title.trim() || 'Your room name';
  const previewLocation = location.trim() || 'Add a location';
  const scheduleLabel = format(startsAt, "MMM d, yyyy 'at' h:mm a");
  const previewDate = format(startsAt, 'MMM d, yyyy · h:mm a');

  const coverColors = COVER_OPTIONS.find((c) => c.id === coverValue)?.colors ?? COVER_OPTIONS[0].colors;
  const coverPreviewUri = coverImageUri ?? coverImageUrl;
  const coverOverlay = getCoverOverlay(
    coverTextColor,
    coverStyle === 'image' ? 'image' : 'gradient',
    coverStyle === 'gradient' ? coverValue : undefined
  );
  const pillBackground = isLightCoverText(coverTextColor)
    ? 'rgba(255,255,255,0.18)'
    : 'rgba(255,255,255,0.82)';

  const pickCoverImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      setCoverImageUri(result.assets[0].uri);
      setCoverStyle('image');
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const fillCurrentLocation = async () => {
    setLocating(true);
    try {
      const result = await getCurrentLocationLabel();
      if (result.ok) {
        skipPlaceSearchRef.current = true;
        setLocation(result.label);
        setPlaceSuggestions([]);
        setShowPlaceSuggestions(false);
        return;
      }

      if (result.reason === 'denied') {
        Alert.alert(
          'Location access needed',
          'Turn on location permissions in Settings to use your current location.'
        );
        return;
      }

      Alert.alert(
        'Could not find location',
        'We could not determine your address. Try again or enter it manually.'
      );
    } finally {
      setLocating(false);
    }
  };

  const handleLocationChange = (text: string) => {
    setLocation(text);

    if (skipPlaceSearchRef.current) {
      skipPlaceSearchRef.current = false;
      return;
    }

    setShowPlaceSuggestions(true);

    if (placeSearchTimerRef.current) {
      clearTimeout(placeSearchTimerRef.current);
    }

    if (text.trim().length < 2) {
      setPlaceSuggestions([]);
      setSearchingPlaces(false);
      return;
    }

    setSearchingPlaces(true);
    placeSearchTimerRef.current = setTimeout(async () => {
      const results = await searchPlaces(text);
      setPlaceSuggestions(results);
      setSearchingPlaces(false);
    }, 300);
  };

  const selectPlace = (place: PlaceSuggestion) => {
    skipPlaceSearchRef.current = true;
    setLocation(place.label);
    setPlaceSuggestions([]);
    setShowPlaceSuggestions(false);
  };

  useEffect(() => {
    return () => {
      if (placeSearchTimerRef.current) {
        clearTimeout(placeSearchTimerRef.current);
      }
    };
  }, []);

  const loadRoom = useCallback(async () => {
    if (!roomId || !user) return;

    setLoadingRoom(true);
    try {
      const room = await getRoomById(roomId);
      if (!room) {
        Alert.alert('Not found', 'This room does not exist.');
        router.back();
        return;
      }
      if (room.host_id !== user.id) {
        Alert.alert('Not allowed', 'Only the host can edit this room.');
        router.back();
        return;
      }

      setTitle(room.title);
      setDescription(room.description ?? '');
      setLocation(room.location ?? '');
      setStartsAt(parseISO(room.starts_at));
      if (room.cover_type === 'image') {
        setCoverStyle('image');
        setCoverImageUrl(room.cover_value);
        setCoverImageUri(null);
      } else {
        setCoverStyle('gradient');
        setCoverValue(room.cover_type === 'gradient' ? room.cover_value : DEFAULT_COVER_GRADIENT);
        setCoverImageUrl(null);
        setCoverImageUri(null);
      }
      setCoverTextColor(room.cover_text_color ?? DEFAULT_COVER_TEXT_COLOR);
      setPrivacy(room.privacy);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load room';
      Alert.alert('Error', message);
      router.back();
    } finally {
      setLoadingRoom(false);
    }
  }, [roomId, user, router]);

  useEffect(() => {
    if (isEdit) {
      loadRoom();
    }
  }, [isEdit, loadRoom]);

  const openDatePicker = () => {
    if (Platform.OS === 'ios') {
      setIosPickerOpen((open) => !open);
      return;
    }
    setAndroidPickerMode('date');
  };

  const onAndroidPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed') {
      setAndroidPickerMode(null);
      return;
    }
    if (!selected) return;

    if (androidPickerMode === 'date') {
      const next = new Date(startsAt);
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      setStartsAt(next);
      setAndroidPickerMode('time');
      return;
    }

    const next = new Date(startsAt);
    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    setStartsAt(next);
    setAndroidPickerMode(null);
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!title.trim()) {
      Alert.alert('Missing title', 'Give your room a name.');
      return;
    }

    if (coverStyle === 'image' && !coverPreviewUri) {
      Alert.alert('Cover photo', 'Choose a photo for your room cover.');
      return;
    }

    setLoading(true);
    try {
      let coverType: CoverType = coverStyle;
      let coverValueFinal = coverValue;

      if (coverStyle === 'image') {
        setUploadingCover(true);
        if (coverImageUri) {
          coverValueFinal = await uploadCoverImage(user.id, coverImageUri);
        } else if (coverImageUrl) {
          coverValueFinal = coverImageUrl;
        }
      }

      const payload = {
        title,
        description: description.trim() || undefined,
        starts_at: startsAt,
        location: location.trim() || undefined,
        cover_type: coverType,
        cover_value: coverValueFinal,
        cover_text_color: coverTextColor,
        privacy,
      };

      if (isEdit && roomId) {
        await updateRoom(roomId, user.id, payload);
        router.replace(`/(main)/room/preview/${roomId}`);
        return;
      }

      const room = await createRoom(user.id, payload, {
        display_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Host',
      });

      router.replace(`/(main)/room/preview/${room.id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : isEdit ? 'Failed to update room' : 'Failed to create room';
      Alert.alert('Error', message);
    } finally {
      setUploadingCover(false);
      setLoading(false);
    }
  };

  if (loadingRoom) {
    return (
      <View style={styles.container}>
        <RoomsBackground />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={PURPLE} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <RoomsBackground />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 8, paddingBottom: tabBarInset },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={22} color={NAVY} />
            </Pressable>
            <Pressable onPress={handleSubmit} disabled={loading} style={styles.iconBtn}>
              <Ionicons name="save-outline" size={20} color="#C9A227" />
            </Pressable>
          </View>

          <View style={styles.titleBlock}>
            <View style={styles.titleRow}>
              <Text style={styles.pageTitle}>{isEdit ? 'Edit Room' : 'Create Room'}</Text>
            </View>
            <Text style={styles.pageSub}>
              {isEdit
                ? 'Update your event details. Your invite code stays the same.'
                : 'Create a private room for your event and let people discover who\'s inside.'}
            </Text>
          </View>

          <View style={styles.previewCard}>
            {coverStyle === 'image' && coverPreviewUri ? (
              <Image source={{ uri: coverPreviewUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <LinearGradient
                colors={[...coverColors]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            )}
            <LinearGradient colors={[...coverOverlay]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
            <View style={styles.portalArt} pointerEvents="none">
              <View style={styles.portalArch}>
                <LinearGradient colors={['#DDD4FF', '#F0EBFF', '#FFFFFF']} style={styles.portalFill} />
                <View style={styles.portalGlow} />
              </View>
            </View>
            <View style={styles.previewContent}>
              <Text style={[styles.previewTitle, { color: coverTextColor }]} numberOfLines={2}>
                {previewTitle}
              </Text>
              <View style={[styles.previewPill, { backgroundColor: pillBackground }]}>
                <Ionicons name="calendar-outline" size={14} color={coverTextColor} />
                <Text style={[styles.previewPillText, { color: coverTextColor }]}>{previewDate}</Text>
              </View>
              <View style={[styles.previewPill, { backgroundColor: pillBackground }]}>
                <Ionicons name="location-outline" size={14} color={coverTextColor} />
                <Text style={[styles.previewPillText, { color: coverTextColor }]} numberOfLines={1}>
                  {previewLocation}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.formCard}>
            <FormRow icon="text-outline" label="Room name">
              <FieldInput
                value={title}
                onChangeText={setTitle}
                placeholder="Enter room name"
                autoCapitalize="words"
              />
            </FormRow>
            <Divider />
            <Pressable onPress={openDatePicker}>
              <FormRow icon="calendar-outline" label="Date & time">
                <Text style={styles.rowInput}>{scheduleLabel}</Text>
              </FormRow>
            </Pressable>
            {iosPickerOpen ? (
              <View style={styles.pickerWrap}>
                <DateTimePicker
                  value={startsAt}
                  mode="datetime"
                  display="spinner"
                  minimumDate={new Date()}
                  onChange={(_, selected) => {
                    if (selected) setStartsAt(selected);
                  }}
                />
                <Pressable onPress={() => setIosPickerOpen(false)} style={styles.pickerDoneBtn}>
                  <Text style={styles.pickerDoneText}>Done</Text>
                </Pressable>
              </View>
            ) : null}
            {androidPickerMode ? (
              <DateTimePicker
                value={startsAt}
                mode={androidPickerMode}
                minimumDate={androidPickerMode === 'date' ? new Date() : undefined}
                onChange={onAndroidPickerChange}
              />
            ) : null}
            <Divider />
            <View>
              <FormRow
                icon="location-outline"
                label="Location"
                trailing={
                  <Pressable
                    onPress={fillCurrentLocation}
                    disabled={locating}
                    style={({ pressed }) => [styles.locateBtn, pressed && styles.pressed]}>
                    {locating ? (
                      <ActivityIndicator size="small" color={PURPLE} />
                    ) : (
                      <Ionicons name="navigate" size={18} color={PURPLE} />
                    )}
                  </Pressable>
                }>
                <FieldInput
                  value={location}
                  onChangeText={handleLocationChange}
                  onFocus={() => setShowPlaceSuggestions(true)}
                  placeholder="Search city or venue"
                  autoCapitalize="words"
                />
              </FormRow>
              {showPlaceSuggestions && (searchingPlaces || placeSuggestions.length > 0) ? (
                <View style={styles.suggestions}>
                  {searchingPlaces ? (
                    <View style={styles.suggestionRow}>
                      <ActivityIndicator size="small" color={PURPLE} />
                      <Text style={styles.suggestionLoading}>Searching places…</Text>
                    </View>
                  ) : null}
                  {placeSuggestions.map((place) => (
                    <Pressable
                      key={place.id}
                      onPress={() => selectPlace(place)}
                      style={({ pressed }) => [styles.suggestionRow, pressed && styles.suggestionPressed]}>
                      <Ionicons name="location-outline" size={16} color={PURPLE} />
                      <View style={styles.suggestionTextWrap}>
                        <Text style={styles.suggestionLabel} numberOfLines={1}>
                          {place.label}
                        </Text>
                        {place.subtitle ? (
                          <Text style={styles.suggestionSub} numberOfLines={1}>
                            {place.subtitle}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
            <Divider />
            <FormRow icon="document-text-outline" label="Description">
              <FieldInput
                value={description}
                onChangeText={setDescription}
                placeholder="What's this room about?"
                style={styles.multilineInput}
                multiline
              />
            </FormRow>
            <Divider />
            {!isEdit ? (
              <>
                <View style={styles.tagsSection}>
                  <View style={styles.tagsHeader}>
                    <View style={styles.formIcon}>
                      <Ionicons name="pricetag-outline" size={18} color={PURPLE} />
                    </View>
                    <Text style={styles.formLabel}>Room vibe / tags</Text>
                  </View>
                  <View style={styles.tagWrap}>
                    {VIBE_TAGS.map((tag) => {
                      const active = selectedTags.includes(tag);
                      return (
                        <Pressable
                          key={tag}
                          onPress={() => toggleTag(tag)}
                          style={[styles.tag, active && styles.tagActive]}>
                          <Text style={[styles.tagText, active && styles.tagTextActive]}>{tag}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </>
            ) : null}
          </View>

          <Text style={styles.sectionLabel}>Privacy</Text>
          <View style={styles.privacyRow}>
            <Pressable
              onPress={() => setPrivacy('private')}
              style={[styles.privacyCard, privacy === 'private' && styles.privacyCardActive]}>
              {privacy === 'private' ? (
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
              ) : null}
              <Ionicons name="lock-closed-outline" size={20} color={privacy === 'private' ? PURPLE : MUTED} />
              <Text style={styles.privacyTitle}>Private</Text>
              <Text style={styles.privacySub}>Only invited people can join</Text>
            </Pressable>
            <Pressable
              onPress={() => setPrivacy('public')}
              style={[styles.privacyCard, privacy === 'public' && styles.privacyCardActive]}>
              {privacy === 'public' ? (
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
              ) : null}
              <Ionicons name="globe-outline" size={20} color={privacy === 'public' ? PURPLE : MUTED} />
              <Text style={styles.privacyTitle}>Public link</Text>
              <Text style={styles.privacySub}>Anyone with the link can join</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>Cover style</Text>
          <View style={styles.coverModeRow}>
            <Pressable
              onPress={() => setCoverStyle('gradient')}
              style={[styles.coverModeBtn, coverStyle === 'gradient' && styles.coverModeBtnActive]}>
              <Ionicons name="color-palette-outline" size={16} color={coverStyle === 'gradient' ? PURPLE : MUTED} />
              <Text style={[styles.coverModeText, coverStyle === 'gradient' && styles.coverModeTextActive]}>
                Gradient
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setCoverStyle('image')}
              style={[styles.coverModeBtn, coverStyle === 'image' && styles.coverModeBtnActive]}>
              <Ionicons name="image-outline" size={16} color={coverStyle === 'image' ? PURPLE : MUTED} />
              <Text style={[styles.coverModeText, coverStyle === 'image' && styles.coverModeTextActive]}>
                Photo
              </Text>
            </Pressable>
          </View>

          {coverStyle === 'gradient' ? (
            <View style={styles.coverRow}>
              {COVER_OPTIONS.map((option) => {
                const selected = coverValue === option.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => setCoverValue(option.id)}
                    style={[styles.coverThumb, selected && styles.coverThumbActive]}>
                    <LinearGradient colors={[...option.colors]} style={styles.coverThumbInner} />
                    {selected ? (
                      <View style={styles.coverCheck}>
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Pressable
              onPress={pickCoverImage}
              disabled={uploadingCover}
              style={({ pressed }) => [styles.coverImagePicker, pressed && styles.pressed]}>
              {coverPreviewUri ? (
                <Image source={{ uri: coverPreviewUri }} style={styles.coverImagePreview} contentFit="cover" />
              ) : (
                <View style={styles.coverImageEmpty}>
                  <Ionicons name="image-outline" size={28} color={PURPLE} />
                  <Text style={styles.coverImageEmptyText}>Choose cover photo</Text>
                </View>
              )}
              <View style={styles.coverImageBadge}>
                {uploadingCover ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={14} color="#FFFFFF" />
                    <Text style={styles.coverImageBadgeText}>
                      {coverPreviewUri ? 'Change photo' : 'Upload photo'}
                    </Text>
                  </>
                )}
              </View>
            </Pressable>
          )}

          <Text style={styles.sectionLabel}>Title text color</Text>
          <View style={styles.textColorRow}>
            {COVER_TEXT_COLORS.map((option) => {
              const selected = coverTextColor === option.value;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setCoverTextColor(option.value)}
                  style={[styles.textColorSwatch, selected && styles.textColorSwatchActive]}
                  accessibilityLabel={option.label}>
                  <View style={[styles.textColorInner, { backgroundColor: option.value }]}>
                    <Text
                      style={[
                        styles.textColorSample,
                        { color: isLightCoverText(option.value) ? NAVY : '#FFFFFF' },
                      ]}>
                      Aa
                    </Text>
                  </View>
                  {selected ? (
                    <View style={styles.textColorCheck}>
                      <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.qrBox}>
            <View style={styles.qrIconWrap}>
              <Ionicons name="key-outline" size={22} color="#C9A227" />
            </View>
            <Text style={styles.qrText}>
              {isEdit
                ? 'Your invite code stays the same after you save changes.'
                : 'A unique invite code will be created when you publish the room.'}
            </Text>
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={({ pressed }) => [styles.createBtn, pressed && styles.pressed, loading && styles.disabled]}>
            <Text style={styles.createBtnText}>
              {loading
                ? uploadingCover
                  ? 'Uploading photo…'
                  : isEdit
                    ? 'Saving…'
                    : 'Creating…'
                : isEdit
                  ? 'Save Changes'
                  : 'Create Room'}
            </Text>
          </Pressable>

          {!isEdit ? (
            <Pressable onPress={() => router.back()} style={styles.previewLinkWrap}>
              <Text style={styles.previewLink}>Preview room</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function FormRow({
  icon,
  label,
  children,
  trailing,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  children: React.ReactNode;
  trailing?: React.ReactNode;
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
      {trailing ?? (
        <Ionicons name="chevron-forward" size={16} color="#C4C4CF" style={styles.rowChevron} />
      )}
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F4F8',
  },
  flex: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  },
  titleBlock: {
    marginBottom: 18,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 34,
    lineHeight: 42,
    color: NAVY,
  },
  pageSub: {
    color: MUTED,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  previewCard: {
    borderRadius: 24,
    overflow: 'hidden',
    minHeight: 168,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  portalArt: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '42%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portalArch: {
    width: 88,
    height: 120,
    borderTopLeftRadius: 44,
    borderTopRightRadius: 44,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.65)',
    borderBottomWidth: 0,
  },
  portalFill: {
    flex: 1,
  },
  portalGlow: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 14,
  },
  previewContent: {
    padding: 20,
    paddingRight: 120,
    justifyContent: 'center',
    minHeight: 168,
  },
  previewTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 26,
    lineHeight: 32,
    marginBottom: 12,
  },
  previewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  previewPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    marginBottom: 20,
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
    paddingTop: 2,
  },
  rowChevron: {
    marginTop: 10,
  },
  locateBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F0FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  suggestions: {
    marginLeft: 62,
    marginRight: 14,
    marginTop: -4,
    marginBottom: 8,
    backgroundColor: '#FAFAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EDE8FF',
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
  },
  suggestionPressed: {
    backgroundColor: '#F3F0FA',
  },
  suggestionTextWrap: {
    flex: 1,
  },
  suggestionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: NAVY,
  },
  suggestionSub: {
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
  },
  suggestionLoading: {
    fontSize: 13,
    color: MUTED,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: MUTED,
    marginBottom: 4,
  },
  rowInput: {
    fontSize: 15,
    lineHeight: 20,
    color: NAVY,
    fontWeight: '600',
    padding: 0,
    margin: 0,
    minHeight: 20,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  multilineInput: {
    minHeight: 40,
    textAlignVertical: 'top',
  },
  pickerWrap: {
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  pickerDoneBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  pickerDoneText: {
    color: PURPLE,
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 62,
  },
  tagsSection: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  tagsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginLeft: 48,
  },
  tag: {
    backgroundColor: '#F3F0FA',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#EDE8FF',
  },
  tagActive: {
    backgroundColor: '#EDE8FF',
    borderColor: PURPLE,
  },
  tagText: {
    fontSize: 13,
    color: MUTED,
    fontWeight: '600',
  },
  tagTextActive: {
    color: PURPLE,
  },
  sectionLabel: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 20,
    lineHeight: 28,
    color: NAVY,
    marginBottom: 12,
  },
  privacyRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  privacyCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#F0F0F5',
    padding: 14,
    minHeight: 118,
    position: 'relative',
  },
  privacyCardActive: {
    borderColor: PURPLE,
    backgroundColor: '#FAF8FF',
  },
  checkBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: NAVY,
    marginTop: 10,
    marginBottom: 4,
  },
  privacySub: {
    fontSize: 12,
    color: MUTED,
    lineHeight: 17,
  },
  coverRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  coverModeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  coverModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDE8FF',
  },
  coverModeBtnActive: {
    borderColor: PURPLE,
    backgroundColor: '#F3F0FA',
  },
  coverModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: MUTED,
  },
  coverModeTextActive: {
    color: PURPLE,
  },
  coverImagePicker: {
    height: 160,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#EDE8FF',
    borderWidth: 1,
    borderColor: '#E0D9FF',
  },
  coverImagePreview: {
    ...StyleSheet.absoluteFillObject,
  },
  coverImageEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  coverImageEmptyText: {
    color: PURPLE,
    fontSize: 14,
    fontWeight: '600',
  },
  coverImageBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(18,18,31,0.72)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  coverImageBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  textColorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  textColorSwatch: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  textColorSwatchActive: {
    borderColor: PURPLE,
  },
  textColorInner: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  textColorSample: {
    fontSize: 14,
    fontWeight: '800',
  },
  textColorCheck: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverThumb: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  coverThumbActive: {
    borderColor: PURPLE,
  },
  coverThumbInner: {
    flex: 1,
  },
  coverCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    padding: 14,
    marginBottom: 20,
  },
  qrIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEF9C3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrText: {
    flex: 1,
    color: '#92400E',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  createBtn: {
    backgroundColor: NAVY,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  previewLinkWrap: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  previewLink: {
    color: PURPLE,
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.6,
  },
});
