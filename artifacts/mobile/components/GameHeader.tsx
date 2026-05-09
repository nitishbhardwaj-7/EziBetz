import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
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

export function GameHeader({ showBack = false }: GameHeaderProps) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { balance, formatBalance } = useBalance();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const balanceAnim = useRef(new Animated.Value(1)).current;
  const prevBalance = useRef(balance);

  useEffect(() => {
    if (prevBalance.current === balance) return;
    prevBalance.current = balance;
    Animated.sequence([
      Animated.timing(balanceAnim, { toValue: 1.12, duration: 120, useNativeDriver: true }),
      Animated.spring(balanceAnim, { toValue: 1, friction: 6, tension: 300, useNativeDriver: true }),
    ]).start();
  }, [balance, balanceAnim]);

  return (
    <View style={[styles.container, { paddingTop: topPadding + 10 }]}>
      <LinearGradient
        colors={["rgba(17,10,30,0.98)", "rgba(17,10,30,0.85)"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.inner}>
        <View style={styles.left}>
          {showBack && (
            <TouchableOpacity
              onPress={() => router.back()}
              style={[styles.backBtn, { backgroundColor: colors.accent, borderColor: colors.border }]}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons name="chevron-left" size={22} color={colors.foreground} />
            </TouchableOpacity>
          )}
          <View style={styles.logoRow}>
            <Image
              source={require("@/assets/images/ezibetz_logo.png")}
              style={styles.logoImg}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
            <Text style={[styles.logoText, { color: colors.foreground }]}>EZIBETZ</Text>
          </View>
        </View>

        <Animated.View style={{ transform: [{ scale: balanceAnim }] }}>
          <View style={[styles.balancePill, { backgroundColor: colors.accent, borderColor: `${colors.secondary}30` }]}>
            <MaterialCommunityIcons name="wallet" size={14} color={colors.secondary} />
            <Text style={[styles.balanceText, { color: colors.secondary }]}>
              {formatBalance(balance)}
            </Text>
          </View>
        </Animated.View>
      </View>
      {/* neon underline */}
      <View style={[styles.neonLine, { backgroundColor: colors.primary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 10,
    paddingHorizontal: 16,
    overflow: "hidden",
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
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logoImg: {
    width: 32,
    height: 32,
  },
  logoText: {
    fontSize: 18,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: -0.5,
  },
  balancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
    borderWidth: 1,
  },
  balanceText: {
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: -0.3,
  },
  neonLine: {
    height: 1.5,
    marginTop: 10,
    opacity: 0.4,
    borderRadius: 1,
    shadowColor: "#c59aff",
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
});
