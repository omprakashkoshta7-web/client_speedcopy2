import { ActivityIndicator, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { DeliveryAuthScreen } from '../components/delivery/home/DeliveryAuthScreen'
import { DeliveryDashboardScreen } from '../components/delivery/home/DeliveryDashboardScreen'
import { DeliveryKycScreen } from '../components/delivery/home/DeliveryKycScreen'
import { useDelivery } from '../lib/delivery-context'
import { getDeliveryPalette } from '../lib/delivery-theme'

export default function DeliveryHomeScreen() {
    const { bootstrapping, session, kycStatus, themeMode } = useDelivery()
    const palette = getDeliveryPalette(themeMode)

    if (bootstrapping) {
        return (
            <SafeAreaView
                className="flex-1 items-center justify-center"
                style={{ backgroundColor: palette.backgroundMuted }}
            >
                <ActivityIndicator size="large" color={palette.accent} />
                <Text
                    className="mt-4 font-nunito-semi text-base"
                    style={{ color: palette.textMuted }}
                >
                    Reconnecting partner workspace
                </Text>
            </SafeAreaView>
        )
    }

    if (!session) {
        return <DeliveryAuthScreen />
    }

    if (kycStatus === 'unsubmitted' || kycStatus === 'rejected') {
        return <DeliveryKycScreen />
    }

    return <DeliveryDashboardScreen />
}
