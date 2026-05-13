import type { DeliveryTask } from './api'

const BASE_EARNING = 58
const DISTANCE_RATE = 18
const ITEM_RATE = 12

export function toTaskCode(orderId: string) {
    return `#${orderId.slice(-8).toUpperCase()}`
}

export function totalTaskItems(task: Pick<DeliveryTask, 'items'>) {
    return task.items.reduce((sum, item) => sum + item.quantity, 0)
}

export function estimateTaskBonus(distanceKm = 0, itemCount = 0) {
    return distanceKm * DISTANCE_RATE + itemCount * ITEM_RATE
}

export function estimateTaskEarnings(distanceKm = 0, itemCount = 0) {
    return BASE_EARNING + estimateTaskBonus(distanceKm, itemCount)
}

export function getTaskPayout(task: Pick<DeliveryTask, 'estimatedPayout' | 'distanceKm' | 'items'>) {
    if (Number(task.estimatedPayout || 0) > 0) {
        return Number(task.estimatedPayout || 0)
    }
    return estimateTaskEarnings(task.distanceKm, totalTaskItems(task))
}

export function getTaskOrderValue(
    task: Pick<DeliveryTask, 'orderTotal' | 'items'>,
) {
    if (Number(task.orderTotal || 0) > 0) {
        return Number(task.orderTotal || 0)
    }

    return task.items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0)
}

export function formatInr(amount: number) {
    return `₹${amount.toFixed(2)}`
}

export function getDeliveredTimestamp(task: Pick<DeliveryTask, 'history' | 'updatedAt'>) {
    return (
        [...task.history]
            .reverse()
            .find((event) => event.status === 'delivered')
            ?.at || task.updatedAt
    )
}

export function formatCompletionTime(timestamp: string) {
    return new Date(timestamp).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    })
}

export function formatDistanceKm(distanceKm = 0) {
    return `${Number(distanceKm || 0).toFixed(2)} km`
}

export function resolveTaskDestination(task: DeliveryTask) {
    if (task.destination) return task.destination
    if (task.destinationType === 'pickup') return task.pickup
    if (task.destinationType === 'dropoff') return task.dropoff
    return task.status === 'assigned' || task.status === 'arrived_pickup'
        ? task.pickup
        : task.dropoff
}
