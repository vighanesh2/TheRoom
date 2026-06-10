import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, View } from 'react-native';

export function GlassBackground() {
  return (
    <View style={styles.container} pointerEvents="none">
      <LinearGradient
        colors={['#0c0c14', '#14102a', '#1a1238', '#0a0a10']}
        locations={[0, 0.3, 0.65, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.orbLayer}>
        <View style={[styles.orb, styles.orbViolet]} />
        <View style={[styles.orb, styles.orbIndigo]} />
        <View style={[styles.orb, styles.orbRose]} />
      </View>

      <BlurView
        intensity={Platform.OS === 'ios' ? 42 : 28}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />

      <LinearGradient
        colors={['rgba(255,255,255,0.06)', 'transparent', 'rgba(0,0,0,0.2)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#08080e',
  },
  orbLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 9999,
  },
  orbViolet: {
    width: 320,
    height: 320,
    top: -80,
    left: -90,
    backgroundColor: 'rgba(139, 92, 246, 0.45)',
  },
  orbIndigo: {
    width: 280,
    height: 280,
    top: 120,
    right: -100,
    backgroundColor: 'rgba(99, 102, 241, 0.38)',
  },
  orbRose: {
    width: 240,
    height: 240,
    bottom: 180,
    left: 20,
    backgroundColor: 'rgba(236, 72, 153, 0.28)',
  },
});
