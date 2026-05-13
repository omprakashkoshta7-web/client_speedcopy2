import { useEffect, useMemo, useRef } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import MapView, { Circle, Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps'
import { deliveryMapStyle } from '../lib/map-style'
import { decodePolyline } from '../lib/polyline'
import type { DeliveryLocationSnapshot, DeliveryTask } from '../lib/api'

type TaskMapProps = {
    task?: DeliveryTask | null
    deviceLocation?: DeliveryLocationSnapshot | null
    focusLocation?: DeliveryLocationSnapshot | null
    compact?: boolean
}

function toMapCoordinate(point?: { lat: number; lng: number } | null) {
    if (!point) return null
    return {
        latitude: point.lat,
        longitude: point.lng,
    }
}

export function TaskMap({
    task = null,
    deviceLocation,
    focusLocation,
    compact = false,
}: TaskMapProps) {
    const mapRef = useRef<MapView | null>(null)
    const pickupCoordinate = toMapCoordinate(task?.pickup?.location || null)
    const dropoffCoordinate = toMapCoordinate(task?.dropoff?.location || null)
    const riderCoordinate = toMapCoordinate(
        focusLocation || deviceLocation || task?.latestLocation || null,
    )

    const routeCoordinates = useMemo(
        () => decodePolyline(task?.route?.polyline),
        [task?.route?.polyline],
    )

    const viewportCoordinates = useMemo(
        () =>
            [pickupCoordinate, dropoffCoordinate, riderCoordinate, ...routeCoordinates].filter(
                Boolean,
            ) as Array<{ latitude: number; longitude: number }>,
        [dropoffCoordinate, pickupCoordinate, riderCoordinate, routeCoordinates],
    )

    useEffect(() => {
        if (!mapRef.current || !viewportCoordinates.length) return
        mapRef.current.fitToCoordinates(viewportCoordinates, {
            animated: true,
            edgePadding: compact
                ? { top: 48, right: 48, bottom: 48, left: 48 }
                : { top: 180, right: 70, bottom: 260, left: 70 },
        })
    }, [compact, viewportCoordinates])

    return (
        <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            customMapStyle={deliveryMapStyle}
            showsCompass={false}
            toolbarEnabled={false}
            showsUserLocation={false}
            showsMyLocationButton={false}
            initialRegion={{
                latitude: riderCoordinate?.latitude || pickupCoordinate?.latitude || 23.8103,
                longitude: riderCoordinate?.longitude || pickupCoordinate?.longitude || 90.4125,
                latitudeDelta: 0.08,
                longitudeDelta: 0.08,
            }}
        >
            {routeCoordinates.length ? (
                <Polyline
                    coordinates={routeCoordinates}
                    strokeColor="#2af0b5"
                    strokeWidth={compact ? 5 : 7}
                    lineCap="round"
                    lineJoin="round"
                />
            ) : null}

            {pickupCoordinate ? (
                <Marker coordinate={pickupCoordinate} title={task?.pickup?.name || 'Pickup'}>
                    <View style={styles.pickupMarkerOuter}>
                        <View style={styles.pickupMarkerInner} />
                    </View>
                </Marker>
            ) : null}

            {dropoffCoordinate ? (
                <Marker coordinate={dropoffCoordinate} title={task?.dropoff?.name || 'Dropoff'}>
                    <View style={styles.dropoffMarkerOuter}>
                        <View style={styles.dropoffMarkerInner} />
                    </View>
                </Marker>
            ) : null}

            {riderCoordinate ? (
                <>
                    <Circle
                        center={riderCoordinate}
                        radius={compact ? 90 : 120}
                        fillColor="rgba(42,240,181,0.18)"
                        strokeColor="rgba(42,240,181,0.32)"
                    />
                    <Marker coordinate={riderCoordinate} anchor={{ x: 0.5, y: 0.5 }}>
                        <View style={styles.riderMarkerOuter}>
                            <View style={styles.riderMarkerInner} />
                        </View>
                    </Marker>
                </>
            ) : null}
        </MapView>
    )
}

const styles = StyleSheet.create({
    pickupMarkerOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#232826',
        borderWidth: 2,
        borderColor: '#2af0b5',
    },
    pickupMarkerInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#2af0b5',
    },
    dropoffMarkerOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        borderWidth: 2,
        borderColor: '#050505',
    },
    dropoffMarkerInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#050505',
    },
    riderMarkerOuter: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2af0b5',
        shadowColor: '#2af0b5',
        shadowOpacity: 0.5,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
    },
    riderMarkerInner: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#2af0b5',
        borderWidth: 4,
        borderColor: '#eafff7',
    },
})

