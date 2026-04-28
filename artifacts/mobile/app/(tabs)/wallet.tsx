import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
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

const TRANSACTIONS = [
  { type: "win", label: "Dice Win", amount: "+$890.12", time: "2m ago", game: "Dice" },
  { type: "loss", label: "Slots Spin", amount: "-$100.00", time: "15m ago", game: "Slots" },
  { type: "win", label: "Blackjack Win", amount: "+$600.00", time: "1h ago", game: "Blackjack" },
  { type: "deposit", label: "Deposit", amount: "+$500.00", time: "3h ago", game: null },
  { type: "loss", label: "Roulette", amount: "-$200.00", time: "5h ago", game: "Roulette" },
  { type: "win", label: "Slots Jackpot", amount: "+$2,450.00", time: "1d ago", game: "Slots" },
  { type: "withdrawal", label: "Withdrawal", amount: "-$1,000.00", time: "2d ago", game: null },
];

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { balance, formatBalance } = useBalance();
  const [activeFilter, setActiveFilter] = useState<"all" | "wins" | "losses">("all");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 80;

  const filtered = TRANSACTIONS.filter((t) => {
    if (activeFilter === "wins") return t.type === "win";
    if (activeFilter === "losses") return t.type === "loss";
    return true;
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          WAL<Text style={{ color: colors.primary }}>LET</Text>
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        {/* Balance Display */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <LinearGradient
            colors={["rgba(30,21,46,0.9)", "rgba(43,32,62,0.9)"]}
            style={[styles.balanceCard, { borderColor: colors.border }]}
          >
            <Text style={[styles.balanceLabel, { color: colors.mutedForeground }]}>
              Total Balance
            </Text>
            <Text style={[styles.balanceBig, { color: colors.secondary }]}>
              {formatBalance(balance)}
            </Text>
            <View style={styles.walletActions}>
              <TouchableOpacity style={styles.walletActionBtn}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryDim]}
                  style={styles.walletBtnGradient}
                >
                  <MaterialCommunityIcons name="plus" size={20} color={colors.primaryForeground} />
                  <Text style={[styles.walletBtnText, { color: colors.primaryForeground }]}>
                    DEPOSIT
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.walletActionBtn,
                  styles.walletBtnOutline,
                  { borderColor: colors.outlineVariant },
                ]}
              >
                <MaterialCommunityIcons name="arrow-up" size={20} color={colors.foreground} />
                <Text style={[styles.walletBtnText, { color: colors.foreground }]}>WITHDRAW</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="trending-up" size={20} color={colors.secondary} />
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Won</Text>
            <Text style={[styles.statAmount, { color: colors.secondary }]}>$16,390.12</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="trending-down" size={20} color={colors.destructive} />
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Lost</Text>
            <Text style={[styles.statAmount, { color: colors.destructive }]}>$3,940.00</Text>
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.txSection}>
          <View style={styles.txHeader}>
            <Text style={[styles.txTitle, { color: colors.foreground }]}>History</Text>
            <View style={styles.filterRow}>
              {(["all", "wins", "losses"] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setActiveFilter(f)}
                  style={[
                    styles.filterBtn,
                    {
                      backgroundColor:
                        activeFilter === f ? colors.primary : colors.accent,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      {
                        color:
                          activeFilter === f
                            ? colors.primaryForeground
                            : colors.mutedForeground,
                      },
                    ]}
                  >
                    {f.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.txList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {filtered.map((tx, i) => {
              const isPositive = tx.amount.startsWith("+");
              return (
                <View
                  key={i}
                  style={[
                    styles.txItem,
                    i < filtered.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                >
                  <View
                    style={[
                      styles.txIcon,
                      {
                        backgroundColor: isPositive
                          ? "rgba(0,244,254,0.12)"
                          : tx.type === "deposit"
                          ? "rgba(197,154,255,0.12)"
                          : "rgba(255,110,132,0.12)",
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={
                        isPositive
                          ? "arrow-down"
                          : tx.type === "withdrawal"
                          ? "arrow-up"
                          : "gamepad-variant"
                      }
                      size={18}
                      color={
                        isPositive
                          ? colors.secondary
                          : tx.type === "deposit"
                          ? colors.primary
                          : colors.destructive
                      }
                    />
                  </View>
                  <View style={styles.txMid}>
                    <Text style={[styles.txLabel, { color: colors.foreground }]}>
                      {tx.label}
                    </Text>
                    <Text style={[styles.txTime, { color: colors.mutedForeground }]}>
                      {tx.time}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.txAmount,
                      {
                        color: isPositive ? colors.secondary : colors.destructive,
                      },
                    ]}
                  >
                    {tx.amount}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
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
  balanceCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  balanceBig: {
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: -1.5,
    marginBottom: 20,
  },
  walletActions: {
    flexDirection: "row",
    gap: 12,
  },
  walletActionBtn: {
    flex: 1,
    borderRadius: 9999,
    overflow: "hidden",
  },
  walletBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 9999,
  },
  walletBtnOutline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderWidth: 1,
  },
  walletBtnText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  statAmount: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  txSection: {
    paddingHorizontal: 16,
  },
  txHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  txTitle: {
    fontSize: 18,
    fontWeight: "900",
    fontStyle: "italic",
  },
  filterRow: {
    flexDirection: "row",
    gap: 6,
  },
  filterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  filterText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  txList: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  txItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  txMid: { flex: 1 },
  txLabel: { fontSize: 13, fontWeight: "700" },
  txTime: { fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: "900", letterSpacing: -0.3 },
});
