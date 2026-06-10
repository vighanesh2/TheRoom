import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
    Animated,
    Dimensions,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { Avatar, AvatarStack } from "@/components/Avatar";
import type { DemoRoom } from "@/constants/demo-rooms";
import { getGradientColors } from "@/constants/gradients";
import type { RoomWithMemberCount } from "@/lib/types/database";
import {
    formatRoomSchedule,
    formatStartedTime,
    isRoomLive,
} from "@/lib/utils/room-status";

const NAVY = "#12121F";
const PURPLE = "#7C3AED";
const MUTED = "#6B7280";

const LOGO = require("../../assets/images/TheRoom.png");
const SCREEN_WIDTH = Dimensions.get("window").width;
const LOGO_CLIP_W = SCREEN_WIDTH * 0.58;
const HEADER_LOGO_HEIGHT = LOGO_CLIP_W * 0.34;
const LOGO_IMG_W = LOGO_CLIP_W * 1.35;
const LOGO_IMG_H = LOGO_CLIP_W * 0.52;
/** PNG has the mark centered — shift left to crop baked-in padding and align text to screen edge. */
const LOGO_SHIFT_X = -(LOGO_IMG_W * 0.265);
const LOGO_SHIFT_Y = -((LOGO_IMG_H - HEADER_LOGO_HEIGHT) / 2);

type ActionProps = {
  onEnterCode: () => void;
};

export function HomeHeader({
  name,
  avatarUri,
  onProfilePress,
  scrollY,
  topInset,
}: {
  name: string;
  avatarUri?: string | null;
  onProfilePress: () => void;
  scrollY: Animated.Value;
  topInset: number;
}) {
  const bgOpacity = scrollY.interpolate({
    inputRange: [0, 24],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const borderOpacity = scrollY.interpolate({
    inputRange: [0, 24],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={[styles.stickyHeader, { paddingTop: topInset }]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.stickyBg, { opacity: bgOpacity }]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.stickyBorder, { opacity: borderOpacity }]}
      />

      <View style={[styles.headerRow, { height: HEADER_LOGO_HEIGHT }]}>
        <View style={[styles.logoClip, { height: HEADER_LOGO_HEIGHT }]}>
          <Image
            source={LOGO}
            style={[
              styles.headerLogo,
              {
                width: LOGO_IMG_W,
                height: LOGO_IMG_H,
                marginLeft: LOGO_SHIFT_X,
                marginTop: LOGO_SHIFT_Y,
              },
            ]}
            contentFit="cover"
            contentPosition="center"
          />
        </View>
        <Pressable onPress={onProfilePress} style={styles.avatarButton}>
          <Avatar name={name} uri={avatarUri} size={44} />
          <View style={styles.statusDot} />
        </Pressable>
      </View>
    </View>
  );
}

export function homeHeaderHeight(topInset: number) {
  return topInset + HEADER_LOGO_HEIGHT + 8;
}

export function EnterRoomCard({ onEnterCode }: ActionProps) {
  return (
    <View style={styles.enterCard}>
      <LinearGradient
        colors={["#EDE8FF", "#F5F2FF", "#FFFFFF"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.portalArt} pointerEvents="none">
        <View style={styles.portalArch}>
          <LinearGradient
            colors={["#DDD4FF", "#F0EBFF", "#FFFFFF"]}
            style={styles.portalFill}
          />
          <View style={styles.portalGlow} />
        </View>
      </View>

      <View style={styles.enterContent}>
        <Text style={styles.enterTitle}>Enter a room</Text>
        <Text style={styles.enterSub}>
          Enter the invite code from your host to join a room.
        </Text>
        <Pressable
          onPress={onEnterCode}
          style={({ pressed }) => [styles.codeBtn, styles.codeBtnFull, pressed && styles.pressed]}
        >
          <Text style={[styles.codeIcon, styles.codeIconLight]}>#</Text>
          <Text style={[styles.codeBtnText, styles.codeBtnTextLight]}>Enter Code</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function SectionHeader({
  title,
  live,
  onViewAll,
}: {
  title: string;
  live?: boolean;
  onViewAll?: () => void;
}) {
  return (
    <View style={styles.sectionRow}>
      <View style={styles.sectionLeft}>
        {live ? <View style={styles.liveDotSmall} /> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {onViewAll ? (
        <Pressable onPress={onViewAll} hitSlop={8}>
          <Text style={styles.viewAll}>View all</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type ActiveCardProps = {
  title: string;
  location?: string | null;
  memberCount: number;
  startsAt: string;
  coverUri?: string | null;
  coverType?: RoomWithMemberCount["cover_type"];
  coverValue?: string;
  members?: { display_name: string; avatar_url: string | null }[];
  onEnter: () => void;
};

export function ActiveRoomCard({
  title,
  location,
  memberCount,
  startsAt,
  coverUri,
  coverType = "gradient",
  coverValue = "midnight",
  members = [],
  onEnter,
}: ActiveCardProps) {
  const live = isRoomLive(startsAt);
  const visibleCount = Math.min(members.length, 4);
  const overflow = Math.max(memberCount - visibleCount, 0);

  return (
    <View style={styles.activeCard}>
      {coverUri ? (
        <Image
          source={{ uri: coverUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      ) : coverType === "color" ? (
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: coverValue }]}
        />
      ) : (
        <LinearGradient
          colors={getGradientColors(coverValue)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <LinearGradient
        colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.82)"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      {live ? (
        <View style={styles.livePill}>
          <View style={styles.liveGoldDot} />
          <Text style={styles.livePillText}>LIVE</Text>
        </View>
      ) : null}

      <View style={styles.activeBody}>
        <Text style={styles.activeTitle}>{title}</Text>
        <View style={styles.metaList}>
          <MetaLine
            icon="people-outline"
            text={`${memberCount} people inside`}
          />
          {location ? (
            <MetaLine icon="location-outline" text={location} />
          ) : null}
          <MetaLine icon="time-outline" text={formatStartedTime(startsAt)} />
        </View>

        <View style={styles.activeFooter}>
          <View style={styles.avatarRow}>
            {members.length > 0 ? (
              <AvatarStack members={members} size={32} borderColor="#FFFFFF" />
            ) : null}
            {overflow > 0 ? (
              <View style={styles.overflowBubble}>
                <Text style={styles.overflowText}>+{overflow}</Text>
              </View>
            ) : null}
          </View>
          <Pressable
            onPress={onEnter}
            style={({ pressed }) => [
              styles.enterRoomBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.enterRoomBtnText}>Enter Room</Text>
            <Ionicons name="chevron-forward" size={16} color={NAVY} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function MetaLine({
  icon,
  text,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  text: string;
}) {
  return (
    <View style={styles.metaLine}>
      <Ionicons name={icon} size={14} color="rgba(255,255,255,0.85)" />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

type UpcomingProps = {
  title: string;
  schedule: string;
  location?: string | null;
  memberCount: number;
  coverUri?: string | null;
  coverType?: RoomWithMemberCount["cover_type"];
  coverValue?: string;
  members?: { display_name: string; avatar_url: string | null }[];
  onPress?: () => void;
};

export function UpcomingRoomCard({
  title,
  schedule,
  location,
  memberCount,
  coverUri,
  coverType = "gradient",
  coverValue = "midnight",
  members = [],
  onPress,
}: UpcomingProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.upcomingCard, pressed && styles.pressed]}
    >
      <View style={styles.thumbWrap}>
        {coverUri ? (
          <Image
            source={{ uri: coverUri }}
            style={styles.thumb}
            contentFit="cover"
          />
        ) : coverType === "color" ? (
          <View style={[styles.thumb, { backgroundColor: coverValue }]} />
        ) : (
          <LinearGradient
            colors={getGradientColors(coverValue)}
            style={styles.thumb}
          />
        )}
      </View>

      <View style={styles.upcomingBody}>
        <Text style={styles.upcomingTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.upcomingMeta}>{schedule}</Text>
        {location ? (
          <Text style={styles.upcomingLocation}>{location}</Text>
        ) : null}
        <View style={styles.upcomingFooter}>
          {members.length > 0 ? (
            <AvatarStack members={members} size={24} borderColor="#FFFFFF" />
          ) : (
            <Text style={styles.goingText}>{memberCount} going</Text>
          )}
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color="#C4C4CF"
        style={styles.chevron}
      />
    </Pressable>
  );
}

export function HostCard({ onCreate }: { onCreate: () => void }) {
  return (
    <View style={styles.hostCard}>
      <View style={styles.hostIconWrap}>
        <Text style={styles.hostPlus}>+</Text>
      </View>
      <View style={styles.hostTextWrap}>
        <Text style={styles.hostTitle}>Hosting something?</Text>
        <Text style={styles.hostSub}>
          Create a private room and let people scan in to see who's inside.
        </Text>
      </View>
      <Pressable
        onPress={onCreate}
        style={({ pressed }) => [styles.createBtn, pressed && styles.pressed]}
      >
        <Text style={styles.createBtnText}>Create Room</Text>
      </Pressable>
    </View>
  );
}

export function roomCardProps(room: RoomWithMemberCount) {
  return {
    title: room.title,
    location: room.location,
    memberCount: room.member_count,
    startsAt: room.starts_at,
    coverUri: room.cover_type === "image" ? room.cover_value : null,
    coverType: room.cover_type,
    coverValue: room.cover_value,
    members: room.members_preview ?? [],
  };
}

export function demoActiveProps(demo: DemoRoom) {
  return {
    title: demo.title,
    location: demo.location,
    memberCount: demo.member_count,
    startsAt: demo.starts_at,
    coverUri: demo.coverUri,
    members: demo.members_preview,
  };
}

export function demoUpcomingProps(demo: DemoRoom) {
  return {
    title: demo.title,
    schedule: formatRoomSchedule(demo.starts_at),
    location: demo.location,
    memberCount: demo.member_count,
    coverUri: demo.coverUri,
    members: demo.members_preview,
  };
}

const styles = StyleSheet.create({
  stickyHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingLeft: 0,
    paddingRight: 20,
    paddingBottom: 4,
  },
  stickyBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
  },
  stickyBorder: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#F0F0F5",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingRight: 20,
  },
  logoClip: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 56,
    overflow: "hidden",
  },
  headerLogo: {},
  avatarButton: {
    position: "relative",
  },
  statusDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: PURPLE,
    borderWidth: 2,
    borderColor: "#F5F4F8",
  },
  enterCard: {
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 28,
    minHeight: 196,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
  },
  portalArt: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "42%",
    alignItems: "center",
    justifyContent: "center",
  },
  portalArch: {
    width: 110,
    height: 150,
    borderTopLeftRadius: 55,
    borderTopRightRadius: 55,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.65)",
    borderBottomWidth: 0,
  },
  portalFill: {
    flex: 1,
  },
  portalGlow: {
    position: "absolute",
    bottom: 0,
    left: 20,
    right: 20,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 20,
  },
  enterContent: {
    padding: 22,
    paddingRight: 130,
  },
  enterTitle: {
    fontFamily: "DMSerifDisplay_400Regular",
    fontSize: 26,
    color: NAVY,
    marginBottom: 8,
  },
  enterSub: {
    fontSize: 14,
    color: MUTED,
    lineHeight: 21,
    marginBottom: 18,
  },
  codeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  codeBtnFull: {
    backgroundColor: NAVY,
    borderColor: NAVY,
  },
  codeIcon: {
    fontSize: 16,
    fontWeight: "700",
    color: NAVY,
  },
  codeIconLight: {
    color: "#FFFFFF",
  },
  codeBtnText: {
    color: NAVY,
    fontSize: 15,
    fontWeight: "600",
  },
  codeBtnTextLight: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    minHeight: 32,
  },
  sectionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    paddingVertical: 2,
  },
  liveDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PURPLE,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: "DMSerifDisplay_400Regular",
    fontSize: 22,
    lineHeight: 32,
    color: NAVY,
  },
  viewAll: {
    fontSize: 14,
    fontWeight: "600",
    color: PURPLE,
    flexShrink: 0,
    marginLeft: 12,
  },
  activeCard: {
    borderRadius: 24,
    overflow: "hidden",
    minHeight: 280,
    marginBottom: 14,
    shadowColor: "#1A1A2E",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
  livePill: {
    position: "absolute",
    top: 16,
    left: 16,
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  liveGoldDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#FBBF24",
  },
  livePillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  activeBody: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 18,
    minHeight: 280,
  },
  activeTitle: {
    fontFamily: "DMSerifDisplay_400Regular",
    fontSize: 26,
    color: "#FFFFFF",
    marginBottom: 10,
  },
  metaList: {
    gap: 6,
    marginBottom: 16,
  },
  metaLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
  },
  activeFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  overflowBubble: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginLeft: 4,
  },
  overflowText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  enterRoomBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  enterRoomBtnText: {
    color: NAVY,
    fontSize: 14,
    fontWeight: "700",
  },
  upcomingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F0F0F5",
    shadowColor: "#1A1A2E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  thumbWrap: {
    borderRadius: 14,
    overflow: "hidden",
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  upcomingBody: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 8,
  },
  upcomingTitle: {
    fontFamily: "DMSerifDisplay_400Regular",
    fontSize: 17,
    color: NAVY,
    marginBottom: 2,
  },
  upcomingMeta: {
    fontSize: 13,
    color: MUTED,
  },
  upcomingLocation: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 2,
  },
  upcomingFooter: {
    marginTop: 8,
  },
  goingText: {
    fontSize: 12,
    color: MUTED,
  },
  chevron: {
    marginRight: 4,
  },
  hostCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#F0F0F5",
    gap: 12,
    shadowColor: "#1A1A2E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  hostIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FAF8F3",
    borderWidth: 1,
    borderColor: "#F0EBE0",
    alignItems: "center",
    justifyContent: "center",
  },
  hostPlus: {
    fontSize: 28,
    fontWeight: "300",
    color: "#C9A227",
    marginTop: -2,
  },
  hostTextWrap: {
    flex: 1,
  },
  hostTitle: {
    fontFamily: "DMSerifDisplay_400Regular",
    fontSize: 17,
    color: NAVY,
    marginBottom: 4,
  },
  hostSub: {
    fontSize: 12,
    color: MUTED,
    lineHeight: 17,
  },
  createBtn: {
    backgroundColor: NAVY,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  createBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
