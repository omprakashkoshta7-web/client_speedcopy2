import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import {
    ActivityIndicator,
    Linking,
    Pressable,
    ScrollView,
    Text,
    useWindowDimensions,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TaskMap } from '../../../components/TaskMap'
import { useDelivery } from '../../../lib/delivery-context'
import { resolveTaskDestination } from '../../../lib/delivery-presentation'
import { useDeliverySessionGuard } from '../../../lib/use-delivery-session-guard'

function metersLabel(distanceMeters?: number) {
    const value = Number(distanceMeters || 0)
    if (!value) return 'Route active'
    if (value >= 1000) {
        return `${(value / 1000).toFixed(1)} km`
    }
    return `${Math.round(value)} m`
}

export default function NavigationTaskScreen() {
    const params = useLocalSearchParams<{ taskId?: string }>()
    const taskId = Array.isArray(params.taskId) ? params.taskId[0] : params.taskId
    const { bootstrapping, session, busy, currentTask, deviceLocation, submitDeliveryProof, refreshTask } =
        useDelivery()
    const hasSession = useDeliverySessionGuard(session, bootstrapping)
    const { width, height } = useWindowDimensions()
    const compact = width < 390
    const shortScreen = height < 760
    const [hydrating, setHydrating] = useState(false)
    const [deliveryCompleting, setDeliveryCompleting] = useState(false)
    const [frozenTask, setFrozenTask] = useState<typeof currentTask | null>(null)

    useEffect(() => {
        if (!taskId) return
        if (currentTask?.id === taskId) return

        setHydrating(true)
        void refreshTask(taskId).finally(() => setHydrating(false))
    }, [currentTask?.id, refreshTask, taskId])

    useEffect(() => {
        if (currentTask?.id === taskId) {
            setFrozenTask(currentTask)
        }
    }, [currentTask, taskId])

    const task = currentTask?.id === taskId ? currentTask : deliveryCompleting ? frozenTask : null

    const destination = useMemo(() => {
        if (!task) return null
        return resolveTaskDestination(task)
    }, [task])

    if (!hasSession || !session) return null

    if (!taskId || (!task && hydrating)) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-[#050505]">
                <ActivityIndicator size="large" color="#1ce96e" />
            </SafeAreaView>
        )
    }

    if ((!task || !destination) && !deliveryCompleting) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-[#050505] px-6">
                <Text className="text-center font-nunito-bold text-xl text-white">
                    No active navigation task found.
                </Text>
                <Pressable
                    onPress={() => router.replace('/')}
                    className="mt-5 rounded-[22px] bg-white px-6 py-4"
                >
                    <Text className="font-nunito-bold text-base text-[#111713]">Back to Home</Text>
                </Pressable>
            </SafeAreaView>
        )
    }

    if (!task || !destination) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-[#050505]">
                <ActivityIndicator size="large" color="#1ce96e" />
            </SafeAreaView>
        )
    }

    const nextInstruction = task.route?.nextInstruction || `Continue to ${destination.name}`
    const instructionDistance = metersLabel(task.route?.nextInstructionDistanceMeters)
    const destinationPhone = destination.contactPhone || task.dropoff.contactPhone
    const mapsDestinationLocation = task.destinationLocation || destination.location
    const resolvedAddressLine = task.destinationAddressLine || destination.addressLine
    const mapsDestination = mapsDestinationLocation
        ? `${mapsDestinationLocation.lat},${mapsDestinationLocation.lng}`
        : resolvedAddressLine
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapsDestination)}&travelmode=driving`
    const navigationLabel =
        (task.destinationType || task.route?.destinationType) === 'pickup' ? 'Start Pickup Navigation' : 'Start Delivery Navigation'
    const etaLabel = `${task.etaMinutes || 0} mins`
    const distanceLabel = `${task.distanceKm || 0} km`
    const metricFontSize = Math.max(24, Math.min(34, compact ? 28 : 34))
    const bottomSheetMaxHeight = Math.min(Math.max(height * 0.56, 360), 520)

    return (
        <SafeAreaView className="flex-1 bg-[#07140d]">
            <View className="absolute inset-0">
                <TaskMap task={task} deviceLocation={deviceLocation} />
            </View>

            <View className="flex-1 px-2">
                <View
                    className="bg-white px-4 py-4"
                    style={{
                        marginHorizontal: compact ? 10 : 16,
                        marginTop: shortScreen ? 16 : 24,
                        borderRadius: 10,
                    }}
                >
                    <Text className="font-nunito-bold text-xs uppercase tracking-[3px] text-[#111713]">
                        Next Turn
                    </Text>
                    <View className="mt-3 flex-row items-center justify-between">
                        <View className="mr-4 flex-1 flex-row items-start">
                            <View
                                className="mt-1 items-center justify-center rounded-2xl bg-[#050505]"
                                style={{ height: compact ? 44 : 48, width: compact ? 44 : 48 }}
                            >
                                <Ionicons name="return-up-forward" size={compact ? 20 : 22} color="#ffffff" />
                            </View>
                            <View className="ml-4 flex-1">
                                <Text
                                    className="font-nunito-bold text-[#6d6d6d]"
                                    style={{ fontSize: compact ? 22 : 26 }}
                                >
                                    {instructionDistance}
                                </Text>
                                <Text
                                    className="mt-1 font-nunito-bold text-[#6d6d6d]"
                                    style={{
                                        fontSize: compact ? 16 : 18,
                                        lineHeight: compact ? 24 : 28,
                                    }}
                                >
                                    {nextInstruction}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View className="mt-5 mr-2 ml-auto gap-3">
                    <Pressable
                        onPress={() => {
                            if (!destinationPhone) return
                            void Linking.openURL(`tel:${destinationPhone}`)
                        }}
                        className="items-center justify-center rounded-[22px] bg-[#1a4331]"
                        style={{ height: compact ? 58 : 64, width: compact ? 58 : 64 }}
                    >
                        <Ionicons name="call" size={22} color="#1ce96e" />
                    </Pressable>

                    <Pressable
                        onPress={() => {
                            void Linking.openURL(mapsUrl)
                        }}
                        className="items-center justify-center rounded-[22px] bg-[#183423]"
                        style={{ height: compact ? 58 : 64, width: compact ? 58 : 64 }}
                    >
                        <Ionicons name="locate" size={22} color="#ffffff" />
                    </Pressable>
                </View>

                <View
                    className="mt-auto rounded-t-[10px] bg-[#050505]"
                    style={{ maxHeight: bottomSheetMaxHeight }}
                >
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{
                            paddingHorizontal: compact ? 14 : 16,
                            paddingTop: 14,
                            paddingBottom: 24,
                        }}
                    >
                        <View className="self-center h-1.5 w-16 rounded-full bg-white/20" />

                        <View className="mt-5 flex-row">
                            <View className="flex-1 border-r border-white/10 pr-3">
                                <Text className="font-nunito-semi text-xs uppercase tracking-[3px] text-[#7f8b85]">
                                    ETA
                                </Text>
                                <Text
                                    className="mt-2 font-nunito-bold text-white"
                                    style={{ fontSize: etaLabel.length > 9 ? metricFontSize - 4 : metricFontSize }}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.72}
                                >
                                    {etaLabel}
                                </Text>
                            </View>

                            <View className="flex-1 pl-3">
                                <Text className="font-nunito-semi text-xs uppercase tracking-[3px] text-[#7f8b85]">
                                    Distance
                                </Text>
                                <Text
                                    className="mt-2 font-nunito-bold text-white"
                                    style={{ fontSize: distanceLabel.length > 9 ? metricFontSize - 4 : metricFontSize }}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.72}
                                >
                                    {distanceLabel}
                                </Text>
                            </View>
                        </View>

                        <View className="mt-6 rounded-[24px] bg-white/14 px-4 py-4">
                            <View className="flex-row items-start">
                                <Ionicons name="location" size={20} color="#1ce96e" />
                                <View className="ml-3 flex-1 pr-2">
                                    <Text className="font-nunito-semi text-sm text-[#d9e5de]">
                                        {(task.destinationType || task.route?.destinationType) === 'pickup' ? 'Pickup Address' : 'Drop-off Address'}
                                    </Text>
                                    <Text
                                        className="mt-1 font-nunito-bold text-white"
                                        style={{
                                            fontSize: compact ? 18 : 20,
                                            lineHeight: compact ? 28 : 32,
                                        }}
                                    >
                                        {resolvedAddressLine}
                                    </Text>
                                    {!!destination.note ? (
                                        <Text className="mt-2 font-nunito-regular text-sm leading-6 text-[#b5c1bb]">
                                            {destination.note}
                                        </Text>
                                    ) : null}
                                </View>
                                <Pressable
                                    onPress={() =>
                                        void Linking.openURL(
                                            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(resolvedAddressLine)}`,
                                        )
                                    }
                                    className="items-center justify-center rounded-2xl bg-white/10"
                                    style={{ height: compact ? 42 : 44, width: compact ? 42 : 44 }}
                                >
                                    <Ionicons name="copy-outline" size={compact ? 18 : 20} color="#1ce96e" />
                                </Pressable>
                            </View>
                        </View>

                        <Pressable
                            onPress={() => {
                                void Linking.openURL(mapsUrl)
                            }}
                            className="mt-6 items-center justify-center rounded-[10px] bg-[#1ce96e]"
                            style={{ minHeight: compact ? 56 : 64, paddingHorizontal: 14 }}
                        >
                            <View className="flex-row items-center justify-center">
                                <Ionicons name="navigate" size={compact ? 18 : 20} color="#111713" />
                                <Text
                                    className="ml-3 font-nunito-bold text-[#111713]"
                                    style={{ fontSize: compact ? 16 : 18 }}
                                >
                                    {navigationLabel}
                                </Text>
                            </View>
                        </Pressable>

                        <Text className="mt-4 text-center font-nunito-semi text-sm uppercase tracking-[2px] text-[#7f8b85]">
                            Opens turn-by-turn directions in Google Maps
                        </Text>

                        <Pressable
                            disabled={busy}
                            onPress={() => {
                                setDeliveryCompleting(true)
                                void submitDeliveryProof(task.id, { notes: 'Delivered from rider app' })
                                    .then(() => router.replace(`/task/${task.id}/completed`))
                                    .catch(() => setDeliveryCompleting(false))
                            }}
                            className="mt-5 items-center justify-center rounded-[10px] bg-white"
                            style={{
                                minHeight: compact ? 56 : 64,
                                opacity: busy ? 0.72 : 1,
                            }}
                        >
                            {busy ? (
                                <ActivityIndicator color="#111713" />
                            ) : (
                                <Text className="font-nunito-bold text-[18px] text-[#111713]">
                                    Mark As Delivered
                                </Text>
                            )}
                        </Pressable>

                        <View className="mt-5 flex-row gap-3">
                            <Pressable
                                onPress={() => {
                                    if (!destinationPhone) return
                                    void Linking.openURL(`tel:${destinationPhone}`)
                                }}
                                className="flex-1 flex-row items-center justify-center rounded-[10px] border border-white bg-transparent px-3"
                                style={{ minHeight: compact ? 52 : 56 }}
                            >
                                <Ionicons name="call-outline" size={18} color="#ffffff" />
                                <Text className="ml-2 font-nunito-bold text-[16px] text-white">Call</Text>
                            </Pressable>

                            <Pressable
                                onPress={() => router.push(`/support?taskId=${task.id}`)}
                                className="flex-1 flex-row items-center justify-center rounded-[10px] border border-white bg-transparent px-3"
                                style={{ minHeight: compact ? 52 : 56 }}
                            >
                                <Ionicons name="information-circle-outline" color="#ffffff" size={22} />
                                <Text className="ml-2 font-nunito-bold text-[16px] text-white">Support</Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </SafeAreaView>
    )
}
