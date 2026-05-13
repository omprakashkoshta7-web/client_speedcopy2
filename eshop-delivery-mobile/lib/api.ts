const DEFAULT_RENDER_GATEWAY_URL = 'https://eshop-gateway-zcms.onrender.com'
const DEFAULT_LOCAL_DELIVERY_URL = 'http://localhost:4000'

const RAW_API_BASE_URL =
    process.env.EXPO_PUBLIC_DELIVERY_API_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    (typeof __DEV__ !== 'undefined' && __DEV__
        ? DEFAULT_LOCAL_DELIVERY_URL
        : DEFAULT_RENDER_GATEWAY_URL)

function normalizeApiBaseUrl(value: string) {
    const trimmed = String(value || '').trim().replace(/\/$/, '')
    return trimmed.replace(/\/api$/i, '')
}

export const API_BASE_URL = normalizeApiBaseUrl(String(RAW_API_BASE_URL))

export const REALTIME_BASE_URL =
    String(process.env.EXPO_PUBLIC_REALTIME_URL || '').trim().replace(/\/$/, '')

export const DELIVERY_DEV_EMAIL =
    process.env.EXPO_PUBLIC_DELIVERY_DEV_EMAIL || 'delivery1@eshop.test'

export const DELIVERY_DEV_PASSWORD =
    process.env.EXPO_PUBLIC_DELIVERY_DEV_PASSWORD || 'Pass@123'

type ApiEnvelope<T> = {
    success: boolean
    data?: T
    error?: {
        message?: string
    }
    message?: string
}

export type DeliveryKycStatus = 'pending' | 'approved' | 'rejected'

export type AuthUser = {
    id: string
    name: string
    email: string | null
    phone: string | null
    role: 'customer' | 'admin' | 'delivery' | 'delivery_partner'
    isBlocked: boolean
    isPhoneVerified: boolean
    authProviders: string[]
    permissions?: {
        notifications: string
        location: string
    }
    avatarUrl?: string
    kycStatus?: DeliveryKycStatus
    kycSubmittedAt?: string | null
}

export type AuthSession = {
    accessToken: string
    refreshToken: string
    sessionId: string
    expiresIn: string
    user: AuthUser
    mockAuth?: boolean
    mockData?: boolean
}

export type OtpChallenge = {
    phone: string
    expiresAt: string
    status?: string
}

export type DeliveryPartnerProfile = {
    _id?: string
    userId: string
    phone?: string
    email?: string
    name?: string
    isActive?: boolean
    isBlocked?: boolean
    blockedReason?: string
    isApproved?: boolean
    isAvailable?: boolean
    rating?: number
    totalTrips?: number
    totalEarnings?: number
    kycStatus?: 'pending' | 'approved' | 'rejected'
    identityVerification?: {
        idDocumentUrl?: string
        selfieUrl?: string
        submittedAt?: string | null
    }
    zoneAssignments?: string[]
    vehicleType?: string
    createdAt?: string
    updatedAt?: string
}

export type DeliveryStop = {
    name: string
    addressLine: string
    note?: string
    contactName?: string
    contactPhone?: string
    location: {
        lat: number
        lng: number
    }
}

export type DeliveryItem = {
    itemId: string
    title: string
    subtitle?: string
    quantity: number
    unitPrice?: number
    totalPrice?: number
    thumbnail?: string
    checkedAtPickup: boolean
}

export type DeliveryRoute = {
    provider?: string
    destinationType?: 'pickup' | 'dropoff'
    polyline?: string
    durationSeconds?: number
    distanceMeters?: number
    nextInstruction?: string
    nextInstructionDistanceMeters?: number
    updatedAt?: string
    origin?: { lat: number; lng: number }
    destination?: { lat: number; lng: number }
}

export type DeliveryLocationSnapshot = {
    lat: number
    lng: number
    heading?: number
    speedKmph?: number
    at: string
}

export type DeliveryIncidentLocation = {
    lat: number
    lng: number
    heading?: number
    speedKmph?: number
    capturedAt?: string
}

export type DeliveryIncidentPhotoUpload = {
    uri: string
    mimeType?: string
    fileName?: string
}

export type DeliveryTask = {
    id: string
    orderId: string
    orderNumber?: string
    customerId: string
    riderId: string
    activeAssignment: boolean
    status:
        | 'pending_assignment'
        | 'assigned'
        | 'arrived_pickup'
        | 'picked'
        | 'out_for_delivery'
        | 'delivered'
        | 'failed'
        | 'sos'
    pickup: DeliveryStop
    dropoff: DeliveryStop
    destinationType?: 'pickup' | 'dropoff'
    destination?: DeliveryStop | null
    destinationLocation?: {
        lat: number
        lng: number
    } | null
    destinationAddressLine?: string
    items: DeliveryItem[]
    orderSubtotal?: number
    deliveryCharge?: number
    orderTotal?: number
    specialInstructions: string
    etaMinutes: number
    distanceKm: number
    estimatedPayout?: number
    chatThreadId: string
    route?: DeliveryRoute | null
    latestLocation?: DeliveryLocationSnapshot | null
    history: Array<{
        status: string
        note?: string
        at: string
    }>
    createdAt: string
    updatedAt: string
}

type TaskListResponse = {
    items: DeliveryTask[]
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
}

export type DeliveryDashboardResponse = {
    profile: DeliveryPartnerProfile
    availability: {
        isAvailable: boolean
        kycStatus?: DeliveryKycStatus
    }
    currentTask: DeliveryTask | null
    availableTasks: DeliveryTask[]
    earnings?: {
        summary?: {
            today?: number
            week?: number
            total?: number
        }
        recent_jobs?: DeliveryTask[]
    }
    taskSummary?: {
        total?: number
        active?: number
        delivered?: number
        failed?: number
        rejected?: number
        statusCounts?: Record<string, number>
    }
    recentTasks: DeliveryTask[]
}

async function request<T>(
    path: string,
    init?: RequestInit,
    accessToken?: string,
): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            ...(init?.headers || {}),
        },
    })

    const raw = await response.text()
    let json: ApiEnvelope<T>

    try {
        json = JSON.parse(raw) as ApiEnvelope<T>
    } catch {
        throw new Error(`Invalid server response (${response.status})`)
    }

    if (!response.ok || !json.success || json.data === undefined) {
        throw new Error(json.error?.message || json.message || `Request failed: ${response.status}`)
    }

    return json.data
}

export function mapDeliveryProfileToUser(profile: DeliveryPartnerProfile): AuthUser {
    return {
        id: profile.userId,
        name: profile.name || 'Delivery Partner',
        email: profile.email || null,
        phone: profile.phone || null,
        role: 'delivery',
        isBlocked: Boolean(profile.isBlocked || profile.isActive === false),
        isPhoneVerified: Boolean(profile.phone),
        authProviders: ['phone'],
        permissions: {
            notifications: 'undetermined',
            location: 'undetermined',
        },
        avatarUrl: '',
        kycStatus: profile.kycStatus,
        kycSubmittedAt: profile.identityVerification?.submittedAt || null,
    }
}

export function isKycApprovalRequiredError(error: unknown) {
    return (
        error instanceof Error &&
        /identity verification approval required/i.test(error.message)
    )
}

export async function requestDeliveryOtp(phone: string) {
    const data = await request<{ status?: string }>('/api/delivery/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: phone.trim() }),
    })

    return {
        phone: phone.trim(),
        status: data.status,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    }
}

export async function verifyDeliveryOtp(phone: string, code: string) {
    const data = await request<{ profile: DeliveryPartnerProfile; token: string }>(
        '/api/delivery/auth/verify-otp',
        {
            method: 'POST',
            body: JSON.stringify({
                phone: phone.trim(),
                otp: code.trim(),
            }),
        },
    )

    return {
        accessToken: data.token,
        refreshToken: '',
        sessionId: data.profile.userId,
        expiresIn: '30d',
        user: mapDeliveryProfileToUser(data.profile),
    } satisfies AuthSession
}

export async function loginDeliveryBridge(email: string, password: string) {
    void email
    void password
    throw new Error('Delivery app uses phone OTP login')
}

export async function refreshSession(refreshToken: string) {
    void refreshToken
    throw new Error('Delivery session refresh is not supported by delivery-service yet')
}

export async function logoutSession(accessToken: string) {
    return request<{ loggedOut?: boolean; riderId?: string; isAvailable?: boolean }>(
        '/api/delivery/auth/logout',
        {
            method: 'POST',
        },
        accessToken,
    )
}

export async function updateDeliveryPermissions(
    accessToken: string,
    payload: {
        notificationsStatus?: 'granted' | 'denied' | 'skipped' | 'undetermined'
        locationStatus?: 'granted' | 'denied' | 'skipped' | 'undetermined'
    },
) {
    void accessToken
    void payload
    throw new Error('Delivery permission sync is not supported by delivery-service yet')
}

export async function updateDeliveryProfile(
    accessToken: string,
    payload: {
        name?: string
        phone?: string
        email?: string
        vehicleType?: string
        avatarUrl?: string
    },
) {
    const profile = await request<DeliveryPartnerProfile>(
        '/api/delivery/me/profile',
        {
            method: 'PATCH',
            body: JSON.stringify({
                name: payload.name,
                phone: payload.phone,
                email: payload.email,
                vehicleType: payload.vehicleType,
            }),
        },
        accessToken,
    )

    return mapDeliveryProfileToUser(profile)
}

export async function getDeliveryProfile(accessToken: string) {
    return request<DeliveryPartnerProfile>('/api/delivery/me/profile', undefined, accessToken)
}

export async function getDeliveryDashboard(accessToken: string) {
    return request<DeliveryDashboardResponse>('/api/delivery/dashboard', undefined, accessToken)
}

export async function getDeliveryAvailability(accessToken: string) {
    return request<DeliveryPartnerProfile>('/api/delivery/me/availability', undefined, accessToken)
}

export async function updateDeliveryAvailability(accessToken: string, isAvailable: boolean) {
    return request<DeliveryPartnerProfile>(
        '/api/delivery/me/availability',
        {
            method: 'PATCH',
            body: JSON.stringify({ isAvailable }),
        },
        accessToken,
    )
}

export async function submitIdentityVerification(
    accessToken: string,
    payload: { idDocumentUrl: string; selfieUrl: string },
) {
    return request<DeliveryPartnerProfile>(
        '/api/delivery/me/identity-verification',
        {
            method: 'POST',
            body: JSON.stringify(payload),
        },
        accessToken,
    )
}

export async function getEarningsSummary(accessToken: string) {
    return request<{
        summary: { today: number; week: number; total: number }
        recent_jobs: DeliveryTask[]
    }>('/api/delivery/earnings/summary', undefined, accessToken)
}

export async function raiseSupportIncident(
    accessToken: string,
    payload: {
        issueType: string
        description: string
        taskId?: string
        photoUrl?: string
        photoUrls?: string[]
        location?: DeliveryIncidentLocation
    },
) {
    return request<unknown>(
        '/api/delivery/support/incident',
        {
            method: 'POST',
            body: JSON.stringify(payload),
        },
        accessToken,
    )
}

export async function uploadDeliveryIncidentPhotos(
    accessToken: string,
    photos: DeliveryIncidentPhotoUpload[],
) {
    const formData = new FormData()

    photos.forEach((photo, index) => {
        formData.append('photos', {
            uri: photo.uri,
            name: photo.fileName || `incident-${index + 1}.jpg`,
            type: photo.mimeType || 'image/jpeg',
        } as never)
    })

    const response = await fetch(`${API_BASE_URL}/api/delivery/support/incident/uploads`, {
        method: 'POST',
        headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: formData,
    })

    const raw = await response.text()
    let json: ApiEnvelope<{ photoUrls: string[] }>

    try {
        json = JSON.parse(raw) as ApiEnvelope<{ photoUrls: string[] }>
    } catch {
        throw new Error(`Invalid server response (${response.status})`)
    }

    if (!response.ok || !json.success || json.data === undefined) {
        throw new Error(json.error?.message || json.message || `Request failed: ${response.status}`)
    }

    return json.data.photoUrls || []
}

export async function rejectTask(accessToken: string, taskId: string, reason: string) {
    return request<DeliveryTask>(
        `/api/delivery/tasks/${taskId}/reject`,
        {
            method: 'POST',
            body: JSON.stringify({ reason }),
        },
        accessToken,
    )
}

export async function submitDeliveryProof(
    accessToken: string,
    taskId: string,
    payload: { otp?: string; photoUrl?: string; notes?: string },
) {
    return request<DeliveryTask>(
        `/api/delivery/tasks/${taskId}/proof`,
        {
            method: 'POST',
            body: JSON.stringify(payload),
        },
        accessToken,
    )
}

export async function markDeliveryFailure(
    accessToken: string,
    taskId: string,
    payload: { reason: string; note?: string },
) {
    return request<DeliveryTask>(
        `/api/delivery/tasks/${taskId}/failure`,
        {
            method: 'POST',
            body: JSON.stringify(payload),
        },
        accessToken,
    )
}

/*
 * Deprecated auth-service routes retained as named exports for older imports.
 * The delivery app now uses delivery-service phone OTP auth directly.
 */
/*
export async function verifyDeliveryOtpLegacy(phone: string, code: string) {
    const session = await request<AuthSession>('/api/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({
            phone: phone.trim(),
            code: code.trim(),
            role: 'delivery',
        }),
    })

    if (session.user.role !== 'delivery') {
        throw new Error('This phone number is not linked to a delivery partner account')
    }

    return session
}
*/

export async function getAvailableTasks(accessToken: string) {
    return request<TaskListResponse>('/api/delivery/tasks/available', undefined, accessToken)
}

export async function getMyTasks(
    accessToken: string,
    status?: string,
    page?: number,
    limit?: number,
) {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (page) params.set('page', String(page))
    if (limit) params.set('limit', String(limit))
    const query = params.toString() ? `?${params.toString()}` : ''
    return request<TaskListResponse>(`/api/delivery/tasks/mine${query}`, undefined, accessToken)
}

export async function getCurrentTask(accessToken: string) {
    return request<DeliveryTask>('/api/delivery/tasks/current', undefined, accessToken)
}

export async function getTaskById(accessToken: string, taskId: string) {
    return request<DeliveryTask>(`/api/delivery/tasks/${taskId}`, undefined, accessToken)
}

export async function acceptTask(accessToken: string, taskId: string) {
    return request<DeliveryTask>(
        '/api/delivery/tasks/accept',
        {
            method: 'POST',
            body: JSON.stringify({ taskId }),
        },
        accessToken,
    )
}

export async function arrivedAtPickup(accessToken: string, taskId: string) {
    return request<DeliveryTask>(
        `/api/delivery/tasks/${taskId}/arrived-pickup`,
        {
            method: 'POST',
            body: JSON.stringify({}),
        },
        accessToken,
    )
}

export async function confirmPickup(
    accessToken: string,
    taskId: string,
    checkedItemIds: string[],
) {
    return request<DeliveryTask>(
        `/api/delivery/tasks/${taskId}/confirm-pickup`,
        {
            method: 'POST',
            body: JSON.stringify({ checkedItemIds }),
        },
        accessToken,
    )
}

export async function updateTaskLocation(
    accessToken: string,
    taskId: string,
    payload: {
        lat: number
        lng: number
        heading?: number
        speedKmph?: number
        etaMinutes?: number
        distanceKm?: number
    },
) {
    return request<DeliveryTask>(
        `/api/delivery/tasks/${taskId}/location`,
        {
            method: 'POST',
            body: JSON.stringify(payload),
        },
        accessToken,
    )
}

export async function markDelivered(accessToken: string, taskId: string) {
    return request<DeliveryTask>(
        `/api/delivery/tasks/${taskId}/mark-delivered`,
        {
            method: 'POST',
            body: JSON.stringify({}),
        },
        accessToken,
    )
}

export async function raiseSos(accessToken: string, taskId: string, message: string) {
    return request<DeliveryTask>(
        `/api/delivery/tasks/${taskId}/sos`,
        {
            method: 'POST',
            body: JSON.stringify({ message }),
        },
        accessToken,
    )
}

