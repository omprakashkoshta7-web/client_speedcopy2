export type AddressCoordinates = {
  lat: number;
  lng: number;
};

export type GeocodeAddressInput = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
};

export type AddressSuggestion = {
  id: string;
  title: string;
  subtitle?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  location: AddressCoordinates;
};

type ExpoLocationModule = typeof import('expo-location');

export async function loadExpoLocationModule(): Promise<ExpoLocationModule | null> {
  try {
    return await import('expo-location');
  } catch {
    return null;
  }
}

export async function captureCurrentAddressCoordinates(): Promise<AddressCoordinates | undefined> {
  try {
    const Location = await loadExpoLocationModule();
    if (!Location) return undefined;

    const existing = await Location.getForegroundPermissionsAsync();
    let granted = existing.granted;

    if (!granted && existing.canAskAgain) {
      const requested = await Location.requestForegroundPermissionsAsync();
      granted = requested.granted;
    }

    if (!granted) return undefined;

    const position =
      await Location.getLastKnownPositionAsync() ||
      await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

    const lat = Number(position?.coords?.latitude);
    const lng = Number(position?.coords?.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return undefined;
    }

    return { lat, lng };
  } catch {
    return undefined;
  }
}

export async function geocodeAddressCoordinates(input: GeocodeAddressInput): Promise<AddressCoordinates | undefined> {
  try {
    const Location = await loadExpoLocationModule();
    if (!Location) return undefined;

    const candidateQueries = [
      [input.line1, input.line2, input.city, input.state, input.pincode, 'India'],
      [input.line1, input.city, input.state, input.pincode, 'India'],
      [input.city, input.state, input.pincode, 'India'],
      [input.pincode, input.city, input.state, 'India'],
    ]
      .map((parts) => parts.map((part) => String(part || '').trim()).filter(Boolean).join(', '))
      .filter(Boolean);

    for (const query of candidateQueries) {
      const results = await Location.geocodeAsync(query);
      const first = Array.isArray(results) ? results[0] : null;
      const lat = Number(first?.latitude);
      const lng = Number(first?.longitude);

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng };
      }
    }

    return undefined;
  } catch {
    return undefined;
  }
}

function uniqueCoordinateKey(lat: number, lng: number) {
  return `${lat.toFixed(5)}:${lng.toFixed(5)}`;
}

function formatSuggestionTitle(line1: string, city: string, state: string) {
  return [line1, city, state].filter(Boolean).join(', ');
}

export async function searchAddressSuggestions(input: Partial<GeocodeAddressInput>): Promise<AddressSuggestion[]> {
  try {
    const Location = await loadExpoLocationModule();
    if (!Location) return [];

    const normalizedLine1 = String(input.line1 || '').trim();
    const candidateQueries = [
      [input.line1, input.line2, input.city, input.state, input.pincode, 'India'],
      [input.line1, input.city, input.state, input.pincode, 'India'],
      [input.line1, input.city, input.state, 'India'],
      [input.line1, input.pincode, 'India'],
      [input.line1, 'India'],
    ]
      .map((parts) => parts.map((part) => String(part || '').trim()).filter(Boolean).join(', '))
      .filter((query, index, array) => query.length >= 6 && array.indexOf(query) === index);

    if (!candidateQueries.length) return [];

    const seen = new Set<string>();
    const suggestions: AddressSuggestion[] = [];

    for (const query of candidateQueries) {
      const geocoded = await Location.geocodeAsync(query);
      for (const item of geocoded) {
        const lat = Number(item?.latitude);
        const lng = Number(item?.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

        const key = uniqueCoordinateKey(lat, lng);
        if (seen.has(key)) continue;
        seen.add(key);

        let reverse: any = null;
        try {
          const reversed = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
          reverse = Array.isArray(reversed) ? reversed[0] : null;
        } catch {
          reverse = null;
        }

        const line1 = String(
          reverse?.name
          || reverse?.street
          || reverse?.district
          || input.line1
          || '',
        ).trim();
        const line2 = String(
          reverse?.streetNumber
          || reverse?.subregion
          || input.line2
          || '',
        ).trim() || undefined;
        const city = String(
          reverse?.city
          || reverse?.subregion
          || reverse?.district
          || input.city
          || '',
        ).trim();
        const state = String(reverse?.region || input.state || '').trim();
        const pincode = String(reverse?.postalCode || input.pincode || '').trim();
        const lowerTitle = `${line1} ${city} ${state}`.toLowerCase();

        if (normalizedLine1 && !lowerTitle.includes(normalizedLine1.toLowerCase())) {
          continue;
        }

        suggestions.push({
          id: key,
          title: formatSuggestionTitle(line1 || query, city, state) || query,
          subtitle: [line2, pincode].filter(Boolean).join(', ') || undefined,
          line1: line1 || String(input.line1 || '').trim(),
          line2,
          city,
          state,
          pincode,
          location: { lat, lng },
        });

        if (suggestions.length >= 4) {
          return suggestions;
        }
      }
    }

    return suggestions;
  } catch {
    return [];
  }
}
