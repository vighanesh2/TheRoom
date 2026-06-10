import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/constants/theme';
import { getInitials } from '@/lib/utils/room-code';
import type { RoomMember } from '@/lib/types/database';

type AvatarProps = {
  name: string;
  uri?: string | null;
  size?: number;
};

export function Avatar({ name, uri, size = 44 }: AvatarProps) {
  const fontSize = size * 0.36;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
        contentFit="cover"
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        { width: size, height: size, borderRadius: size / 2 },
      ]}>
      <Text style={[styles.initials, { fontSize }]}>{getInitials(name)}</Text>
    </View>
  );
}

type AvatarStackProps = {
  members: Pick<RoomMember, 'display_name' | 'avatar_url'>[];
  max?: number;
  size?: number;
  borderColor?: string;
};

export function AvatarStack({ members, max = 4, size = 36, borderColor = colors.surface }: AvatarStackProps) {
  const visible = members.slice(0, max);
  const overflow = members.length - max;

  return (
    <View style={styles.stack}>
      {visible.map((member, index) => (
        <View
          key={`${member.display_name}-${index}`}
          style={[styles.stackItem, { marginLeft: index === 0 ? 0 : -size * 0.35, zIndex: max - index }]}>
          <View style={[styles.stackBorder, { borderColor }]}>
            <Avatar name={member.display_name} uri={member.avatar_url} size={size} />
          </View>
        </View>
      ))}
      {overflow > 0 && (
        <View
          style={[
            styles.overflow,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              marginLeft: -size * 0.35,
              borderColor,
            },
          ]}>
          <Text style={[styles.overflowText, { fontSize: size * 0.32 }]}>+{overflow}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: colors.border,
  },
  placeholder: {
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.accent,
    fontWeight: '700',
  },
  stack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackItem: {},
  stackBorder: {
    borderWidth: 2,
    borderColor: colors.surface,
    borderRadius: radius.full,
  },
  overflow: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  overflowText: {
    color: '#fff',
    fontWeight: '700',
  },
});
