import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

const PROMOS = [
  {
    title: "200% WELCOME BOOST",
    tag: "NEW PLAYERS",
    desc: "Double your first deposit up to $2,000",
    icon: "gift" as const,
    color: "#c59aff",
  },
  {
    title: "DAILY CASHBACK",
    tag: "EVERY DAY",
    desc: "Get 10% back on all losses, credited every 24 hours",
    icon: "cash-refund" as const,
    color: "#00f4fe",
  },
  {
    title: "VIP PLASMA BONUS",
    tag: "EXCLUSIVE",
    desc: "Plasma tier members get 50 free spins every Monday",
    icon: "crown" as const,
    color: "#ff59e3",
  },
  {
    title: "REFER A FRIEND",
    tag: "UNLIMITED",
    desc: "Earn $50 for every friend who deposits $100 or more",
    icon: "account-multiple-plus" as const,
    color: "#c59aff",
  },
  {
    title: "WEEKEND RELOAD",
    tag: "SAT & SUN",
    desc: "50% reload bonus every weekend, up to $500",
    icon: "reload" as const,
    color: "#00f4fe",
  },
];

export default function PromosScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 80;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          PROMO<Text style={{ color: colors.primary }}>TIONS</Text>
        </Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          ACTIVE OFFERS
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad }]}
      >
        {PROMOS.map((promo, i) => (
          <View
            key={i}
            style={[
              styles.promoCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={[styles.promoIconWrap, { backgroundColor: `${promo.color}18` }]}>
              <MaterialCommunityIcons name={promo.icon} size={28} color={promo.color} />
            </View>
            <View style={styles.promoContent}>
              <Text style={[styles.promoTag, { color: colors.mutedForeground }]}>
                {promo.tag}
              </Text>
              <Text style={[styles.promoTitle, { color: colors.foreground }]}>
                {promo.title}
              </Text>
              <Text style={[styles.promoDesc, { color: colors.mutedForeground }]}>
                {promo.desc}
              </Text>
              <TouchableOpacity style={styles.claimBtn}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryDim]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.claimGradient}
                >
                  <Text style={[styles.claimText, { color: colors.primaryForeground }]}>
                    CLAIM
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 3,
    marginTop: 2,
  },
  list: {
    paddingHorizontal: 16,
    gap: 12,
    paddingTop: 8,
  },
  promoCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    flexDirection: "row",
    gap: 16,
  },
  promoIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  promoContent: {
    flex: 1,
    gap: 4,
  },
  promoTag: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  promoTitle: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  promoDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  claimBtn: {
    alignSelf: "flex-start",
  },
  claimGradient: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  claimText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
});
