import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, View } from 'react-native';

/** Login backdrop tuned to the logo palette — ambient glow, no logo halo. */
export function AuthGlassBackground() {
  return (
    <View style={styles.container} pointerEvents="none">
      <LinearGradient
        colors={['#040406', '#0a0a10', '#0c0c14', '#060608']}
        locations={[0, 0.35, 0.72, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.glowLayer}>
        <View style={[styles.pool, styles.poolLavender]} />
        <View style={[styles.pool, styles.poolSky]} />
        <View style={[styles.pool, styles.poolMint]} />
        <View style={[styles.pool, styles.poolCreamHalo]} />
      </View>

      <LinearGradient
        colors={[
          'rgba(196, 181, 253, 0.12)',
          'rgba(125, 211, 252, 0.08)',
          'rgba(110, 231, 183, 0.06)',
          'transparent',
        ]}
        locations={[0, 0.35, 0.65, 1]}
        start={{ x: 0, y: 0.2 }}
        end={{ x: 1, y: 0.85 }}
        style={StyleSheet.absoluteFill}
      />

      <BlurView
        intensity={Platform.OS === 'ios' ? 38 : 24}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />

      <LinearGradient
        colors={['rgba(255, 248, 240, 0.04)', 'transparent', 'rgba(0, 0, 0, 0.45)']}
        locations={[0, 0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#050508',
  },
  glowLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  pool: {
    position: 'absolute',
    borderRadius: 9999,
  },
  poolLavender: {
    width: 340,
    height: 340,
    top: -90,
    left: -100,
    backgroundColor: 'rgba(167, 139, 250, 0.32)',
  },
  poolSky: {
    width: 300,
    height: 300,
    top: 100,
    right: -110,
    backgroundColor: 'rgba(125, 211, 252, 0.24)',
  },
  poolMint: {
    width: 260,
    height: 260,
    bottom: 160,
    left: -40,
    backgroundColor: 'rgba(110, 231, 183, 0.18)',
  },
  poolCreamHalo: {
    width: 380,
    height: 200,
    top: '22%',
    left: '50%',
    marginLeft: -190,
    backgroundColor: 'rgba(255, 248, 240, 0.06)',
  },
});
