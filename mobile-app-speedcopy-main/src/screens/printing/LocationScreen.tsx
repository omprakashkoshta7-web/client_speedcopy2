import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Search } from 'lucide-react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { PrintStackParamList } from '../../navigation/types';
import { useThemeStore } from '../../store/useThemeStore';
import { useOrderStore } from '../../store/useOrderStore';
import * as productsApi from '../../api/products';
import { loadExpoLocationModule } from '../../utils/addressLocation';
import { resolvePickupEtaLabel } from '../../utils/pickupEta';

type Nav = NativeStackNavigationProp<PrintStackParamList, 'Location'>;
type Route = RouteProp<PrintStackParamList, 'Location'>;

type LocationItem = {
  id: string;
  title: string;
  address: string;
  pincode: string;
  etaLabel: string;
};

const PRINT_TYPE_BY_SUB_SERVICE = {
  standard: 'standard_printing',
  spiral: 'spiral_binding',
  soft: 'soft_binding',
  thesis: 'thesis_binding',
} as const;

function normalizeLocationPayload(payload: any): any[] {
  const pools = [
    payload,
    payload?.stores,
    payload?.locations,
    payload?.items,
    payload?.results,
    payload?.shops,
    payload?.vendors,
    payload?.data,
    payload?.data?.stores,
    payload?.data?.locations,
    payload?.data?.items,
    payload?.data?.results,
    payload?.data?.shops,
  ];

  for (const pool of pools) {
    if (Array.isArray(pool)) return pool;
  }

  return [];
}

export const LocationScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { subService, deliveryMode, servicePackage, pickupEtaLabel } = route.params;
  const { colors: t } = useThemeStore();
  const addresses = useOrderStore((state) => state.addresses);
  const fetchAddresses = useOrderStore((state) => state.fetchAddresses);
  const [query, setQuery] = useState('');
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationSource, setLocationSource] = useState<'nearby' | 'pickup'>('pickup');
  const [deviceCoordinates, setDeviceCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const trimmedQuery = query.trim();
  const isPincodeQuery = /^\d{6}$/.test(trimmedQuery);
  const activePincode = isPincodeQuery ? trimmedQuery : '';
  const hasTypedQuery = trimmedQuery.length > 0;
  const [remotePincode, setRemotePincode] = useState('');
  const backendPrintType = PRINT_TYPE_BY_SUB_SERVICE[subService];
  const primaryAddress = useMemo(
    () => addresses.find((address) => address.isDefault) ?? addresses[0],
    [addresses],
  );
  const nearbyCoordinates = useMemo(() => {
    const lat = Number(primaryAddress?.location?.lat);
    const lng = Number(primaryAddress?.location?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }, [primaryAddress]);
  const effectiveNearbyCoordinates = nearbyCoordinates || deviceCoordinates;

  const mapLocation = useCallback((loc: any): LocationItem | null => {
    const nestedAddress = typeof loc?.address === 'object' && loc?.address ? loc.address : null;
    const nestedLocation = typeof loc?.location === 'object' && loc?.location ? loc.location : null;
    const nestedStore = typeof loc?.store === 'object' && loc?.store ? loc.store : null;
    const id = String(
      loc?._id
      || loc?.id
      || loc?.storeId
      || loc?.shopId
      || nestedStore?._id
      || nestedStore?.id
      || '',
    ).trim();
    if (!id) return null;

    const title = String(
      loc?.name
      || loc?.shopName
      || loc?.storeName
      || loc?.businessName
      || nestedStore?.name
      || nestedStore?.shopName
      || nestedStore?.storeName
      || 'Pickup location',
    ).trim();
    const addressParts = [
      typeof loc?.address === 'string' ? loc.address : '',
      nestedAddress?.line1,
      nestedAddress?.line2,
      nestedAddress?.addressLine,
      nestedLocation?.address,
      nestedLocation?.line1,
      nestedLocation?.line2,
      loc?.addressLine,
      loc?.houseNo,
      loc?.area,
      loc?.locality,
      loc?.landmark,
      nestedAddress?.area,
      nestedAddress?.locality,
      nestedAddress?.landmark,
      loc?.city,
      nestedAddress?.city,
      nestedLocation?.city,
      loc?.state,
      nestedAddress?.state,
      nestedLocation?.state,
    ]
      .map((part) => String(part || '').trim())
      .filter(Boolean);
    const pincode = String(
      loc?.pincode
      || nestedAddress?.pincode
      || nestedLocation?.pincode
      || '',
    ).trim();

    return {
      id,
      title,
      address: [addressParts.join(', '), pincode].filter(Boolean).join(' - '),
      pincode,
      etaLabel: resolvePickupEtaLabel(loc, pickupEtaLabel || ''),
    };
  }, [pickupEtaLabel]);

  useEffect(() => {
    if (!activePincode) {
      setRemotePincode('');
      return undefined;
    }

    const timer = setTimeout(() => {
      setRemotePincode(activePincode);
    }, 250);

    return () => clearTimeout(timer);
  }, [activePincode]);

  useEffect(() => {
    fetchAddresses().catch(() => {});
  }, [fetchAddresses]);

  useEffect(() => {
    let active = true;

    const loadDeviceCoordinates = async () => {
      try {
        const Location = await loadExpoLocationModule();
        if (!Location) {
          if (active) {
            setLocationPermissionDenied(true);
          }
          return;
        }

        const existing = await Location.getForegroundPermissionsAsync();
        let granted = existing.granted;

        if (!granted && existing.canAskAgain) {
          const requested = await Location.requestForegroundPermissionsAsync();
          granted = requested.granted;
        }

        if (!active) return;

        if (!granted) {
          setLocationPermissionDenied(true);
          return;
        }

        setLocationPermissionDenied(false);

        const position =
          await Location.getLastKnownPositionAsync() ||
          await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

        if (!active || !position?.coords) return;

        const lat = Number(position.coords.latitude);
        const lng = Number(position.coords.longitude);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        setDeviceCoordinates({ lat, lng });
      } catch {
        if (active) {
          setDeviceCoordinates(null);
        }
      }
    };

    loadDeviceCoordinates();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadLocations = async () => {
      setLoading(true);
      try {
        const mapLocations = (payload: any) => normalizeLocationPayload(payload)
          .map(mapLocation)
          .filter(Boolean) as LocationItem[];

        const loadPickupLocations = async (params: { pincode?: string; printType?: string }) => {
          const firstPass = await productsApi.getPickupLocations(params);
          const mappedFirstPass = mapLocations(firstPass);
          if (mappedFirstPass.length > 0 || !params.printType) {
            return mappedFirstPass;
          }

          const broaderPass = await productsApi.getPickupLocations({
            pincode: params.pincode,
          });
          return mapLocations(broaderPass);
        };

        if (remotePincode) {
          const mapped = await loadPickupLocations({
            pincode: remotePincode,
            printType: backendPrintType,
          });
          if (!active) return;
          setLocationSource('pickup');
          setLocations(mapped);
          return;
        }

        if (effectiveNearbyCoordinates) {
          try {
            const nearbyStores = await productsApi.getNearbyVendorStores({
              lat: effectiveNearbyCoordinates.lat,
              lng: effectiveNearbyCoordinates.lng,
              radius: 10,
              limit: 20,
            });
            if (!active) return;
            const mappedNearby = mapLocations(nearbyStores);
            if (mappedNearby.length > 0) {
              setLocationSource('nearby');
              setLocations(mappedNearby);
              return;
            }
          } catch {
            // Fall through to printing pickup locations when nearby-store lookup is unavailable.
          }
        }

        const mapped = await loadPickupLocations({
          printType: backendPrintType,
        });
        if (!active) return;
        setLocationSource('pickup');
        setLocations(mapped);
      } catch {
        if (active) setLocations([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadLocations();

    return () => {
      active = false;
    };
  }, [backendPrintType, effectiveNearbyCoordinates, mapLocation, remotePincode]);

  const filtered = useMemo(() => {
    if (!hasTypedQuery) return locations;
    if (!isPincodeQuery) return [];
    return locations.filter((location) => location.pincode === activePincode);
  }, [activePincode, hasTypedQuery, isPincodeQuery, locations, remotePincode]);

  const helperText = (() => {
    if (loading && !hasTypedQuery) {
      return effectiveNearbyCoordinates ? 'Loading nearby stores...' : 'Loading stores...';
    }
    if (!hasTypedQuery) {
      if (locationPermissionDenied && !effectiveNearbyCoordinates && locationSource !== 'nearby') {
        return 'Allow location access or enter a 6-digit pincode to find nearby stores';
      }
      return locationSource === 'nearby'
        ? `${locations.length} nearby store${locations.length === 1 ? '' : 's'} available`
        : `${locations.length} store${locations.length === 1 ? '' : 's'} available`;
    }
    if (!isPincodeQuery) {
      return 'Enter full 6-digit pincode to search stores';
    }
    if (loading) {
      return `Searching stores for ${activePincode}...`;
    }
    return `${filtered.length} store${filtered.length === 1 ? '' : 's'} found for ${activePincode}`;
  })();

  const emptyMessage = (() => {
    if (hasTypedQuery && !isPincodeQuery) {
      return 'Please enter a valid 6-digit pincode to search pickup locations.';
    }
    if (isPincodeQuery) {
      return 'No pickup available for this pincode';
    }
    if (locationPermissionDenied && !effectiveNearbyCoordinates) {
      return 'Location access is off, so nearby stores cannot be loaded right now.';
    }
    return 'No pickup locations available right now.';
  })();

  const onLocationSelect = useCallback((location: LocationItem) => {
    navigation.navigate('StandardPrinting', {
      subService,
      deliveryMode,
      locationId: location.id,
      servicePackage,
      pickupEtaLabel: location.etaLabel || undefined,
      pickupLocationTitle: location.title,
    });
  }, [deliveryMode, navigation, servicePackage, subService]);

  return (
    <SafeScreen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={24} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Location</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search */}
      <View style={[styles.searchRow, { borderBottomColor: t.searchBorder }]}>
        <Search size={18} color={t.placeholder} />
        <TextInput
          style={[styles.searchInput, { color: t.textPrimary }]}
          placeholder="Enter 6-digit pincode"
          placeholderTextColor={t.placeholder}
          value={query}
          onChangeText={setQuery}
          keyboardType="number-pad"
          maxLength={6}
          returnKeyType="search"
        />
      </View>
      <Text style={[styles.helperText, { color: t.textSecondary }]}>{helperText}</Text>

      {/* Location List */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={t.textPrimary} />
          </View>
        )}
        {filtered.map((location) => (
          <TouchableOpacity
            key={location.id}
            style={[
              styles.locationItem,
              { backgroundColor: t.card, borderColor: activePincode && location.pincode === activePincode ? '#0F766E' : t.border },
              activePincode && location.pincode === activePincode ? styles.locationItemActive : null,
            ]}
            activeOpacity={0.7}
            onPress={() => onLocationSelect(location)}
          >
            <View style={styles.locationTopRow}>
              <Text style={[styles.locationTitle, { color: t.textPrimary }]}>{location.title}</Text>
              {location.pincode ? (
                <View style={styles.pincodeBadge}>
                  <Text style={styles.pincodeText}>{location.pincode}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.locationText, { color: t.textSecondary }]}>{location.address}</Text>
            {location.etaLabel ? <Text style={styles.locationEta}>{location.etaLabel}</Text> : null}
          </TouchableOpacity>
        ))}
        {!loading && filtered.length === 0 && (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: t.textSecondary }]}>{emptyMessage}</Text>
          </View>
        )}
      </ScrollView>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    color: '#242424',
    textAlign: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingHorizontal: 2,
    height: 44,
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  helperText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    lineHeight: 18,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#000',
    padding: 0,
    lineHeight: 20,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  scroll: {
    paddingTop: 8,
    paddingBottom: 100,
  },
  loadingWrap: {
    paddingTop: 24,
    alignItems: 'center',
  },
  locationItem: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  locationItemActive: {
    borderColor: '#0F766E',
    shadowColor: '#0F766E',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  locationTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  locationTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  pincodeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#ECFDF5',
  },
  pincodeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    lineHeight: 16,
    color: '#0F766E',
  },
  locationText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  locationEta: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    lineHeight: 18,
    color: '#0F766E',
    marginTop: 6,
  },
  emptyWrap: {
    paddingHorizontal: 16,
    paddingTop: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});





