import { formatInr, toTaskCode as toDeliveryTaskCode } from './delivery-presentation'

const DEFAULT_COUNTRY_CODE = '91'

export function toTitle(value: string) {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function toTaskCode(orderId: string) {
    return toDeliveryTaskCode(orderId)
}

export function activeRoutePath(taskId: string, status: string) {
    if (status === 'assigned' || status === 'arrived_pickup') {
        return `/task/${taskId}/pickup`
    }
    return `/task/${taskId}/navigate`
}

export function estimateTaskEarnings(distanceKm = 0, itemCount = 0) {
    return 58 + distanceKm * 18 + itemCount * 12
}

export function formatCurrency(amount: number) {
    return formatInr(amount)
}

export function normalizeLocalPhoneInput(value: string) {
    const digits = value.replace(/[^\d]/g, '')
    if (digits.startsWith(DEFAULT_COUNTRY_CODE) && digits.length > 10) {
        return digits.slice(DEFAULT_COUNTRY_CODE.length, DEFAULT_COUNTRY_CODE.length + 10)
    }
    return digits.slice(0, 10)
}

export function toE164Phone(localNumber: string) {
    const digits = normalizeLocalPhoneInput(localNumber)
    return digits ? `+${DEFAULT_COUNTRY_CODE}${digits}` : ''
}

export function formatPhoneHint(phone: string) {
    const digits = phone.replace(/[^\d]/g, '')
    if (digits.length < 4) return phone
    return `Sent to +${digits.slice(0, Math.max(2, digits.length - 4))}-${digits.slice(-4)}`
}
