import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { Pressable, Text, View } from 'react-native'

export function UploadBadge({
    label,
    tone,
}: {
    label: string
    tone: 'required' | 'pending' | 'ready'
}) {
    const palette =
        tone === 'required'
            ? { background: 'bg-[#ffe3e0]', text: 'text-[#ff6d62]' }
            : tone === 'pending'
              ? { background: 'bg-[#fff2dc]', text: 'text-[#f29e2f]' }
              : { background: 'bg-[#e0faeb]', text: 'text-[#16b162]' }

    return (
        <View className={`rounded-[8px] px-3 py-1 ${palette.background}`}>
            <Text className={`font-nunito-bold text-xs uppercase tracking-[1px] ${palette.text}`}>
                {label}
            </Text>
        </View>
    )
}

export function UploadSlot({
    label,
    uri,
    onPress,
}: {
    label: string
    uri?: string | null
    onPress: () => void
}) {
    return (
        <Pressable
            onPress={onPress}
            className="h-[88px] w-[48%] overflow-hidden rounded-[12px] border border-[#d7dde5] bg-white"
        >
            {uri ? (
                <>
                    <Image source={{ uri }} style={{ height: '100%', width: '100%' }} contentFit="cover" />
                    <View className="absolute inset-x-0 bottom-2 items-center">
                        <View className="rounded-full bg-white px-2 py-1">
                            <Text className="font-nunito-semi text-[11px] text-[#111713]">{label}</Text>
                        </View>
                    </View>
                </>
            ) : (
                <View className="flex-1 items-center justify-center">
                    <Ionicons name="camera-outline" size={18} color="#9aabc3" />
                    <Text className="mt-2 font-nunito-semi text-[13px] text-[#8ea0b8]">{label}</Text>
                </View>
            )}
        </Pressable>
    )
}
