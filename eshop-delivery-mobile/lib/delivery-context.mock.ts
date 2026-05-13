import type { AuthSession, DeliveryTask } from './api'

export function createMockSession(phone: string): AuthSession {
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

export function createMockTasks(riderId: string): {
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
