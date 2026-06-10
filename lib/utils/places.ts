export type PlaceSuggestion = {
  id: string;
  label: string;
  subtitle?: string;
};

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    state?: string;
    country?: string;
    osm_id?: number;
  };
};

function formatPhotonPlace(props: PhotonFeature['properties']): string {
  const streetLine = [props.housenumber, props.street].filter(Boolean).join(' ');
  const locality = [props.city, props.state].filter(Boolean).join(', ');

  if (streetLine && locality) {
    return `${streetLine}, ${locality}`;
  }
  if (props.name && locality && props.name !== props.city) {
    return `${props.name}, ${locality}`;
  }
  return locality || props.name || streetLine || '';
}

async function searchPhoton(query: string): Promise<PlaceSuggestion[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6`;
  const response = await fetch(url);
  if (!response.ok) return [];

  const data = (await response.json()) as { features?: PhotonFeature[] };
  const seen = new Set<string>();

  return (data.features ?? []).flatMap((feature, index) => {
    const label = formatPhotonPlace(feature.properties);
    if (!label || seen.has(label)) return [];
    seen.add(label);

    const subtitle = [feature.properties.city, feature.properties.state, feature.properties.country]
      .filter(Boolean)
      .join(', ');

    return [
      {
        id: `${feature.properties.osm_id ?? feature.geometry.coordinates.join(',')}-${index}`,
        label,
        subtitle: subtitle !== label ? subtitle : undefined,
      },
    ];
  });
}

async function searchGooglePlaces(query: string, apiKey: string): Promise<PlaceSuggestion[]> {
  const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
    },
    body: JSON.stringify({ input: query }),
  });

  if (!response.ok) return [];

  const data = (await response.json()) as {
    suggestions?: Array<{
      placePrediction?: {
        placeId: string;
        text?: { text?: string };
        structuredFormat?: {
          mainText?: { text?: string };
          secondaryText?: { text?: string };
        };
      };
    }>;
  };

  return (data.suggestions ?? []).flatMap((suggestion) => {
    const prediction = suggestion.placePrediction;
    const label = prediction?.text?.text;
    if (!prediction?.placeId || !label) return [];

    return [
      {
        id: prediction.placeId,
        label,
        subtitle: prediction.structuredFormat?.secondaryText?.text,
      },
    ];
  });
}

export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const googleKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (googleKey) {
    const googleResults = await searchGooglePlaces(trimmed, googleKey);
    if (googleResults.length > 0) return googleResults;
  }

  return searchPhoton(trimmed);
}
