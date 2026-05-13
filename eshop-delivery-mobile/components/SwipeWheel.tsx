import {
    Animated,
    PanResponder,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
    type GestureResponderEvent,
} from 'react-native'
import { useEffect, useMemo, useRef } from 'react'

type SwipeWheelProps = {
    value: boolean
    disabled?: boolean
    onChange: (next: boolean) => void
}

const TRACK_HEIGHT = 72
const KNOB_SIZE = 56
const TRACK_PADDING = 6

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value))
}

export function SwipeWheel({ value, disabled = false, onChange }: SwipeWheelProps) {
    const { width: windowWidth } = useWindowDimensions()
    const trackWidth = useMemo(() => clamp(windowWidth - 56, 272, 360), [windowWidth])
    const maxTranslate = useMemo(
        () => trackWidth - KNOB_SIZE - TRACK_PADDING * 2,
        [trackWidth],
    )
    const translateX = useRef(new Animated.Value(value ? maxTranslate : 0)).current
    const startOffsetRef = useRef(value ? maxTranslate : 0)

    useEffect(() => {
        const target = value ? maxTranslate : 0
        startOffsetRef.current = target
        Animated.spring(translateX, {
            toValue: target,
            useNativeDriver: true,
            bounciness: 7,
            speed: 16,
        }).start()
    }, [maxTranslate, translateX, value])

    const settle = (next: boolean) => {
        startOffsetRef.current = next ? maxTranslate : 0
        Animated.spring(translateX, {
            toValue: startOffsetRef.current,
            useNativeDriver: true,
            bounciness: 7,
            speed: 16,
        }).start()

        if (next !== value) {
            onChange(next)
        }
    }

    const panResponder = useMemo(
        () =>
            PanResponder.create({
                onMoveShouldSetPanResponder: (_event, gestureState) =>
                    !disabled && Math.abs(gestureState.dx) > 4,
                onPanResponderGrant: () => {
                    translateX.stopAnimation((current) => {
                        startOffsetRef.current = Number(current)
                    })
                },
                onPanResponderMove: (_event, gestureState) => {
                    const nextValue = clamp(
                        startOffsetRef.current + gestureState.dx,
                        0,
                        maxTranslate,
                    )
                    translateX.setValue(nextValue)
                },
                onPanResponderRelease: (_event, gestureState) => {
                    translateX.stopAnimation((current) => {
                        const shouldEnable =
                            current > maxTranslate * 0.58 || gestureState.vx > 0.45
                        const shouldDisable =
                            current < maxTranslate * 0.42 || gestureState.vx < -0.45
                        const next = value ? !shouldDisable : shouldEnable
                        settle(next)
                    })
                },
                onPanResponderTerminate: () => {
                    settle(value)
                },
            }),
        [disabled, maxTranslate, translateX, value],
    )

    const toggle = (_event: GestureResponderEvent) => {
        if (disabled) return
        settle(!value)
    }

    const labelFontSize = trackWidth < 310 ? 16 : 18
    const labelLetterSpacing = trackWidth < 310 ? 2.2 : 3
    const labelOffset = KNOB_SIZE + TRACK_PADDING * 2 + 12
    const label = value ? 'ONLINE' : 'OFFLINE'

    return (
        <Pressable
            onPress={toggle}
            className={disabled ? 'opacity-70' : ''}
            style={[
                styles.track,
                {
                    width: trackWidth,
                    height: TRACK_HEIGHT,
                    borderRadius: TRACK_HEIGHT / 2,
                    padding: TRACK_PADDING,
                },
                value ? styles.trackOnline : styles.trackOffline,
            ]}
        >
            <View
                pointerEvents="none"
                style={[
                    styles.labelWrap,
                    value ? styles.labelWrapOnline : styles.labelWrapOffline,
                    value ? { left: 20, right: labelOffset } : { right: 20, left: labelOffset },
                ]}
            >
                <Text
                    style={[
                        styles.label,
                        {
                            fontSize: labelFontSize,
                            letterSpacing: labelLetterSpacing,
                        },
                        value ? styles.labelOnline : styles.labelOffline,
                    ]}
                >
                    {label}
                </Text>
            </View>

            <Animated.View
                {...panResponder.panHandlers}
                style={[
                    styles.knob,
                    value ? styles.knobOnline : styles.knobOffline,
                    { transform: [{ translateX }] },
                ]}
            />
        </Pressable>
    )
}

const styles = StyleSheet.create({
    track: {
        borderWidth: 2,
        justifyContent: 'center',
        overflow: 'visible',
        alignSelf: 'center',
    },
    trackOffline: {
        backgroundColor: '#f5d3d3',
        borderColor: '#eb5858',
    },
    trackOnline: {
        backgroundColor: '#dcebe4',
        borderColor: '#2cb36b',
    },
    labelWrap: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        justifyContent: 'center',
    },
    labelWrapOffline: {
        alignItems: 'center',
    },
    labelWrapOnline: {
        alignItems: 'center',
    },
    label: {
        fontFamily: 'Nunito_700Bold',
    },
    labelOffline: {
        color: '#eb5858',
    },
    labelOnline: {
        color: '#08e25f',
    },
    knob: {
        width: KNOB_SIZE,
        height: KNOB_SIZE,
        borderRadius: KNOB_SIZE / 2,
        backgroundColor: '#ffffff',
        borderWidth: 3,
        shadowColor: '#0f1712',
        shadowOpacity: 0.24,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 9 },
        elevation: 12,
    },
    knobOffline: {
        borderColor: '#eb5858',
    },
    knobOnline: {
        borderColor: '#2cb36b',
    },
})
