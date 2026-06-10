import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Dimensions, ImageSourcePropType, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const AVATARS: ImageSourcePropType[] = [
  require('../../assets/images/person1.jpg'),
  require('../../assets/images/person2.jpg'),
  require('../../assets/images/person3.jpg'),
];

const LOGO = require('../../assets/images/TheRoom.png');
const SCREEN_WIDTH = Dimensions.get('window').width;
const LOGO_WIDTH = SCREEN_WIDTH * 0.78;
const AVATAR_SIZE = 58;

const ORBIT_AVATARS = [
  { source: AVATARS[0], zoom: 1.35, style: 'orbitTopLeft', delay: 0, duration: 2600, yRange: 6, xRange: 5 },
  { source: AVATARS[1], zoom: 1, style: 'orbitTopRight', delay: 350, duration: 2900, yRange: 5, xRange: 4 },
  { source: AVATARS[2], zoom: 1, style: 'orbitBottomLeft', delay: 700, duration: 3100, yRange: 7, xRange: 3 },
] as const;

type FloatConfig = {
  delay?: number;
  duration?: number;
  yRange?: number;
  xRange?: number;
};

function AvatarBubble({ source, zoom = 1 }: { source: ImageSourcePropType; zoom?: number }) {
  const size = AVATAR_SIZE * zoom;
  const offset = (size - AVATAR_SIZE) / 2;

  return (
    <View style={[styles.avatarClip, { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }]}>
      <Image
        source={source}
        style={{
          width: size,
          height: size,
          marginLeft: -offset,
          marginTop: -offset,
        }}
        contentFit="cover"
      />
    </View>
  );
}

function FloatingWrap({
  children,
  delay = 0,
  duration = 2800,
  yRange = 7,
  xRange = 4,
}: FloatConfig & { children: React.ReactNode }) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    const easing = Easing.inOut(Easing.sin);

    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-yRange, { duration, easing }),
          withTiming(yRange, { duration, easing })
        ),
        -1,
        true
      )
    );

    translateX.value = withDelay(
      delay + duration * 0.35,
      withRepeat(
        withSequence(
          withTiming(xRange, { duration: duration * 1.15, easing }),
          withTiming(-xRange, { duration: duration * 1.15, easing })
        ),
        -1,
        true
      )
    );
  }, [delay, duration, yRange, xRange, translateX, translateY]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

export function AuthHero() {
  return (
    <View style={styles.container}>
      <View style={styles.heroUnit}>
        <View style={styles.logoWrap}>
          <Image source={LOGO} style={styles.logo} contentFit="cover" contentPosition="center" />
        </View>

        {ORBIT_AVATARS.map((avatar) => (
          <View key={avatar.style} style={[styles.orbitAvatar, styles[avatar.style]]}>
            <FloatingWrap
              delay={avatar.delay}
              duration={avatar.duration}
              yRange={avatar.yRange}
              xRange={avatar.xRange}>
              <AvatarBubble source={avatar.source} zoom={avatar.zoom} />
            </FloatingWrap>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 4,
  },
  heroUnit: {
    width: LOGO_WIDTH,
    height: LOGO_WIDTH * 0.52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    width: LOGO_WIDTH,
    height: LOGO_WIDTH * 0.38,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  logo: {
    width: LOGO_WIDTH * 1.35,
    height: LOGO_WIDTH * 0.52,
    transform: [{ translateX: -14 }],
  },
  orbitAvatar: {
    position: 'absolute',
    zIndex: 3,
  },
  orbitTopLeft: {
    top: 14,
    left: 26,
    zIndex: 4,
  },
  orbitTopRight: {
    top: 48,
    right: 52,
    zIndex: 1,
  },
  orbitBottomLeft: {
    bottom: 18,
    left: 58,
    zIndex: 5,
  },
  avatarClip: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});
