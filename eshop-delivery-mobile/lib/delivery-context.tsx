import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'
import { router } from 'expo-router'
import {
    createContext,
    startTransition,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type PropsWithChildren,
} from 'react'
import { io, type Socket } from 'socket.io-client'
import {
    REALTIME_BASE_URL,
    type DeliveryIncidentLocation,
    type DeliveryIncidentPhotoUpload,
    getDeliveryDashboard,
    logoutSession,
    mapDeliveryProfileToUser,
    requestDeliveryOtp,
    verifyDeliveryOtp,
    type AuthSession,
    type DeliveryKycStatus,
    type DeliveryLocationSnapshot,
    type DeliveryTask,
    type OtpChallenge,
} from './api'

const SESSION_STORAGE_KEY = 'eshop:delivery:session'
const PREFERENCES_STORAGE_KEY = 'eshop:delivery:preferences'
const MOCK_OTP_EXPIRES_IN_MS = 5 * 60 * 1000
const ENABLE_DELIVERY_MOCKS = process.env.EXPO_PUBLIC_ENABLE_DELIVERY_MOCKS === 'true'

const ACTIVE_STATUSES = new Set([
    'assigned',
    'arrived_pickup',
    'picked',
    'out_for_delivery',
    'sos',
])

export type RiderKycState = {
    governmentIdFrontUri: string
    governmentIdBackUri: string
    selfieUri: string
    submittedAt: string | null
}

export type DeliveryThemeMode = 'light' | 'dark'
export type DeliveryLanguage = 'English' | 'Hindi'

type RiderPreferences = {
    phone: string
    isOnline: boolean
    themeMode: DeliveryThemeMode
    language: DeliveryLanguage
    vehicleInfo: string
    kyc: RiderKycState
}

type DeliveryPreferencesStore = {
    lastPhone: string
    riders: Record<string, RiderPreferences>
}

type DeliveryLocationEvent = {
    taskId?: string
    etaMinutes?: number
    distanceKm?: number
    route?: DeliveryTask['route']
    lat?: number
    lng?: number
    heading?: number
    speedKmph?: number
    updatedAt?: string
}

type DeliveryDashboardStats = {
    tasksDone: number
    totalEarnings: number
    todayEarnings: number
    weekEarnings: number
}

type DeliveryContextValue = {
    bootstrapping: boolean
    busy: boolean
    refreshing: boolean
    session: AuthSession | null
    currentTask: DeliveryTask | null
    availableTasks: DeliveryTask[]
    completedTasks: DeliveryTask[]
    deviceLocation: DeliveryLocationSnapshot | null
    socketConnected: boolean
    locationPermission: Location.PermissionStatus | 'undetermined'
    error: string | null
    isOnline: boolean
    dashboardStats: DeliveryDashboardStats
    preferredPhone: string
    kycStatus: DeliveryKycStatus | 'unsubmitted'
    kycState: RiderKycState
    themeMode: DeliveryThemeMode
    notificationsEnabled: boolean
    language: DeliveryLanguage
    vehicleInfo: string
    requestOtpCode: (phone: string) => Promise<OtpChallenge>
    verifyOtpCode: (phone: string, code: string) => Promise<void>
    logout: () => Promise<void>
    refreshDashboard: () => Promise<void>
    acceptTask: (taskId: string) => Promise<void>
    rejectTask: (taskId: string, reason: string) => Promise<void>
    markArrived: (taskId: string) => Promise<void>
    confirmPickup: (taskId: string, checkedItemIds: string[]) => Promise<void>
    markDelivered: (taskId: string) => Promise<void>
    submitDeliveryProof: (
        taskId: string,
        payload: { otp?: string; photoUrl?: string; notes?: string },
    ) => Promise<void>
    markFailure: (taskId: string, payload: { reason: string; note?: string }) => Promise<void>
    raiseSos: (taskId: string, message: string) => Promise<void>
    raiseSupportIncident: (payload: {
        issueType: string
        description: string
        taskId?: string
        photos?: DeliveryIncidentPhotoUpload[]
        location?: DeliveryIncidentLocation | null
    }) => Promise<void>
    refreshTask: (taskId: string) => Promise<DeliveryTask | null>
    setOnlineAvailability: (next: boolean) => Promise<void>
    saveKycDraft: (draft: Partial<RiderKycState>) => Promise<void>
    submitKyc: () => Promise<void>
    updateProfile: (payload: {
        name?: string
        phone?: string
        avatarUrl?: string
    }) => Promise<void>
    setThemeMode: (next: DeliveryThemeMode) => Promise<void>
    setNotificationsEnabled: (next: boolean) => Promise<void>
    setLanguage: (next: DeliveryLanguage) => Promise<void>
    setVehicleInfo: (next: string) => Promise<void>
    clearError: () => void
}

const DeliveryContext = createContext<DeliveryContextValue | null>(null)

function createDefaultKycState(): RiderKycState {
    return {
        governmentIdFrontUri: '',
        governmentIdBackUri: '',
        selfieUri: '',
        submittedAt: null,
    }
}

function createDefaultRiderPreferences(phone = ''): RiderPreferences {
    return {
        phone,
        isOnline: false,
        themeMode: 'light',
        language: 'English',
        vehicleInfo: '',
        kyc: createDefaultKycState(),
    }
}

function normalizePreferencesStore(
    input?: Partial<DeliveryPreferencesStore> | null,
): DeliveryPreferencesStore {
    const riders = Object.fromEntries(
        Object.entries(input?.riders || {}).map(([userId, prefs]) => [
            userId,
            {
                ...createDefaultRiderPreferences(String(prefs?.phone || '')),
                ...prefs,
                kyc: {
                    ...createDefaultKycState(),
                    ...(prefs?.kyc || {}),
                },
            },
        ]),
    )

    return {
        lastPhone: String(input?.lastPhone || ''),
        riders,
    }
}

function normalizeLocationSnapshot(input: {
    coords: {
        latitude: number
        longitude: number
        heading: number | null
        speed: number | null
    }
    timestamp: number
}): DeliveryLocationSnapshot {
    const speedMetersPerSecond = Number(input.coords.speed || 0)
    return {
        lat: input.coords.latitude,
        lng: input.coords.longitude,
        heading: Number(input.coords.heading || 0),
        speedKmph: Number((speedMetersPerSecond * 3.6).toFixed(1)),
        at: new Date(input.timestamp).toISOString(),
    }
}

function upsertTask(list: DeliveryTask[], task: DeliveryTask) {
    return [task, ...list.filter((entry) => entry.id !== task.id)]
}

function removeTask(list: DeliveryTask[], taskId: string) {
    return list.filter((entry) => entry.id !== taskId)
}

function isMockDeliverySession(session: AuthSession | null | undefined) {
    if (!session) return false
    return Boolean(session.mockData ?? session.mockAuth)
}

function usesMockDeliveryData(session: AuthSession | null | undefined) {
    return ENABLE_DELIVERY_MOCKS && isMockDeliverySession(session)
}

function sanitizeAvailableTasks(tasks: DeliveryTask[], currentTaskId?: string | null) {
    return tasks.filter(
        (task) =>
            task.status === 'pending_assignment' &&
            !task.activeAssignment &&
            !task.riderId &&
            task.id !== currentTaskId,
    )
}

function sanitizeCompletedTasks(tasks: DeliveryTask[]) {
    return tasks.filter((task) => task.status === 'delivered')
}

function createDefaultDashboardStats(): DeliveryDashboardStats {
    return {
        tasksDone: 0,
        totalEarnings: 0,
        todayEarnings: 0,
        weekEarnings: 0,
    }
}

function resolveStoredGuestPreferences(store: DeliveryPreferencesStore) {
    const riderEntries = Object.values(store.riders || {})
    const lastPhone = String(store.lastPhone || '')

    return (
        riderEntries.find((prefs) => String(prefs.phone || '') === lastPhone) ||
        riderEntries[0] ||
        createDefaultRiderPreferences(lastPhone)
    )
}

function getSessionKycStatus(session: AuthSession | null | undefined): DeliveryKycStatus | 'unsubmitted' {
    if (!session) return 'unsubmitted'

    if (session.user.kycStatus) {
        return session.user.kycStatus
    }

    return session.user.kycSubmittedAt ? 'pending' : 'unsubmitted'
}

function canAccessDeliveryFeatures(session: AuthSession | null | undefined) {
    const status = getSessionKycStatus(session)
    return status === 'approved' || status === 'pending'
}

function createMockSession(phone: string): AuthSession {
    return {
        accessToken: 'mock-delivery-access-token',
        refreshToken: 'mock-delivery-refresh-token',
        sessionId: 'mock-delivery-session',
        expiresIn: '7d',
        mockAuth: true,
        mockData: true,
        user: {
            id: 'mock-delivery-user',
            name: 'Rahul Sharma',
            email: 'delivery1@eshop.test',
            phone,
            role: 'delivery',
            isBlocked: false,
            isPhoneVerified: true,
            authProviders: ['phone'],
            permissions: {
                notifications: 'granted',
                location: 'granted',
            },
            avatarUrl: '',
        },
    }
}

function createMockTasks(riderId: string): {
    available: DeliveryTask[]
    completed: DeliveryTask[]
} {
    const now = new Date().toISOString()

    const available: DeliveryTask[] = [
        {
            id: 'mock-task-1001',
            orderId: 'SC-98234',
            customerId: 'mock-customer-1',
            riderId: '',
            activeAssignment: false,
            status: 'pending_assignment',
            pickup: {
                name: 'SpeedCopy Center',
                addressLine: '123 Market Street, Downtown',
                note: 'Ask for the dispatch desk',
                contactName: 'Dispatch Team',
                contactPhone: '+917771899074',
                location: { lat: 23.8103, lng: 90.4125 },
            },
            dropoff: {
                name: 'Tech Park, Building B',
                addressLine: '800 Innovation Drive',
                note: 'Deliver at reception',
                contactName: 'Client Office',
                contactPhone: '+917001112223',
                location: { lat: 23.7988, lng: 90.4013 },
            },
            items: [
                {
                    itemId: 'doc-envelope',
                    title: 'Document Envelopes',
                    subtitle: 'Standard A4 security pack',
                    quantity: 2,
                    checkedAtPickup: false,
                },
                {
                    itemId: 'printed-blueprints',
                    title: 'Printed Blueprints',
                    subtitle: 'Large cardboard tube',
                    quantity: 1,
                    checkedAtPickup: false,
                },
            ],
            specialInstructions:
                'Fragile items included. Ensure the blueprint tube remains upright during transit.',
            etaMinutes: 12,
            distanceKm: 4.2,
            chatThreadId: 'mock-chat-1001',
            route: {
                provider: 'mock',
                destinationType: 'pickup',
                polyline: '',
                durationSeconds: 720,
                distanceMeters: 4200,
                nextInstruction: 'Turn right onto Market Street',
                nextInstructionDistanceMeters: 200,
                updatedAt: now,
                origin: { lat: 23.805, lng: 90.405 },
                destination: { lat: 23.8103, lng: 90.4125 },
            },
            latestLocation: {
                lat: 23.805,
                lng: 90.405,
                heading: 30,
                speedKmph: 18,
                at: now,
            },
            history: [{ status: 'pending_assignment', at: now, note: 'Mock task ready' }],
            createdAt: now,
            updatedAt: now,
        },
        {
            id: 'mock-task-1002',
            orderId: 'SC-91022',
            customerId: 'mock-customer-2',
            riderId: '',
            activeAssignment: false,
            status: 'pending_assignment',
            pickup: {
                name: 'eShop Fulfillment Hub',
                addressLine: 'Block A Warehouse District',
                note: 'Collect from bay 3',
                contactName: 'Warehouse Team',
                contactPhone: '+917771899074',
                location: { lat: 23.8142, lng: 90.418 },
            },
            dropoff: {
                name: 'Residency Tower, Apt 402',
                addressLine: '890 Pine Street, North Bay',
                note: 'Call on arrival',
                contactName: 'Ariana Khan',
                contactPhone: '+917009998887',
                location: { lat: 23.7878, lng: 90.3948 },
            },
            items: [
                {
                    itemId: 'small-box',
                    title: 'Small Box',
                    subtitle: 'Lightweight electronics',
                    quantity: 1,
                    checkedAtPickup: false,
                },
            ],
            specialInstructions: 'Handle with care and avoid tilting the package.',
            etaMinutes: 10,
            distanceKm: 3.6,
            chatThreadId: 'mock-chat-1002',
            route: {
                provider: 'mock',
                destinationType: 'pickup',
                polyline: '',
                durationSeconds: 600,
                distanceMeters: 3600,
                nextInstruction: 'Continue straight for 500 m',
                nextInstructionDistanceMeters: 500,
                updatedAt: now,
                origin: { lat: 23.809, lng: 90.409 },
                destination: { lat: 23.8142, lng: 90.418 },
            },
            latestLocation: {
                lat: 23.809,
                lng: 90.409,
                heading: 15,
                speedKmph: 14,
                at: now,
            },
            history: [{ status: 'pending_assignment', at: now, note: 'Mock task ready' }],
            createdAt: now,
            updatedAt: now,
        },
    ]

    const completed: DeliveryTask[] = [
        {
            id: 'mock-task-complete-1',
            orderId: 'SC-87001',
            customerId: 'mock-customer-3',
            riderId,
            activeAssignment: false,
            status: 'delivered',
            pickup: {
                name: 'eShop Fulfillment Center',
                addressLine: 'Warehouse District, Block A',
                location: { lat: 23.8103, lng: 90.4125 },
            },
            dropoff: {
                name: 'Green Residency',
                addressLine: '123 Green Street, Apartment 4B',
                location: { lat: 23.7899, lng: 90.3981 },
            },
            items: [
                {
                    itemId: 'mock-complete-item',
                    title: 'Office Parcel',
                    quantity: 1,
                    checkedAtPickup: true,
                },
            ],
            specialInstructions: '',
            etaMinutes: 8,
            distanceKm: 2.4,
            chatThreadId: 'mock-chat-complete',
            route: {
                provider: 'mock',
                destinationType: 'dropoff',
                polyline: '',
                durationSeconds: 480,
                distanceMeters: 2400,
                nextInstruction: 'Destination reached',
                nextInstructionDistanceMeters: 0,
                updatedAt: now,
                origin: { lat: 23.8103, lng: 90.4125 },
                destination: { lat: 23.7899, lng: 90.3981 },
            },
            latestLocation: {
                lat: 23.7899,
                lng: 90.3981,
                heading: 0,
                speedKmph: 0,
                at: now,
            },
            history: [
                { status: 'assigned', at: now, note: 'Mock accepted' },
                { status: 'arrived_pickup', at: now, note: 'Mock arrived' },
                { status: 'out_for_delivery', at: now, note: 'Mock in transit' },
                { status: 'delivered', at: now, note: 'Mock complete' },
            ],
            createdAt: now,
            updatedAt: now,
        },
    ]

    return { available, completed }
}

export function DeliveryProvider({ children }: PropsWithChildren) {
    const [bootstrapping, setBootstrapping] = useState(true)
    const [busy, setBusy] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const [session, setSession] = useState<AuthSession | null>(null)
    const [currentTask, setCurrentTask] = useState<DeliveryTask | null>(null)
    const [availableTasks, setAvailableTasks] = useState<DeliveryTask[]>([])
    const [completedTasks, setCompletedTasks] = useState<DeliveryTask[]>([])
    const [dashboardStats, setDashboardStats] = useState<DeliveryDashboardStats>(
        createDefaultDashboardStats(),
    )
    const [deviceLocation, setDeviceLocation] = useState<DeliveryLocationSnapshot | null>(null)
    const [socketConnected, setSocketConnected] = useState(false)
    const [locationPermission, setLocationPermission] = useState<
        Location.PermissionStatus | 'undetermined'
    >('undetermined')
    const [error, setError] = useState<string | null>(null)
    const [preferencesStore, setPreferencesStore] = useState<DeliveryPreferencesStore>(
        normalizePreferencesStore(),
    )

    const socketRef = useRef<Socket | null>(null)
    const locationWatchRef = useRef<Location.LocationSubscription | null>(null)
    const lastLocationSyncAtRef = useRef(0)
    const sessionRef = useRef<AuthSession | null>(null)
    const currentTaskRef = useRef<DeliveryTask | null>(null)

    useEffect(() => {
        sessionRef.current = session
    }, [session])

    useEffect(() => {
        currentTaskRef.current = currentTask
    }, [currentTask])

    const persistSession = useCallback(async (nextSession: AuthSession | null) => {
        if (!nextSession) {
            await AsyncStorage.removeItem(SESSION_STORAGE_KEY)
            return
        }
        await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession))
    }, [])

    const persistPreferences = useCallback(async (nextStore: DeliveryPreferencesStore) => {
        await AsyncStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(nextStore))
    }, [])

    const updatePreferences = useCallback(
        (updater: (store: DeliveryPreferencesStore) => DeliveryPreferencesStore) => {
            setPreferencesStore((previous) => {
                const next = normalizePreferencesStore(updater(previous))
                void persistPreferences(next)
                return next
            })
        },
        [persistPreferences],
    )

    const updateCurrentRiderPreferences = useCallback(
        (updater: (prefs: RiderPreferences) => RiderPreferences) => {
            const activeSession = sessionRef.current
            if (!activeSession) return

            updatePreferences((previous) => {
                const currentPrefs =
                    previous.riders[activeSession.user.id] ||
                    createDefaultRiderPreferences(
                        activeSession.user.phone || previous.lastPhone,
                    )

                return {
                    ...previous,
                    riders: {
                        ...previous.riders,
                        [activeSession.user.id]: updater(currentPrefs),
                    },
                }
            })
        },
        [updatePreferences],
    )

    const currentRiderPreferences = useMemo(() => {
        if (!session) {
            return resolveStoredGuestPreferences(preferencesStore)
        }

        return (
            preferencesStore.riders[session.user.id] ||
            createDefaultRiderPreferences(session.user.phone || preferencesStore.lastPhone)
        )
    }, [preferencesStore, session])

    const applySession = useCallback(
        async (nextSession: AuthSession) => {
            startTransition(() => {
                setSession(nextSession)
            })
            await persistSession(nextSession)
        },
        [persistSession],
    )

    const syncTaskSnapshot = useCallback((task: DeliveryTask | null) => {
        const riderId = sessionRef.current?.user.id || ''

        startTransition(() => {
            if (!task) {
                setCurrentTask(null)
                return
            }

            const assignedToCurrentRider = Boolean(task.riderId && task.riderId === riderId)
            const isActiveTask = assignedToCurrentRider && ACTIVE_STATUSES.has(task.status)
            const isDeliveredTask = assignedToCurrentRider && task.status === 'delivered'

            setAvailableTasks((previous) =>
                task.status === 'pending_assignment'
                    ? upsertTask(previous, task)
                    : removeTask(previous, task.id),
            )

            setCurrentTask((previous) => {
                if (isActiveTask) return task
                if (previous?.id === task.id) return null
                return previous
            })

            if (isDeliveredTask) {
                setCompletedTasks((previous) => upsertTask(previous, task))
            }
        })
    }, [])

    const applyCurrentTask = useCallback((task: DeliveryTask | null) => {
        startTransition(() => {
            if (!task) {
                setCurrentTask(null)
                return
            }

            const isActiveTask = ACTIVE_STATUSES.has(task.status)
            setCurrentTask(isActiveTask ? task : null)
            setAvailableTasks((previous) => removeTask(previous, task.id))
            if (task.status === 'delivered') {
                setCompletedTasks((previous) => upsertTask(previous, task))
                return
            }

            setCompletedTasks((previous) => removeTask(previous, task.id))
        })
    }, [])

    const refreshDashboard = useCallback(async () => {
        const activeSession = sessionRef.current
        if (!activeSession) return

        setRefreshing(true)
        try {
            if (usesMockDeliveryData(activeSession)) {
                const mockTasks = createMockTasks(activeSession.user.id)
                startTransition(() => {
                    setCurrentTask((previous) => previous)
                    setAvailableTasks((previous) =>
                        previous.length ? previous : mockTasks.available,
                    )
                    setCompletedTasks((previous) =>
                        previous.length ? previous : mockTasks.completed,
                    )
                    setDashboardStats({
                        tasksDone: mockTasks.completed.length,
                        totalEarnings: mockTasks.completed.reduce(
                            (sum, task) => sum + Number(task.estimatedPayout || 0),
                            0,
                        ),
                        todayEarnings: mockTasks.completed.reduce(
                            (sum, task) => sum + Number(task.estimatedPayout || 0),
                            0,
                        ),
                        weekEarnings: mockTasks.completed.reduce(
                            (sum, task) => sum + Number(task.estimatedPayout || 0),
                            0,
                        ),
                    })
                    setError(null)
                })
                return
            }

            if (!canAccessDeliveryFeatures(activeSession)) {
                startTransition(() => {
                    setCurrentTask(null)
                    setAvailableTasks([])
                    setCompletedTasks([])
                    setDashboardStats(createDefaultDashboardStats())
                    setError('Complete identity verification submission to access the delivery dashboard')
                })
                return
            }

            const dashboard = await getDeliveryDashboard(activeSession.accessToken)
            const nextCurrentTask = dashboard.currentTask || null
            const nextAvailableTasks = sanitizeAvailableTasks(
                dashboard.availableTasks || [],
                nextCurrentTask?.id,
            )
            const nextCompletedTasks = sanitizeCompletedTasks(dashboard.recentTasks || [])
            const nextIsOnline = Boolean(dashboard.availability?.isAvailable)
            const completedTaskEarnings = nextCompletedTasks.reduce(
                (sum, task) => sum + Number(task.estimatedPayout || 0),
                0,
            )
            const nextStats: DeliveryDashboardStats = {
                tasksDone: Number(dashboard.taskSummary?.delivered || nextCompletedTasks.length || 0),
                totalEarnings: Number(
                    dashboard.earnings?.summary?.total ||
                        dashboard.profile.totalEarnings ||
                        completedTaskEarnings ||
                        0,
                ),
                todayEarnings: Number(dashboard.earnings?.summary?.today || 0),
                weekEarnings: Number(dashboard.earnings?.summary?.week || 0),
            }
            const profileUser = mapDeliveryProfileToUser(dashboard.profile)
            const nextUser: AuthSession['user'] = {
                ...activeSession.user,
                ...profileUser,
                permissions: activeSession.user.permissions || profileUser.permissions,
                avatarUrl: activeSession.user.avatarUrl || profileUser.avatarUrl,
                kycStatus:
                    dashboard.availability?.kycStatus ||
                    profileUser.kycStatus ||
                    activeSession.user.kycStatus,
                kycSubmittedAt:
                    dashboard.profile.identityVerification?.submittedAt ||
                    profileUser.kycSubmittedAt ||
                    activeSession.user.kycSubmittedAt,
            }

            startTransition(() => {
                setCurrentTask(nextCurrentTask)
                setAvailableTasks(nextAvailableTasks)
                setCompletedTasks(nextCompletedTasks)
                setDashboardStats(nextStats)
                setError(null)
            })

            updatePreferences((previous) => {
                const currentPrefs =
                    previous.riders[activeSession.user.id] ||
                    createDefaultRiderPreferences(
                        activeSession.user.phone || previous.lastPhone,
                    )

                if (currentPrefs.isOnline === nextIsOnline) {
                    return previous
                }

                return {
                    ...previous,
                    riders: {
                        ...previous.riders,
                        [activeSession.user.id]: {
                            ...currentPrefs,
                            isOnline: nextIsOnline,
                        },
                    },
                }
            })

            const shouldSyncSessionUser =
                activeSession.user.name !== nextUser.name ||
                activeSession.user.email !== nextUser.email ||
                activeSession.user.phone !== nextUser.phone ||
                activeSession.user.kycStatus !== nextUser.kycStatus ||
                activeSession.user.kycSubmittedAt !== nextUser.kycSubmittedAt

            if (shouldSyncSessionUser) {
                await applySession({
                    ...activeSession,
                    user: nextUser,
                })
            }
        } catch (refreshError) {
            setError(
                refreshError instanceof Error
                    ? refreshError.message
                    : 'Unable to refresh delivery dashboard',
            )
        } finally {
            setRefreshing(false)
        }
    }, [applySession, updatePreferences])

    const hydrate = useCallback(async () => {
        setBootstrapping(true)
        try {
            const [rawSession, rawPreferences] = await Promise.all([
                AsyncStorage.getItem(SESSION_STORAGE_KEY),
                AsyncStorage.getItem(PREFERENCES_STORAGE_KEY),
            ])

            if (rawPreferences) {
                setPreferencesStore(
                    normalizePreferencesStore(JSON.parse(rawPreferences) as DeliveryPreferencesStore),
                )
            }

            if (!rawSession) {
                setSession(null)
                return
            }

            const parsedSession = JSON.parse(rawSession) as AuthSession
            if (isMockDeliverySession(parsedSession) && !ENABLE_DELIVERY_MOCKS) {
                setSession(null)
                setCurrentTask(null)
                setAvailableTasks([])
                setCompletedTasks([])
                await persistSession(null)
                return
            }

            if (usesMockDeliveryData(parsedSession)) {
                setSession(parsedSession)
                return
            }
            setSession(parsedSession)
        } catch {
            setSession(null)
            await persistSession(null)
        } finally {
            setBootstrapping(false)
        }
    }, [persistSession])

    useEffect(() => {
        void hydrate()
    }, [hydrate])

    useEffect(() => {
        if (!session) {
            startTransition(() => {
                setCurrentTask(null)
                setAvailableTasks([])
                setCompletedTasks([])
                setDashboardStats(createDefaultDashboardStats())
                setDeviceLocation(null)
            })
            return
        }

        updatePreferences((previous) => ({
            ...previous,
            lastPhone: session.user.phone || previous.lastPhone,
            riders: {
                ...previous.riders,
                [session.user.id]: {
                    ...(previous.riders[session.user.id] ||
                        createDefaultRiderPreferences(
                            session.user.phone || previous.lastPhone,
                        )),
                    phone:
                        previous.riders[session.user.id]?.phone ||
                        session.user.phone ||
                        previous.lastPhone,
                },
            },
        }))

        void refreshDashboard()
    }, [refreshDashboard, session, updatePreferences])

    useEffect(() => {
        if (!session) {
            socketRef.current?.disconnect()
            socketRef.current = null
            setSocketConnected(false)
            return
        }

        if (usesMockDeliveryData(session)) {
            setSocketConnected(true)
            return
        }

        if (!REALTIME_BASE_URL) {
            setSocketConnected(false)
            return
        }

        const socket = io(REALTIME_BASE_URL, {
            transports: ['websocket'],
            auth: { token: session.accessToken },
        })

        socketRef.current = socket

        socket.on('connect', () => {
            setSocketConnected(true)
            if (currentTaskRef.current?.id) {
                socket.emit('task:join', { taskId: currentTaskRef.current.id })
            }
        })

        socket.on('disconnect', () => {
            setSocketConnected(false)
        })

        socket.on('delivery.location.updated', (payload: DeliveryLocationEvent) => {
            if (!payload.taskId || currentTaskRef.current?.id !== payload.taskId) {
                return
            }

            startTransition(() => {
                setCurrentTask((previous) =>
                    previous
                        ? {
                              ...previous,
                              etaMinutes: Number(payload.etaMinutes || previous.etaMinutes),
                              distanceKm: Number(payload.distanceKm || previous.distanceKm),
                              route: payload.route || previous.route,
                              latestLocation:
                                  typeof payload.lat === 'number' &&
                                  typeof payload.lng === 'number'
                                      ? {
                                            lat: Number(payload.lat),
                                            lng: Number(payload.lng),
                                            heading: Number(payload.heading || 0),
                                            speedKmph: Number(payload.speedKmph || 0),
                                            at: String(
                                                payload.updatedAt || new Date().toISOString(),
                                            ),
                                        }
                                      : previous.latestLocation,
                          }
                        : previous,
                )
            })
        })

        const taskEventNames = [
            'delivery.task.created',
            'delivery.task.assigned',
            'delivery.task.arrived_pickup',
            'delivery.task.out_for_delivery',
            'delivery.task.delivered',
            'delivery.task.failed',
            'delivery.task.rejected',
            'delivery.task.sos',
        ]

        for (const eventName of taskEventNames) {
            socket.on(
                eventName,
                (
                    payload: Partial<DeliveryTask> & {
                        taskId?: string
                        status?: DeliveryTask['status']
                    },
                ) => {
                    if (!payload.taskId) return
                    void refreshDashboard()
                },
            )
        }

        return () => {
            socket.disconnect()
            socketRef.current = null
            setSocketConnected(false)
        }
    }, [session, refreshDashboard])

    useEffect(() => {
        if (!session || usesMockDeliveryData(session) || !canAccessDeliveryFeatures(session)) {
            return
        }

        const shouldPoll = currentRiderPreferences.isOnline || Boolean(currentTask)
        if (!shouldPoll) {
            return
        }

        const interval = setInterval(() => {
            void refreshDashboard()
        }, 15000)

        return () => clearInterval(interval)
    }, [
        currentRiderPreferences.isOnline,
        currentTask,
        refreshDashboard,
        session,
    ])

    useEffect(() => {
        if (socketRef.current && currentTask?.id) {
            socketRef.current.emit('task:join', { taskId: currentTask.id })
        }
    }, [currentTask?.id])

    useEffect(() => {
        const activeSession = sessionRef.current
        const activeTask = currentTaskRef.current

        if (
            !activeSession ||
            !activeTask ||
            !ACTIVE_STATUSES.has(activeTask.status) ||
            activeTask.status === 'delivered'
        ) {
            locationWatchRef.current?.remove()
            locationWatchRef.current = null
            return
        }

        let cancelled = false

        const startLocationWatch = async () => {
            const permissionResult = await Location.requestForegroundPermissionsAsync()
            if (cancelled) return

            setLocationPermission(permissionResult.status)
            if (permissionResult.status !== 'granted') {
                setError('Location permission is required for live delivery tracking')
                return
            }

            const currentPosition = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            }).catch(() => null)

            if (currentPosition && !cancelled) {
                const snapshot = normalizeLocationSnapshot(currentPosition)
                setDeviceLocation(snapshot)
            }

            locationWatchRef.current?.remove()
            locationWatchRef.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.BestForNavigation,
                    distanceInterval: 15,
                    timeInterval: 8000,
                },
                async (nextPosition) => {
                    const snapshot = normalizeLocationSnapshot(nextPosition)
                    setDeviceLocation(snapshot)

                    const currentSession = sessionRef.current
                    const trackedTask = currentTaskRef.current
                    if (!currentSession || !trackedTask) return
                    if (!ACTIVE_STATUSES.has(trackedTask.status)) return

                    const now = Date.now()
                    if (now - lastLocationSyncAtRef.current < 12000) {
                        return
                    }

                    lastLocationSyncAtRef.current = now

                    if (usesMockDeliveryData(currentSession)) {
                        applyCurrentTask({
                            ...trackedTask,
                            latestLocation: snapshot,
                            updatedAt: snapshot.at,
                        })
                        return
                    }

                    try {
                        const { updateTaskLocation } = await import('./api')
                        const task = await updateTaskLocation(currentSession.accessToken, trackedTask.id, {
                            lat: snapshot.lat,
                            lng: snapshot.lng,
                            heading: snapshot.heading,
                            speedKmph: snapshot.speedKmph,
                        })
                        applyCurrentTask(task)
                    } catch (locationError) {
                        setError(
                            locationError instanceof Error
                                ? locationError.message
                                : 'Unable to sync rider location',
                        )
                    }
                },
            )
        }

        void startLocationWatch()

        return () => {
            cancelled = true
            locationWatchRef.current?.remove()
            locationWatchRef.current = null
        }
    }, [applyCurrentTask, currentTask, session])

    const requestOtpCode = useCallback(
        async (phone: string) => {
            setBusy(true)
            try {
                const challenge = await requestDeliveryOtp(phone.trim())
                updatePreferences((previous) => ({
                    ...previous,
                    lastPhone: phone.trim(),
                }))
                setError(null)
                return challenge
            } catch (otpError) {
                setError(
                    otpError instanceof Error
                        ? otpError.message
                        : 'Unable to request verification code',
                )
                throw otpError
            } finally {
                setBusy(false)
            }
        },
        [updatePreferences],
    )

    const verifyOtpCode = useCallback(
        async (phone: string, code: string) => {
            setBusy(true)
            try {
                const nextSession = await verifyDeliveryOtp(phone.trim(), code.trim())
                const nextKycSubmittedAt = nextSession.user.kycSubmittedAt || null

                setSession(nextSession)
                setError(null)
                updatePreferences((previous) => ({
                    ...previous,
                    lastPhone: phone.trim(),
                    riders: {
                        ...previous.riders,
                        [nextSession.user.id]: {
                            ...(previous.riders[nextSession.user.id] ||
                                createDefaultRiderPreferences(phone.trim())),
                            phone: phone.trim(),
                            kyc: {
                                ...(
                                    previous.riders[nextSession.user.id]?.kyc ||
                                    createDefaultKycState()
                                ),
                                submittedAt:
                                    nextKycSubmittedAt ||
                                    previous.riders[nextSession.user.id]?.kyc?.submittedAt ||
                                    null,
                            },
                        },
                    },
                }))
                await persistSession(nextSession)

                if (usesMockDeliveryData(nextSession)) {
                    const mockTasks = createMockTasks(nextSession.user.id)
                    startTransition(() => {
                        setCurrentTask(null)
                        setAvailableTasks(mockTasks.available)
                        setCompletedTasks(mockTasks.completed)
                        setSocketConnected(true)
                    })
                } else {
                    startTransition(() => {
                        setCurrentTask(null)
                        setAvailableTasks([])
                        setCompletedTasks([])
                        setSocketConnected(false)
                    })
                }
            } catch (verifyError) {
                setError(
                    verifyError instanceof Error
                        ? verifyError.message
                        : 'Unable to verify the code',
                )
                throw verifyError
            } finally {
                setBusy(false)
            }
        },
        [persistSession, updatePreferences],
    )

    const logout = useCallback(async () => {
        const activeSession = sessionRef.current
        setBusy(true)
        try {
            if (activeSession && !usesMockDeliveryData(activeSession)) {
                await logoutSession(activeSession.accessToken).catch(() => null)
            }
        } finally {
            setSession(null)
            setCurrentTask(null)
            setAvailableTasks([])
            setCompletedTasks([])
            setDeviceLocation(null)
            setError(null)
            await persistSession(null)
            router.replace('/')
            setBusy(false)
        }
    }, [persistSession])

    const setOnlineAvailability = useCallback(
        async (next: boolean) => {
            const activeSession = sessionRef.current
            const activeTask = currentTaskRef.current
            if (!next && activeTask && ACTIVE_STATUSES.has(activeTask.status)) {
                setError('Finish the active delivery before going offline')
                return
            }

            updateCurrentRiderPreferences((previous) => ({
                ...previous,
                isOnline: next,
            }))
            setError(null)

            if (next && activeSession && !canAccessDeliveryFeatures(activeSession)) {
                setError('Complete identity verification submission before going online')
                updateCurrentRiderPreferences((previous) => ({
                    ...previous,
                    isOnline: false,
                }))
                return
            }

            if (!next) {
                if (activeSession && !usesMockDeliveryData(activeSession)) {
                    const { updateDeliveryAvailability } = await import('./api')
                    await updateDeliveryAvailability(activeSession.accessToken, false)
                }
                startTransition(() => {
                    setAvailableTasks([])
                })
                return
            }

            if (activeSession && !usesMockDeliveryData(activeSession)) {
                const { updateDeliveryAvailability } = await import('./api')
                await updateDeliveryAvailability(activeSession.accessToken, true)
            }
            await refreshDashboard()
        },
        [refreshDashboard, updateCurrentRiderPreferences],
    )

    const saveKycDraft = useCallback(
        async (draft: Partial<RiderKycState>) => {
            updateCurrentRiderPreferences((previous) => ({
                ...previous,
                kyc: {
                    ...previous.kyc,
                    ...draft,
                },
            }))
            setError(null)
        },
        [updateCurrentRiderPreferences],
    )

    const submitKyc = useCallback(async () => {
        const currentKyc = currentRiderPreferences.kyc
        if (
            !currentKyc.governmentIdFrontUri ||
            !currentKyc.governmentIdBackUri ||
            !currentKyc.selfieUri
        ) {
            setError('Upload your government ID and a selfie before continuing')
            throw new Error('KYC is incomplete')
        }

        const activeSession = sessionRef.current
        try {
            if (activeSession && !usesMockDeliveryData(activeSession)) {
                const { submitIdentityVerification } = await import('./api')
                await submitIdentityVerification(activeSession.accessToken, {
                    idDocumentUrl: currentKyc.governmentIdFrontUri,
                    selfieUrl: currentKyc.selfieUri,
                })
            }

            updateCurrentRiderPreferences((previous) => ({
                ...previous,
                kyc: {
                    ...previous.kyc,
                    submittedAt: new Date().toISOString(),
                },
            }))
            if (activeSession) {
                const nextSession: AuthSession = {
                    ...activeSession,
                    user: {
                        ...activeSession.user,
                        kycStatus: 'pending',
                        kycSubmittedAt: new Date().toISOString(),
                    },
                }
                await applySession(nextSession)
            }
            setError(null)
        } catch (kycError) {
            setError(
                kycError instanceof Error
                    ? kycError.message
                    : 'Unable to submit identity verification',
            )
            throw kycError
        }
    }, [applySession, currentRiderPreferences.kyc, updateCurrentRiderPreferences])

    const updateProfile = useCallback(
        async (payload: { name?: string; phone?: string; avatarUrl?: string }) => {
            const activeSession = sessionRef.current
            if (!activeSession) return

            setBusy(true)
            try {
                const normalizedPayload = {
                    ...(payload.name?.trim() ? { name: payload.name.trim() } : {}),
                    ...(payload.phone?.trim() ? { phone: payload.phone.trim() } : {}),
                    ...(payload.avatarUrl?.trim() ? { avatarUrl: payload.avatarUrl.trim() } : {}),
                }

                const nextUser = usesMockDeliveryData(activeSession)
                    ? {
                          ...activeSession.user,
                          ...normalizedPayload,
                      }
                    : await (async () => {
                          const { updateDeliveryProfile } = await import('./api')
                          return updateDeliveryProfile(activeSession.accessToken, normalizedPayload)
                      })()

                const nextSession: AuthSession = {
                    ...activeSession,
                    user: nextUser,
                }

                await applySession(nextSession)

                if (normalizedPayload.phone) {
                    updatePreferences((previous) => ({
                        ...previous,
                        lastPhone: normalizedPayload.phone || previous.lastPhone,
                        riders: {
                            ...previous.riders,
                            [nextSession.user.id]: {
                                ...(previous.riders[nextSession.user.id] ||
                                    createDefaultRiderPreferences(normalizedPayload.phone)),
                                phone: normalizedPayload.phone || previous.lastPhone,
                            },
                        },
                    }))
                }

                setError(null)
            } catch (profileError) {
                setError(
                    profileError instanceof Error
                        ? profileError.message
                        : 'Unable to update rider profile',
                )
                throw profileError
            } finally {
                setBusy(false)
            }
        },
        [applySession, updatePreferences],
    )

    const setThemeMode = useCallback(
        async (next: DeliveryThemeMode) => {
            updateCurrentRiderPreferences((previous) => ({
                ...previous,
                themeMode: next,
            }))
            setError(null)
        },
        [updateCurrentRiderPreferences],
    )

    const setNotificationsEnabled = useCallback(
        async (next: boolean) => {
            const activeSession = sessionRef.current
            if (!activeSession) return

            setBusy(true)
            try {
                const nextUser = {
                    ...activeSession.user,
                    permissions: {
                        notifications: next ? 'granted' : 'skipped',
                        location: activeSession.user.permissions?.location || 'undetermined',
                    },
                }

                await applySession({
                    ...activeSession,
                    user: nextUser,
                })
                setError(null)
            } catch (permissionsError) {
                setError(
                    permissionsError instanceof Error
                        ? permissionsError.message
                        : 'Unable to update notification settings',
                )
                throw permissionsError
            } finally {
                setBusy(false)
            }
        },
        [applySession],
    )

    const setLanguage = useCallback(
        async (next: DeliveryLanguage) => {
            updateCurrentRiderPreferences((previous) => ({
                ...previous,
                language: next,
            }))
            setError(null)
        },
        [updateCurrentRiderPreferences],
    )

    const setVehicleInfo = useCallback(
        async (next: string) => {
            updateCurrentRiderPreferences((previous) => ({
                ...previous,
                vehicleInfo: next.trim(),
            }))
            setError(null)
        },
        [updateCurrentRiderPreferences],
    )

    const acceptTask = useCallback(
        async (taskId: string) => {
            const activeSession = sessionRef.current
            if (!activeSession) return

            if (!currentRiderPreferences.isOnline) {
                const offlineError = new Error('Go online before accepting a new delivery')
                setError(offlineError.message)
                throw offlineError
            }

            setBusy(true)
            try {
                if (usesMockDeliveryData(activeSession)) {
                    const task = availableTasks.find((entry) => entry.id === taskId)
                    if (!task) {
                        throw new Error('Mock task not found')
                    }

                    const acceptedTask: DeliveryTask = {
                        ...task,
                        riderId: activeSession.user.id,
                        activeAssignment: true,
                        status: 'assigned',
                        history: [
                            ...task.history,
                            {
                                status: 'assigned',
                                at: new Date().toISOString(),
                                note: 'Mock rider accepted task',
                            },
                        ],
                    }

                    applyCurrentTask(acceptedTask)
                    setError(null)
                    return
                }

                const { acceptTask: acceptTaskRequest } = await import('./api')
                const task = await acceptTaskRequest(activeSession.accessToken, taskId)
                applyCurrentTask(task)
                setError(null)
                await refreshDashboard()
            } catch (acceptError) {
                setError(
                    acceptError instanceof Error
                        ? acceptError.message
                        : 'Unable to accept delivery task',
                )
                throw acceptError
            } finally {
                setBusy(false)
            }
        },
        [applyCurrentTask, currentRiderPreferences.isOnline, refreshDashboard],
    )

    const rejectTask = useCallback(
        async (taskId: string, reason: string) => {
            const activeSession = sessionRef.current
            if (!activeSession) return

            setBusy(true)
            try {
                if (usesMockDeliveryData(activeSession)) {
                    setAvailableTasks((previous) => removeTask(previous, taskId))
                    setError(null)
                    return
                }

                const { rejectTask: rejectTaskRequest } = await import('./api')
                await rejectTaskRequest(activeSession.accessToken, taskId, reason)
                if (currentTaskRef.current?.id === taskId) {
                    currentTaskRef.current = null
                    setCurrentTask(null)
                }
                setAvailableTasks((previous) => removeTask(previous, taskId))
                setError(null)
                await refreshDashboard()
            } catch (rejectError) {
                setError(
                    rejectError instanceof Error
                        ? rejectError.message
                        : 'Unable to reject delivery task',
                )
                throw rejectError
            } finally {
                setBusy(false)
            }
        },
        [refreshDashboard],
    )

    const markArrived = useCallback(
        async (taskId: string) => {
            const activeSession = sessionRef.current
            if (!activeSession) return

            setBusy(true)
            try {
                if (usesMockDeliveryData(activeSession)) {
                    const task = currentTaskRef.current
                    if (!task || task.id !== taskId) {
                        throw new Error('Mock task not found')
                    }

                    applyCurrentTask({
                        ...task,
                        status: 'arrived_pickup',
                        history: [
                            ...task.history,
                            {
                                status: 'arrived_pickup',
                                at: new Date().toISOString(),
                                note: 'Mock rider arrived at pickup',
                            },
                        ],
                    })
                    setError(null)
                    return
                }

                const { arrivedAtPickup } = await import('./api')
                const task = await arrivedAtPickup(activeSession.accessToken, taskId)
                applyCurrentTask(task)
                setError(null)
            } catch (arriveError) {
                setError(
                    arriveError instanceof Error
                        ? arriveError.message
                        : 'Unable to mark pickup arrival',
                )
                throw arriveError
            } finally {
                setBusy(false)
            }
        },
        [applyCurrentTask],
    )

    const confirmPickup = useCallback(
        async (taskId: string, checkedItemIds: string[]) => {
            const activeSession = sessionRef.current
            if (!activeSession) return

            setBusy(true)
            try {
                if (usesMockDeliveryData(activeSession)) {
                    const task = currentTaskRef.current
                    if (!task || task.id !== taskId) {
                        throw new Error('Mock task not found')
                    }

                    applyCurrentTask({
                        ...task,
                        status: 'out_for_delivery',
                        items: task.items.map((item) => ({
                            ...item,
                            checkedAtPickup: checkedItemIds.includes(item.itemId),
                        })),
                        route: {
                            ...task.route,
                            destinationType: 'dropoff',
                            nextInstruction: 'Head to the customer drop-off point',
                            nextInstructionDistanceMeters: 300,
                        },
                        history: [
                            ...task.history,
                            {
                                status: 'out_for_delivery',
                                at: new Date().toISOString(),
                                note: 'Mock pickup confirmed',
                            },
                        ],
                    })
                    setError(null)
                    return
                }

                const { confirmPickup: confirmPickupRequest } = await import('./api')
                const task = await confirmPickupRequest(activeSession.accessToken, taskId, checkedItemIds)
                applyCurrentTask(task)
                setError(null)
            } catch (confirmError) {
                setError(
                    confirmError instanceof Error
                        ? confirmError.message
                        : 'Unable to confirm pickup',
                )
                throw confirmError
            } finally {
                setBusy(false)
            }
        },
        [applyCurrentTask],
    )

    const markDelivered = useCallback(
        async (taskId: string) => {
            const activeSession = sessionRef.current
            if (!activeSession) return

            setBusy(true)
            try {
                if (usesMockDeliveryData(activeSession)) {
                    const task = currentTaskRef.current
                    if (!task || task.id !== taskId) {
                        throw new Error('Mock task not found')
                    }

                    const deliveredTask: DeliveryTask = {
                        ...task,
                        activeAssignment: false,
                        status: 'delivered',
                        history: [
                            ...task.history,
                            {
                                status: 'delivered',
                                at: new Date().toISOString(),
                                note: 'Mock delivery completed',
                            },
                        ],
                    }
                    applyCurrentTask(deliveredTask)
                    setCompletedTasks((previous) => upsertTask(previous, deliveredTask))
                    setCurrentTask(null)
                    setError(null)
                    return
                }

                const { markDelivered: markDeliveredRequest } = await import('./api')
                const task = await markDeliveredRequest(activeSession.accessToken, taskId)
                applyCurrentTask(task)
                setError(null)
                await refreshDashboard()
            } catch (deliverError) {
                setError(
                    deliverError instanceof Error
                        ? deliverError.message
                        : 'Unable to mark delivery complete',
                )
                throw deliverError
            } finally {
                setBusy(false)
            }
        },
        [applyCurrentTask, refreshDashboard],
    )

    const submitDeliveryProof = useCallback(
        async (
            taskId: string,
            payload: { otp?: string; photoUrl?: string; notes?: string },
        ) => {
            const activeSession = sessionRef.current
            if (!activeSession) return

            setBusy(true)
            try {
                if (usesMockDeliveryData(activeSession)) {
                    const task = currentTaskRef.current
                    if (!task || task.id !== taskId) {
                        throw new Error('Mock task not found')
                    }

                    const deliveredTask: DeliveryTask = {
                        ...task,
                        activeAssignment: false,
                        status: 'delivered',
                        history: [
                            ...task.history,
                            {
                                status: 'delivered',
                                at: new Date().toISOString(),
                                note: payload.notes || 'Mock proof captured',
                            },
                        ],
                    }
                    applyCurrentTask(deliveredTask)
                    setCompletedTasks((previous) => upsertTask(previous, deliveredTask))
                    currentTaskRef.current = null
                    setCurrentTask(null)
                    setError(null)
                    return
                }

                const { submitDeliveryProof: submitDeliveryProofRequest } = await import('./api')
                let task: DeliveryTask
                try {
                    task = await submitDeliveryProofRequest(activeSession.accessToken, taskId, payload)
                } catch (proofError) {
                    const proofMessage =
                        proofError instanceof Error ? proofError.message : 'Unable to submit delivery proof'

                    // Some deployments still expose the older mark-delivered route without proof support.
                    // Fallback silently so riders do not see a false error before landing on success.
                    if (/route not found/i.test(proofMessage)) {
                        const { markDelivered: markDeliveredRequest } = await import('./api')
                        task = await markDeliveredRequest(activeSession.accessToken, taskId)
                    } else {
                        throw proofError
                    }
                }
                applyCurrentTask(task)
                setCompletedTasks((previous) => upsertTask(previous, task))
                currentTaskRef.current = null
                setCurrentTask(null)
                setError(null)
                await refreshDashboard()
            } catch (proofError) {
                setError(
                    proofError instanceof Error
                        ? proofError.message
                        : 'Unable to submit delivery proof',
                )
                throw proofError
            } finally {
                setBusy(false)
            }
        },
        [applyCurrentTask, refreshDashboard],
    )

    const markFailure = useCallback(
        async (taskId: string, payload: { reason: string; note?: string }) => {
            const activeSession = sessionRef.current
            if (!activeSession) return

            setBusy(true)
            try {
                if (usesMockDeliveryData(activeSession)) {
                    const task = currentTaskRef.current
                    if (!task || task.id !== taskId) {
                        throw new Error('Mock task not found')
                    }

                    applyCurrentTask({
                        ...task,
                        activeAssignment: false,
                        status: 'failed',
                        history: [
                            ...task.history,
                            {
                                status: 'failed',
                                at: new Date().toISOString(),
                                note: payload.note || payload.reason,
                            },
                        ],
                    })
                    currentTaskRef.current = null
                    setCurrentTask(null)
                    setError(null)
                    return
                }

                const { markDeliveryFailure } = await import('./api')
                const task = await markDeliveryFailure(activeSession.accessToken, taskId, payload)
                applyCurrentTask(task)
                currentTaskRef.current = null
                setCurrentTask(null)
                setError(null)
                await refreshDashboard()
            } catch (failureError) {
                setError(
                    failureError instanceof Error
                        ? failureError.message
                        : 'Unable to report delivery failure',
                )
                throw failureError
            } finally {
                setBusy(false)
            }
        },
        [applyCurrentTask, refreshDashboard],
    )

    const raiseSos = useCallback(
        async (taskId: string, message: string) => {
            const activeSession = sessionRef.current
            if (!activeSession) return

            setBusy(true)
            try {
                if (usesMockDeliveryData(activeSession)) {
                    const task = currentTaskRef.current
                    if (!task || task.id !== taskId) {
                        throw new Error('Mock task not found')
                    }

                    applyCurrentTask({
                        ...task,
                        status: 'sos',
                        history: [
                            ...task.history,
                            {
                                status: 'sos',
                                at: new Date().toISOString(),
                                note: message,
                            },
                        ],
                    })
                    setError(null)
                    return
                }

                const { raiseSos: raiseSosRequest } = await import('./api')
                const task = await raiseSosRequest(activeSession.accessToken, taskId, message)
                applyCurrentTask(task)
                setError(null)
            } catch (sosError) {
                setError(sosError instanceof Error ? sosError.message : 'Unable to raise SOS')
                throw sosError
            } finally {
                setBusy(false)
            }
        },
        [applyCurrentTask],
    )

    const raiseSupportIncident = useCallback(
        async (payload: {
            issueType: string
            description: string
            taskId?: string
            photos?: DeliveryIncidentPhotoUpload[]
            location?: DeliveryIncidentLocation | null
        }) => {
            const activeSession = sessionRef.current
            if (!activeSession) return

            setBusy(true)
            try {
                if (usesMockDeliveryData(activeSession)) {
                    setError(null)
                    return
                }

                const {
                    raiseSupportIncident: raiseSupportIncidentRequest,
                    uploadDeliveryIncidentPhotos,
                } = await import('./api')

                const photoUrls =
                    payload.photos && payload.photos.length
                        ? await uploadDeliveryIncidentPhotos(activeSession.accessToken, payload.photos)
                        : []

                await raiseSupportIncidentRequest(activeSession.accessToken, {
                    issueType: payload.issueType,
                    description: payload.description,
                    taskId: payload.taskId,
                    photoUrls,
                    location: payload.location || undefined,
                })

                setError(null)
            } catch (incidentError) {
                setError(
                    incidentError instanceof Error
                        ? incidentError.message
                        : 'Unable to submit support incident',
                )
                throw incidentError
            } finally {
                setBusy(false)
            }
        },
        [],
    )

    const refreshTask = useCallback(
        async (taskId: string) => {
            const activeSession = sessionRef.current
            if (!activeSession) return null

            try {
                if (usesMockDeliveryData(activeSession)) {
                    const task =
                        currentTaskRef.current?.id === taskId
                            ? currentTaskRef.current
                            : availableTasks.find((entry) => entry.id === taskId) ||
                              completedTasks.find((entry) => entry.id === taskId) ||
                              null
                    if (task) {
                        syncTaskSnapshot(task)
                    }
                    setError(null)
                    return task
                }

                const { getTaskById } = await import('./api')
                const task = await getTaskById(activeSession.accessToken, taskId)
                syncTaskSnapshot(task)
                setError(null)
                return task
            } catch (taskError) {
                setError(
                    taskError instanceof Error ? taskError.message : 'Unable to refresh task',
                )
                return null
            }
        },
        [availableTasks, completedTasks, syncTaskSnapshot],
    )

    const value = useMemo<DeliveryContextValue>(
        () => ({
            bootstrapping,
            busy,
            refreshing,
            session,
            currentTask,
            availableTasks,
            completedTasks,
            deviceLocation,
            socketConnected,
            locationPermission,
            error,
            isOnline: currentRiderPreferences.isOnline,
            dashboardStats,
            preferredPhone:
                currentRiderPreferences.phone || session?.user.phone || preferencesStore.lastPhone,
            kycStatus: getSessionKycStatus(session),
            kycState: currentRiderPreferences.kyc,
            themeMode: currentRiderPreferences.themeMode,
            notificationsEnabled: session?.user.permissions?.notifications === 'granted',
            language: currentRiderPreferences.language,
            vehicleInfo: currentRiderPreferences.vehicleInfo,
            requestOtpCode,
            verifyOtpCode,
            logout,
            refreshDashboard,
            acceptTask,
            rejectTask,
            markArrived,
            confirmPickup,
            markDelivered,
            submitDeliveryProof,
            markFailure,
            raiseSos,
            raiseSupportIncident,
            refreshTask,
            setOnlineAvailability,
            saveKycDraft,
            submitKyc,
            updateProfile,
            setThemeMode,
            setNotificationsEnabled,
            setLanguage,
            setVehicleInfo,
            clearError: () => setError(null),
        }),
        [
            acceptTask,
            availableTasks,
            bootstrapping,
            busy,
            completedTasks,
            confirmPickup,
            currentRiderPreferences.isOnline,
            currentRiderPreferences.kyc,
            currentRiderPreferences.language,
            currentRiderPreferences.phone,
            currentRiderPreferences.themeMode,
            currentRiderPreferences.vehicleInfo,
            currentTask,
            dashboardStats,
            deviceLocation,
            error,
            session?.user.kycStatus,
            session?.user.kycSubmittedAt,
            locationPermission,
            logout,
            markArrived,
            markDelivered,
            markFailure,
            preferencesStore.lastPhone,
            rejectTask,
            raiseSos,
            raiseSupportIncident,
            refreshDashboard,
            refreshTask,
            refreshing,
            requestOtpCode,
            saveKycDraft,
            session,
            setLanguage,
            setNotificationsEnabled,
            setOnlineAvailability,
            setThemeMode,
            setVehicleInfo,
            socketConnected,
            submitDeliveryProof,
            submitKyc,
            updateProfile,
            verifyOtpCode,
        ],
    )

    return <DeliveryContext.Provider value={value}>{children}</DeliveryContext.Provider>
}

export function useDelivery() {
    const context = useContext(DeliveryContext)
    if (!context) {
        throw new Error('useDelivery must be used within DeliveryProvider')
    }
    return context
}
