import * as Location from 'expo-location'
import type {
    AuthSession,
    DeliveryIncidentLocation,
    DeliveryIncidentPhotoUpload,
    DeliveryKycStatus,
    DeliveryLocationSnapshot,
    DeliveryTask,
    OtpChallenge,
} from './api'

export type RiderKycState = {
    governmentIdFrontUri: string
    governmentIdBackUri: string
    selfieUri: string
    submittedAt: string | null
}

export type DeliveryThemeMode = 'light' | 'dark'
export type DeliveryLanguage = 'English' | 'Hindi'

export type RiderPreferences = {
    phone: string
    isOnline: boolean
    themeMode: DeliveryThemeMode
    language: DeliveryLanguage
    vehicleInfo: string
    kyc: RiderKycState
}

export type DeliveryPreferencesStore = {
    lastPhone: string
    riders: Record<string, RiderPreferences>
}

export type DeliveryLocationEvent = {
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

export type DeliveryContextValue = {
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
