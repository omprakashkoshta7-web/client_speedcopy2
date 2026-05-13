import * as Haptics from 'expo-haptics'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useDelivery } from '../../../lib/delivery-context'
import { UploadBadge, UploadSlot } from './KycUpload'

export function DeliveryKycScreen() {
    const {
        busy,
        error,
        session,
        kycStatus,
        kycState,
        logout,
        saveKycDraft,
        submitKyc,
        clearError,
    } = useDelivery()
    const submittedAt = kycState.submittedAt || session?.user.kycSubmittedAt || null
    const isPendingReview = kycStatus === 'pending' && Boolean(submittedAt)
    const isRejected = kycStatus === 'rejected'

    const pickImage = async (mode: 'camera' | 'library') => {
        if (mode === 'camera') {
            const permission = await ImagePicker.requestCameraPermissionsAsync()
            if (permission.status !== 'granted') {
                throw new Error('Camera permission is required')
            }
            return ImagePicker.launchCameraAsync({
                allowsEditing: true,
                quality: 0.7,
                mediaTypes: ['images'],
            })
        }

        return ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            quality: 0.7,
            mediaTypes: ['images'],
        })
    }

    const handleUpload = async (
        field: 'governmentIdFrontUri' | 'governmentIdBackUri' | 'selfieUri',
        mode: 'camera' | 'library',
    ) => {
        try {
            const result = await pickImage(mode)
            if (!result.canceled && result.assets[0]?.uri) {
                await saveKycDraft({ [field]: result.assets[0].uri })
                await Haptics.selectionAsync().catch(() => null)
            }
        } catch (uploadError) {
            console.warn(uploadError)
        }
    }

    const governmentIdSidesAdded = [
        kycState.governmentIdFrontUri,
        kycState.governmentIdBackUri,
    ].filter(Boolean).length
    const governmentIdBadge =
        governmentIdSidesAdded === 2 ? 'Added' : governmentIdSidesAdded === 1 ? 'Pending' : 'Required'
    const governmentIdTone: 'required' | 'pending' | 'ready' =
        governmentIdSidesAdded === 2 ? 'ready' : governmentIdSidesAdded === 1 ? 'pending' : 'required'
    const governmentIdHelperText =
        governmentIdSidesAdded === 0
            ? 'Tap to upload front & back'
            : governmentIdSidesAdded === 1
              ? 'Upload the remaining side'
              : 'Front & back added'
    const selfieTone: 'pending' | 'ready' = kycState.selfieUri ? 'ready' : 'pending'

    return (
        <SafeAreaView className="flex-1 bg-[#f5f7f6]">
            <ScrollView contentContainerClassName="px-6 pb-10 pt-4">
                <View className="mt-2 flex-row items-center justify-between">
                    <Pressable
                        onPress={() => void logout()}
                        className="h-11 w-11 items-center justify-center rounded-full bg-white"
                    >
                        <Ionicons name="chevron-back" size={20} color="#111713" />
                    </Pressable>
                    <Text className="font-nunito-bold text-[22px] text-[#222222]">KYC</Text>
                    <View className="h-11 w-11" />
                </View>

                <Text className="mt-12 font-nunito-bold text-[24px] leading-[34px] text-[#050505]">
                    {isPendingReview
                        ? 'Verification is under review'
                        : isRejected
                          ? 'Verification needs another upload'
                          : "Let's get you verified"}
                </Text>
                <Text className="mt-3 font-nunito-regular text-[15px] leading-7 text-[#9aaac2]">
                    {isPendingReview
                        ? 'Your identity documents have been submitted. We will unlock delivery access once the review is approved.'
                        : isRejected
                          ? 'Your previous submission was not approved. Upload a clear government ID and selfie to try again.'
                          : 'To keep the eShop delivery platform safe, we need a quick ID and selfie check. This usually takes under 2 minutes.'}
                </Text>

                <View className="mt-6 rounded-[22px] border border-[#bfc6c2] bg-white px-4 py-5">
                    <View className="flex-row items-start">
                        <View className="h-12 w-12 items-center justify-center rounded-[12px] bg-[#707572]">
                            <Ionicons name="card-outline" size={22} color="#ffffff" />
                        </View>
                        <View className="ml-4 flex-1">
                            <View className="flex-row items-center justify-between">
                                <Text className="font-nunito-bold text-[15px] text-[#111713]">
                                    Government ID
                                </Text>
                                <UploadBadge label={governmentIdBadge} tone={governmentIdTone} />
                            </View>
                            <Text className="mt-1 font-nunito-regular text-[13px] leading-5 text-[#91a0b5]">
                                Driver&apos;s License or National ID Card
                            </Text>

                            <View className="mt-4 rounded-[14px] border border-dashed border-[#7d7d7d] bg-[#fafafa] px-4 py-4">
                                <View className="items-center">
                                    <Ionicons name="camera-outline" size={20} color="#9aabc3" />
                                    <Text className="mt-2 font-nunito-semi text-[13px] text-[#6d6d6d]">
                                        {governmentIdHelperText}
                                    </Text>
                                </View>

                                <View className="mt-4 flex-row items-center justify-between">
                                    <UploadSlot
                                        label="Front"
                                        uri={kycState.governmentIdFrontUri}
                                        onPress={() =>
                                            void handleUpload('governmentIdFrontUri', 'library').catch(() => null)
                                        }
                                    />
                                    <UploadSlot
                                        label="Back"
                                        uri={kycState.governmentIdBackUri}
                                        onPress={() =>
                                            void handleUpload('governmentIdBackUri', 'library').catch(() => null)
                                        }
                                    />
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                <View className="mt-4 rounded-[22px] border border-[#bfc6c2] bg-white px-4 py-5">
                    <View className="flex-row items-start">
                        <View className="h-12 w-12 items-center justify-center rounded-[12px] bg-[#707572]">
                            <Ionicons name="person-outline" size={22} color="#ffffff" />
                        </View>
                        <View className="ml-4 flex-1">
                            <View className="flex-row items-center justify-between">
                                <Text className="font-nunito-bold text-[15px] text-[#111713]">
                                    Take a Selfie
                                </Text>
                                <UploadBadge
                                    label={kycState.selfieUri ? 'Ready' : 'Pending'}
                                    tone={selfieTone}
                                />
                            </View>
                            <Text className="mt-1 font-nunito-regular text-[13px] leading-5 text-[#91a0b5]">
                                Ensure your face is clearly visible without glasses or masks.
                            </Text>

                            <Pressable
                                onPress={() => void handleUpload('selfieUri', 'camera').catch(() => null)}
                                className="mt-4 overflow-hidden rounded-[14px] border border-dashed border-[#7d7d7d] bg-[#fafafa]"
                            >
                                {kycState.selfieUri ? (
                                    <Image
                                        source={{ uri: kycState.selfieUri }}
                                        style={{ height: 110, width: '100%' }}
                                        contentFit="cover"
                                    />
                                ) : (
                                    <View className="h-[72px] flex-row items-center justify-center">
                                        <Ionicons name="camera-outline" size={20} color="#9aabc3" />
                                        <Text className="ml-3 font-nunito-semi text-[13px] text-[#cad4e2]">
                                            Open Camera
                                        </Text>
                                    </View>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>

                <View className="mt-10 flex-row items-start justify-center px-4">
                    <Ionicons name="lock-closed" size={14} color="#6f7a8e" style={{ marginTop: 3 }} />
                    <Text className="ml-3 max-w-[260px] text-center font-nunito-regular text-[14px] leading-5 text-[#6f7a8e]">
                        {'Your data is encrypted and securely\nstored. We value your privacy.'}
                    </Text>
                </View>

                {error ? (
                    <Pressable
                        onPress={clearError}
                        className="mt-6 rounded-[22px] bg-[#fff2ef] px-4 py-4"
                    >
                        <Text className="font-nunito-semi text-sm text-[#b24f3d]">{error}</Text>
                    </Pressable>
                ) : null}

                {isPendingReview ? (
                    <View className="mt-6 rounded-[22px] bg-[#eef7f0] px-4 py-4">
                        <Text className="font-nunito-semi text-sm text-[#2f6f44]">
                            Submitted {new Date(submittedAt as string).toLocaleString('en-IN')}. Approval is required before jobs and earnings become available.
                        </Text>
                    </View>
                ) : null}

                <Pressable
                    disabled={busy || isPendingReview}
                    onPress={() => void submitKyc().catch(() => null)}
                    className="mt-8 h-14 items-center justify-center rounded-[16px] bg-[#050505]"
                    style={{ opacity: busy || isPendingReview ? 0.6 : 1 }}
                >
                    {busy ? (
                        <ActivityIndicator color="#1ce96e" />
                    ) : (
                        <Text className="font-nunito-bold text-[16px] text-white">
                            {isPendingReview ? 'Awaiting Approval' : 'Submit for Approval'}
                        </Text>
                    )}
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    )
}
