import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SwipeWheel } from '../../SwipeWheel'
import { DeliveryBottomNav, DELIVERY_TAB_BAR_HEIGHT } from '../DeliveryBottomNav'
import { useDelivery } from '../../../lib/delivery-context'
import {
    formatCurrency,
    toTitle,
} from '../../../lib/delivery-home'
import {
    formatDistanceKm,
    getTaskOrderValue,
    getTaskPayout,
    resolveTaskDestination,
    totalTaskItems,
    toTaskCode,
} from '../../../lib/delivery-presentation'
import { getDeliveryPalette } from '../../../lib/delivery-theme'

const shadow = {
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
}

function urgency(etaMinutes: number, instructions: string) {
    if (etaMinutes > 0 && etaMinutes <= 5) return { text: 'High urgency', color: 'danger' as const }
    if (/fragile|priority|urgent|express/i.test(instructions)) {
        return { text: 'Priority pickup', color: 'accent' as const }
    }
    return { text: 'Pickup ready', color: 'muted' as const }
}

function activePath(taskId: string, status: string) {
    if (status === 'assigned' || status === 'arrived_pickup') {
        return `/task/${taskId}/pickup`
    }
    return `/task/${taskId}/navigate`
}

export function DeliveryDashboardScreen() {
    const {
        busy,
        refreshing,
        session,
        currentTask,
        availableTasks,
        dashboardStats,
        socketConnected,
        locationPermission,
        error,
        isOnline,
        themeMode,
        refreshDashboard,
        setOnlineAvailability,
        clearError,
        acceptTask,
    } = useDelivery()

    const palette = getDeliveryPalette(themeMode)
    const [acceptingTaskId, setAcceptingTaskId] = useState<string | null>(null)

    const topTasks = useMemo(() => availableTasks.slice(0, 3), [availableTasks])

    const currentLabel = useMemo(() => {
        if (!currentTask) return 'Ready for the next run'
        if (currentTask.status === 'assigned') return 'Drive to pickup'
        if (currentTask.status === 'arrived_pickup') return 'Confirm the pickup'
        if (currentTask.status === 'picked' || currentTask.status === 'out_for_delivery') {
            return 'Deliver to customer'
        }
        if (currentTask.status === 'sos') return 'SOS active'
        return toTitle(currentTask.status)
    }, [currentTask])

    if (!session) return null

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: palette.background }}>
            <View className="flex-1">
                <ScrollView
                    className="flex-1"
                    contentContainerClassName="px-5 pt-4"
                    contentContainerStyle={{ paddingBottom: DELIVERY_TAB_BAR_HEIGHT + 28 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => void refreshDashboard()}
                        />
                    }
                >
                    <View className="mt-3 flex-row items-center justify-between">
                        <View className="flex-row items-center">
                            <View
                                className="h-14 w-14 items-center justify-center rounded-full border-[3px]"
                                style={{ borderColor: palette.accentSoft, backgroundColor: palette.card }}
                            >
                                <Text className="font-nunito-bold text-[16px]" style={{ color: palette.text }}>
                                    {(session.user.name || 'R')
                                        .split(' ')
                                        .map((part) => part[0])
                                        .join('')
                                        .slice(0, 2)
                                        .toUpperCase()}
                                </Text>
                            </View>
                            <View className="ml-3">
                                <Text className="font-nunito-semi text-[12px] uppercase tracking-[1.5px]" style={{ color: palette.textSoft }}>
                                    Welcome back,
                                </Text>
                                <Text className="mt-1 font-nunito-bold text-[20px]" style={{ color: palette.text }}>
                                    {session.user.name || 'Delivery Partner'}
                                </Text>
                            </View>
                        </View>

                        <Pressable
                            onPress={() => router.replace('/profile')}
                            className="h-12 w-12 items-center justify-center rounded-[8px]"
                            style={{ backgroundColor: palette.card, ...shadow }}
                        >
                            <Ionicons name="settings-outline" size={20} color={palette.text} />
                        </Pressable>
                    </View>

                    <View className="mt-6">
                        <SwipeWheel
                            value={isOnline}
                            disabled={Boolean(currentTask)}
                            onChange={setOnlineAvailability}
                        />
                    </View>

                    <View className="mt-6 flex-row items-end justify-between">
                        <View>
                            <Text className="font-nunito-semi text-[12px] uppercase tracking-[1.5px]" style={{ color: palette.textSoft }}>
                                Daily performance
                            </Text>
                            <Text className="mt-1 font-nunito-bold text-[30px]" style={{ color: palette.text }}>
                                Today&apos;s Hub
                            </Text>
                        </View>
                        <View className="items-end">
                            <Text className="font-nunito-semi text-[12px] uppercase tracking-[1.5px]" style={{ color: palette.textSoft }}>
                                Status
                            </Text>
                            <Text className="mt-1 font-nunito-bold text-[19px]" style={{ color: currentTask || isOnline ? palette.accent : palette.textMuted }}>
                                {currentTask ? 'Active Shift' : isOnline ? 'Online' : 'Offline'}
                            </Text>
                        </View>
                    </View>

                    <View className="mt-4 flex-row gap-3">
                        <View className="flex-1 rounded-[8px] px-4 py-4" style={{ backgroundColor: palette.card, ...shadow }}>
                            <Text className="font-nunito-semi text-[12px] uppercase tracking-[1.5px]" style={{ color: palette.textSoft }}>
                                Total earnings
                            </Text>
                            <Text className="mt-4 font-nunito-bold text-[26px]" style={{ color: palette.text }}>
                                {formatCurrency(dashboardStats.totalEarnings)}
                            </Text>
                        </View>
                        <View className="flex-1 rounded-[8px] border-l-[4px] px-4 py-4" style={{ backgroundColor: palette.card, borderLeftColor: palette.accent, ...shadow }}>
                            <Text className="font-nunito-semi text-[12px] uppercase tracking-[1.5px]" style={{ color: palette.textSoft }}>
                                Tasks done
                            </Text>
                            <Text className="mt-4 font-nunito-bold text-[26px]" style={{ color: palette.text }}>
                                {dashboardStats.tasksDone}
                            </Text>
                        </View>
                    </View>

                    {error ? (
                        <Pressable
                            onPress={clearError}
                            className="mt-4 rounded-[8px] px-4 py-4"
                            style={{ backgroundColor: palette.dangerSoft }}
                        >
                            <Text className="font-nunito-semi text-[13px]" style={{ color: palette.danger }}>
                                {error}
                            </Text>
                        </Pressable>
                    ) : null}

                    {currentTask ? (
                        <View className="mt-6 rounded-[8px] px-5 py-5" style={{ backgroundColor: palette.card, ...shadow }}>
                            <View className="flex-row items-start justify-between">
                                <View className="flex-1 pr-4">
                                    <Text className="font-nunito-semi text-[12px] uppercase tracking-[1.5px]" style={{ color: palette.textSoft }}>
                                        Current mission
                                    </Text>
                                    <Text className="mt-2 font-nunito-bold text-[24px]" style={{ color: palette.text }}>
                                        {currentLabel}
                                    </Text>
                                    <Text className="mt-2 font-nunito-regular text-[14px] leading-6" style={{ color: palette.textMuted }}>
                                        {resolveTaskDestination(currentTask).addressLine}
                                    </Text>
                                </View>
                                <View className="rounded-full px-3 py-2" style={{ backgroundColor: palette.accentSoft }}>
                                    <Text className="font-nunito-bold text-[12px]" style={{ color: palette.accent }}>
                                        {toTitle(currentTask.status)}
                                    </Text>
                                </View>
                            </View>

                            <View className="mt-5 flex-row gap-3">
                                <View className="flex-1 rounded-[8px] px-4 py-4" style={{ backgroundColor: palette.backgroundMuted }}>
                                    <Text className="font-nunito-semi text-[12px]" style={{ color: palette.textSoft }}>
                                        Order
                                    </Text>
                                    <Text className="mt-2 font-nunito-bold text-[20px]" style={{ color: palette.text }}>
                                        {toTaskCode(currentTask.orderId)}
                                    </Text>
                                </View>
                                <View className="flex-1 rounded-[8px] px-4 py-4" style={{ backgroundColor: palette.backgroundMuted }}>
                                    <Text className="font-nunito-semi text-[12px]" style={{ color: palette.textSoft }}>
                                        ETA
                                    </Text>
                                    <Text className="mt-2 font-nunito-bold text-[20px]" style={{ color: palette.text }}>
                                        {currentTask.etaMinutes || 0} min
                                    </Text>
                                </View>
                            </View>

                            <Pressable
                                className="mt-5 h-14 items-center justify-center rounded-[8px]"
                                style={{ backgroundColor: palette.cardStrong }}
                                onPress={() => router.push(activePath(currentTask.id, currentTask.status))}
                            >
                                <Text className="font-nunito-bold text-[15px]" style={{ color: palette.buttonTextOnDark }}>
                                    Continue task
                                </Text>
                            </Pressable>
                        </View>
                    ) : null}

                    <View className="mt-6 flex-row items-center justify-between">
                        <Text className="font-nunito-bold text-[26px]" style={{ color: palette.text }}>
                            Available Tasks
                        </Text>
                        <View className="rounded-full px-4 py-2" style={{ backgroundColor: palette.accentSoft }}>
                            <Text className="font-nunito-bold text-[13px]" style={{ color: palette.accent }}>
                                {isOnline ? availableTasks.length : 0} nearby
                            </Text>
                        </View>
                    </View>

                    {!isOnline && !currentTask ? (
                        <View className="mt-4 rounded-[8px] px-5 py-5" style={{ backgroundColor: palette.card, ...shadow }}>
                            <Text className="font-nunito-bold text-[20px]" style={{ color: palette.text }}>
                                Go online to start receiving tasks
                            </Text>
                            <Text className="mt-2 font-nunito-regular text-[14px] leading-6" style={{ color: palette.textMuted }}>
                                Nearby pickups, payout estimates, and route ETAs will show up here once your shift is live.
                            </Text>
                        </View>
                    ) : null}

                    {!topTasks.length && isOnline && !currentTask ? (
                        <View className="mt-4 rounded-[8px] px-5 py-5" style={{ backgroundColor: palette.card, ...shadow }}>
                            <Text className="font-nunito-bold text-[20px]" style={{ color: palette.text }}>
                                Dispatch is searching nearby
                            </Text>
                            <Text className="mt-2 font-nunito-regular text-[14px] leading-6" style={{ color: palette.textMuted }}>
                                Keep the app open. New delivery offers will refresh here automatically as soon as they are available.
                            </Text>
                        </View>
                    ) : null}

                    {isOnline && !currentTask ? topTasks.map((task) => {
                        const tone = urgency(task.etaMinutes, task.specialInstructions)
                        const toneColor =
                            tone.color === 'danger'
                                ? palette.danger
                                : tone.color === 'accent'
                                  ? palette.accent
                                  : palette.textSoft

                        return (
                            <View
                                key={task.id}
                                className="mt-4 overflow-hidden rounded-[8px] px-5 py-5"
                                style={{
                                    backgroundColor: palette.card,
                                    borderRightWidth: tone.color === 'danger' ? 4 : 0,
                                    borderRightColor: palette.danger,
                                    ...shadow,
                                }}
                            >
                                <View className="flex-row items-start justify-between">
                                    <View className="flex-1 pr-4">
                                        <Text className="font-nunito-bold text-[12px] uppercase tracking-[1.5px]" style={{ color: toneColor }}>
                                            {tone.text}
                                        </Text>
                                        <Text className="mt-1 font-nunito-bold text-[23px]" style={{ color: palette.text }}>
                                            {task.pickup.name}
                                        </Text>
                                        <Text className="mt-1 font-nunito-semi text-[13px]" style={{ color: palette.accent }}>
                                            {task.items[0]?.title || 'Order item'}
                                        </Text>
                                        <Text className="mt-1 font-nunito-regular text-[14px] leading-6" style={{ color: palette.textMuted }}>
                                            {task.pickup.addressLine}
                                        </Text>
                                    </View>

                                    <View className="rounded-[8px] px-4 py-3" style={{ backgroundColor: palette.backgroundMuted }}>
                                        <Text className="font-nunito-semi text-[11px] uppercase tracking-[1px]" style={{ color: palette.textSoft }}>
                                            Real payout
                                        </Text>
                                        <Text className="mt-1 font-nunito-bold text-[20px]" style={{ color: palette.accent }}>
                                            {formatCurrency(getTaskPayout(task))}
                                        </Text>
                                    </View>
                                </View>

                                <View className="mt-4 rounded-[8px] px-4 py-4" style={{ backgroundColor: palette.backgroundMuted }}>
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-row items-center">
                                            <Ionicons name="navigate-outline" size={18} color={palette.textMuted} />
                                            <Text className="ml-2 font-nunito-semi text-[12px]" style={{ color: palette.textMuted }}>
                                                Arrival in{' '}
                                                <Text style={{ color: tone.color === 'danger' ? palette.danger : palette.text }}>
                                                    {task.etaMinutes || 0} min
                                                </Text>
                                            </Text>
                                        </View>

                                        <View className="h-5 w-9 rounded-full px-0.5" style={{ backgroundColor: palette.card }}>
                                            <View className="h-4 w-4 self-end rounded-full" style={{ backgroundColor: palette.accent }} />
                                        </View>
                                    </View>

                                    <View className="mt-3 flex-row items-center justify-between">
                                        <Text className="font-nunito-semi text-[12px]" style={{ color: palette.textMuted }}>
                                            {formatDistanceKm(task.distanceKm)} away
                                        </Text>
                                        <Text className="font-nunito-semi text-[12px]" style={{ color: palette.textMuted }}>
                                            {totalTaskItems(task)} items · {formatCurrency(getTaskOrderValue(task))}
                                        </Text>
                                    </View>
                                </View>

                                <Pressable
                                    disabled={busy || Boolean(currentTask) || acceptingTaskId === task.id}
                                    onPress={() => {
                                        setAcceptingTaskId(task.id)
                                        void acceptTask(task.id)
                                            .then(() => router.push(`/task/${task.id}/pickup`))
                                            .finally(() => setAcceptingTaskId(null))
                                    }}
                                    className="mt-4 h-14 items-center justify-center rounded-[8px]"
                                    style={{
                                        backgroundColor: palette.cardStrong,
                                        opacity: busy || Boolean(currentTask) || acceptingTaskId === task.id ? 0.72 : 1,
                                    }}
                                >
                                    {acceptingTaskId === task.id ? (
                                        <ActivityIndicator color={palette.buttonTextOnDark} />
                                    ) : (
                                        <Text className="font-nunito-bold text-[15px]" style={{ color: palette.buttonTextOnDark }}>
                                            Accept Task
                                        </Text>
                                    )}
                                </Pressable>
                            </View>
                        )
                    }) : null}

                    <View className="mt-7 overflow-hidden rounded-[8px] px-5 py-5" style={{ backgroundColor: palette.card, ...shadow }}>
                        <View className="absolute -right-10 -top-8 h-36 w-36 rounded-full" style={{ backgroundColor: palette.accentSoft }} />
                        <View className="absolute -bottom-16 left-16 h-40 w-40 rounded-full" style={{ backgroundColor: palette.backgroundMuted }} />
                        <Text className="font-nunito-bold text-[20px]" style={{ color: palette.text }}>
                            Route activity
                        </Text>
                        <Text className="mt-2 max-w-[260px] font-nunito-regular text-[13px] leading-6" style={{ color: palette.textMuted }}>
                            {socketConnected
                                ? 'Dispatch sync is active and route updates are flowing live.'
                                : 'This app is using automatic refresh. New orders and task updates will sync every few seconds.'}
                        </Text>

                        <View className="mt-10 flex-row items-center justify-between">
                            <View className="rounded-full px-4 py-3" style={{ backgroundColor: palette.card }}>
                                <Text className="font-nunito-bold text-[13px]" style={{ color: palette.text }}>
                                    {Math.max(availableTasks.length, currentTask ? 1 : 0)} active zones nearby
                                </Text>
                            </View>

                            <View className="h-12 w-12 items-center justify-center rounded-[8px]" style={{ backgroundColor: palette.card }}>
                                <Ionicons
                                    name={locationPermission === 'granted' ? 'locate' : 'locate-outline'}
                                    size={20}
                                    color={palette.text}
                                />
                            </View>
                        </View>
                    </View>
                </ScrollView>

                <DeliveryBottomNav themeMode={themeMode} />
            </View>
        </SafeAreaView>
    )
}
