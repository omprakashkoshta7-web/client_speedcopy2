import 'react-native-gesture-handler'
import '../global.css'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ActivityIndicator, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useEffect } from 'react'
import * as SplashScreen from 'expo-splash-screen'
import * as WebBrowser from 'expo-web-browser'
import {
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    useFonts,
} from '@expo-google-fonts/nunito'
import { DeliveryProvider, useDelivery } from '../lib/delivery-context'
import { getDeliveryPalette } from '../lib/delivery-theme'

void SplashScreen.preventAutoHideAsync()
WebBrowser.maybeCompleteAuthSession()

function DeliveryShell() {
    const { themeMode } = useDelivery()
    const palette = getDeliveryPalette(themeMode)

    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.background }}>
            <Stack
                screenOptions={{
                    headerShown: false,
                    animation: 'fade',
                    animationDuration: 150,
                    gestureEnabled: true,
                    fullScreenGestureEnabled: true,
                }}
            />
            <StatusBar style={palette.statusBar} />
        </GestureHandlerRootView>
    )
}

export default function RootLayout() {
    const [fontsLoaded, fontError] = useFonts({
        Nunito_400Regular,
        Nunito_600SemiBold,
        Nunito_700Bold,
    })

    useEffect(() => {
        if (fontsLoaded || fontError) {
            void SplashScreen.hideAsync()
        }
    }, [fontError, fontsLoaded])

    if (!fontsLoaded && !fontError) {
        return (
            <View
                className="items-center justify-center bg-[#eef4f0]"
                style={{ flex: 1 }}
            >
                <ActivityIndicator size="large" color="#19cf6f" />
            </View>
        )
    }

    return (
        <DeliveryProvider>
            <DeliveryShell />
        </DeliveryProvider>
    )
}

