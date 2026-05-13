import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { useMemo } from 'react'
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { DeliveryBottomNav, DELIVERY_TAB_BAR_HEIGHT } from '../components/delivery/DeliveryBottomNav'
import { useDelivery } from '../lib/delivery-context'
import { getDeliveryPalette } from '../lib/delivery-theme'
import { useDeliverySessionGuard } from '../lib/use-delivery-session-guard'

type DeliveryPalette = ReturnType<typeof getDeliveryPalette>

function getShadowStyle(palette: DeliveryPalette) {
    return {
        shadowColor: palette.dark ? '#000000' : '#d7dce3',
        shadowOpacity: palette.dark ? 0.22 : 0.16,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 10 },
        elevation: 8,
    }
}

function ProfileStat({
    label,
    value,
    palette,
    valueColor,
    showDivider = false,
    showStar = false,
}: {
    label: string
    value: string
    palette: DeliveryPalette
    valueColor?: string
    showDivider?: boolean
    showStar?: boolean
}) {
    return (
        <View
            className="flex-1 items-center px-2"
            style={showDivider ? { borderRightWidth: 1, borderRightColor: palette.borderSoft } : undefined}
        >
            <Text className="font-nunito-semi text-[13px]" style={{ color: palette.textMuted }}>
                {label}
            </Text>
            <View className="mt-2 flex-row items-center">
                <Text className="font-nunito-bold text-[17px]" style={{ color: valueColor || palette.text }}>
                    {value}
                </Text>
                {showStar ? <Ionicons name="star" size={14} color="#f4b400" style={{ marginLeft: 4 }} /> : null}
            </View>
        </View>
    )
}

function ProfileListRow({
    icon,
    label,
    palette,
    value,
    onPress,
    trailing,
    showChevron = false,
    bordered = true,
}: {
    icon: keyof typeof Ionicons.glyphMap
    label: string
    palette: DeliveryPalette
    value?: string
    onPress?: () => void
    trailing?: React.ReactNode
    showChevron?: boolean
    bordered?: boolean
}) {
    const content = (
        <View
            className="flex-row items-center px-5 py-5"
            style={bordered ? { borderBottomWidth: 1, borderBottomColor: palette.borderSoft } : undefined}
        >
            <Ionicons name={icon} size={22} color={palette.textSoft} />
            <Text className="ml-4 flex-1 font-nunito-bold text-[15px]" style={{ color: palette.text }}>
                {label}
            </Text>

            {trailing ? (
                trailing
            ) : value ? (
                <Text
                    className="max-w-[165px] text-right font-nunito-regular text-[14px]"
                    numberOfLines={1}
                    style={{ color: palette.textMuted }}
                >
                    {value}
                </Text>
            ) : null}

            {showChevron ? (
                <Ionicons name="chevron-forward" size={18} color={palette.textSoft} style={{ marginLeft: 8 }} />
            ) : null}
        </View>
    )

    return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content
}

export default function DeliveryProfileScreen() {
    const {
        bootstrapping,
        session,
        busy,
        currentTask,
        completedTasks,
        error,
        clearError,
        logout,
        isOnline,
        kycStatus,
        kycState,
        themeMode,
        notificationsEnabled,
        language,
        vehicleInfo,
        updateProfile,
        setThemeMode,
        setNotificationsEnabled,
        setLanguage,
    } = useDelivery()

    const palette = getDeliveryPalette(themeMode)
    const hasSession = useDeliverySessionGuard(session, bootstrapping)
    const cardShadow = getShadowStyle(palette)
    const appVersion = Constants.expoConfig?.version ?? '1.0.0'
    const kycLabel =
        kycStatus === 'approved'
            ? 'KYC Approved'
            : kycStatus === 'rejected'
              ? 'KYC Rejected'
              : kycState.submittedAt || session?.user.kycSubmittedAt
                ? 'KYC Pending Review'
                : 'KYC Required'
    const kycAccentColor =
        kycStatus === 'approved'
            ? '#16a34a'
            : kycStatus === 'rejected'
              ? '#dc2626'
              : palette.textMuted
    const kycBadgeBackground =
        kycStatus === 'approved'
            ? '#dcfce7'
            : kycStatus === 'rejected'
              ? '#fee2e2'
              : palette.backgroundMuted

    const profileStats = useMemo(
        () => ({
            rating: '4.8',
            trips: completedTasks.length.toLocaleString('en-IN'),
            status: currentTask || isOnline ? 'Active' : 'Offline',
        }),
        [completedTasks.length, currentTask, isOnline],
    )

    const initials = (session?.user.name || 'R')
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()

    const pickAvatar = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!permission.granted) return

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.55,
            base64: true,
        })

        if (result.canceled || !result.assets?.length) return
        const asset = result.assets[0]
        const avatarUrl = asset.base64
            ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
            : asset.uri

        if (!avatarUrl) return
        await updateProfile({ avatarUrl })
    }

    if (!hasSession || !session) return null

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: palette.background }}>
            <View className="flex-1">
                <ScrollView
                    className="flex-1"
                    contentContainerClassName="px-5 pt-2"
                    contentContainerStyle={{ paddingBottom: DELIVERY_TAB_BAR_HEIGHT + 36 }}
                    showsVerticalScrollIndicator={false}
                >
                    <View className="relative min-h-[44px] items-center justify-center">
                        <Pressable
                            onPress={() => router.replace('/')}
                            className="absolute left-0 h-11 w-11 items-center justify-center rounded-full"
                        >
                            <Ionicons name="chevron-back" size={28} color={palette.text} />
                        </Pressable>
                        <Text className="font-nunito-bold text-[24px]" style={{ color: palette.text }}>
                            Profile
                        </Text>
                    </View>

                    <View className="mt-10 items-center">
                        <View className="relative">
                            <View
                                className="h-32 w-32 items-center justify-center overflow-hidden rounded-[36px]"
                                style={{
                                    backgroundColor: palette.dark ? '#546d67' : '#6f8a82',
                                    ...cardShadow,
                                }}
                            >
                                {session.user.avatarUrl ? (
                                    <Image
                                        source={{ uri: session.user.avatarUrl }}
                                        style={{ height: '100%', width: '100%' }}
                                        contentFit="cover"
                                    />
                                ) : (
                                    <Text className="font-nunito-bold text-[34px]" style={{ color: '#ffffff' }}>
                                        {initials}
                                    </Text>
                                )}
                            </View>

                            <Pressable
                                disabled={busy}
                                onPress={() => void pickAvatar().catch(() => null)}
                                className="absolute bottom-1 right-0 h-11 w-11 items-center justify-center rounded-full border-[3px]"
                                style={{
                                    backgroundColor: '#2387f2',
                                    borderColor: palette.background,
                                    opacity: busy ? 0.7 : 1,
                                }}
                            >
                                <Ionicons name="create-outline" size={18} color="#ffffff" />
                            </Pressable>
                        </View>

                        <Text className="mt-6 font-nunito-bold text-[22px]" style={{ color: palette.text }}>
                            {session.user.name || 'Delivery Partner'}
                        </Text>

                        <View
                            className="mt-3 flex-row items-center rounded-full px-4 py-2"
                            style={{ backgroundColor: kycBadgeBackground }}
                        >
                            <Ionicons
                                name={kycStatus === 'approved' ? 'checkmark-circle' : 'shield-outline'}
                                size={16}
                                color={kycAccentColor}
                            />
                            <Text
                                className="ml-2 font-nunito-bold text-[13px]"
                                style={{ color: kycAccentColor }}
                            >
                                {kycLabel}
                            </Text>
                        </View>
                    </View>

                    <View
                        className="mt-8 flex-row rounded-[24px] px-2 py-5"
                        style={{ backgroundColor: palette.card, ...cardShadow }}
                    >
                        <ProfileStat label="Rating" value={profileStats.rating} palette={palette} showStar showDivider />
                        <ProfileStat label="Trips" value={profileStats.trips} palette={palette} showDivider />
                        <ProfileStat
                            label="Status"
                            value={profileStats.status}
                            palette={palette}
                            valueColor={profileStats.status === 'Active' ? palette.accent : palette.textMuted}
                        />
                    </View>

                    <View className="mt-4 flex-row items-center justify-between px-3">
                        <Text className="font-nunito-bold text-[17px]" style={{ color: palette.text }}>
                            Enable Dark Mode
                        </Text>
                        <Switch
                            value={themeMode === 'dark'}
                            onValueChange={(next) => void setThemeMode(next ? 'dark' : 'light')}
                            trackColor={{ false: '#d7d9de', true: '#2387f2' }}
                            thumbColor="#ffffff"
                        />
                    </View>

                    <Text
                        className="mt-8 px-3 font-nunito-bold text-[13px] uppercase tracking-[1.4px]"
                        style={{ color: palette.textMuted }}
                    >
                        Account Details
                    </Text>

                    <View
                        className="mt-3 overflow-hidden rounded-[22px]"
                        style={{ backgroundColor: palette.card, ...cardShadow }}
                    >
                        <ProfileListRow
                            icon="call-outline"
                            label="Phone Number"
                            value={session.user.phone || 'Not added'}
                            palette={palette}
                        />
                        <ProfileListRow
                            icon="mail-outline"
                            label="Email Address"
                            value={session.user.email || 'No email linked'}
                            palette={palette}
                        />
                        <ProfileListRow
                            icon="bicycle-outline"
                            label="Vehicle Info"
                            value={vehicleInfo || 'Not added'}
                            palette={palette}
                            bordered={false}
                        />
                    </View>

                    <Text
                        className="mt-8 px-3 font-nunito-bold text-[13px] uppercase tracking-[1.4px]"
                        style={{ color: palette.textMuted }}
                    >
                        Settings
                    </Text>

                    <View
                        className="mt-3 overflow-hidden rounded-[22px]"
                        style={{ backgroundColor: palette.card, ...cardShadow }}
                    >
                        <ProfileListRow
                            icon="notifications-outline"
                            label="Notifications"
                            palette={palette}
                            trailing={
                                <Switch
                                    value={notificationsEnabled}
                                    onValueChange={(next) => void setNotificationsEnabled(next).catch(() => null)}
                                    trackColor={{ false: '#d7d9de', true: '#2387f2' }}
                                    thumbColor="#ffffff"
                                />
                            }
                        />
                        <ProfileListRow
                            icon="globe-outline"
                            label="Language"
                            value={language}
                            palette={palette}
                            onPress={() => void setLanguage(language === 'English' ? 'Hindi' : 'English')}
                            showChevron
                        />
                        <ProfileListRow
                            icon="headset-outline"
                            label="Help & Support"
                            palette={palette}
                            onPress={() => router.push('/support')}
                            showChevron
                        />
                        <ProfileListRow
                            icon="trash-outline"
                            label="Delete account"
                            palette={palette}
                            onPress={() =>
                                Alert.alert(
                                    'Delete account',
                                    'Account deletion is not available in the delivery app yet.',
                                )
                            }
                            showChevron
                            bordered={false}
                        />
                    </View>

                    {error ? (
                        <Pressable
                            onPress={clearError}
                            className="mt-5 rounded-[20px] px-4 py-4"
                            style={{ backgroundColor: palette.dangerSoft }}
                        >
                            <Text className="font-nunito-semi text-[13px]" style={{ color: palette.danger }}>
                                {error}
                            </Text>
                        </Pressable>
                    ) : null}

                    <Pressable
                        onPress={() => void logout()}
                        className="mt-8 h-16 flex-row items-center justify-center rounded-[20px]"
                        style={{
                            backgroundColor: palette.dark ? '#301516' : '#fff1ef',
                            opacity: busy ? 0.7 : 1,
                        }}
                    >
                        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                        <Text className="ml-2 font-nunito-bold text-[16px]" style={{ color: '#ef4444' }}>
                            Logout
                        </Text>
                    </Pressable>

                    <Text className="mt-8 text-center font-nunito-regular text-[13px]" style={{ color: palette.textSoft }}>
                        App Version {appVersion}
                    </Text>
                </ScrollView>

                <DeliveryBottomNav themeMode={themeMode} />
            </View>
        </SafeAreaView>
    )
}
