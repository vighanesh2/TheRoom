import * as Location from 'expo-location';

export type LocationRequestResult =
  | { ok: true; label: string }
  | { ok: false; reason: 'denied' | 'unavailable' | 'unknown' };

function formatAddress(address: Location.LocationGeocodedAddress): string {
  const locality = address.city || address.subregion || address.district;
  const region = address.region;
  const venue =
    address.name && address.name !== locality && address.name !== region
      ? address.name
      : null;

  if (venue && locality) {
    return `${venue}, ${locality}`;
  }
  if (locality && region && locality !== region) {
    return `${locality}, ${region}`;
  }
  return locality || region || venue || 'Current location';
}

export async function getCurrentLocationLabel(): Promise<LocationRequestResult> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { ok: false, reason: 'denied' };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const results = await Location.reverseGeocodeAsync({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });

    const address = results[0];
    if (!address) {
      return { ok: false, reason: 'unavailable' };
    }

    return { ok: true, label: formatAddress(address) };
  } catch {
    return { ok: false, reason: 'unknown' };
  }
}
