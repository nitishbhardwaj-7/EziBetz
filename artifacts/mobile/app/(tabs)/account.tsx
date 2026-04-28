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
import { useBalance } from "@/context/BalanceContext";
import { useColors } from "@/hooks/useColors";

const MENU_ITEMS = [
  { icon: "account-edit" as const, label: "Edit Profile", chevron: true },
  { icon: "shield-check" as const, label: "Security & KYC", chevron: true },
  { icon: "bell-outline" as const, label: "Notifications", chevron: true },
  { icon: "swap-horizontal" as const, label: "Transaction Limits", chevron: true },
  { icon: "translate" as const, label: "Language & Region", chevron: true },
  { icon: "help-circle-outline" as const, label: "Help & Support", chevron: true },
  { icon: "file-document-outline" as const, label: "Terms & Privacy", chevron: true },
];

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { balance, formatBalance } = useBalance();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 80;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        {/* Profile Card */}
        <LinearGradient
          colors={["rgba(43,32,62,0.95)", "rgba(17,10,30,0.95)"]}
          style={[styles.profileCard, { paddingTop: topPad + 24 }]}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDim]}
            style={styles.avatarCircle}
          >
            <Text style={[styles.avatarInitials, { color: colors.primaryForeground }]}>EZ</Text>
          </LinearGradient>
          <Text style={[styles.username, { color: colors.foreground }]}>Ezibetz_Player</Text>
          <Text style={[styles.userHandle, { color: colors.mutedForeground }]}>
            @ezibetz_player
          </Text>
          <View style={[styles.vipBadge, { backgroundColor: `${colors.primary}20`, borderColor: colors.primary }]}>
            <MaterialCommunityIcons name="crown" size={14} color={colors.primary} />
            <Text style={[styles.vipBadgeText, { color: colors.primary }]}>PLASMA TIER</Text>
          </View>

          {/* XP Bar */}
          <View style={styles.xpSection}>
            <View style={[styles.xpBarBg, { backgroundColor: colors.surfaceContainerLow }]}>
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.xpBarFill}
              />
            </View>
            <Text style={[styles.xpText, { color: colors.mutedForeground }]}>
              750 / 1000 XP TO NEXT LEVEL
            </Text>
          </View>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: "GAMES PLAYED", value: "1,248" },
            { label: "WIN RATE", value: "58%" },
            { label: "TOTAL WON", value: "$16.4K" },
          ].map((s, i) => (
            <View
              key={i}
              style={[styles.statItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={[styles.statValue, { color: colors.foreground }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Balance Summary */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <View style={[styles.balanceRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View>
              <Text style={[styles.balanceLabel, { color: colors.mutedForeground }]}>Balance</Text>
              <Text style={[styles.balanceAmount, { color: colors.secondary }]}>
                {formatBalance(balance)}
              </Text>
            </View>
            <TouchableOpacity>
              <LinearGradient
                colors={[colors.primary, colors.primaryDim]}
                style={styles.depositBtn}
              >
                <Text style={[styles.depositBtnText, { color: colors.primaryForeground }]}>
                  DEPOSIT
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu */}
        <View style={{ paddingHorizontal: 16 }}>
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {MENU_ITEMS.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.menuItem,
                  i < MENU_ITEMS.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <View
                  style={[styles.menuIconWrap, { backgroundColor: `${colors.primary}14` }]}
                >
                  <MaterialCommunityIcons name={item.icon} size={20} color={colors.primary} />
                </View>
                <Text style={[styles.menuLabel, { color: colors.foreground }]}>
                  {item.label}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={colors.mutedForeground}
                />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.logoutBtn, { borderColor: colors.destructive }]}
          >
            <MaterialCommunityIcons name="logout" size={20} color={colors.destructive} />
            <Text style={[styles.logoutText, { color: colors.destructive }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  profileCard: {
    alignItems: "center",
    paddingBottom: 24,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: "900",
    fontStyle: "italic",
  },
  username: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  userHandle: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 10,
  },
  vipBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    marginBottom: 16,
  },
  vipBadgeText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  xpSection: {
    width: "100%",
  },
  xpBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 6,
  },
  xpBarFill: {
    width: "75%",
    height: "100%",
    borderRadius: 3,
  },
  xpText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
    textAlign: "center",
    textTransform: "uppercase",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 4,
    textAlign: "center",
  },
  balanceRow: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -1,
  },
  depositBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  depositBtnText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  menuCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "800",
  },
});
