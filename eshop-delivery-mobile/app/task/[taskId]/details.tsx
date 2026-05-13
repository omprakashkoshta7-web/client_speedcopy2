import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import {
    ActivityIndicator,
    Linking,
    Pressable,
    ScrollView,  
    Text,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TaskMap } from '../../../components/TaskMap'
import { useDelivery } from '../../../lib/delivery-context'
import {
    formatDistanceKm,
    formatInr,
    getTaskOrderValue,
    getTaskPayout,
    totalTaskItems,
} from '../../../lib/delivery-presentation'
import { useDeliverySessionGuard } from '../../../lib/use-delivery-session-guard'

function summarizePackage(task: { items: Array<{ title: string; quantity: number }>; specialInstructions: string }) {
    const firstItem = task.items[0]?.title || 'Parcel'
    const fragile = /fragile|care/i.test(task.specialInstructions) ? 'Fragile' : 'Standard'
    return `${firstItem} • ${fragile}`
}

function getTaskItemUiKey(item: { itemId?: string; title?: string }, index: number) {
    return `${String(item.itemId || item.title || 'item')}:${index}`
}

export default function TaskDetailsScreen() {
    const params = useLocalSearchParams<{ taskId?: string }>()
    const taskId = Array.isArray(params.taskId) ? params.taskId[0] : params.taskId
    const { bootstrapping, session, busy, currentTask, acceptTask, rejectTask, refreshTask } = useDelivery()
    const hasSession = useDeliverySessionGuard(session, bootstrapping)
    const [task, setTask] = useState(currentTask && currentTask.id === taskId ? currentTask : null)
    const [hydrating, setHydrating] = useState(false)

    useEffect(() => {
        if (!taskId) return
        if (task?.id === taskId) return

        setHydrating(true)
        void refreshTask(taskId)
            .then((nextTask) => setTask(nextTask))
            .finally(() => setHydrating(false))
    }, [refreshTask, task?.id, taskId])

    useEffect(() => {
        if (currentTask?.id === taskId) {
            setTask(currentTask)
        }
    }, [currentTask, taskId])

    if (!hasSession || !session) return null

    if (!taskId || (!task && hydrating)) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-[#f5f7f6]">
                <ActivityIndicator size="large" color="#111713" />
            </SafeAreaView>
        )
    }

    if (!task) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-[#f5f7f6] px-6">
                <Text className="text-center font-nunito-bold text-xl text-[#111713]">
                    Delivery job not found.
                </Text>
                <Pressable
                    onPress={() => router.replace('/')}
                    className="mt-5 rounded-[22px] bg-[#050505] px-6 py-4"
                >
                    <Text className="font-nunito-bold text-base text-white">Back to Home</Text>
                </Pressable>
            </SafeAreaView>
        )
    }

    const payout = getTaskPayout(task)
    const isAccepted = currentTask?.id === task.id

    return (
        <SafeAreaView className="flex-1 bg-[#f5f7f6]">
            <ScrollView contentContainerClassName="px-6 pb-8 pt-4">
                <View className="mt-2 flex-row items-center justify-between">
                    <Pressable
                        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
                        className="h-11 w-11 items-center justify-center rounded-full bg-white"
                    >
                        <Ionicons name="chevron-back" size={20} color="#111713" />
                    </Pressable>
                    <Text className="font-nunito-bold text-[22px] text-[#2c2f33]">Job Detail</Text>
                    <View className="h-11 w-11" />
                </View>

                <View className="mt-6 overflow-hidden rounded-[10px] bg-[#d4d8d3]">
                    <View className="h-72">
                        <TaskMap task={task} compact />
                    </View>
                    <View className="absolute inset-x-0 bottom-0 flex-row items-end justify-between px-5 pb-5">
                        <View className="rounded-[10px] bg-white px-4 py-2.5">
                            <Text className="font-nunito-bold text-[14px] uppercase tracking-[2px] text-[#111713]">
                                Live Job
                            </Text>
                        </View>
                        <Text className="font-nunito-bold text-[24px] text-[#ffffff]">
                            {formatInr(payout)}
                        </Text>
                    </View>
                </View>

                <View className="mt-5 rounded-[10px] bg-[#050505] px-5 py-5">
                    <View className="flex-row items-start">
                        <View className="mr-4 items-center">
                            <View className="h-10 w-10 items-center justify-center rounded-full border border-[#1ce96e] bg-[#13201c]">
                                <Ionicons name="storefront-outline" size={18} color="#1ce96e" />
                            </View>
                            <View className="h-20 border-l border-dashed border-[#1ce96e]" />
                            <View className="h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-[#1a2233]">
                                <Ionicons name="location-outline" size={18} color="#dbe0e8" />
                            </View>
                        </View>

                        <View className="flex-1">
                            <Text className="font-nunito-bold text-xs uppercase tracking-[3px] text-[#1ce96e]">
                                Pickup Address
                            </Text>
                            <Text className="mt-2 font-nunito-bold text-[18px] text-white">
                                {task.pickup.name}
                            </Text>
                            <Text className="mt-1 font-nunito-regular text-[14px] leading-6 text-[#96a3b8]">
                                {task.pickup.addressLine}
                            </Text>

                            <Text className="mt-8 font-nunito-bold text-xs uppercase tracking-[3px] text-[#96a3b8]">
                                Drop-off Address
                            </Text>
                            <Text className="mt-2 font-nunito-bold text-[18px] text-white">
                                {task.dropoff.name}
                            </Text>
                            <Text className="mt-1 font-nunito-regular text-[14px] leading-6 text-[#96a3b8]">
                                {task.dropoff.addressLine}
                            </Text>
                        </View>
                    </View>
                </View>

                <View className="mt-5 rounded-[10px] bg-[#dde1dd] px-5 py-5">
                    <Text className="font-nunito-semi text-xs uppercase tracking-[4px] text-[#8ba0bf]">
                        Order Details
                    </Text>

                    <View className="mt-4 flex-row gap-4">
                        <View className="flex-1 rounded-[12px] bg-[#050505] px-4 py-4">
                            <Text className="font-nunito-regular text-[14px] text-[#8ea2c2]">Distance</Text>
                            <Text className="mt-3 font-nunito-bold text-[18px] text-white">
                                {formatDistanceKm(task.distanceKm)}
                            </Text>
                        </View>
                        <View className="flex-1 rounded-[12px] bg-[#050505] px-4 py-4">
                            <Text className="font-nunito-regular text-[14px] text-[#8ea2c2]">Items</Text>
                            <Text className="mt-3 font-nunito-bold text-[18px] text-white">
                                {totalTaskItems(task)}
                            </Text>
                        </View>
                    </View>

                    <View className="mt-4 flex-row gap-4">
                        <View className="flex-1 rounded-[12px] bg-[#050505] px-4 py-4">
                            <Text className="font-nunito-regular text-[14px] text-[#8ea2c2]">Order value</Text>
                            <Text className="mt-3 font-nunito-bold text-[18px] text-white">
                                {formatInr(getTaskOrderValue(task))}
                            </Text>
                        </View>
                        <View className="flex-1 rounded-[12px] bg-[#050505] px-4 py-4">
                            <Text className="font-nunito-regular text-[14px] text-[#8ea2c2]">Payout</Text>
                            <Text className="mt-3 font-nunito-bold text-[18px] text-white">
                                {formatInr(payout)}
                            </Text>
                        </View>
                    </View>

                    <View className="mt-4 rounded-[12px] bg-[#050505] px-4 py-4">
                        <Text className="font-nunito-regular text-[14px] text-[#8ea2c2]">Package Type</Text>
                        <Text className="mt-3 font-nunito-bold text-[18px] text-white">
                            {summarizePackage(task)}
                        </Text>
                        <Text className="mt-2 font-nunito-regular text-[13px] leading-6 text-[#96a3b8]">
                            {task.specialInstructions || 'Verify listed items at pickup before departure.'}
                        </Text>
                    </View>

                    <View className="mt-4 rounded-[12px] bg-[#050505] px-4 py-4">
                        <Text className="font-nunito-regular text-[14px] text-[#8ea2c2]">Products</Text>
                        {task.items.map((item, index) => (
                            <View key={getTaskItemUiKey(item, index)} className="mt-3 flex-row items-center justify-between">
                                <View className="flex-1 pr-4">
                                    <Text className="font-nunito-bold text-[15px] text-white">
                                        {item.title}
                                    </Text>
                                    <Text className="mt-1 font-nunito-regular text-[12px] text-[#96a3b8]">
                                        Qty {item.quantity}{item.subtitle ? ` · ${item.subtitle}` : ''}
                                    </Text>
                                </View>
                                <Text className="font-nunito-bold text-[15px] text-[#1ce96e]">
                                    {formatInr(Number(item.totalPrice || item.unitPrice || 0))}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>

                <Pressable
                    onPress={() =>
                        void Linking.openURL(`tel:${task.pickup.contactPhone || task.dropoff.contactPhone || '+10000000000'}`)
                    }
                    className="mt-5 h-14 flex-row items-center justify-center rounded-[14px] border border-[#111713] bg-transparent"
                >
                    <Ionicons name="headset-outline" size={20} color="#111713" />
                    <Text className="ml-3 font-nunito-bold text-[16px] text-[#111713]">
                        Call eShop Support
                    </Text>
                </Pressable>

                <View className="mt-5 flex-row gap-4">
                    <Pressable
                        disabled={busy}
                        onPress={() => {
                            rejectTask(task.id, 'Rejected by rider from task details')
                                .then(() => router.replace('/'))
                                .catch(() => null)
                        }}
                        className="flex-1 h-14 items-center justify-center rounded-[14px] border border-[#111713] bg-white"
                        style={{ opacity: busy ? 0.72 : 1 }}
                    >
                        <Text className="font-nunito-bold text-[16px] text-[#111713]">Reject</Text>
                    </Pressable>
                    <Pressable
                        disabled={busy}
                        onPress={() => {
                            if (isAccepted) {
                                router.replace(`/task/${task.id}/pickup`)
                                return
                            }

                            acceptTask(task.id)
                                .then(() => router.replace(`/task/${task.id}/pickup`))
                                .catch(() => null)
                        }}
                        className="flex-[1.8] flex-row h-14 items-center justify-center rounded-[14px] bg-[#050505]"
                    >
                        {busy ? (
                            <ActivityIndicator color="#1ce96e" />
                        ) : (
                            <Text className="font-nunito-bold text-[16px] text-white">
                                {isAccepted ? 'Continue Job' : 'Accept Job'}
                            </Text>
                        )}

                        <Ionicons name="chevron-forward" size={20} color="#ffffff" />
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}
