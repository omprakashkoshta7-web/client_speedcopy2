import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BackButton from '../components/BackButton';
import productService, { extractStoresFromResponse, getStoreIdentifier, type StoreQueryParams } from '../services/product.service';
import locationService from '../services/location.service';

// Declare google maps global type
declare global {
  interface Window {
    google: any;
    googleMapsReady: boolean;
  }
}

type DeliveryType = 'Pickup' | 'Delivery';
type Filter = 'All Centers' | 'Open Now' | 'Color Printing' | 'Binding Services' | '24/7 Access';
type PickupLocation = {
  id: string;
  name: string;
  address: string;
  distance: string;
  rating: number;
  reviews: number;
  status: 'open' | 'closed' | 'open247';
  statusLabel: string;
  amenities: string[];
  icon: string;
  estimatedDeliveryTime?: string;
  readyTime?: string;
};

const filters: Filter[] = ['All Centers', 'Open Now', 'Color Printing', 'Binding Services', '24/7 Access'];

const statusColor: Record<string, string> = {
  open: '#16a34a',
  closed: '#6b7280',
  open247: '#16a34a',
};

const isFalseLike = (value: any) =>
  value === false || value === 0 || String(value).toLowerCase() === 'false';

// Only filter out stores that are EXPLICITLY inactive/disabled
// If field is undefined/null, assume store is active (permissive)
const isStoreVisible = (store: any) => {
  // Explicitly false → hide
  if (isFalseLike(store?.is_active)) return false;
  if (isFalseLike(store?.isActive)) return false;

  // Explicitly inactive/disabled/deleted status → hide
  const status = String(store?.status || store?.storeStatus || '').toLowerCase();
  if (['inactive', 'disabled', 'deleted'].includes(status)) return false;

  // Everything else → show (including undefined/null fields)
  return true;
};

const formatVendorAddress = (store: any) => {
  // Shop model (product-service): address is a single string
  if (typeof store?.address === 'string' && store.address.trim()) {
    const parts: string[] = [store.address.trim()];
    const city = store?.city;
    const state = store?.state;
    const pincode = store?.pincode;
    if (city && !store.address.toLowerCase().includes(String(city).toLowerCase())) parts.push(String(city));
    if (state && !store.address.toLowerCase().includes(String(state).toLowerCase())) parts.push(String(state));
    const line = parts.join(', ');
    return pincode && !line.includes(String(pincode)) ? `${line} - ${pincode}` : line;
  }

  // Store model (vendor-service): address is an object { line1, line2, city, state, pincode }
  if (store?.address && typeof store.address === 'object') {
    const a = store.address;
    const parts = [a.line1, a.line2, a.city, a.state]
      .filter(Boolean)
      .map((p: any) => String(p).trim())
      .filter(Boolean);
    const line = [...new Set(parts)].join(', ');
    return a.pincode ? `${line} - ${a.pincode}` : line;
  }

  // Fallback: city + state + pincode
  const city = store?.city;
  const state = store?.state;
  const pincode = store?.pincode || store?.pinCode;
  const fallback = [city, state].filter(Boolean).join(', ');
  return fallback ? (pincode ? `${fallback} - ${pincode}` : fallback) : 'Address not available';
};

const formatDistance = (store: any) => {
  // Vendor API: distance in meters (MongoDB $geoNear)
  const distanceMeters = store?.distance;
  if (typeof distanceMeters === 'number' && distanceMeters > 100) {
    return `${(distanceMeters / 1000).toFixed(1)} km`;
  }
  // Printing API: distance_km (Haversine formula)
  const distanceKm = store?.distance_km ?? store?.distanceKm;
  if (typeof distanceKm === 'number') return `${distanceKm.toFixed(1)} km`;
  // Small number from vendor API (already in km)
  if (typeof distanceMeters === 'number') return `${distanceMeters.toFixed(1)} km`;
  if (typeof distanceMeters === 'string' && distanceMeters.trim()) {
    return distanceMeters.toLowerCase().includes('km') ? distanceMeters : `${distanceMeters} km`;
  }
  return 'Nearby';
};

const mapVendorStoreToLocation = (store: any): PickupLocation => {
  const isActive = isStoreVisible(store);

  // Working hours — vendor uses workingHours, shop uses workingHours or working_hours
  const workingHours = store?.workingHours || store?.working_hours || store?.hours || 'OPEN NOW';

  const status: 'open' | 'closed' | 'open247' = !isActive
    ? 'closed'
    : String(workingHours).includes('24')
      ? 'open247'
      : 'open';

  // ETA — printing API provides eta/estimated_ready_time, vendor API does not
  const estimatedDeliveryTime =
    store?.eta ||
    store?.estimated_ready_time ||
    store?.estimatedDeliveryTime ||
    store?.estimated_delivery_time ||
    store?.readyTime ||
    store?.ready_time ||
    'Ready in 2-4 hrs';

  // Capacity — only vendor API provides this
  const capacity = store?.capacity || null;

  // Supported flows — only vendor API provides this
  const supportedFlows: string[] = Array.isArray(store?.supportedFlows)
    ? store.supportedFlows
    : [];

  return {
    id: getStoreIdentifier(store) || `store-${Date.now()}`,
    name: store?.name || store?.storeName || store?.shopName || store?.businessName || 'SpeedCopy Hub',
    address: formatVendorAddress(store),
    distance: formatDistance(store),
    rating: Number(store?.rating || store?.averageRating) || 4.8,
    reviews: Number(store?.reviews || store?.reviewCount) || 0,
    status,
    statusLabel: status === 'closed' ? 'CLOSED' : String(workingHours),
    amenities: Array.isArray(store?.amenities) && store.amenities.length
      ? store.amenities
      : supportedFlows.length
        ? supportedFlows
        : ['print', 'wifi', 'parking'],
    icon: 'store',
    estimatedDeliveryTime,
    readyTime: estimatedDeliveryTime,
    // Lat/Lng for map markers
    lat: store?.location?.coordinates?.[1] ?? store?.lat ?? store?.latitude ?? null,
    lng: store?.location?.coordinates?.[0] ?? store?.lng ?? store?.longitude ?? null,
    // Extra fields for display
    phone: store?.phone || '',
    email: store?.email || '',
    capacity,
    supportedFlows,
  } as PickupLocation & { phone?: string; email?: string; capacity?: any; supportedFlows?: string[]; lat?: number | null; lng?: number | null };
  };
  // Use the location service for better location detection
  const getCurrentPosition = async () => {
    try {
      const location = await locationService.getLocationWithFallback();
      console.log('[PickupLocation] Location detected via service:', location);
      return { lat: location.lat, lng: location.lng };
    } catch (error: any) {
      console.error('[PickupLocation] Location service failed:', error);
      throw error;
    }
  };

  const LocationIcon: React.FC<{ type: string }> = ({ type }) => {
    if (type === 'print') return (
      <svg className="w-5 h-5" style={{ color: '#6b7280' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
      </svg>
    );
    if (type === 'grid') return (
      <svg className="w-5 h-5" style={{ color: '#6b7280' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    );
    return (
      <svg className="w-5 h-5" style={{ color: '#6b7280' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    );
  };

  const AmenityIcon: React.FC<{ type: string }> = ({ type }) => {
    if (type === 'wifi') return (
      <svg className="w-4 h-4" style={{ color: '#9ca3af' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
      </svg>
    );
    if (type === 'accessible') return (
      <svg className="w-4 h-4" style={{ color: '#9ca3af' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    );
    if (type === 'parking') return (
      <span className="text-xs font-bold" style={{ color: '#9ca3af' }}>P</span>
    );
    return (
      <svg className="w-4 h-4" style={{ color: '#9ca3af' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2" />
      </svg>
    );
  };

  // ── Google Map Component with Nearby Shops ───────────────────────────────
  const MapView: React.FC<{
    lat: number;
    lng: number;
    shops?: PickupLocation[];
    onShopSelect?: (shop: PickupLocation) => void;
  }> = ({ lat, lng, shops = [], onShopSelect }) => {
    const mapDivRef = React.useRef<HTMLDivElement>(null);
    const mapInstanceRef = React.useRef<any>(null);

    React.useEffect(() => {
      const initMap = () => {
        if (!mapDivRef.current || !window.google?.maps) return;

        const userPos = { lat, lng };

        // Create map centered on user
        const mapInstance = new window.google.maps.Map(mapDivRef.current, {
          center: userPos,
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          styles: [
            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }
          ],
        });
        mapInstanceRef.current = mapInstance;

        // ── User location marker (blue dot) ──
        new window.google.maps.Marker({
          position: userPos,
          map: mapInstance,
          title: 'Your Location',
          zIndex: 999,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#4285F4',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          },
        });

        // Accuracy circle around user
        new window.google.maps.Circle({
          map: mapInstance,
          center: userPos,
          radius: 200,
          fillColor: '#4285F4',
          fillOpacity: 0.08,
          strokeColor: '#4285F4',
          strokeOpacity: 0.25,
          strokeWeight: 1,
        });

        // ── Shop markers (red pins) ──
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(userPos);

        shops.forEach((shop) => {
          // Parse lat/lng from shop data
          const shopLat = (shop as any).lat || (shop as any).latitude;
          const shopLng = (shop as any).lng || (shop as any).longitude;
          if (!shopLat || !shopLng) return;

          const shopPos = { lat: Number(shopLat), lng: Number(shopLng) };
          bounds.extend(shopPos);

          const shopMarker = new window.google.maps.Marker({
            position: shopPos,
            map: mapInstance,
            title: shop.name,
            icon: {
              url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
              scaledSize: new window.google.maps.Size(36, 36),
            },
          });

          // Info window for each shop
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="padding:10px; min-width:180px; font-family:sans-serif;">
                <p style="margin:0 0 4px; font-weight:700; font-size:14px; color:#111;">${shop.name}</p>
                <p style="margin:0 0 6px; font-size:12px; color:#666;">${shop.address}</p>
                <p style="margin:0 0 8px; font-size:11px; color:#16a34a; font-weight:600;">
                  ${shop.status === 'open' ? '● Open' : '● Closed'} · ${shop.estimatedDeliveryTime || 'Ready in 2-4 hrs'}
                </p>
                <button
                  id="select-shop-${shop.id}"
                  style="background:#111;color:#fff;border:none;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;width:100%;"
                >
                  Select This Shop
                </button>
              </div>
            `,
          });

          shopMarker.addListener('click', () => {
            infoWindow.open(mapInstance, shopMarker);

            // Listen for button click inside info window
            window.google.maps.event.addListenerOnce(infoWindow, 'domready', () => {
              const btn = document.getElementById(`select-shop-${shop.id}`);
              if (btn) {
                btn.addEventListener('click', () => {
                  infoWindow.close();
                  if (onShopSelect) onShopSelect(shop);
                });
              }
            });
          });
        });

        // Fit map to show all markers
        if (shops.some((s) => (s as any).lat)) {
          mapInstance.fitBounds(bounds, { padding: 60 });
        }
      };

      if (window.google?.maps) {
        initMap();
      } else {
        window.addEventListener('google-maps-ready', initMap);
        return () => window.removeEventListener('google-maps-ready', initMap);
      }
    }, [lat, lng, shops]);

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />
        {/* Legend */}
        <div style={{
          position: 'absolute', bottom: 8, left: 8,
          background: 'white', borderRadius: 8, padding: '6px 10px',
          fontSize: 11, boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column', gap: 4
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4285F4', border: '2px solid white', boxShadow: '0 0 0 1px #4285F4' }} />
            <span style={{ color: '#374151' }}>Your Location</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
            <span style={{ color: '#374151' }}>Nearby Shops ({shops.filter(s => (s as any).lat).length})</span>
          </div>
        </div>
      </div>
    );
  };

  const PickupLocationPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [deliveryType, setDeliveryType] = useState<DeliveryType>('Pickup');
    const [locations, setLocations] = useState<PickupLocation[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState<Filter>('All Centers');

    // Near Me popup state with enhanced functionality
    const [showNearMePopup, setShowNearMePopup] = useState(false);
    const [zipInput, setZipInput] = useState('');
    const [zipSearching, setZipSearching] = useState(false);
    const [zipError, setZipError] = useState('');
    const [locationDetecting, setLocationDetecting] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<{lat: number; lng: number} | null>(null);

    const configId = searchParams.get('configId') || '';
    const printType = searchParams.get('type') || '';

    const loadStores = async (params?: StoreQueryParams) => {
      console.log('[PickupLocation] Loading stores with params:', params);

      const hasLatLng = params?.lat !== undefined && params?.lng !== undefined;
      const hasPincode = !!params?.pincode;

      const promises: Promise<any>[] = [];
      const sources: string[] = [];

      // Vendor API requires lat+lng
      if (hasLatLng) {
        promises.push(productService.getNearbyVendorStores(params));
        sources.push('vendor');
      }

      // Printing API requires lat+lng OR pincode OR q
      if (hasLatLng || hasPincode) {
        promises.push(productService.getPrintingPickupLocations(params));
        sources.push('printing');
      }

      const results = await Promise.allSettled(promises);
      const allStores: any[] = [];

      results.forEach((res, i) => {
        if (res.status === 'fulfilled') {
          console.log(`[PickupLocation] Raw ${sources[i]} response:`, JSON.stringify(res.value)?.slice(0, 500));
          const stores = extractStoresFromResponse(res.value);
          console.log(`[PickupLocation] ${sources[i]} extracted stores:`, stores.length, stores);
          const visible = stores.filter(isStoreVisible);
          console.log(`[PickupLocation] ${sources[i]} visible stores after filter:`, visible.length);
          allStores.push(...visible);
        } else {
          console.error(`[PickupLocation] ${sources[i]} API failed:`, res.reason);
        }
      });

      const seen = new Set<string>();
      const uniqueStores: any[] = [];

      for (const store of allStores) {
        const id = getStoreIdentifier(store);
        if (id && seen.has(id)) continue;
        if (id) seen.add(id);
        uniqueStores.push(store);
      }

      console.log('[PickupLocation] Unique stores after merge:', uniqueStores.length);
      return uniqueStores.map(mapVendorStoreToLocation);
    };
    useEffect(() => {
      fetchLocations();
    }, []);

    // Fetch nearby stores first, then fall back to SpeedCopyHub default.
    const fetchLocations = async () => {
      try {
        setLoading(true);
        console.log('[PickupLocation] Fetching pickup locations');

        let apiStores: PickupLocation[] = [];

        // Try with user's GPS location first
        let userLat = 23.1892;
        let userLng = 79.9296;

        try {
          const pos = await getCurrentPosition();
          userLat = pos.lat;
          userLng = pos.lng;
          console.log('[PickupLocation] User location detected:', userLat, userLng);
        } catch {
          console.log('[PickupLocation] Location unavailable, using default center');
        }

        // Always call API - first with 50km radius, then with global radius if empty
        apiStores = await loadStores({ lat: userLat, lng: userLng, radius: 50, limit: 50 });

        // If no stores found nearby, fetch ALL stores with huge radius
        if (apiStores.length === 0) {
          console.log('[PickupLocation] No nearby stores, fetching all stores globally...');
          apiStores = await loadStores({ lat: userLat, lng: userLng, radius: 20000, limit: 50 });
        }

        setLocations(apiStores);
      } catch (error) {
        console.error('[PickupLocation] Failed to fetch pickup locations:', error);
        setLocations([]);
      } finally {
        setLoading(false);
      }
    };
    const handleSelectCenter = (locationId: string) => {
      const selectedLocation = locations.find((location) => location.id === locationId);
      if (selectedLocation) {
        sessionStorage.setItem(`pickup_location_${locationId}`, JSON.stringify(selectedLocation));
        // Also store the delivery time separately for easy access
        sessionStorage.setItem(`pickup_delivery_time_${locationId}`, selectedLocation.estimatedDeliveryTime || (selectedLocation.statusLabel && selectedLocation.statusLabel !== 'CLOSED' ? `Ready during ${selectedLocation.statusLabel}` : 'Ready during store hours'));
      }

      // Navigate directly to print checkout page with Razorpay payment
      navigate(`/print-checkout?configId=${configId}&type=${printType}&locationId=${locationId}&delivery=pickup`);
    };

    const handleNearMeSearch = async () => {
      const zip = zipInput.trim();
      
      // Validate pincode format (Indian pincode is 6 digits)
      if (!zip) {
        setZipError('Please enter a pincode');
        return;
      }
      
      // Check if input is numeric
      if (!/^\d+$/.test(zip)) {
        setZipError('Pincode should contain only numbers');
        return;
      }
      
      // Check if it's a valid Indian pincode (6 digits)
      if (zip.length !== 6) {
        setZipError('Please enter a valid 6-digit pincode');
        return;
      }

      try {
        setZipSearching(true);
        setZipError('');

        console.log('[PickupLocation] Searching stores for pincode:', zip);

        // Try to use the pincode parameter in the API call
        let mappedStores = await loadStores({
          pincode: zip,
          limit: 50,
        });

        // If API doesn't return results with pincode, try filtering locally
        if (mappedStores.length === 0) {
          console.log('[PickupLocation] No stores from API, trying local filter...');
          
          // Get all stores and filter by pincode
          const allStores = await loadStores({
            lat: 22.9734,
            lng: 78.6569,
            radius: 20000,
            limit: 100,
          });

          // Filter stores by exact pincode match in address
          mappedStores = allStores.filter(store => {
            const storeAddress = String(store.address || '');
            const storePincode = String((store as any).pincode || '');
            
            // Check if pincode matches exactly (not just contains)
            return storePincode === zip || storeAddress.includes(zip);
          });
        }

        if (mappedStores.length > 0) {
          setLocations(mappedStores);
          setShowNearMePopup(false);
          setZipInput('');
          console.log(`[PickupLocation] Found ${mappedStores.length} stores for pincode ${zip}`);
        } else {
          setZipError(`No pickup stores found for pincode ${zip}. Please try another pincode or use current location.`);
        }
      } catch (error) {
        console.error('[PickupLocation] Pincode search error:', error);
        setZipError('Failed to search. Please try again.');
      } finally {
        setZipSearching(false);
      }
    };
    const handleNearMeClick = async () => {
      // Always show popup for better user experience
      setShowNearMePopup(true);
      setZipError('');
      setZipInput('');
      setCurrentLocation(null); // Reset previous location
      
      // Always try to detect fresh location when popup opens
      try {
        setLocationDetecting(true);
        console.log('[Location] Starting fresh location detection...');
        console.log('[Location] Calling getCurrentPosition...');
        
        const position = await getCurrentPosition();
        
        console.log('[Location] Position received:', position);
        setCurrentLocation({ lat: position.lat, lng: position.lng });
        setLocationDetecting(false);
        console.log('[Location] Fresh location detected successfully:', position);
      } catch (error: any) {
        console.error('[Location] Detection error:', error);
        console.error('[Location] Error message:', error.message);
        console.error('[Location] Error stack:', error.stack);
        setLocationDetecting(false);
        // Show error message to user
        if (error.message) {
          setZipError(error.message);
        } else {
          setZipError('Unable to detect location. Please try entering a pincode.');
        }
      }
    };

    const handleUseCurrentLocation = async () => {
      console.log('[PickupLocation] handleUseCurrentLocation called');
      console.log('[PickupLocation] Current location state:', currentLocation);
      
      try {
        setZipSearching(true);
        setZipError('');

        // If location not detected yet, try to detect it now
        let locationToUse = currentLocation;
        if (!locationToUse) {
          console.log('[PickupLocation] No location in state, detecting now...');
          try {
            setLocationDetecting(true);
            const position = await getCurrentPosition();
            locationToUse = { lat: position.lat, lng: position.lng };
            setCurrentLocation(locationToUse);
            setLocationDetecting(false);
            console.log('[PickupLocation] Location detected:', locationToUse);
          } catch (error) {
            console.error('[PickupLocation] Location detection failed:', error);
            setLocationDetecting(false);
            setZipError('Unable to detect your location. Please enable location access in your browser or enter a pincode.');
            setZipSearching(false);
            return;
          }
        } else {
          console.log('[PickupLocation] Using existing location from state:', locationToUse);
        }

      console.log('[PickupLocation] Searching stores near location:', locationToUse);

      let mappedStores = await loadStores({
        lat: locationToUse.lat,
        lng: locationToUse.lng,
        radius: 50,
        limit: 50,
      });

      console.log('[PickupLocation] Stores found:', mappedStores.length);

      if (mappedStores.length === 0) {
        console.warn('[PickupLocation] No nearby stores found, loading all vendor stores');
        mappedStores = await loadStores({ limit: 50 });
        console.log('[PickupLocation] All stores loaded:', mappedStores.length);
      }

      if (mappedStores.length > 0) {
        console.log('[PickupLocation] Setting locations and closing popup');
        setLocations(mappedStores);
        setShowNearMePopup(false);
      } else {
        setZipError('No pickup stores found near your location yet. Please try a pincode.');
      }
    } catch (error) {
      console.error('[PickupLocation] Location search error:', error);
      setZipError('Failed to search near your location. Please try entering a pincode.');
    } finally {
      setZipSearching(false);
    }
  };
  const filtered = locations.filter(l => {
    const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.address.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      activeFilter === 'All Centers' ||
      (activeFilter === 'Open Now' && l.status === 'open') ||
      (activeFilter === '24/7 Access' && l.status === 'open247');
      
    return matchSearch && matchFilter;
  });

  return (
    <>
    <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <BackButton label="Back" className="mb-4" />

        {/* Pickup / Delivery toggle */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center bg-white rounded-full p-1 w-full max-w-sm" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>
            {(['Pickup', 'Delivery'] as DeliveryType[]).map(type => (
              <button key={type} onClick={() => {
                setDeliveryType(type);
                if (type === 'Delivery') navigate(`/service-package?configId=${configId}&type=${printType}`);
              }}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold transition"
                style={{ backgroundColor: deliveryType === type ? '#111111' : 'transparent', color: deliveryType === type ? '#ffffff' : '#6b7280' }}>
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Main card */}
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb' }}>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Select a Pickup Location</h1>
          <p className="text-sm mb-5" style={{ color: '#9ca3af' }}>Choose a convenient SpeedCopy Hub for your printing needs.</p>

          {/* Search + Near Me */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 relative">
              <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Enter city or zip code..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{ border: '1px solid #e5e7eb', backgroundColor: '#fafafa', color: '#374151' }} />
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition hover:bg-gray-50"
              onClick={handleNearMeClick}
              style={{ border: '1px solid #e5e7eb', color: '#374151', backgroundColor: '#fff' }}>
              <svg className="w-4 h-4" style={{ color: '#6b7280' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Near Me
            </button>
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-2 mb-5">
            {filters.map(f => (
              <button key={f} onClick={() => setActiveFilter(f)}
                className="px-4 py-1.5 rounded-full text-xs font-semibold transition"
                style={{
                  backgroundColor: activeFilter === f ? '#111111' : '#f3f4f6',
                  color: activeFilter === f ? '#ffffff' : '#374151',
                }}>
                {f}
              </button>
            ))}
          </div>

          {/* Location list */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse bg-gray-100" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <p className="text-gray-700 font-semibold mb-2">No pickup stores found</p>
              <p className="text-sm text-gray-400 mb-1 max-w-xs mx-auto">
                We could not find active vendor pickup stores for this search.
              </p>
              <p className="text-xs text-gray-400 mb-5 max-w-xs mx-auto">
                Try another pincode or use current location to search again.
              </p>
              <button
                onClick={handleNearMeClick}
                className="px-6 py-2 bg-black text-white rounded-full text-sm font-semibold hover:bg-gray-800 transition"
              >
                Search by Pincode
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((loc) => (
                <div key={loc.id} className="flex items-center gap-4 p-4 rounded-2xl"
                  style={{ border: '1px solid #f3f4f6', backgroundColor: '#fafafa' }}>
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb' }}>
                    <LocationIcon type={loc.icon} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">{loc.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>{loc.address}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {/* Distance */}
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3" style={{ color: '#9ca3af' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        <span className="text-xs" style={{ color: '#9ca3af' }}>{loc.distance}</span>
                      </div>
                      {/* Delivery Time */}
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3" style={{ color: '#16a34a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs font-semibold" style={{ color: '#16a34a' }}>{loc.estimatedDeliveryTime || 'Ready in 2-4 hrs'}</span>
                      </div>
                      {/* Rating */}
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3" style={{ color: '#f59e0b' }} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-xs font-semibold" style={{ color: '#374151' }}>{loc.rating}</span>
                        <span className="text-xs" style={{ color: '#9ca3af' }}>({loc.reviews})</span>
                      </div>
                      {/* Amenities */}
                      <div className="flex items-center gap-1.5">
                        {loc.amenities?.map((a: string) => <AmenityIcon key={a} type={a} />)}
                      </div>
                    </div>
                  </div>

                  {/* Status + Button */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-xs font-bold" style={{ color: statusColor[loc.status] }}>
                      {loc.status !== 'closed' ? '● ' : ''}{loc.statusLabel}
                    </span>
                    {loc.status !== 'closed' && (
                      <button onClick={() => handleSelectCenter(loc.id)}
                        className="flex items-center gap-1.5 px-4 py-2 text-white text-xs font-bold rounded-full hover:bg-gray-700 transition"
                        style={{ backgroundColor: '#111111' }}>
                        Select Center
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Enhanced Near Me Popup with Map Integration */}
    {showNearMePopup && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
        <div className="bg-white rounded-3xl p-6 w-full shadow-2xl" style={{ maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#f0fdf4' }}>
                <svg className="w-6 h-6" style={{ color: '#16a34a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Find Nearby Shops</h3>
                <p className="text-sm" style={{ color: '#9ca3af' }}>Choose your preferred method</p>
              </div>
            </div>
            <button onClick={() => setShowNearMePopup(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Google Map - Live Location with Nearby Shops */}
          <div className="mb-4 rounded-2xl overflow-hidden" style={{ height: '280px', border: '1px solid #e5e7eb' }}>
            {locationDetecting ? (
              <div className="w-full h-full flex flex-col items-center justify-center" style={{ backgroundColor: '#f8fafc' }}>
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-3" />
                <p className="text-sm font-semibold text-gray-600">Detecting your location...</p>
                <p className="text-xs text-gray-400 mt-1">Please allow location access</p>
              </div>
            ) : currentLocation ? (
              <MapView
                lat={currentLocation.lat}
                lng={currentLocation.lng}
                shops={locations}
                onShopSelect={(shop) => {
                  // Store session data and navigate to checkout
                  sessionStorage.setItem(`pickup_location_${shop.id}`, JSON.stringify(shop));
                  sessionStorage.setItem(`pickup_delivery_time_${shop.id}`, shop.estimatedDeliveryTime || 'Ready during store hours');
                  setShowNearMePopup(false);
                  navigate(`/print-checkout?configId=${configId}&type=${printType}&locationId=${shop.id}&delivery=pickup`);
                }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center" style={{ backgroundColor: '#f8fafc' }}>
                <svg className="w-12 h-12 mb-3" style={{ color: '#d1d5db' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-sm text-gray-400">Map will appear after location detection</p>
              </div>
            )}
          </div>

          {/* Current Location Option */}
          <div className="mb-4">
            <div className="flex items-center justify-between p-4 rounded-2xl border-2 border-dashed border-gray-200 hover:border-gray-300 transition">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#eff6ff' }}>
                  <svg className="w-5 h-5" style={{ color: '#3b82f6' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Use Current Location</p>
                  <p className="text-xs" style={{ color: currentLocation ? '#16a34a' : '#9ca3af' }}>
                    {locationDetecting ? 'Detecting your location...' :
                     currentLocation ? `✓ ${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}` : 'Click to detect GPS location'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  console.log('[DEBUG] Use Location button clicked!');
                  handleUseCurrentLocation();
                }}
                disabled={zipSearching || locationDetecting}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-50"
                style={{ 
                  backgroundColor: (zipSearching || locationDetecting) ? '#f3f4f6' : '#3b82f6',
                  color: (zipSearching || locationDetecting) ? '#9ca3af' : '#ffffff'
                }}
              >
                {zipSearching ? 'Searching...' : locationDetecting ? 'Detecting...' : 'Use Location'}
              </button>
            </div>
            {locationDetecting && (
              <div className="flex items-center gap-2 mt-2 px-4">
                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-gray-500">Getting your location...</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs font-semibold text-gray-400">OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Pincode Input */}
          <div className="mb-4">
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Enter Pincode</label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={zipInput}
                onChange={(e) => { 
                  // Only allow numbers and limit to 6 digits
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setZipInput(value); 
                  setZipError(''); 
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleNearMeSearch()}
                placeholder="e.g. 400001, 110001"
                maxLength={6}
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none pr-12"
                style={{
                  border: zipError ? '2px solid #ef4444' : '2px solid #e5e7eb',
                  backgroundColor: '#fafafa',
                  color: '#111111',
                  fontSize: '16px',
                  fontWeight: '500',
                }}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            {zipError && (
              <p className="text-sm mt-2 flex items-center gap-2" style={{ color: '#ef4444' }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {zipError}
              </p>
            )}
          </div>

          <p className="text-xs mb-6" style={{ color: '#9ca3af' }}>
            We'll search for shops added by vendors in your area. If no shops are found, we'll show the nearest available options.
          </p>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowNearMePopup(false)}
              className="flex-1 py-3 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleNearMeSearch}
              disabled={zipSearching || !zipInput.trim()}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#111111' }}
            >
              {zipSearching ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search Pincode
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default PickupLocationPage;
