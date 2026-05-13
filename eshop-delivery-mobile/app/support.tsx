import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { Linking, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { DeliveryBottomNav, DELIVERY_TAB_BAR_HEIGHT } from '../components/delivery/DeliveryBottomNav'
import type { DeliveryTask } from '../lib/api'
import { toTaskCode } from '../lib/delivery-presentation'
import { useDelivery } from '../lib/delivery-context'
import { getDeliveryPalette } from '../lib/delivery-theme'
import { useDeliverySessionGuard } from '../lib/use-delivery-session-guard'

const SUPPORT_PHONE = '+918800120120'

const categories = [
    {
        key: 'payment_issue',
        title: 'Payment Issues',
        subtitle: 'Payouts, bonuses, and weekly settlements',
        icon: 'wallet-outline' as const,
    },
    {
        key: 'order_trouble',
        title: 'Order Troubles',
        subtitle: 'Pickup or customer delivery complications',
        icon: 'cube-outline' as const,
    },
    {
        key: 'app_feedback',
        title: 'App Feedback',
        subtitle: 'Bug reports and rider feature requests',
        icon: 'chatbubble-ellipses-outline' as const,
    },
    {
        key: 'vehicle_assistance',
        title: 'Vehicle Assistance',
        subtitle: 'Breakdown, accident, or roadside help',
        icon: 'bicycle-outline' as const,
    },
] as const

const shadow = {
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
}

export default function SupportScreen() {
    const params = useLocalSearchParams<{ taskId?: string; issueType?: string }>()
    const taskId = Array.isArray(params.taskId) ? params.taskId[0] : params.taskId
    const { bootstrapping, session, currentTask, refreshTask, themeMode } = useDelivery()
    const palette = getDeliveryPalette(themeMode)
    const hasSession = useDeliverySessionGuard(session, bootstrapping)
    const [task, setTask] = useState<DeliveryTask | null>(currentTask || null)

    useEffect(() => {
        if (!taskId) {
            setTask(currentTask || null)
            return
        }

        if (currentTask?.id === taskId) {
            setTask(currentTask)
            return
        }

        void refreshTask(taskId).then((nextTask) => setTask(nextTask))
    }, [currentTask, refreshTask, taskId])

    if (!hasSession || !session) return null

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: palette.background }}>
            <View className="flex-1">
                <ScrollView
                    className="flex-1"
                    contentContainerClassName="px-5 pt-4"
                    contentContainerStyle={{ paddingBottom: DELIVERY_TAB_BAR_HEIGHT + 24 }}
                >
                    <View className="mt-3 flex-row items-center justify-between">
                        <View>
                            <Text className="font-nunito-semi text-[12px] uppercase tracking-[1.5px]" style={{ color: palette.textSoft }}>
                                Support
                            </Text>
                            <Text className="mt-1 font-nunito-bold text-[26px]" style={{ color: palette.text }}>
                                Rider Help Desk
                            </Text>
                        </View>
                        <View className="rounded-full px-4 py-2" style={{ backgroundColor: palette.accentSoft }}>
                            <Text className="font-nunito-bold text-[12px]" style={{ color: palette.accent }}>
                                24/7 Live
                            </Text>
                        </View>
                    </View>

                    <View className="mt-5 rounded-[8px] px-5 py-6" style={{ backgroundColor: palette.card, ...shadow }}>
                        <Text className="font-nunito-bold text-[30px] leading-[36px]" style={{ color: palette.text }}>
                            Need help on the road?
                        </Text>
                        <Text className="mt-3 max-w-[320px] font-nunito-regular text-[14px] leading-6" style={{ color: palette.textMuted }}>
                            Reach dispatch support, raise delivery incidents, or report payment and vehicle problems without leaving the rider workspace.
                        </Text>

                        <Pressable
                            onPress={() => void Linking.openURL(`tel:${SUPPORT_PHONE}`)}
                            className="mt-6 h-14 flex-row items-center justify-center rounded-[8px]"
                            style={{ backgroundColor: palette.cardStrong }}
                        >
                            <Ionicons name="call-outline" size={18} color={palette.buttonTextOnDark} />
                            <Text className="ml-3 font-nunito-bold text-[15px]" style={{ color: palette.buttonTextOnDark }}>
                                Call Support Now
                            </Text>
                        </Pressable>
                    </View>

                    {task ? (
                        <Pressable
                            onPress={() => router.push(`/raise-incident?taskId=${task.id}`)}
                            className="mt-5 rounded-[8px] px-5 py-5"
                            style={{ backgroundColor: palette.card, ...shadow }}
                        >
                            <View className="flex-row items-center justify-between">
                                <View>
                                    <Text className="font-nunito-semi text-[12px] uppercase tracking-[1.5px]" style={{ color: palette.textSoft }}>
                                        Current job
                                    </Text>
                                    <Text className="mt-1 font-nunito-bold text-[20px]" style={{ color: palette.text }}>
                                        {toTaskCode(task.orderId)}
                                    </Text>
                                    <Text className="mt-1 font-nunito-regular text-[13px]" style={{ color: palette.textMuted }}>
                                        {task.dropoff.name}
                                    </Text>
                                </View>
                                <View className="rounded-full px-4 py-2" style={{ backgroundColor: palette.accentSoft }}>
                                    <Text className="font-nunito-bold text-[12px]" style={{ color: palette.accent }}>
                                        Raise incident
                                    </Text>
                                </View>
                            </View>
                        </Pressable>
                    ) : null}

                    <View className="mt-6 flex-row items-center justify-between">
                        <Text className="font-nunito-bold text-[20px]" style={{ color: palette.text }}>
                            Common Categories
                        </Text>
                        <Text className="font-nunito-semi text-[12px]" style={{ color: palette.textMuted }}>
                            Fast actions
                        </Text>
                    </View>

                    <View className="mt-4 gap-4">
                        {categories.map((category) => (
                            <Pressable
                                key={category.key}
                                onPress={() =>
                                    router.push(
                                        `/raise-incident?issueType=${category.key}${task ? `&taskId=${task.id}` : ''}`,
                                    )
                                }
                                className="rounded-[8px] px-4 py-4"
                                style={{ backgroundColor: palette.card, ...shadow }}
                            >
                                <View className="flex-row items-center">
                                    <View className="h-12 w-12 items-center justify-center rounded-[8px]" style={{ backgroundColor: palette.backgroundMuted }}>
                                        <Ionicons name={category.icon} size={20} color={palette.textMuted} />
                                    </View>
                                    <View className="ml-4 flex-1">
                                        <Text className="font-nunito-bold text-[16px]" style={{ color: palette.text }}>
                                            {category.title}
                                        </Text>
                                        <Text className="mt-1 font-nunito-regular text-[13px]" style={{ color: palette.textMuted }}>
                                            {category.subtitle}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color={palette.textSoft} />
                                </View>
                            </Pressable>
                        ))}
                    </View>

                    <View className="mt-6 rounded-[8px] px-5 py-5" style={{ backgroundColor: palette.card, ...shadow }}>
                        <Text className="font-nunito-bold text-[20px]" style={{ color: palette.text }}>
                            Safety first
                        </Text>
                        <Text className="mt-2 max-w-[280px] font-nunito-regular text-[13px] leading-6" style={{ color: palette.textMuted }}>
                            If you are in immediate danger, move to a safe location first and then alert the support desk so the active delivery can be reviewed.
                        </Text>
                        <Pressable
                            onPress={() =>
                                router.push(
                                    `/raise-incident?issueType=safety_emergency${task ? `&taskId=${task.id}` : ''}`,
                                )
                            }
                            className="mt-5 self-start rounded-full px-4 py-3"
                            style={{ backgroundColor: palette.dangerSoft }}
                        >
                            <Text className="font-nunito-bold text-[12px]" style={{ color: palette.danger }}>
                                Report safety issue
                            </Text>
                        </Pressable>
                    </View>
                </ScrollView>

                <DeliveryBottomNav themeMode={themeMode} />
            </View>
        </SafeAreaView>
    )
}
