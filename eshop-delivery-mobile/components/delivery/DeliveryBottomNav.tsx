import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { getDeliveryPalette } from "../../lib/delivery-theme";
import type { DeliveryThemeMode } from "../../lib/delivery-context.types";

export const DELIVERY_TAB_BAR_HEIGHT = 108;

const tabs = [
  { route: "/", label: "Home", icon: "grid-outline", iconActive: "grid" },
  {
    route: "/earnings",
    label: "Earnings",
    icon: "wallet-outline",
    iconActive: "wallet",
  },
  {
    route: "/profile",
    label: "Profile",
    icon: "person-outline",
    iconActive: "person",
  },
  {
    route: "/support",
    label: "Support",
    icon: "headset-outline",
    iconActive: "headset",
  },
] as const;

function isActiveRoute(pathname: string, route: string) {
  if (route === "/earnings") {
    return pathname === "/earnings" || pathname === "/history";
  }
  return pathname === route;
}

export function DeliveryBottomNav({
  themeMode,
}: {
  themeMode: DeliveryThemeMode;
}) {
  const pathname = usePathname();
  const palette = getDeliveryPalette(themeMode);

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 bottom-0 px-4 pb-4"
    >
      <View
        className="mx-auto mb-3 h-[1px] w-full"
        style={{
          backgroundColor: palette.borderSoft,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
        }}
      />
      <View
        className="flex-row items-center justify-between"
        style={{
          backgroundColor: palette.card,
          borderWidth: 1,
          borderColor: palette.borderSoft,
          borderRadius: 28,
          paddingVertical: 10,
          paddingHorizontal: 6,
          shadowColor: "#0f172a",
          shadowOpacity: palette.dark ? 0.28 : 0.08,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
          elevation: 10,
        }}
      >
        {tabs.map((tab) => {
          const active = isActiveRoute(pathname, tab.route);

          return (
            <Pressable
              key={tab.route}
              onPress={() => {
                if (!active) {
                  router.replace(tab.route);
                }
              }}
              className="flex-1 items-center"
              style={{ paddingVertical: 4 }}
            >
              <View
                className="items-center justify-center"
                style={{
                  width: active ? 72 : 56,
                  minHeight: active ? 72 : 56,
                  paddingVertical: active ? 10 : 4,
                  borderRadius: 999,
                  backgroundColor: active ? palette.cardStrong : "transparent",
                  borderWidth: active ? 1 : 0,
                  borderColor: active ? palette.borderSoft : "transparent",
                }}
              >
                <Ionicons
                  name={active ? tab.iconActive : tab.icon}
                  size={active ? 26 : 22}
                  color={active ? palette.buttonTextOnDark : palette.textMuted}
                />

                <Text
                  className="mt-2 font-nunito-bold text-[11px]"
                  style={{
                    color: active ? palette.buttonTextOnDark : palette.textMuted,
                  }}
                >
                  {tab.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
