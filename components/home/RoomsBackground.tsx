import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

export function RoomsBackground() {
  return (
    <View style={styles.container} pointerEvents="none">
      <LinearGradient
        colors={['#F3F0FA', '#F8F7FB', '#F5F4F8', '#EFECF5']}
        locations={[0, 0.35, 0.7, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.blobLavender} />
      <View style={styles.blobWhite} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F5F4F8',
  },
  blobLavender: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    top: -40,
    right: -60,
    backgroundColor: 'rgba(196, 181, 253, 0.35)',
  },
  blobWhite: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    bottom: 200,
    left: -80,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
});
