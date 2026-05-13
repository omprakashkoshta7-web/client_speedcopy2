import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TaskMap } from '../components/TaskMap'
import type { DeliveryLocationSnapshot, DeliveryTask } from '../lib/api'
import { useDelivery } from '../lib/delivery-context'
import { toTaskCode } from '../lib/delivery-presentation'
import { getDeliveryPalette } from '../lib/delivery-theme'
import { useDeliverySessionGuard } from '../lib/use-delivery-session-guard'

const ISSUE_OPTIONS = [
    { key: 'payment_issue', label: 'Payment issue' },
    { key: 'order_trouble', label: 'Order trouble' },
    { key: 'app_feedback', label: 'App feedback' },
    { key: 'vehicle_assistance', label: 'Vehicle assistance' },
    { key: 'safety_emergency', label: 'Safety emergency' },
    { key: 'account_help', label: 'Account help' },
] as const

const PHOTO_SLOTS = 3

function formatCoordinate(value: number, positiveDirection: string, negativeDirection: string) {
    return `${Math.abs(value).toFixed(4)}° ${value >= 0 ? positiveDirection : negativeDirection}`
}

function formatLocationLabel(location?: DeliveryLocationSnapshot | null) {
    if (!location) return 'Live location unavailable'
    return `${formatCoordinate(location.lat, 'N', 'S')}, ${formatCoordinate(location.lng, 'E', 'W')}`
}

async function getFreshIncidentLocation() {
    const permission = await Location.requestForegroundPermissionsAsync()
    if (!permission.granted) {
        return null
    }

    const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
    })

    return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        heading:
            typeof position.coords.heading === 'number' && position.coords.heading >= 0
                ? position.coords.heading
                : undefined,
        speedKmph:
            typeof position.coords.speed === 'number' && position.coords.speed >= 0
                ? Number((position.coords.speed * 3.6).toFixed(1))
                : undefined,
        capturedAt: new Date(position.timestamp).toISOString(),
    }
}

export default function RaiseIncidentScreen() {
    const params = useLocalSearchParams<{ taskId?: string; issueType?: string }>()
    const taskId = Array.isArray(params.taskId) ? params.taskId[0] : params.taskId
    const issueTypeParam = Array.isArray(params.issueType) ? params.issueType[0] : params.issueType
    const {
        bootstrapping,
        session,
        busy,
        currentTask,
        deviceLocation,
        refreshTask,
        raiseSupportIncident,
        themeMode,
        error,
        clearError,
    } = useDelivery()

    const palette = getDeliveryPalette(themeMode)
    const hasSession = useDeliverySessionGuard(session, bootstrapping)
    const dark = palette.dark
    const colors = {
        screen: dark ? palette.background : '#f6f6f4',
        surface: dark ? '#131d18' : '#f2f1ef',
        surfaceStrong: dark ? '#19241e' : '#d1cdcd',
        surfaceMuted: dark ? '#18231d' : '#eef1f0',
        border: dark ? palette.border : '#c7cbc8',
        borderAccent: dark ? '#345847' : '#cfe7d7',
        borderDashed: dark ? '#51635a' : '#9a9da0',
        text: dark ? palette.text : '#24262d',
        textSoft: dark ? '#97a59d' : '#9aa5ba',
        textMuted: dark ? palette.textMuted : '#737373',
        sectionLabel: dark ? '#a9b7af' : '#8fa1ba',
        placeholder: dark ? '#a7b0ac' : '#f7f7f7',
        iconSurface: dark ? '#3a433e' : '#8f8f8f',
        button: dark ? palette.cardStrong : '#111111',
        buttonText: palette.buttonTextOnDark,
        notice: dark ? palette.accentSoft : '#edf7ef',
        noticeText: dark ? '#7de2a7' : '#2f8c52',
    }

    const [task, setTask] = useState<DeliveryTask | null>(currentTask || null)
    const [issueType, setIssueType] = useState(issueTypeParam || '')
    const [description, setDescription] = useState('')
    const [evidence, setEvidence] = useState<Array<string | null>>(
        Array.from({ length: PHOTO_SLOTS }, () => null),
    )
    const [selectorOpen, setSelectorOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [notice, setNotice] = useState<string | null>(null)
    const [previewLocation, setPreviewLocation] = useState<DeliveryLocationSnapshot | null>(
        deviceLocation,
    )

    useEffect(() => {
        setIssueType(issueTypeParam || '')
    }, [issueTypeParam])

    useEffect(() => {
        if (deviceLocation) {
            setPreviewLocation(deviceLocation)
        }
    }, [deviceLocation])

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

    useEffect(() => {
        let mounted = true

        void getFreshIncidentLocation()
            .then((location) => {
                if (!mounted || !location) return
                setPreviewLocation({
                    lat: location.lat,
                    lng: location.lng,
                    heading: location.heading,
                    speedKmph: location.speedKmph,
                    at: location.capturedAt || new Date().toISOString(),
                })
            })
            .catch(() => null)

        return () => {
            mounted = false
        }
    }, [])

    const issueLabel = useMemo(
        () => ISSUE_OPTIONS.find((option) => option.key === issueType)?.label ?? '',
        [issueType],
    )

    if (!hasSession || !session) return null

    const evidenceCount = evidence.filter(Boolean).length
    const locationSummary = formatLocationLabel(previewLocation || deviceLocation)

    const pickEvidence = async (slotIndex: number) => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!permission.granted) {
            setNotice('Allow photo access to attach verification images.')
            return
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.7,
        })

        if (result.canceled || !result.assets?.length) return
        const asset = result.assets[0]
        const uri = asset.uri

        if (!uri) return

        setEvidence((previous) => {
            const next = [...previous]
            next[slotIndex] = uri
            return next
        })
        setNotice(null)
    }

    const removeEvidence = (slotIndex: number) => {
        setEvidence((previous) => {
            const next = [...previous]
            next[slotIndex] = null
            return next
        })
    }

    const submitIncident = async () => {
        if (!issueType) {
            setNotice('Select an issue type before submitting the incident.')
            return
        }

        setSubmitting(true)
        try {
            const attachedPhotos = evidence.filter((uri): uri is string => Boolean(uri))
            const incidentLocation = (await getFreshIncidentLocation().catch(() => null)) ||
                (previewLocation
                    ? {
                          lat: previewLocation.lat,
                          lng: previewLocation.lng,
                          heading: previewLocation.heading,
                          speedKmph: previewLocation.speedKmph,
                          capturedAt: previewLocation.at,
                      }
                    : null)
            const nextLocationSummary = incidentLocation
                ? formatLocationLabel({ ...incidentLocation, at: incidentLocation.capturedAt || new Date().toISOString() })
                : 'Live location unavailable'
            const message = [
                `Issue: ${issueLabel}`,
                description.trim() ? `Description: ${description.trim()}` : '',
                `Photos attached: ${attachedPhotos.length}`,
                `Location: ${nextLocationSummary}`,
                task ? `Linked task: ${toTaskCode(task.orderId)}` : 'Linked task: none',
            ]
                .filter(Boolean)
                .join('\n')

            await raiseSupportIncident({
                issueType,
                description: message,
                taskId: task?.id,
                photos: attachedPhotos.map((uri, index) => ({
                    uri,
                    fileName: `incident-${index + 1}.jpg`,
                })),
                location: incidentLocation,
            })
            setNotice('Incident submitted to support for review.')
            setTimeout(() => {
                router.replace('/support')
            }, 600)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: colors.screen }}>
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: 28, paddingTop: 14, paddingBottom: 42 }}
                showsVerticalScrollIndicator={false}
            >
                <View className="mt-1 flex-row items-center justify-center">
                    <Pressable
                        onPress={() => (router.canGoBack() ? router.back() : router.replace('/support'))}
                        className="absolute left-0 h-10 w-10 items-start justify-center"
                        hitSlop={10}
                    >
                        <Ionicons name="chevron-back" size={24} color={colors.text} />
                    </Pressable>
                    <Text className="font-nunito-bold text-[22px]" style={{ color: colors.text }}>
                        Raise Incident
                    </Text>
                </View>

                {task ? (
                    <View
                        className="mt-10 flex-row items-center rounded-[18px] px-4 py-5"
                        style={{
                            backgroundColor: colors.surface,
                            borderWidth: 1,
                            borderColor: colors.border,
                        }}
                    >
                        <View
                            className="h-12 w-12 items-center justify-center rounded-[10px]"
                            style={{ backgroundColor: colors.iconSurface }}
                        >
                            <Ionicons
                                name="car-outline"
                                size={24}
                                color={dark ? '#f7faf8' : '#111111'}
                            />
                        </View>
                        <View className="ml-4 flex-1">
                            <Text
                                className="font-nunito-bold text-[12px] uppercase tracking-[1.2px]"
                                style={{ color: colors.text }}
                            >
                                Current Job
                            </Text>
                            <Text className="mt-1 font-nunito-bold text-[18px]" style={{ color: colors.textMuted }}>
                                Order {toTaskCode(task.orderId)}
                            </Text>
                        </View>
                    </View>
                ) : null}

                <Text
                    className="mt-7 font-nunito-bold text-[13px] uppercase tracking-[1.2px]"
                    style={{ color: colors.text }}
                >
                    Issue Type
                </Text>
                <Pressable
                    onPress={() => setSelectorOpen((open) => !open)}
                    className="mt-3 flex-row items-center rounded-[16px] px-5 py-5"
                    style={{
                        backgroundColor: colors.surfaceStrong,
                        borderWidth: 1,
                        borderColor: colors.borderAccent,
                    }}
                >
                    <Text
                        className="flex-1 font-nunito-regular text-[16px]"
                        style={{ color: issueLabel ? colors.text : colors.placeholder }}
                    >
                        {issueLabel || 'Select an issue type'}
                    </Text>
                    <Ionicons
                        name={selectorOpen ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.textSoft}
                    />
                </Pressable>

                {selectorOpen ? (
                    <View
                        className="mt-3 overflow-hidden rounded-[16px]"
                        style={{
                            backgroundColor: dark ? colors.surface : '#ffffff',
                            borderWidth: 1,
                            borderColor: colors.border,
                        }}
                    >
                        {ISSUE_OPTIONS.map((option, index) => {
                            const selected = option.key === issueType
                            return (
                                <Pressable
                                    key={option.key}
                                    onPress={() => {
                                        setIssueType(option.key)
                                        setSelectorOpen(false)
                                        setNotice(null)
                                    }}
                                    className="px-5 py-4"
                                    style={{
                                        backgroundColor: selected ? colors.notice : 'transparent',
                                        borderTopWidth: index === 0 ? 0 : 1,
                                        borderTopColor: dark ? '#22302a' : '#eceeed',
                                    }}
                                >
                                    <Text
                                        className="font-nunito-semi text-[15px]"
                                        style={{ color: selected ? colors.noticeText : colors.text }}
                                    >
                                        {option.label}
                                    </Text>
                                </Pressable>
                            )
                        })}
                    </View>
                ) : null}

                <View className="mt-7 flex-row items-center justify-between">
                    <Text
                        className="font-nunito-bold text-[13px] uppercase tracking-[1.2px]"
                        style={{ color: colors.text }}
                    >
                        Description
                    </Text>
                    <Text className="font-nunito-semi text-[12px]" style={{ color: colors.textSoft }}>
                        {description.length}/500
                    </Text>
                </View>
                <TextInput
                    multiline
                    value={description}
                    onChangeText={(value) => setDescription(value.slice(0, 500))}
                    placeholder="Provide as much detail as possible about what happened..."
                    placeholderTextColor={colors.placeholder}
                    textAlignVertical="top"
                    className="mt-3 min-h-[168px] rounded-[18px] px-5 py-5 font-nunito-regular text-[16px] leading-8"
                    style={{
                        backgroundColor: colors.surfaceStrong,
                        borderWidth: 1,
                        borderColor: colors.borderAccent,
                        color: dark ? colors.text : '#ffffff',
                    }}
                />

                <Text
                    className="mt-7 font-nunito-bold text-[13px] uppercase tracking-[1.2px]"
                    style={{ color: colors.sectionLabel }}
                >
                    Evidence & Photos
                </Text>
                <View className="mt-4 flex-row justify-between">
                    {evidence.map((uri, index) => {
                        const canUpload = !uri && evidenceCount < PHOTO_SLOTS

                        return (
                            <View
                                key={index}
                                className="h-[120px] w-[31%] overflow-hidden rounded-[16px]"
                                style={{
                                    backgroundColor: uri ? colors.surfaceMuted : index === 0 ? '#9ba2ad' : '#d2d5da',
                                    borderWidth: 1,
                                    borderStyle: uri ? 'solid' : 'dashed',
                                    borderColor: colors.borderDashed,
                                }}
                            >
                                {uri ? (
                                    <>
                                        <Image
                                            source={{ uri }}
                                            style={{ width: '100%', height: '100%' }}
                                            contentFit="cover"
                                        />
                                        <Pressable
                                            onPress={() => removeEvidence(index)}
                                            className="absolute right-2 top-2 h-6 w-6 items-center justify-center rounded-full"
                                            style={{ backgroundColor: 'rgba(17, 17, 17, 0.55)' }}
                                            hitSlop={6}
                                        >
                                            <Ionicons name="close" size={14} color="#ffffff" />
                                        </Pressable>
                                    </>
                                ) : (
                                    <Pressable
                                        disabled={!canUpload}
                                        onPress={() => void pickEvidence(index).catch(() => null)}
                                        className="flex-1 items-center justify-center px-2"
                                        style={{ opacity: canUpload ? 1 : 0.75 }}
                                    >
                                        <Ionicons
                                            name={index === 0 ? 'camera-outline' : 'image-outline'}
                                            size={28}
                                            color="#667085"
                                        />
                                        {index === 0 ? (
                                            <Text
                                                className="mt-2 text-center font-nunito-bold text-[12px] uppercase"
                                                style={{ color: '#6c6c6c' }}
                                            >
                                                Add Photo
                                            </Text>
                                        ) : null}
                                    </Pressable>
                                )}
                            </View>
                        )
                    })}
                </View>
                <Text
                    className="mt-4 text-center font-nunito-regular text-[13px]"
                    style={{ color: colors.sectionLabel }}
                >
                    You can upload up to 3 photos for verification.
                </Text>

                <View className="mt-8 flex-row items-center">
                    <Ionicons name="location-sharp" size={15} color={colors.textMuted} />
                    <Text
                        className="ml-1.5 font-nunito-bold text-[13px] uppercase tracking-[1.2px]"
                        style={{ color: colors.sectionLabel }}
                    >
                        Location Tagged
                    </Text>
                </View>
                <View className="mt-3 overflow-hidden rounded-[16px]">
                    <View
                        className="h-[106px] overflow-hidden rounded-[16px]"
                        style={{ backgroundColor: '#dfe9e5' }}
                    >
                        {task || previewLocation ? (
                            <TaskMap
                                task={task}
                                deviceLocation={deviceLocation}
                                focusLocation={previewLocation}
                                compact
                            />
                        ) : null}
                        <View
                            className="absolute bottom-0 left-0 top-0 w-[22%]"
                            style={{ backgroundColor: 'rgba(225, 237, 232, 0.8)' }}
                        />
                        <View
                            className="absolute bottom-0 right-0 top-0 w-[22%]"
                            style={{ backgroundColor: 'rgba(225, 237, 232, 0.8)' }}
                        />
                    </View>
                </View>
                <Text
                    className="mt-3 text-right font-nunito-regular text-[13px]"
                    style={{ color: colors.textSoft }}
                >
                    Captured at: {locationSummary}
                </Text>

                {notice ? (
                    <View
                        className="mt-6 rounded-[16px] px-4 py-4"
                        style={{ backgroundColor: notice.includes('submitted') ? colors.notice : palette.dangerSoft }}
                    >
                        <Text
                            className="font-nunito-semi text-[14px]"
                            style={{ color: notice.includes('submitted') ? colors.noticeText : palette.danger }}
                        >
                            {notice}
                        </Text>
                    </View>
                ) : null}

                {error ? (
                    <Pressable
                        onPress={clearError}
                        className="mt-5 rounded-[16px] px-4 py-4"
                        style={{ backgroundColor: palette.dangerSoft }}
                    >
                        <Text className="font-nunito-semi text-[14px]" style={{ color: palette.danger }}>
                            {error}
                        </Text>
                    </Pressable>
                ) : null}

                <Pressable
                    disabled={busy || submitting}
                    onPress={() => void submitIncident().catch(() => null)}
                    className="mt-8 h-[58px] items-center justify-center rounded-[16px]"
                    style={{
                        backgroundColor: colors.button,
                        opacity: busy || submitting ? 0.7 : 1,
                    }}
                >
                    {busy || submitting ? (
                        <ActivityIndicator color={colors.buttonText} />
                    ) : (
                        <Text className="font-nunito-bold text-[17px]" style={{ color: colors.buttonText }}>
                            Submit Incident
                        </Text>
                    )}
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    )
}
