// Google Maps Geolocation Service
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export interface LocationCoordinates {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface LocationAddress {
  formattedAddress: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

class LocationService {
  /**
   * Get current location using browser's Geolocation API
   * This is the most accurate method as it uses GPS
   */
  async getCurrentPosition(): Promise<LocationCoordinates> {
    console.log('[LocationService] getCurrentPosition called');
    
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        console.error('[LocationService] Geolocation not supported');
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      console.log('[LocationService] Requesting geolocation...');
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('[LocationService] GPS location detected:', {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          console.error('[LocationService] GPS detection failed:', error);
          console.error('[LocationService] Error code:', error.code);
          console.error('[LocationService] Error message:', error.message);
          
          let errorMessage = 'Unable to detect location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location permissions in your browser.';
              console.error('[LocationService] Permission denied by user');
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable. Please try again.';
              console.error('[LocationService] Position unavailable');
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again.';
              console.error('[LocationService] Request timeout');
              break;
          }
          
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true, // Use GPS for better accuracy
          timeout: 10000,
          maximumAge: 0, // Don't use cached location
        }
      );
    });
  }

  /**
   * Get location using Google Maps Geolocation API
   * This uses WiFi and cell tower data when GPS is not available
   */
  async getLocationViaGoogle(): Promise<LocationCoordinates> {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      console.log('[Location] Attempting Google Geolocation API...');
      
      const response = await fetch(
        `https://www.googleapis.com/geolocation/v1/geolocate?key=${GOOGLE_MAPS_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            considerIp: true, // Use IP-based location as fallback
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Google Geolocation API error: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('[Location] Google Geolocation result:', data);

      return {
        lat: data.location.lat,
        lng: data.location.lng,
        accuracy: data.accuracy,
      };
    } catch (error) {
      console.error('[Location] Google Geolocation failed:', error);
      throw error;
    }
  }

  /**
   * Reverse geocode coordinates to get address
   */
  async reverseGeocode(lat: number, lng: number): Promise<LocationAddress> {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        throw new Error('No address found for these coordinates');
      }

      const result = data.results[0];
      const addressComponents = result.address_components;

      // Extract address components
      const getComponent = (type: string) => {
        const component = addressComponents.find((c: any) => c.types.includes(type));
        return component?.long_name || '';
      };

      return {
        formattedAddress: result.formatted_address,
        city: getComponent('locality') || getComponent('administrative_area_level_2'),
        state: getComponent('administrative_area_level_1'),
        country: getComponent('country'),
        postalCode: getComponent('postal_code'),
      };
    } catch (error) {
      console.error('[Location] Reverse geocoding failed:', error);
      throw error;
    }
  }

  /**
   * Get current location with fallback strategies
   * 1. Try browser GPS first (most accurate)
   * 2. Fall back to Google Geolocation API (WiFi/cell tower)
   * 3. Return error if both fail
   */
  async getLocationWithFallback(): Promise<LocationCoordinates> {
    try {
      // Try GPS first
      return await this.getCurrentPosition();
    } catch (gpsError) {
      console.warn('[Location] GPS failed, trying Google Geolocation API...', gpsError);
      
      try {
        // Fall back to Google Geolocation API
        return await this.getLocationViaGoogle();
      } catch (googleError) {
        console.error('[Location] All location methods failed');
        throw new Error('Unable to detect your location. Please enable location access or enter your pincode manually.');
      }
    }
  }

  /**
   * Get current location with address
   */
  async getLocationWithAddress(): Promise<LocationCoordinates & { address?: LocationAddress }> {
    const coords = await this.getLocationWithFallback();
    
    try {
      const address = await this.reverseGeocode(coords.lat, coords.lng);
      return { ...coords, address };
    } catch (error) {
      console.warn('[Location] Could not get address for location');
      return coords;
    }
  }
}

export default new LocationService();
