import type { ExpoConfig } from 'expo/config'

const googleMapsApiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_DEMO_KEY ||
    ''

const config: ExpoConfig = {
    name: 'eshop-delivery-mobile',
    slug: 'eshop-delivery-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    scheme: 'eshopdelivery',
    plugins: ['expo-router'],
    ios: {
        bundleIdentifier: 'com.sachinsen7.eshopdeliverymobile',
        supportsTablet: false,
        config: {
            googleMapsApiKey,
        },
        infoPlist: {
            NSLocationWhenInUseUsageDescription:
                'Live location is used to guide you to pickup and drop-off points and to update customers in real time.',
        },
    },
    android: {
        package: 'com.sachinsen7.eshopdeliverymobile',
        config: {
            googleMaps: {
                apiKey: googleMapsApiKey,
            },
        },
        permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
    },
    extra: {
        eas: {
            projectId: '2babeb17-d03f-40a9-80dc-044176187c92',
        },
    },
}

export default config
