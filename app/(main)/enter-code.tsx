import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
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
import { useTabBarInset } from '@/lib/hooks/useTabBarInset';

const NAVY = '#12121F';
const PURPLE = '#7C3AED';
const MUTED = '#6B7280';
const CODE_LENGTH = 6;

export default function EnterCodeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();
  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState('');

  const handleSubmit = () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < CODE_LENGTH) {
      Alert.alert('Invalid code', 'Please enter a valid 6-character room code.');
      return;
    }
    router.push(`/join/${trimmed}`);
  };

  const onChangeCode = (text: string) => {
    setCode(text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH));
  };

  const chars = code.padEnd(CODE_LENGTH, ' ').split('').slice(0, CODE_LENGTH);
  const canSubmit = code.trim().length >= CODE_LENGTH;

  return (
    <View style={styles.container}>
      <RoomsBackground />
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

          <Text style={styles.title}>Enter code</Text>
          <Text style={styles.sub}>
            Type the invite code from your event host to step into the room.
          </Text>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Ionicons name="key-outline" size={22} color={PURPLE} />
              </View>
              <View style={styles.cardHeaderCopy}>
                <Text style={styles.cardTitle}>Room invite code</Text>
                <Text style={styles.cardSub}>Usually 6 letters or numbers</Text>
              </View>
            </View>

            <Pressable onPress={() => inputRef.current?.focus()} style={styles.codeInputWrap}>
              <View style={styles.codeRow}>
                {chars.map((char, index) => {
                  const filled = char.trim().length > 0;
                  const active = index === code.length && code.length < CODE_LENGTH;
                  return (
                    <View
                      key={index}
                      style={[
                        styles.codeBox,
                        filled && styles.codeBoxFilled,
                        active && styles.codeBoxActive,
                      ]}>
                      <Text style={[styles.codeChar, filled && styles.codeCharFilled]}>
                        {filled ? char : ''}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <TextInput
                ref={inputRef}
                value={code}
                onChangeText={onChangeCode}
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus
                maxLength={CODE_LENGTH}
                keyboardType="default"
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
                style={styles.overlayInput}
                caretHidden
              />
            </Pressable>

            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.submitBtn,
                !canSubmit && styles.submitBtnDisabled,
                pressed && canSubmit && styles.pressed,
              ]}>
              <Text style={styles.submitText}>Join Room</Text>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={styles.tipBox}>
            <View style={styles.tipIconWrap}>
              <Ionicons name="information-circle-outline" size={22} color="#C9A227" />
            </View>
            <Text style={styles.tipText}>
              Your host shares this code on invites, slides, or at the door. Codes are not case-sensitive.
            </Text>
          </View>

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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    padding: 20,
    marginBottom: 16,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F3F0FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderCopy: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 22,
    color: NAVY,
    marginBottom: 2,
  },
  cardSub: {
    fontSize: 13,
    color: MUTED,
  },
  codeInputWrap: {
    position: 'relative',
    marginBottom: 20,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  overlayInput: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.02,
    fontSize: 24,
    letterSpacing: 18,
    color: 'transparent',
  },
  codeBox: {
    flex: 1,
    aspectRatio: 0.82,
    maxWidth: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxFilled: {
    borderColor: PURPLE,
    backgroundColor: '#FAF8FF',
  },
  codeBoxActive: {
    borderColor: PURPLE,
    backgroundColor: '#FFFFFF',
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  codeChar: {
    fontSize: 22,
    fontWeight: '800',
    color: '#D1D5DB',
  },
  codeCharFilled: {
    color: NAVY,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: NAVY,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    padding: 14,
    marginBottom: 16,
  },
  tipIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEF9C3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    flex: 1,
    color: '#92400E',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
});
