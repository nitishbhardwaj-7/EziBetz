import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useBalance } from "@/context/BalanceContext";
import { useColors } from "@/hooks/useColors";

const QUICK_AMOUNTS = [100, 250, 500, 1000];

function DepositModal({
  visible,
  type,
  onClose,
  onConfirm,
  balance,
  colors,
}: {
  visible: boolean;
  type: "deposit" | "withdraw";
  onClose: () => void;
  onConfirm: (amount: number) => void;
  balance: number;
  colors: ReturnType<typeof useColors>;
}) {
  const [inputAmount, setInputAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 16;
  const isDeposit = type === "deposit";
  const parsed = parseFloat(inputAmount.replace(/,/g, "")) || 0;

  const handleConfirm = () => {
    if (parsed < 10) { setError("Minimum amount is $10.00"); return; }
    if (!isDeposit && parsed > balance) { setError("Insufficient balance"); return; }
    if (isDeposit && parsed > 10000) { setError("Max deposit is $10,000"); return; }
    setError(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSuccess(true);
    setTimeout(() => { onConfirm(parsed); setSuccess(false); setInputAmount(""); onClose(); }, 1000);
  };

  const handleClose = () => { setInputAmount(""); setError(null); setSuccess(false); onClose(); };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, justifyContent: "flex-end" }}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={handleClose} />
        <View style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: bottomPad }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.outlineVariant }]} />
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={[styles.modalIconWrap, { backgroundColor: isDeposit ? `${colors.primary}20` : `${colors.secondary}15` }]}>
                <MaterialCommunityIcons name={isDeposit ? "arrow-down" : "arrow-up"} size={22} color={isDeposit ? colors.primary : colors.secondary} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{isDeposit ? "Deposit Funds" : "Withdraw Funds"}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={[styles.closeBtn, { backgroundColor: colors.accent }]}>
              <MaterialCommunityIcons name="close" size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {success ? (
            <View style={styles.successBox}>
              <View style={[styles.successIcon, { backgroundColor: `${colors.secondary}20` }]}>
                <MaterialCommunityIcons name="check-circle" size={48} color={colors.secondary} />
              </View>
              <Text style={[styles.successTitle, { color: colors.foreground }]}>{isDeposit ? "Deposit Successful!" : "Withdrawal Initiated!"}</Text>
              <Text style={[styles.successSub, { color: colors.mutedForeground }]}>{isDeposit ? `$${parsed.toFixed(2)} added to your balance` : `$${parsed.toFixed(2)} will arrive within 1-3 business days`}</Text>
            </View>
          ) : (
            <View style={styles.modalContent}>
              {!isDeposit && (
                <View style={[styles.balancePillModal, { backgroundColor: colors.accent, borderColor: colors.border }]}>
                  <MaterialCommunityIcons name="wallet" size={16} color={colors.secondary} />
                  <Text style={[{ fontSize: 13, fontWeight: "600" as const }, { color: colors.mutedForeground }]}>
                    Available: <Text style={{ color: colors.secondary, fontWeight: "900" as const }}>${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</Text>
                  </Text>
                </View>
              )}
              <View style={[styles.amountInput, { backgroundColor: colors.input, borderColor: error ? colors.destructive : colors.border }]}>
                <Text style={[styles.dollarSign, { color: colors.primary }]}>$</Text>
                <TextInput value={inputAmount} onChangeText={(v) => { setInputAmount(v); setError(null); }} placeholder="0.00" placeholderTextColor={colors.mutedForeground} keyboardType="decimal-pad" style={[styles.amountTextInput, { color: colors.primary }]} autoFocus />
              </View>
              {error && (
                <View style={[styles.errorRow, { borderColor: colors.destructive, backgroundColor: `${colors.destructive}12` }]}>
                  <MaterialCommunityIcons name="alert-circle" size={14} color={colors.destructive} />
                  <Text style={[{ fontSize: 12, fontWeight: "600" as const, flex: 1 }, { color: colors.destructive }]}>{error}</Text>
                </View>
              )}
              <View style={styles.quickRow}>
                {QUICK_AMOUNTS.map((amt) => (
                  <TouchableOpacity key={amt} onPress={() => { setInputAmount(String(amt)); setError(null); }}
                    style={[styles.quickBtn, { backgroundColor: parsed === amt ? `${colors.primary}25` : colors.accent, borderColor: parsed === amt ? colors.primary : colors.border }]}>
                    <Text style={[styles.quickBtnText, { color: parsed === amt ? colors.primary : colors.foreground }]}>${amt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[{ fontSize: 9, fontWeight: "800" as const, letterSpacing: 2, textTransform: "uppercase" as const }, { color: colors.mutedForeground }]}>PAYMENT METHOD</Text>
              <View style={styles.methodRow}>
                {[{ icon: "credit-card-outline", label: "Card" }, { icon: "bitcoin", label: "Crypto" }, { icon: "bank-outline", label: "Bank" }].map((m, i) => (
                  <TouchableOpacity key={i} style={[styles.methodBtn, { backgroundColor: i === 0 ? `${colors.primary}15` : colors.accent, borderColor: i === 0 ? colors.primary : colors.border }]}>
                    <MaterialCommunityIcons name={m.icon as any} size={20} color={i === 0 ? colors.primary : colors.mutedForeground} />
                    <Text style={[{ fontSize: 11, fontWeight: "700" as const }, { color: i === 0 ? colors.primary : colors.mutedForeground }]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity onPress={handleConfirm} activeOpacity={0.85}>
                <LinearGradient colors={[colors.primary, colors.primaryDim]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.confirmBtn}>
                  <Text style={[styles.confirmBtnText, { color: colors.primaryForeground }]}>{isDeposit ? "DEPOSIT FUNDS" : "WITHDRAW FUNDS"}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const { width } = Dimensions.get("window");

const GAMES = [
  {
    id: "slots",
    title: "Slots",
    subtitle: "MEGA JACKPOT",
    badge: "HOT",
    badgeColor: "#00f4fe",
    image: require("@/assets/images/slots_card.png"),
    route: "/games/slots",
  },
  {
    id: "dice",
    title: "Dice",
    subtitle: "99.0% RTP",
    badge: "FAIR",
    badgeColor: "#ff59e3",
    image: require("@/assets/images/dice_card.png"),
    route: "/games/dice",
  },
  {
    id: "blackjack",
    title: "Blackjack",
    subtitle: "LIVE DEALERS",
    badge: null,
    badgeColor: null,
    image: require("@/assets/images/blackjack_card.png"),
    route: "/games/blackjack",
  },
  {
    id: "roulette",
    title: "Roulette",
    subtitle: "HIGH STAKES",
    badge: null,
    badgeColor: null,
    image: require("@/assets/images/roulette_card.png"),
    route: "/games/roulette",
  },
  {
    id: "matka",
    title: "Matka",
    subtitle: "150× PAYOUT",
    badge: "NEW",
    badgeColor: "#ffca28",
    image: require("@/assets/images/matka_card.png"),
    route: "/games/matka",
  },
];

const LIVE_FEED = [
  { user: "Player_921", game: "Slots", amount: "$2,450.00", initials: "P9" },
  { user: "CryptoKing", game: "Dice", amount: "$890.12", initials: "CK" },
  { user: "Ezibetz_User", game: "Blackjack", amount: "$12,000.00", initials: "EU" },
  { user: "LuckyAce", game: "Roulette", amount: "$3,200.00", initials: "LA" },
];

export default function GamesScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { balance, updateBalance, formatBalance } = useBalance();
  const [activeTab, setActiveTab] = useState<"wins" | "highrollers">("wins");
  const [depositModal, setDepositModal] = useState<"deposit" | "withdraw" | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 80;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            backgroundColor: "rgba(17,10,30,0.8)",
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <View style={styles.logoRow}>
            <Image
              source={require("@/assets/images/ezibetz_logo.png")}
              style={styles.logoImg}
              contentFit="contain"
              cachePolicy="memory-disk"
              priority="high"
            />
            <Text style={[styles.logoText, { color: colors.foreground }]}>EZIBETZ</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.balancePill, { backgroundColor: colors.accent }]}>
          <MaterialCommunityIcons name="wallet" size={16} color={colors.secondary} />
          <Text style={[styles.balanceAmount, { color: colors.secondary }]}>
            {formatBalance(balance)}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <Image
            source={require("@/assets/images/hero_banner.png")}
            style={styles.heroImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            priority="high"
          />
          <LinearGradient
            colors={["rgba(17,10,30,0.95)", "rgba(17,10,30,0.3)", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.heroOverlay}
          >
            <Text style={[styles.heroTag, { color: colors.secondary }]}>ACTIVE BONUS</Text>
            <Text style={styles.heroTitle}>
              IGNITE YOUR{" "}
              <Text style={{ color: colors.primary }}>LUCK</Text>
              {"\n"}WITH 200% BOOST
            </Text>
            <View style={styles.heroButtons}>
              <TouchableOpacity>
                <LinearGradient
                  colors={[colors.primary, colors.primaryDim]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.heroBtnPrimary}
                >
                  <Text style={[styles.heroBtnText, { color: colors.primaryForeground }]}>
                    CLAIM NOW
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.heroBtnSecondary, { borderColor: "rgba(76,68,91,0.4)" }]}
              >
                <Text style={[styles.heroBtnText, { color: colors.foreground }]}>DETAILS</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Balance Bento */}
        <View style={styles.bento}>
          <View
            style={[
              styles.balanceCard,
              {
                backgroundColor: "rgba(30,21,46,0.85)",
                borderColor: "rgba(76,68,91,0.15)",
              },
            ]}
          >
            <View>
              <Text style={[styles.balanceLabel, { color: colors.mutedForeground }]}>
                Available Liquidity
              </Text>
              <Text style={[styles.balanceBig, { color: colors.secondary }]}>
                {formatBalance(balance)}
              </Text>
              <View style={styles.balanceTrend}>
                <MaterialCommunityIcons name="trending-up" size={14} color={colors.tertiary} />
                <Text style={[styles.trendText, { color: colors.tertiary }]}>
                  +12.4% THIS WEEK
                </Text>
              </View>
            </View>
            <View style={styles.balanceActions}>
              <TouchableOpacity
                style={[styles.balanceActionBtn, { backgroundColor: colors.surfaceBright }]}
              >
                <MaterialCommunityIcons name="plus" size={20} color={colors.foreground} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.balanceActionBtn, { backgroundColor: colors.surfaceBright }]}
              >
                <MaterialCommunityIcons name="history" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <View style={styles.balanceGlow} />
          </View>

          <View
            style={[
              styles.vipCard,
              {
                backgroundColor: "rgba(30,21,46,0.85)",
                borderColor: "rgba(76,68,91,0.15)",
              },
            ]}
          >
            <Text style={[styles.vipLabel, { color: colors.mutedForeground }]}>VIP Status</Text>
            <Text style={[styles.vipTier, { color: colors.primary }]}>PLASMA TIER</Text>
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
        </View>

        {/* Games Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              THE <Text style={{ color: colors.primary }}>ARENA</Text>
            </Text>
            <TouchableOpacity style={styles.viewAll}>
              <Text style={[styles.viewAllText, { color: colors.mutedForeground }]}>VIEW ALL</Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View style={styles.gamesGrid}>
            {GAMES.map((game) => (
              <TouchableOpacity
                key={game.id}
                style={[styles.gameCard, { backgroundColor: colors.accent }]}
                onPress={() => router.push(game.route as any)}
                activeOpacity={0.8}
              >
                <View style={styles.gameImageWrapper}>
                  <Image
                    source={game.image}
                    style={styles.gameImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    priority="normal"
                  />
                  {game.badge && (
                    <View
                      style={[
                        styles.gameBadge,
                        { backgroundColor: "rgba(30,21,46,0.8)" },
                      ]}
                    >
                      <Text style={[styles.gameBadgeText, { color: game.badgeColor! }]}>
                        {game.badge}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.gameInfo}>
                  <Text style={[styles.gameTitle, { color: colors.foreground }]}>
                    {game.title}
                  </Text>
                  <Text style={[styles.gameSubtitle, { color: colors.mutedForeground }]}>
                    {game.subtitle}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Live Feed */}
        <View style={styles.section}>
          <View
            style={[
              styles.liveFeedCard,
              {
                backgroundColor: "rgba(30,21,46,0.7)",
                borderColor: "rgba(76,68,91,0.12)",
              },
            ]}
          >
            <View style={styles.liveFeedHeader}>
              <View style={styles.liveFeedLeft}>
                <View style={[styles.liveDot, { backgroundColor: colors.secondary }]} />
                <Text style={[styles.liveFeedTitle, { color: colors.foreground }]}>
                  LIVE FEED
                </Text>
              </View>
              <View style={styles.liveTabs}>
                <TouchableOpacity onPress={() => setActiveTab("wins")}>
                  <Text
                    style={[
                      styles.liveTabText,
                      {
                        color:
                          activeTab === "wins" ? colors.secondary : colors.mutedForeground,
                      },
                    ]}
                  >
                    Recent Wins
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab("highrollers")}>
                  <Text
                    style={[
                      styles.liveTabText,
                      {
                        color:
                          activeTab === "highrollers"
                            ? colors.secondary
                            : colors.mutedForeground,
                      },
                    ]}
                  >
                    High Rollers
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {LIVE_FEED.map((item, i) => (
              <View
                key={i}
                style={[
                  styles.liveFeedItem,
                  i < LIVE_FEED.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: "rgba(76,68,91,0.08)",
                  },
                ]}
              >
                <View
                  style={[
                    styles.liveAvatar,
                    { backgroundColor: colors.surfaceContainerLow },
                  ]}
                >
                  <Text style={[styles.liveAvatarText, { color: colors.primary }]}>
                    {item.initials}
                  </Text>
                </View>
                <View style={styles.liveFeedItemMid}>
                  <Text style={[styles.liveFeedUser, { color: colors.foreground }]}>
                    {item.user}{" "}
                    <Text style={[styles.liveFeedWon, { color: colors.mutedForeground }]}>
                      just won in{" "}
                    </Text>
                    <Text style={{ color: colors.primary }}>{item.game}</Text>
                  </Text>
                </View>
                <Text style={[styles.liveFeedAmount, { color: colors.secondary }]}>
                  {item.amount}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setDepositModal("deposit")} activeOpacity={0.85}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDim]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <MaterialCommunityIcons name="rocket-launch" size={24} color={colors.primaryForeground} />
        </LinearGradient>
      </TouchableOpacity>

      {depositModal && (
        <DepositModal
          visible={true}
          type={depositModal}
          onClose={() => setDepositModal(null)}
          onConfirm={(amt) => updateBalance(depositModal === "deposit" ? amt : -amt)}
          balance={balance}
          colors={colors}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logoImg: {
    width: 43,
    height: 43,
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
  balanceAmount: {
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: -0.3,
  },
  heroBanner: {
    height: 200,
    overflow: "hidden",
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "85%",
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: "center",
  },
  heroTag: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#ede0fd",
    fontStyle: "italic",
    letterSpacing: -0.5,
    lineHeight: 26,
    marginBottom: 16,
  },
  heroButtons: {
    flexDirection: "row",
    gap: 10,
  },
  heroBtnPrimary: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  heroBtnSecondary: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1,
    backgroundColor: "rgba(43,32,62,0.6)",
  },
  heroBtnText: {
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 1,
  },
  bento: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  balanceCard: {
    flex: 2,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    overflow: "hidden",
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  balanceBig: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -1,
  },
  balanceTrend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  trendText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  balanceActions: {
    flexDirection: "column",
    gap: 8,
  },
  balanceActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  balanceGlow: {
    position: "absolute",
    right: -20,
    bottom: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(197,154,255,0.12)",
  },
  vipCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    justifyContent: "space-between",
  },
  vipLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  vipTier: {
    fontSize: 15,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: -0.5,
  },
  xpBarBg: {
    height: 6,
    borderRadius: 3,
    marginTop: 12,
    overflow: "hidden",
  },
  xpBarFill: {
    width: "75%",
    height: "100%",
    borderRadius: 3,
  },
  xpText: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
    textAlign: "right",
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: -0.5,
  },
  viewAll: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  gamesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  gameCard: {
    width: (width - 44) / 2,
    borderRadius: 16,
    overflow: "hidden",
  },
  gameImageWrapper: {
    aspectRatio: 1,
    position: "relative",
  },
  gameImage: {
    width: "100%",
    height: "100%",
  },
  gameBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  gameBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  gameInfo: {
    padding: 14,
  },
  gameTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 2,
  },
  gameSubtitle: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  liveFeedCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  liveFeedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(49,38,70,0.5)",
  },
  liveFeedLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveFeedTitle: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
  },
  liveTabs: {
    flexDirection: "row",
    gap: 16,
  },
  liveTabText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  liveFeedItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  liveAvatar: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  liveAvatarText: {
    fontWeight: "900",
    fontSize: 12,
  },
  liveFeedItemMid: {
    flex: 1,
  },
  liveFeedUser: {
    fontSize: 13,
    fontWeight: "600",
  },
  liveFeedWon: {
    fontSize: 11,
    fontWeight: "400",
  },
  liveFeedAmount: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 100,
    shadowColor: "#9547f7",
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: -0.5,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    gap: 16,
    paddingBottom: 8,
  },
  balancePillModal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  amountInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  dollarSign: {
    fontSize: 26,
    fontWeight: "900",
    marginRight: 6,
  },
  amountTextInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -1,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickRow: {
    flexDirection: "row",
    gap: 10,
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  quickBtnText: {
    fontSize: 13,
    fontWeight: "800",
  },
  methodRow: {
    flexDirection: "row",
    gap: 10,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  confirmBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  successBox: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "900",
    fontStyle: "italic",
  },
  successSub: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
  },
});
