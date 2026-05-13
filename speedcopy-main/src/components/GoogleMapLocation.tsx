import React, { useEffect, useRef, useState } from 'react';

interface GoogleMapLocationProps {
  onLocationDetected?: (lat: number, lng: number) => void;
  showMap?: boolean;
  height?: string;
}

const GoogleMapLocation: React.FC<GoogleMapLocationProps> = ({ 
  onLocationDetected, 
  showMap = true,
  height = '400px' 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerInstanceRef = useRef<google.maps.Marker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Load Google Maps Script
  useEffect(() => {
    const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!GOOGLE_MAPS_API_KEY) {
      setError('Google Maps API key not configured');
      setLoading(false);
      return;
    }

    // Check if script already loaded
    if (window.google && window.google.maps) {
      console.log('[GoogleMap] Google Maps already loaded');
      initMap();
      return;
    }

    // Load Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('[GoogleMap] Google Maps script loaded');
      initMap();
    };
    script.onerror = () => {
      setError('Failed to load Google Maps');
      setLoading(false);
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, []);

  const initMap = () => {
    console.log('[GoogleMap] Initializing map...');
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          console.log('[GoogleMap] Location detected:', pos);
          setLocation(pos);
          setLoading(false);

          // Notify parent component
          if (onLocationDetected) {
            onLocationDetected(pos.lat, pos.lng);
          }

          // Create map if showMap is true
          if (showMap && mapRef.current && window.google) {
            const mapInstance = new google.maps.Map(mapRef.current, {
              center: pos,
              zoom: 15,
              mapTypeControl: true,
              streetViewControl: false,
              fullscreenControl: true,
            });

            // Add marker
            const markerInstance = new google.maps.Marker({
              position: pos,
              map: mapInstance,
              title: 'Your Location',
              animation: google.maps.Animation.DROP,
            });

            // Add info window
            const infoWindow = new google.maps.InfoWindow({
              content: `
                <div style="padding: 10px;">
                  <h3 style="margin: 0 0 5px 0; font-weight: bold;">Your Current Location</h3>
                  <p style="margin: 0; font-size: 12px; color: #666;">
                    Lat: ${pos.lat.toFixed(6)}<br/>
                    Lng: ${pos.lng.toFixed(6)}
                  </p>
                </div>
              `,
            });

            markerInstance.addListener('click', () => {
              infoWindow.open(mapInstance, markerInstance);
            });

            mapInstanceRef.current = mapInstance;
            markerInstanceRef.current = markerInstance;
          }
        },
        (error) => {
          console.error('[GoogleMap] Geolocation error:', error);
          let errorMessage = 'Unable to detect location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location permissions.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
          }
          
          setError(errorMessage);
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        height, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: '12px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 10px'
          }} />
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Detecting your location...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        height, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#fef2f2',
        borderRadius: '12px',
        padding: '20px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <svg 
            style={{ width: '48px', height: '48px', color: '#ef4444', margin: '0 auto 10px' }}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
          <p style={{ color: '#dc2626', fontSize: '14px', fontWeight: '600' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!showMap && location) {
    return (
      <div style={{ 
        padding: '15px', 
        backgroundColor: '#f0fdf4',
        borderRadius: '12px',
        border: '1px solid #86efac'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg 
            style={{ width: '24px', height: '24px', color: '#16a34a' }}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
          <div>
            <p style={{ margin: 0, fontWeight: '600', color: '#166534', fontSize: '14px' }}>
              Location Detected Successfully
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#15803d' }}>
              Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div 
        ref={mapRef} 
        style={{ 
          height, 
          width: '100%',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }} 
      />
      {location && (
        <div style={{ 
          marginTop: '10px', 
          padding: '10px', 
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#6b7280'
        }}>
          <strong>Your Location:</strong> {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
        </div>
      )}
    </div>
  );
};

export default GoogleMapLocation;
