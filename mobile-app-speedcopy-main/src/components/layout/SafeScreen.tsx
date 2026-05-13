import React from 'react';
import { View, StyleSheet, StatusBar, StatusBarStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore } from '../../store/useThemeStore';

interface SafeScreenProps {
  children: React.ReactNode;
  backgroundColor?: string;
  statusBarStyle?: StatusBarStyle;
  edges?: Edge[];
}

export const SafeScreen: React.FC<SafeScreenProps> = ({
  children,
  backgroundColor,
  statusBarStyle,
  edges,
}) => {
  const { colors } = useThemeStore();
  const bg = backgroundColor ?? colors.background;
  const barStyle = statusBarStyle ?? colors.statusBar;

  return (
    <SafeAreaView edges={edges} style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={barStyle} backgroundColor={bg} animated />
      <View style={styles.inner}>{children}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1 },
});
