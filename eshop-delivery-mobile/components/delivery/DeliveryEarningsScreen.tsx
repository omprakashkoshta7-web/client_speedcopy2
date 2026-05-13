import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { DeliveryBottomNav, DELIVERY_TAB_BAR_HEIGHT } from './DeliveryBottomNav'
import { getMyTasks, type DeliveryTask } from '../../lib/api'
import {
    formatInr,
    getDeliveredTimestamp,
    getTaskPayout,
    totalTaskItems,
    toTaskCode,
} from '../../lib/delivery-presentation'
import { useDelivery } from '../../lib/delivery-context'
import { getDeliveryPalette } from '../../lib/delivery-theme'
import { useDeliverySessionGuard } from '../../lib/use-delivery-session-guard'

type EarningsRange = 'today' | 'week' | 'month'

const ranges: EarningsRange[] = ['today', 'week', 'month']

function cardShadow(opacity: number) {
    return {
        shadowColor: '#0f172a',
        shadowOpacity: opacity,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
        elevation: 7,
    }
}

function isDelivered(task: DeliveryTask) {
    return task.status === 'delivered'
}

function deliveredAt(task: DeliveryTask) {
    return new Date(getDeliveredTimestamp(task))
}

function startOfDay(date: Date) {
    const next = new Date(date)
    next.setHours(0, 0, 0, 0)
    return next
}

function startOfWeek(date: Date) {
    const next = startOfDay(date)
    const weekday = next.getDay()
    const diff = weekday === 0 ? 6 : weekday - 1
    next.setDate(next.getDate() - diff)
    return next
}

function startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfDay(date: Date) {
    const next = startOfDay(date)
    next.setDate(next.getDate() + 1)
    next.setMilliseconds(-1)
    return next
}

function shiftDays(date: Date, amount: number) {
    const next = new Date(date)
    next.setDate(next.getDate() + amount)
    return next
}

function rangeWindow(range: EarningsRange, now: Date) {
    if (range === 'today') {
        const start = startOfDay(now)
        return {
            start,
            end: endOfDay(now),
            previousStart: shiftDays(start, -1),
            previousEnd: endOfDay(shiftDays(start, -1)),
        }
    }

    if (range === 'week') {
        const start = startOfWeek(now)
        const end = endOfDay(shiftDays(start, 6))
        return {
            start,
            end,
            previousStart: shiftDays(start, -7),
            previousEnd: endOfDay(shiftDays(start, -1)),
        }
    }

    const start = startOfMonth(now)
    const end = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0))
    const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const previousEnd = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0))
    return { start, end, previousStart, previousEnd }
}

function inWindow(task: DeliveryTask, start: Date, end: Date) {
    const timestamp = deliveredAt(task).getTime()
    return timestamp >= start.getTime() && timestamp <= end.getTime()
}

function sumTaskEarnings(tasks: DeliveryTask[]) {
    return tasks.reduce((total, task) => total + getTaskPayout(task), 0)
}

function mergeDeliveredTasks(...sources: DeliveryTask[][]) {
    const merged: DeliveryTask[] = []

    for (const source of sources) {
        for (const task of source) {
            if (!isDelivered(task)) continue
            if (merged.some((entry) => entry.id === task.id)) continue
            merged.push(task)
        }
    }

    return merged.sort(
        (left, right) => deliveredAt(right).getTime() - deliveredAt(left).getTime(),
    )
}

function formatShortDate(timestamp: string) {
    return new Date(timestamp).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
    })
}

function formatLongDate(timestamp: Date) {
    return timestamp.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    })
}

function nextPayoutDate(reference = new Date()) {
    const payout = startOfDay(reference)
    const daysUntilMonday = (8 - payout.getDay()) % 7 || 7
    payout.setDate(payout.getDate() + daysUntilMonday)
    return payout
}

export function DeliveryEarningsScreen() {
    const { bootstrapping, session, currentTask, completedTasks, themeMode } = useDelivery()
    const palette = getDeliveryPalette(themeMode)
    const hasSession = useDeliverySessionGuard(session, bootstrapping)
    const [range, setRange] = useState<EarningsRange>('today')
    const [tasks, setTasks] = useState<DeliveryTask[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const usesMockData = Boolean(session?.mockAuth ?? session?.mockData)

    const syncMockTasks = useCallback(() => {
        const nextTasks = mergeDeliveredTasks(
            currentTask ? [currentTask] : [],
            completedTasks,
        )

        setTasks(nextTasks)
        setError(null)
        setLoading(false)
        setRefreshing(false)
    }, [completedTasks, currentTask])

    const loadTasks = useCallback(async () => {
        if (!session) {
            setTasks([])
            setLoading(false)
            setRefreshing(false)
            return
        }

        if (usesMockData) {
            syncMockTasks()
            return
        }

        if (session.user.kycStatus === 'rejected') {
            setTasks([])
            setError('Re-submit identity verification to view earnings')
            setLoading(false)
            setRefreshing(false)
            return
        }

        try {
            const response = await getMyTasks(session.accessToken, 'delivered', 1, 40)
            const nextTasks = mergeDeliveredTasks(
                response.items || [],
                currentTask ? [currentTask] : [],
                completedTasks,
            )
            setTasks(nextTasks)
            setError(null)
        } catch (loadError) {
            const fallbackTasks = mergeDeliveredTasks(
                currentTask ? [currentTask] : [],
                completedTasks,
            )

            if (fallbackTasks.length) {
                setTasks(fallbackTasks)
                setError(null)
            } else {
                setError(
                    loadError instanceof Error
                        ? loadError.message
                        : 'Unable to load earnings data',
                )
            }
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [completedTasks, currentTask, session, syncMockTasks, usesMockData])

    useEffect(() => {
        setLoading(true)
        void loadTasks()
    }, [loadTasks])

    const earningsTasks = useMemo(() => tasks.filter(isDelivered), [tasks])

    const summary = useMemo(() => {
        const now = new Date()
        const window = rangeWindow(range, now)
        const currentRangeTasks = earningsTasks.filter((task) =>
            inWindow(task, window.start, window.end),
        )
        const previousRangeTasks = earningsTasks.filter((task) =>
            inWindow(task, window.previousStart, window.previousEnd),
        )
        const total = sumTaskEarnings(currentRangeTasks)
        const previousTotal = sumTaskEarnings(previousRangeTasks)
        const deltaPercent =
            previousTotal > 0
                ? ((total - previousTotal) / previousTotal) * 100
                : total > 0
                  ? 100
                  : 0

        return {
            tasks: currentRangeTasks,
            total,
            previousTotal,
            deltaPercent,
            weekTotal: sumTaskEarnings(
                earningsTasks.filter((task) =>
                    inWindow(task, startOfWeek(now), endOfDay(shiftDays(startOfWeek(now), 6))),
                ),
            ),
            monthTotal: sumTaskEarnings(
                earningsTasks.filter((task) =>
                    inWindow(
                        task,
                        startOfMonth(now),
                        endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
                    ),
                ),
            ),
        }
    }, [earningsTasks, range])

    const weekBars = useMemo(() => {
        const start = startOfWeek(new Date())

        return Array.from({ length: 7 }, (_, index) => {
            const day = shiftDays(start, index)
            const total = sumTaskEarnings(
                earningsTasks.filter((task) => inWindow(task, startOfDay(day), endOfDay(day))),
            )

            return {
                key: day.toISOString(),
                label: day
                    .toLocaleDateString('en-IN', { weekday: 'short' })
                    .slice(0, 3)
                    .toUpperCase(),
                total,
                active: startOfDay(day).getTime() === startOfDay(new Date()).getTime(),
            }
        })
    }, [earningsTasks])

    const maxBarTotal = Math.max(...weekBars.map((bar) => bar.total), 1)
    const nextPayout = nextPayoutDate()

    if (!hasSession || !session) return null

    if (loading) {
        return (
            <SafeAreaView
                className="flex-1 items-center justify-center"
                style={{ backgroundColor: palette.background }}
            >
                <ActivityIndicator size="large" color={palette.accent} />
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: palette.background }}>
            <View className="flex-1">
                <ScrollView
                    className="flex-1"
                    contentContainerClassName="px-5 pt-4"
                    contentContainerStyle={{ paddingBottom: DELIVERY_TAB_BAR_HEIGHT + 24 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true)
                                void loadTasks()
                            }}
                        />
                    }
                >
                    <View className="mt-3 flex-row items-center justify-between">
                        <View>
                            <Text
                                className="font-nunito-semi text-[12px] uppercase tracking-[2px]"
                                style={{ color: palette.textSoft }}
                            >
                                Earnings
                            </Text>
                            <Text
                                className="mt-1 font-nunito-bold text-[26px]"
                                style={{ color: palette.text }}
                            >
                                Payout Summary
                            </Text>
                        </View>
                        <View
                            className="rounded-full px-4 py-2"
                            style={{ backgroundColor: palette.accentSoft }}
                        >
                            <Text
                                className="font-nunito-bold text-[12px]"
                                style={{ color: palette.accent }}
                            >
                                {earningsTasks.length} paid jobs
                            </Text>
                        </View>
                    </View>

                    <View
                        className="mt-5 flex-row rounded-[8px] p-1"
                        style={{ backgroundColor: palette.card, ...cardShadow(0.06) }}
                    >
                        {ranges.map((item) => {
                            const active = item === range
                            return (
                                <Pressable
                                    key={item}
                                    onPress={() => setRange(item)}
                                    className="flex-1 rounded-[8px] px-4 py-3"
                                    style={{
                                        backgroundColor: active
                                            ? palette.backgroundMuted
                                            : 'transparent',
                                    }}
                                >
                                    <Text
                                        className="text-center font-nunito-bold text-[13px]"
                                        style={{
                                            color: active ? palette.text : palette.textMuted,
                                        }}
                                    >
                                        {item[0].toUpperCase()}
                                        {item.slice(1)}
                                    </Text>
                                </Pressable>
                            )
                        })}
                    </View>

                    <View
                        className="mt-5 rounded-[8px] px-5 py-6"
                        style={{ backgroundColor: palette.card, ...cardShadow(0.1) }}
                    >
                        <View className="flex-row items-start justify-between">
                            <View className="flex-1 pr-4">
                                <Text
                                    className="font-nunito-semi text-[12px] uppercase tracking-[2px]"
                                    style={{ color: palette.textSoft }}
                                >
                                    Total {range} earnings
                                </Text>
                                <Text
                                    className="mt-2 font-nunito-bold text-[34px]"
                                    style={{ color: palette.text }}
                                >
                                    {formatInr(summary.total)}
                                </Text>
                            </View>
                            <View
                                className="rounded-full px-3 py-2"
                                style={{ backgroundColor: palette.accentSoft }}
                            >
                                <Text
                                    className="font-nunito-bold text-[12px]"
                                    style={{ color: palette.accent }}
                                >
                                    {summary.deltaPercent >= 0 ? '+' : ''}
                                    {Math.round(summary.deltaPercent)}%
                                </Text>
                            </View>
                        </View>

                        <Text
                            className="mt-2 font-nunito-regular text-[13px]"
                            style={{ color: palette.textMuted }}
                        >
                            Compared with {formatInr(summary.previousTotal)} in the previous cycle.
                        </Text>

                        <View
                            className="mt-6 rounded-[8px] px-4 py-4"
                            style={{ backgroundColor: palette.backgroundMuted }}
                        >
                            <View className="h-[180px] flex-row items-end justify-between">
                                {weekBars.map((bar) => (
                                    <View key={bar.key} className="items-center">
                                        <View
                                            className="w-8 rounded-full"
                                            style={{
                                                height:
                                                    28 + (bar.total / maxBarTotal) * 92,
                                                backgroundColor: bar.active
                                                    ? palette.accent
                                                    : palette.border,
                                            }}
                                        />
                                        <Text
                                            className="mt-3 font-nunito-bold text-[10px]"
                                            style={{
                                                color: bar.active
                                                    ? palette.accent
                                                    : palette.textMuted,
                                            }}
                                        >
                                            {bar.label}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View className="mt-5 flex-row gap-3">
                            <View
                                className="flex-1 rounded-[8px] px-4 py-4"
                                style={{
                                    backgroundColor: palette.backgroundMuted,
                                }}
                            >
                                <Text
                                    className="font-nunito-semi text-[12px] uppercase tracking-[2px]"
                                    style={{ color: palette.textSoft }}
                                >
                                    This week
                                </Text>
                                <Text
                                    className="mt-2 font-nunito-bold text-[24px]"
                                    style={{ color: palette.text }}
                                >
                                    {formatInr(summary.weekTotal)}
                                </Text>
                            </View>
                            <View
                                className="flex-1 rounded-[8px] px-4 py-4"
                                style={{
                                    backgroundColor: palette.backgroundMuted,
                                }}
                            >
                                <Text
                                    className="font-nunito-semi text-[12px] uppercase tracking-[2px]"
                                    style={{ color: palette.textSoft }}
                                >
                                    This month
                                </Text>
                                <Text
                                    className="mt-2 font-nunito-bold text-[24px]"
                                    style={{ color: palette.text }}
                                >
                                    {formatInr(summary.monthTotal)}
                                </Text>
                            </View>
                        </View>

                        <Pressable
                            onPress={() => router.push('/support?issueType=payment_issue')}
                            className="mt-6 h-14 flex-row items-center justify-center rounded-[8px]"
                            style={{ backgroundColor: palette.cardStrong }}
                        >
                            <Ionicons
                                name="wallet-outline"
                                size={18}
                                color={palette.buttonTextOnDark}
                            />
                            <Text
                                className="ml-3 font-nunito-bold text-[15px]"
                                style={{ color: palette.buttonTextOnDark }}
                            >
                                Withdraw to Wallet
                            </Text>
                        </Pressable>

                        <Text
                            className="mt-4 text-center font-nunito-bold text-[10px] uppercase tracking-[2px]"
                            style={{ color: palette.textSoft }}
                        >
                            Next automatic payout: {formatLongDate(nextPayout)}
                        </Text>
                    </View>

                    {error ? (
                        <View
                            className="mt-5 rounded-[8px] px-4 py-4"
                            style={{ backgroundColor: palette.dangerSoft }}
                        >
                            <Text
                                className="font-nunito-semi text-[13px]"
                                style={{ color: palette.danger }}
                            >
                                {error}
                            </Text>
                        </View>
                    ) : null}

                    <View className="mt-6 flex-row items-center justify-between">
                            <Text
                                className="font-nunito-bold text-[20px]"
                                style={{ color: palette.text }}
                            >
                            Order History
                            </Text>
                        <Text
                            className="font-nunito-semi text-[13px]"
                            style={{ color: palette.textMuted }}
                        >
                            {summary.tasks.length} in view
                        </Text>
                    </View>

                    {summary.tasks.length ? (
                        summary.tasks.slice(0, 8).map((task) => {
                            const payout = getTaskPayout(task)
                            const payoutDate = getDeliveredTimestamp(task)

                            return (
                                <View
                                    key={task.id}
                                    className="mt-4 flex-row items-center rounded-[8px] px-4 py-4"
                                    style={{
                                        backgroundColor: palette.card,
                                        ...cardShadow(0.08),
                                    }}
                                >
                                    <View
                                        className="h-12 w-12 items-center justify-center rounded-full"
                                        style={{ backgroundColor: palette.cardStrong }}
                                    >
                                        <Ionicons
                                            name="wallet-outline"
                                            size={20}
                                            color={palette.buttonTextOnDark}
                                        />
                                    </View>
                                    <View className="ml-4 flex-1">
                                        <Text
                                            className="font-nunito-bold text-[15px]"
                                            style={{ color: palette.text }}
                                        >
                                            Delivery Payout
                                        </Text>
                                        <Text
                                            className="mt-1 font-nunito-regular text-[12px]"
                                            style={{ color: palette.textMuted }}
                                        >
                                            {formatShortDate(payoutDate)} · {toTaskCode(task.orderId)} · {totalTaskItems(task)} items
                                        </Text>
                                    </View>
                                    <View className="items-end">
                                        <Text
                                            className="font-nunito-bold text-[18px]"
                                            style={{ color: palette.text }}
                                        >
                                            +{formatInr(payout)}
                                        </Text>
                                        <Text
                                            className="mt-1 font-nunito-bold text-[11px]"
                                            style={{ color: palette.accent }}
                                        >
                                            Paid
                                        </Text>
                                    </View>
                                </View>
                            )
                        })
                    ) : (
                        <View
                            className="mt-4 rounded-[8px] px-5 py-8"
                            style={{ backgroundColor: palette.card }}
                        >
                            <Text
                                className="font-nunito-bold text-[16px]"
                                style={{ color: palette.text }}
                            >
                                No completed orders yet
                            </Text>
                            <Text
                                className="mt-2 font-nunito-regular text-[13px] leading-6"
                                style={{ color: palette.textMuted }}
                            >
                                Completed delivery orders will appear here automatically.
                            </Text>
                        </View>
                    )}
                </ScrollView>

                <DeliveryBottomNav themeMode={themeMode} />
            </View>
        </SafeAreaView>
    )
}
