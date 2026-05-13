import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Animated,
    Easing,
    Pressable,
    ScrollView,
    Text,
    useWindowDimensions,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { DeliveryTask } from '../../../lib/api'
import {
    estimateTaskBonus,
    formatCompletionTime,
    formatDistanceKm,
    formatInr,
    getDeliveredTimestamp,
    getTaskPayout,
    toTaskCode,
    totalTaskItems,
} from '../../../lib/delivery-presentation'
import { useDelivery } from '../../../lib/delivery-context'
import { getDeliveryPalette } from '../../../lib/delivery-theme'
import { useDeliverySessionGuard } from '../../../lib/use-delivery-session-guard'

type DropoffRating = 'up' | 'down' | null

const cardShadow = {
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
}

function RatingButton({
    active,
    icon,
    onPress,
    compact = false,
}: {
    active: boolean
    icon: 'thumbs-up' | 'thumbs-down'
    onPress: () => void
    compact?: boolean
}) {
    return (
        <Pressable
            onPress={onPress}
            className={`items-center justify-center rounded-full border ${
                active
                    ? 'border-[#111827] bg-[#111827]'
                    : 'border-[#d8dde5] bg-white'
            }`}
            style={[
                cardShadow,
                {
                    height: compact ? 50 : 56,
                    width: compact ? 50 : 56,
                },
            ]}
        >
            <Ionicons
                name={icon}
                size={compact ? 20 : 22}
                color={active ? '#ffffff' : '#6b7280'}
            />
        </Pressable>
    )
}

export default function DeliveryCompletedScreen() {
    const params = useLocalSearchParams<{ taskId?: string }>()
    const taskId = Array.isArray(params.taskId) ? params.taskId[0] : params.taskId
    const { bootstrapping, session, completedTasks, refreshTask, themeMode } = useDelivery()
    const palette = getDeliveryPalette(themeMode)
    const hasSession = useDeliverySessionGuard(session, bootstrapping)
    const { width, height } = useWindowDimensions()
    const compact = width < 390
    const shortScreen = height < 760
    const [task, setTask] = useState<DeliveryTask | null>(null)
    const [hydrating, setHydrating] = useState(false)
    const [rating, setRating] = useState<DropoffRating>(null)
    const successScale = useRef(new Animated.Value(0.82)).current
    const successOpacity = useRef(new Animated.Value(0)).current

    useEffect(() => {
        if (!taskId) return

        const cachedTask = completedTasks.find((entry) => entry.id === taskId) || null
        if (cachedTask) {
            setTask(cachedTask)
        }
    }, [completedTasks, taskId])

    useEffect(() => {
        if (!taskId) return
        setHydrating(true)
        void refreshTask(taskId)
            .then((nextTask) => {
                if (nextTask?.status === 'delivered') {
                    setTask(nextTask)
                    return
                }

                setTask(null)
            })
            .finally(() => setHydrating(false))
    }, [refreshTask, taskId])

    useEffect(() => {
        if (!task) return

        successScale.setValue(0.82)
        successOpacity.setValue(0)

        Animated.parallel([
            Animated.timing(successScale, {
                toValue: 1,
                duration: 420,
                easing: Easing.out(Easing.back(1.4)),
                useNativeDriver: true,
            }),
            Animated.timing(successOpacity, {
                toValue: 1,
                duration: 320,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start()
    }, [successOpacity, successScale, task])

    const metrics = useMemo(() => {
        if (!task) return null

        const itemCount = totalTaskItems(task)
        const fallbackBonus = estimateTaskBonus(task.distanceKm, itemCount)
        const earnings = getTaskPayout(task)
        const deliveredAt = getDeliveredTimestamp(task)

        return {
            bonus: task.estimatedPayout ? 0 : fallbackBonus,
            earnings,
            formattedDistance: formatDistanceKm(task.distanceKm),
            formattedTime: formatCompletionTime(deliveredAt),
            orderCode: toTaskCode(task.orderId),
        }
    }, [task])

    if (!hasSession || !session) return null

    if (!taskId || (!task && hydrating)) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-[#f5f7f6]">
                <ActivityIndicator size="large" color={palette.accent} />
            </SafeAreaView>
        )
    }

    if (!task || !metrics) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center px-6" style={{ backgroundColor: palette.background }}>
                <View className="items-center rounded-[28px] px-6 py-8" style={{ ...cardShadow, backgroundColor: palette.card }}>
                    <View className="h-16 w-16 items-center justify-center rounded-full bg-[#e7f8ee]">
                        <Ionicons name="checkmark" size={28} color="#16c45b" />
                    </View>
                    <Text className="mt-5 text-center font-nunito-bold text-[24px]" style={{ color: palette.text }}>
                        Delivery updated
                    </Text>
                    <Text className="mt-2 text-center font-nunito-regular text-[16px] leading-7" style={{ color: palette.textMuted }}>
                        The task was marked delivered, but its summary could not be loaded.
                    </Text>
                    <Pressable
                        onPress={() => router.replace('/')}
                        className="mt-8 h-14 w-full items-center justify-center rounded-[18px]"
                        style={{ backgroundColor: palette.cardStrong }}
                    >
                        <Text className="font-nunito-bold text-[18px]" style={{ color: palette.buttonTextOnDark }}>
                            Go to home
                        </Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: palette.background }}>
            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    flexGrow: 1,
                    paddingHorizontal: compact ? 20 : 24,
                    paddingTop: shortScreen ? 18 : 24,
                    paddingBottom: compact ? 24 : 28,
                }}
                showsVerticalScrollIndicator={false}
            >
                <View className="flex-1 items-center justify-center">
                    <View className="items-center">
                        <Animated.View
                            className="items-center justify-center rounded-full bg-[#15c458]"
                            style={[
                                cardShadow,
                                {
                                    height: compact ? 92 : 112,
                                    width: compact ? 92 : 112,
                                    opacity: successOpacity,
                                    transform: [{ scale: successScale }],
                                },
                            ]}
                        >
                            <View
                                className="items-center justify-center rounded-full border-[6px] border-white/15 bg-[#15c458]"
                                style={{
                                    height: compact ? 68 : 80,
                                    width: compact ? 68 : 80,
                                }}
                            >
                                <Ionicons name="checkmark" size={compact ? 36 : 44} color="#ffffff" />
                            </View>
                        </Animated.View>

                        <Text
                            className="text-center font-nunito-bold"
                            style={{
                                color: palette.text,
                                marginTop: shortScreen ? 24 : 40,
                                fontSize: compact ? 22 : 24,
                            }}
                        >
                            Delivery Completed!
                        </Text>
                        <Text
                            className="mt-3 text-center font-nunito-regular"
                            style={{
                                color: palette.textMuted,
                                maxWidth: compact ? 260 : 280,
                                fontSize: compact ? 15 : 16,
                                lineHeight: compact ? 24 : 28,
                            }}
                        >
                            Great job, rider. The package has been delivered.
                        </Text>
                    </View>

                    <View
                        className="w-full rounded-[26px]"
                        style={[
                            cardShadow,
                            {
                                backgroundColor: palette.card,
                                marginTop: shortScreen ? 24 : 32,
                                paddingHorizontal: compact ? 20 : 24,
                                paddingVertical: compact ? 20 : 24,
                            },
                        ]}
                    >
                        <Text className="text-center font-nunito-semi text-[14px] uppercase tracking-[3px]" style={{ color: palette.text }}>
                            Total Earnings
                        </Text>

                        <View className="mt-4 flex-row items-center justify-center flex-wrap">
                            <Text
                                className="font-nunito-bold"
                                style={{
                                    color: palette.text,
                                    fontSize: compact ? 34 : 42,
                                    lineHeight: compact ? 40 : 48,
                                }}
                            >
                                {formatInr(metrics.earnings)}
                            </Text>
                            {metrics.bonus > 0 ? (
                                <View className="ml-2 mt-2 rounded-full bg-[#e5e7eb] px-3 py-1.5">
                                    <Text className="font-nunito-bold text-[14px] text-[#111827]">
                                        + Bonus
                                    </Text>
                                </View>
                            ) : null}
                        </View>

                        <View className="mt-5 border-t border-[#edf0f3]" />

                        <View className="mt-5 gap-4">
                            <View className="flex-row items-center justify-between">
                                <Text className="font-nunito-regular text-[15px]" style={{ color: palette.textMuted }}>
                                    Order ID
                                </Text>
                                <Text
                                    className="font-nunito-bold text-right"
                                    style={{
                                        color: palette.text,
                                        fontSize: compact ? 15 : 17,
                                        maxWidth: compact ? 170 : 220,
                                    }}
                                >
                                    {metrics.orderCode}
                                </Text>
                            </View>

                            <View className="flex-row items-center justify-between">
                                <Text className="font-nunito-regular text-[15px]" style={{ color: palette.textMuted }}>
                                    Time
                                </Text>
                                <Text
                                    className="font-nunito-bold text-right"
                                    style={{
                                        color: palette.text,
                                        fontSize: compact ? 15 : 17,
                                        maxWidth: compact ? 170 : 220,
                                    }}
                                >
                                    {metrics.formattedTime}
                                </Text>
                            </View>

                            <View className="flex-row items-center justify-between">
                                <Text className="font-nunito-regular text-[15px]" style={{ color: palette.textMuted }}>
                                    Distance
                                </Text>
                                <Text
                                    className="font-nunito-bold text-right"
                                    style={{
                                        color: palette.text,
                                        fontSize: compact ? 15 : 17,
                                        maxWidth: compact ? 170 : 220,
                                    }}
                                >
                                    {metrics.formattedDistance}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View className="items-center" style={{ marginTop: shortScreen ? 28 : 48 }}>
                        <Text
                            className="font-nunito-regular"
                            style={{ color: palette.textSoft, fontSize: compact ? 15 : 16 }}
                        >
                            How was the drop-off?
                        </Text>
                        <View className="mt-5 flex-row gap-5">
                            <RatingButton
                                active={rating === 'up'}
                                icon="thumbs-up"
                                compact={compact}
                                onPress={() => setRating((current) => (current === 'up' ? null : 'up'))}
                            />
                            <RatingButton
                                active={rating === 'down'}
                                icon="thumbs-down"
                                compact={compact}
                                onPress={() =>
                                    setRating((current) => (current === 'down' ? null : 'down'))
                                }
                            />
                        </View>
                    </View>
                </View>

                <Pressable
                    onPress={() => router.replace('/')}
                    className="items-center justify-center rounded-[18px]"
                    style={{
                        backgroundColor: palette.cardStrong,
                        minHeight: compact ? 58 : 64,
                        marginTop: shortScreen ? 28 : 36,
                    }}
                >
                    <Text
                        className="font-nunito-bold"
                        style={{ color: palette.buttonTextOnDark, fontSize: compact ? 18 : 20 }}
                    >
                        Go to home
                    </Text>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    )
}
