import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    Text,
    useWindowDimensions,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TaskMap } from '../../../components/TaskMap'
import { useDelivery } from '../../../lib/delivery-context'
import { formatDistanceKm, formatInr } from '../../../lib/delivery-presentation'
import { getDeliveryPalette } from '../../../lib/delivery-theme'
import { useDeliverySessionGuard } from '../../../lib/use-delivery-session-guard'

function toTaskCode(orderId: string) {
    return `#${orderId.slice(-8).toUpperCase()}`
}

function getTaskItemUiKey(item: { itemId?: string; title?: string }, index: number) {
    return `${String(item.itemId || item.title || 'item')}:${index}`
}

export default function PickupTaskScreen() {
    const params = useLocalSearchParams<{ taskId?: string }>()
    const taskId = Array.isArray(params.taskId) ? params.taskId[0] : params.taskId
    const { bootstrapping, session, busy, currentTask, deviceLocation, markArrived, confirmPickup, refreshTask, themeMode } =
        useDelivery()
    const hasSession = useDeliverySessionGuard(session, bootstrapping)
    const { width } = useWindowDimensions()
    const compact = width < 390
    const palette = getDeliveryPalette(themeMode)
    const [checked, setChecked] = useState<Record<string, boolean>>({})
    const [hydrating, setHydrating] = useState(false)
    const [validationError, setValidationError] = useState<string | null>(null)
    const checkedRef = useRef<Record<string, boolean>>({})

    useEffect(() => {
        if (!taskId) return
        if (currentTask?.id === taskId) return

        setHydrating(true)
        void refreshTask(taskId).finally(() => setHydrating(false))
    }, [currentTask?.id, refreshTask, taskId])

    const task = currentTask?.id === taskId ? currentTask : null

    useEffect(() => {
        if (!task) return
        const nextChecked = Object.fromEntries(
            task.items.map((item, index) => [
                getTaskItemUiKey(item, index),
                Boolean(item.checkedAtPickup),
            ]),
        )
        checkedRef.current = nextChecked
        setChecked(nextChecked)
        setValidationError(null)
    }, [task])

    const checkedItemIds = useMemo(() => {
        if (!task) return []

        return task.items
            .filter((item, index) => checked[getTaskItemUiKey(item, index)])
            .map((item) => item.itemId)
    }, [checked, task])

    const checkedCount = useMemo(
        () => Object.values(checked).filter(Boolean).length,
        [checked],
    )

    const toggleItem = (itemKey: string) => {
        if (!isPickupReady) {
            setValidationError('Tap "Arrived At Pickup" first, then verify all items.')
            return
        }
        const nextChecked = {
            ...checkedRef.current,
            [itemKey]: !checkedRef.current[itemKey],
        }
        checkedRef.current = nextChecked
        setChecked(nextChecked)
        setValidationError(null)
    }

    const submitPickupStep = () => {
        if (!task || busy) return

        const latestCheckedItemIds = task.items
            .filter((item, index) => checkedRef.current[getTaskItemUiKey(item, index)])
            .map((item) => item.itemId)

        if (isPickupReady && latestCheckedItemIds.length !== task.items.length) {
            setValidationError('Verify every item before confirming pickup.')
            return
        }

        setValidationError(null)

        const action = isPickupReady
            ? confirmPickup(task.id, latestCheckedItemIds)
            : markArrived(task.id)

        action
            .then(() => {
                if (isPickupReady) {
                    router.replace(`/task/${task.id}/navigate`)
                }
            })
            .catch(() => null)
    }

    if (!hasSession || !session) return null

    if (!taskId || (!task && hydrating)) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: palette.background }}>
                <ActivityIndicator size="large" color={palette.accent} />
            </SafeAreaView>
        )
    }

    if (!task) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center px-6" style={{ backgroundColor: palette.background }}>
                <Text className="text-center font-nunito-bold text-xl" style={{ color: palette.text }}>
                    Pickup task not found.
                </Text>
                <Pressable
                    onPress={() => router.replace('/')}
                    className="mt-5 rounded-[22px] px-6 py-4"
                    style={{ backgroundColor: palette.cardStrong }}
                >
                    <Text className="font-nunito-bold text-base" style={{ color: palette.buttonTextOnDark }}>Back to Home</Text>
                </Pressable>
            </SafeAreaView>
        )
    }

    const isPickupReady = task.status === 'arrived_pickup'

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: palette.background }}>
            <ScrollView className="flex-1" contentContainerClassName="px-5 pb-10 pt-4">
                <View className="mt-2 flex-row items-center justify-between">
                    <Pressable
                        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
                        className="h-11 w-11 items-center justify-center rounded-full"
                        style={{ backgroundColor: palette.card }}
                    >
                        <Ionicons name="chevron-back" size={20} color={palette.text} />
                    </Pressable>
                    <Text className="font-nunito-bold text-[20px]" style={{ color: palette.text }}>
                        Pickup Confirmation
                    </Text>
                    <View className="h-11 w-11" />
                </View>

                <View className="mt-8 rounded-[10px] border px-5 py-5" style={{ borderColor: palette.accent, backgroundColor: palette.cardStrong }}>
                    <View className="flex-row items-center justify-between">
                        <View>
                            <Text className="font-nunito-bold text-xs uppercase tracking-[3px]" style={{ color: palette.accent }}>
                                Current Order
                            </Text>
                            <Text className="mt-2 font-nunito-bold text-[28px]" style={{ color: palette.buttonTextOnDark }}>
                                {toTaskCode(task.orderId)}
                            </Text>
                        </View>
                        <View className="rounded-full border px-4 py-2" style={{ borderColor: palette.accent, backgroundColor: palette.accentSoft }}>
                            <Text className="font-nunito-bold text-sm uppercase tracking-[1px]" style={{ color: palette.accent }}>
                                {isPickupReady ? 'Pending Pickup' : 'En Route'}
                            </Text>
                        </View>
                    </View>

                    <View className="mt-5 flex-row items-start">
                        <Ionicons name="location" size={18} color={palette.textSoft} />
                        <Text className="ml-3 flex-1 font-nunito-regular text-[16px] leading-6" style={{ color: palette.textSoft }}>
                            {task.pickup.name} • {task.pickup.addressLine}
                        </Text>
                    </View>
                </View>

                <Text className="mt-8 font-nunito-bold text-[16px] uppercase tracking-[2.5px]" style={{ color: palette.text }}>
                    Items To Verify
                </Text>

                {task.items.map((item, index) => {
                    const itemKey = getTaskItemUiKey(item, index)
                    const selected = Boolean(checked[itemKey])
                    return (
                        <Pressable
                            key={itemKey}
                            onPress={() => toggleItem(itemKey)}
                            className="mt-4 flex-row items-center rounded-[10px] border px-4 py-4"
                            style={{
                                borderColor: selected ? palette.accent : palette.borderSoft,
                                backgroundColor: palette.card,
                                opacity: isPickupReady ? 1 : 0.72,
                            }}
                        >
                            <View className="h-14 w-14 items-center justify-center rounded-[10px]" style={{ backgroundColor: palette.backgroundMuted }}>
                                <Ionicons name="document-text-outline" size={22} color={palette.textMuted} />
                            </View>

                            <View className="ml-4 flex-1">
                                <Text className="font-nunito-bold text-[18px]" style={{ color: palette.text }}>
                                    {item.title}
                                </Text>
                                {!!item.subtitle ? (
                                    <Text className="mt-1 font-nunito-regular text-[14px]" style={{ color: palette.textMuted }}>
                                        {item.subtitle}
                                    </Text>
                                ) : null}
                                <Text className="mt-1 font-nunito-bold text-[13px]" style={{ color: palette.accent }}>
                                    {formatInr(Number(item.totalPrice || item.unitPrice || 0))}
                                </Text>
                            </View>

                            <View className="ml-3 items-end">
                                <Text className="font-nunito-bold text-[16px]" style={{ color: palette.accent }}>
                                    {item.quantity}x
                                </Text>
                                <View
                                    className="mt-3 items-center justify-center rounded-full"
                                    style={{
                                        height: compact ? 36 : 40,
                                        width: compact ? 36 : 40,
                                        backgroundColor: selected ? palette.accent : palette.backgroundMuted,
                                    }}
                                >
                                    <Ionicons
                                        name="checkmark"
                                        size={compact ? 16 : 18}
                                        color={selected ? palette.buttonTextOnAccent : palette.textSoft}
                                    />
                                </View>
                            </View>
                        </Pressable>
                    )
                })}

                <Text className="mt-8 font-nunito-bold text-[16px] uppercase tracking-[2.5px]" style={{ color: palette.text }}>
                    Special Instructions
                </Text>
                <View className="mt-4 rounded-[10px] border px-5 py-5" style={{ borderColor: palette.border, backgroundColor: palette.backgroundMuted }}>
                    <View className="flex-row items-start">
                        <Ionicons name="warning" size={18} color="#ffb400" />
                        <Text className="ml-3 flex-1 font-nunito-regular text-[15px] leading-7" style={{ color: palette.textMuted }}>
                            {task.specialInstructions || 'No additional instructions for this pickup.'}
                        </Text>
                    </View>
                </View>

                <Text className="mt-8 font-nunito-bold text-[16px] uppercase tracking-[2.5px]" style={{ color: palette.textSoft }}>
                    Delivery Destination
                </Text>
                <View className="mt-4 overflow-hidden rounded-[10px] border" style={{ borderColor: palette.borderSoft, backgroundColor: palette.backgroundMuted }}>
                    <View className="h-48">
                        <TaskMap task={task} deviceLocation={deviceLocation} compact />
                    </View>
                    <View className="absolute inset-x-0 bottom-0 px-5 py-4" style={{ backgroundColor: palette.overlay }}>
                        <Text className="font-nunito-bold text-[18px]" style={{ color: palette.buttonTextOnDark }}>
                            {formatDistanceKm(task.distanceKm)} to destination
                        </Text>
                        <Text className="mt-1 font-nunito-regular text-[14px]" style={{ color: palette.buttonTextOnDark }}>
                            Approx {task.etaMinutes || 0} mins
                        </Text>
                    </View>
                </View>

                {validationError ? (
                    <View className="mt-4 rounded-[16px] px-4 py-3" style={{ backgroundColor: palette.dangerSoft }}>
                        <Text className="font-nunito-semi text-[13px]" style={{ color: palette.danger }}>
                            {validationError}
                        </Text>
                    </View>
                ) : null}

                <Pressable
                    disabled={busy}
                    onPress={submitPickupStep}
                    className="mt-8 h-16 items-center justify-center rounded-[22px]"
                    style={{
                        opacity: busy ? 0.72 : 1,
                        backgroundColor: palette.cardStrong,
                    }}
                >
                    {busy ? (
                        <ActivityIndicator color={palette.accent} />
                    ) : (
                        <Text className="font-nunito-bold text-[20px]" style={{ color: palette.buttonTextOnDark }}>
                            {isPickupReady ? 'Confirm Pickup' : 'Arrived At Pickup'}
                        </Text>
                    )}
                </Pressable>

                <Text className="mt-4 text-center font-nunito-semi text-[12px] uppercase tracking-[2px]" style={{ color: palette.textMuted }}>
                    {isPickupReady
                        ? `${checkedCount}/${task.items.length} items marked. All items must be checked before confirmation.`
                        : 'Tap "Arrived At Pickup" first. Item verification unlocks after arrival.'}
                </Text>
            </ScrollView>
        </SafeAreaView>
    )
}
