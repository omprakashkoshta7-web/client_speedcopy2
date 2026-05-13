import * as Haptics from 'expo-haptics'
import { useEffect, useRef, useState } from 'react'
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Keyboard,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useDelivery } from '../../../lib/delivery-context'
import { getDeliveryPalette } from '../../../lib/delivery-theme'
import {
    formatPhoneHint,
    normalizeLocalPhoneInput,
    toE164Phone,
} from '../../../lib/delivery-home'

export function DeliveryAuthScreen() {
    const {
        busy,
        error,
        preferredPhone,
        themeMode,
        requestOtpCode,
        verifyOtpCode,
        clearError,
    } = useDelivery()
    const palette = getDeliveryPalette(themeMode)

    const [phone, setPhone] = useState(normalizeLocalPhoneInput(preferredPhone || ''))
    const [otpCode, setOtpCode] = useState('')
    const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null)
    const [hasRequestedOtp, setHasRequestedOtp] = useState(false)
    const otpInputRef = useRef<TextInput | null>(null)

    useEffect(() => {
        if (!preferredPhone) return
        setPhone((previous) => previous || normalizeLocalPhoneInput(preferredPhone))
    }, [preferredPhone])

    useEffect(() => {
        if (!cooldownEndsAt) return
        const timer = setInterval(() => {
            if (Date.now() >= cooldownEndsAt) {
                setCooldownEndsAt(null)
            }
        }, 1000)
        return () => clearInterval(timer)
    }, [cooldownEndsAt])

    const resendSeconds = cooldownEndsAt
        ? Math.max(0, Math.ceil((cooldownEndsAt - Date.now()) / 1000))
        : 0
    const fullPhone = toE164Phone(phone)

    const handleOtpRequest = async () => {
        await requestOtpCode(fullPhone)
        setCooldownEndsAt(Date.now() + 60000)
        setHasRequestedOtp(true)
        setOtpCode('')
        requestAnimationFrame(() => {
            otpInputRef.current?.focus()
        })
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null)
    }

    const handleOtpBoxPress = () => {
        if (!hasRequestedOtp) {
            return
        }
        requestAnimationFrame(() => {
            otpInputRef.current?.focus()
        })
    }

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: palette.background }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                className="flex-1"
            >
                <ScrollView contentContainerClassName="flex-grow px-6 pb-12 pt-8">
                    <View className="mt-8 flex-1">
                        <Text className="font-nunito-bold text-[30px] leading-[50px]" style={{ color: palette.text }}>
                            Welcome Partner
                        </Text>
                        <Text className=" font-nunito-regular text-[18px] leading-7" style={{ color: palette.textSoft }}>
                            Log in to start delivering with eShop.
                        </Text>

                        <View className="mt-16">
                            <Text className="text-center font-nunito-semi text-sm uppercase tracking-[3px]" style={{ color: palette.textSoft }}>
                                Mobile Number
                            </Text>
                            <View className="mt-4 flex-row overflow-hidden rounded-[12px] border" style={{ borderColor: palette.border, backgroundColor: palette.card }}>
                                <View className="flex-row items-center border-r px-5" style={{ borderColor: palette.border }}>
                                    <Text className="font-nunito-bold text-[20px]" style={{ color: palette.text }}>+91</Text>
                                    <Ionicons name="chevron-down" size={16} color={palette.textSoft} />
                                </View>
                                <TextInput
                                    value={phone}
                                    onChangeText={(value) => setPhone(normalizeLocalPhoneInput(value))}
                                    keyboardType="phone-pad"
                                    placeholder="000 000 0000"
                                    placeholderTextColor={palette.textSoft}
                                    className="flex-1 px-5 py-4 font-nunito-bold text-[18px]"
                                    style={{ color: palette.text }}
                                />
                            </View>

                            <View className="mt-9 border-t border-dashed pt-6" style={{ borderColor: palette.border }}>
                                <View className="flex-row items-center justify-between">
                                    <Text className="font-nunito-bold text-[10px] uppercase tracking-[2px]" style={{ color: palette.text }}>
                                        Verification Code
                                    </Text>
                                    <Text className="font-nunito-regular text-base" style={{ color: palette.textSoft }}>
                                        {hasRequestedOtp && fullPhone
                                            ? formatPhoneHint(fullPhone)
                                            : 'Send OTP first'}
                                    </Text>
                                </View>

                                {!hasRequestedOtp ? (
                                    <Pressable
                                        disabled={busy || phone.length < 10}
                                        onPress={() => void handleOtpRequest().catch(() => null)}
                                        className="mt-5 h-14 items-center justify-center rounded-[15px]"
                                        style={{
                                            backgroundColor:
                                                busy || phone.length < 10
                                                    ? palette.border
                                                    : palette.cardStrong,
                                        }}
                                    >
                                        {busy ? (
                                            <ActivityIndicator color={palette.accent} />
                                        ) : (
                                            <Text className="font-nunito-bold text-[15px]" style={{ color: palette.buttonTextOnDark }}>
                                                Send OTP
                                            </Text>
                                        )}
                                    </Pressable>
                                ) : (
                                    <>
                                        <View className="mt-5 flex-row justify-between">
                                            {Array.from({ length: 6 }).map((_, index) => {
                                                const digit = otpCode[index] || ''
                                                const isFilled = Boolean(digit)
                                                return (
                                                    <Pressable
                                                        key={index}
                                                        onPress={handleOtpBoxPress}
                                                        className="h-[50px] w-[46px] items-center justify-center rounded-[12px] border"
                                                        style={{
                                                            borderColor: isFilled ? palette.cardStrong : palette.border,
                                                            backgroundColor: isFilled ? palette.cardStrong : palette.card,
                                                        }}
                                                    >
                                                        <Text
                                                            className="font-nunito-bold text-[24px]"
                                                            style={{ color: isFilled ? palette.buttonTextOnDark : palette.text }}
                                                        >
                                                            {digit || ''}
                                                        </Text>
                                                    </Pressable>
                                                )
                                            })}
                                        </View>

                                        <TextInput
                                            ref={otpInputRef}
                                            value={otpCode}
                                            onChangeText={(value) =>
                                                setOtpCode(value.replace(/\D/g, '').slice(0, 6))
                                            }
                                            keyboardType="number-pad"
                                            maxLength={6}
                                            autoFocus
                                            textContentType="oneTimeCode"
                                            returnKeyType="done"
                                            onSubmitEditing={Keyboard.dismiss}
                                            style={{
                                                position: 'absolute',
                                                opacity: 0.01,
                                                width: 1,
                                                height: 1,
                                                left: -9999,
                                                top: -9999,
                                            }}
                                        />

                                        <View className="mt-6 flex-row items-center justify-between">
                                            <Pressable
                                                disabled={busy || resendSeconds > 0 || phone.length < 10}
                                                onPress={() => void handleOtpRequest().catch(() => null)}
                                            >
                                                <Text className="font-nunito-bold text-[18px]" style={{ color: palette.textMuted }}>
                                                    Send again
                                                </Text>
                                            </Pressable>
                                            <Pressable
                                                disabled={busy || phone.length < 10 || resendSeconds > 0}
                                                onPress={() => void handleOtpRequest().catch(() => null)}
                                            >
                                                <Text
                                                    className="font-nunito-semi text-sm"
                                                    style={{
                                                        color:
                                                            resendSeconds > 0
                                                                ? palette.textSoft
                                                                : palette.textMuted,
                                                    }}
                                                >
                                                    {resendSeconds > 0
                                                        ? `Resend in 00:${String(resendSeconds).padStart(2, '0')}`
                                                        : 'Resend OTP'}
                                                </Text>
                                            </Pressable>
                                        </View>
                                    </>
                                )}
                            </View>
                        </View>

                        {error ? (
                            <Pressable
                                onPress={clearError}
                                className="mt-8 rounded-[22px] px-4 py-4"
                                style={{ backgroundColor: palette.dangerSoft }}
                            >
                                <Text className="font-nunito-semi text-sm" style={{ color: palette.danger }}>{error}</Text>
                            </Pressable>
                        ) : null}

                        <Pressable
                            disabled={busy || !hasRequestedOtp || phone.length < 10 || otpCode.length < 4}
                            onPress={() => void verifyOtpCode(fullPhone, otpCode).catch(() => null)}
                            className="mt-auto h-14 items-center justify-center rounded-[15px]"
                            style={{
                                backgroundColor:
                                    busy || !hasRequestedOtp || phone.length < 10 || otpCode.length < 4
                                        ? palette.border
                                        : palette.cardStrong,
                            }}
                        >
                            {busy ? (
                                <ActivityIndicator color={palette.accent} />
                            ) : (
                                <Text className="font-nunito-bold text-[15px]" style={{ color: palette.buttonTextOnDark }}>
                                    Verify & Login
                                </Text>
                            )}
                        </Pressable>

                        <Text className="mt-10 text-center font-nunito-semi text-[15px]" style={{ color: palette.textSoft }}>
                            Having trouble? Get Help
                        </Text>
                        <Text className="mt-8 text-center font-nunito-regular text-base leading-7" style={{ color: palette.textMuted }}>
                            By logging in, you agree to eShop's Terms of Service and Privacy Policy.
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}
