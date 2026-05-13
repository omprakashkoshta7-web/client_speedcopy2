import type { AuthSession, DeliveryLocationSnapshot, DeliveryTask } from './api'
import type {
    DeliveryPreferencesStore,
    RiderKycState,
    RiderPreferences,
} from './delivery-context.types'

export const SESSION_STORAGE_KEY = 'eshop:delivery:session'
export const PREFERENCES_STORAGE_KEY = 'eshop:delivery:preferences'
export const MOCK_OTP_EXPIRES_IN_MS = 5 * 60 * 1000

export const ACTIVE_STATUSES = new Set([
    'assigned',
    'arrived_pickup',
    'picked',
    'out_for_delivery',
    'sos',
])

export function createDefaultKycState(): RiderKycState {
    return {
        governmentIdFrontUri: '',
        governmentIdBackUri: '',
        selfieUri: '',
        submittedAt: null,
    }
}

export function createDefaultRiderPreferences(phone = ''): RiderPreferences {
    return {
        phone,
        isOnline: false,
        themeMode: 'light',
        language: 'English',
        vehicleInfo: '',
        kyc: createDefaultKycState(),
    }
}

export function normalizePreferencesStore(
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

export function normalizeLocationSnapshot(input: {
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

export function upsertTask(list: DeliveryTask[], task: DeliveryTask) {
    return [task, ...list.filter((entry) => entry.id !== task.id)]
}

export function removeTask(list: DeliveryTask[], taskId: string) {
    return list.filter((entry) => entry.id !== taskId)
}

export function isNoActiveTaskError(error: unknown) {
    return error instanceof Error && /no active task/i.test(error.message)
}

export function usesMockDeliveryData(session: AuthSession | null | undefined) {
    if (!session) return false
    return Boolean(session.mockData ?? session.mockAuth)
}
