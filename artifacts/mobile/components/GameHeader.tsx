import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useBalance } from "@/context/BalanceContext";
import { useColors } from "@/hooks/useColors";

interface GameHeaderProps {
  title?: string;
  showBack?: boolean;
}

export function GameHeader({ title, showBack = false }: GameHeaderProps) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { balance, formatBalance } = useBalance();
  const topPadding =
    Platform.OS === "web" ? 67 : insets.top;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: topPadding + 12,
          backgroundColor: "rgba(17, 10, 30, 0.75)",
        },
      ]}
    >
      <View style={styles.inner}>
        <View style={styles.left}>
          {showBack && (
            <TouchableOpacity
              onPress={() => router.back()}
              style={[styles.backBtn, { backgroundColor: colors.accent }]}
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={24}
                color={colors.foreground}
              />
            </TouchableOpacity>
          )} 
          <View style={styles.logoRow}>
            <Image
              source={require("@/assets/images/ezibetz_logo.png")}
              style={styles.logoImg}
              contentFit="contain"
            />
            <Text style={[styles.logoText, { color: colors.foreground }]}>
              EZIBETZ
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.balancePill, { backgroundColor: colors.accent }]}
        >
          <MaterialCommunityIcons
            name="wallet"
            size={16}
            color={colors.secondary}
          />
          <Text style={[styles.balanceText, { color: colors.secondary }]}>
            {formatBalance(balance)}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logoImg: {
    width: 36,
    height: 36,
  },
  logoText: {
    fontSize: 20,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: -0.5,
  },
  balancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  balanceText: {
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: -0.3,
  },
});
