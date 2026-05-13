import { router } from 'expo-router'
import { useEffect } from 'react'
import type { AuthSession } from './api'

export function useDeliverySessionGuard(
    session: AuthSession | null,
    bootstrapping = false,
) {
    useEffect(() => {
        if (!bootstrapping && !session) {
            router.replace('/')
        }
    }, [bootstrapping, session])

    return !bootstrapping && Boolean(session)
}
