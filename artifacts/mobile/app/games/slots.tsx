import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useGameSound } from "@/hooks/useGameSound";
import React, { useRef, useState } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GameHeader } from "@/components/GameHeader";
import { useBalance } from "@/context/BalanceContext";
import { useColors } from "@/hooks/useColors";

interface SlotSymbol {
  icon: string;
  color: string;
  name: string;
  multiplier: number;
}

const SYMBOLS: SlotSymbol[] = [
  { icon: "diamond", color: "#00f4fe", name: "Diamond", multiplier: 500 },
  { icon: "lightning-bolt", color: "#ff59e3", name: "Lightning", multiplier: 100 },
  { icon: "star", color: "#ede0fd", name: "Star", multiplier: 50 },
  { icon: "rocket-launch", color: "#c59aff", name: "Rocket", multiplier: 25 },
  { icon: "clover", color: "#00f4fe", name: "Clover", multiplier: 10 },
  { icon: "crown", color: "#ff59e3", name: "Crown", multiplier: 15 },
  { icon: "cards", color: "#c59aff", name: "Cards", multiplier: 8 },
];

const NUM_REELS = 5;

function randomSymbol(): SlotSymbol {
  // weighted: diamonds are rare
  const r = Math.random();
  if (r < 0.05) return SYMBOLS[0]; // diamond
  if (r < 0.12) return SYMBOLS[1]; // lightning
  if (r < 0.22) return SYMBOLS[2]; // star
  if (r < 0.35) return SYMBOLS[3]; // rocket
  if (r < 0.55) return SYMBOLS[4]; // clover
  if (r < 0.75) return SYMBOLS[5]; // crown
  return SYMBOLS[6]; // cards
}

function checkWin(reels: SlotSymbol[]): { win: boolean; multiplier: number; msg: string } {
  // All same
  if (reels.every((r) => r.name === reels[0].name)) {
    return { win: true, multiplier: reels[0].multiplier, msg: `JACKPOT! ${reels[0].name.toUpperCase()}!` };
  }
  // 4 same
  const counts = reels.reduce<Record<string, number>>((acc, r) => {
    acc[r.name] = (acc[r.name] || 0) + 1;
    return acc;
  }, {});
  const max = Math.max(...Object.values(counts));
  if (max >= 4) {
    const sym = Object.entries(counts).find(([, c]) => c >= 4)![0];
    const found = SYMBOLS.find((s) => s.name === sym)!;
    return { win: true, multiplier: Math.floor(found.multiplier * 0.4), msg: `4 OF A KIND!` };
  }
  if (max >= 3) {
    const sym = Object.entries(counts).find(([, c]) => c >= 3)![0];
    const found = SYMBOLS.find((s) => s.name === sym)!;
    return { win: true, multiplier: Math.floor(found.multiplier * 0.15), msg: `3 OF A KIND!` };
  }
  return { win: false, multiplier: 0, msg: "NO WIN" };
}

const PAYTABLE = [
  { icon: "diamond", label: "777", payout: "500x", color: "#00f4fe" },
  { icon: "lightning-bolt", label: "Lightning", payout: "100x", color: "#ff59e3" },
  { icon: "star", label: "Star Rush", payout: "50x", color: "#ede0fd" },
];

export default function SlotsGameScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { balance, updateBalance, formatBalance } = useBalance();

  const [betAmount, setBetAmount] = useState(100);
  const [reels, setReels] = useState<SlotSymbol[]>(
    Array.from({ length: NUM_REELS }, () => SYMBOLS[0])
  );
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<{ win: boolean; msg: string; payout?: string } | null>(null);
  const [jackpot, setJackpot] = useState(2847312);

  const { playSpin, playWin, playJackpot, playLose } = useGameSound();
  const spinAnims = useRef(
    Array.from({ length: NUM_REELS }, () => new Animated.Value(0))
  ).current;

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 20;

  const spin = () => {
    if (isSpinning || betAmount > balance || betAmount <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    playSpin();
    setIsSpinning(true);
    setLastResult(null);
    updateBalance(-betAmount);

    const finalReels = Array.from({ length: NUM_REELS }, () => randomSymbol());

    spinAnims.forEach((anim, i) => {
      anim.setValue(0);
      Animated.sequence([
        Animated.delay(i * 80),
        Animated.timing(anim, {
          toValue: 1,
          duration: 600 + i * 100,
          useNativeDriver: true,
        }),
      ]).start();
    });

    setTimeout(() => {
      setReels(finalReels);
      const result = checkWin(finalReels);
      if (result.win) {
        const payout = betAmount * result.multiplier;
        updateBalance(payout);
        setLastResult({ win: true, msg: result.msg, payout: formatBalance(payout) });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (result.multiplier >= 100) playJackpot(); else playWin();
      } else {
        setLastResult({ win: false, msg: "TRY AGAIN!" });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        playLose();
      }
      setIsSpinning(false);
    }, 900 + NUM_REELS * 80);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <GameHeader showBack title="Slots" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 20 }]}
      >
        {/* Header */}
        <View style={styles.gameHeader}>
          <Text style={[styles.gameSubtitle, { color: colors.secondary }]}>
            CYBER RUSH DELUXE
          </Text>
          <View style={styles.titleRow}>
            <Text style={[styles.gameTitle, { color: colors.foreground }]}>
              MEGA <Text style={{ color: colors.primary }}>SPIN</Text>
            </Text>
            <View style={[styles.jackpotBadge, { borderColor: colors.tertiary }]}>
              <Text style={[styles.jackpotBadgeText, { color: colors.tertiary }]}>
                JACKPOT ACTIVE
              </Text>
            </View>
          </View>
          <Text style={[styles.jackpotAmount, { color: colors.tertiary }]}>
            ${jackpot.toLocaleString()}
          </Text>
        </View>

        {/* Slot Machine */}
        <View
          style={[
            styles.machine,
            { backgroundColor: colors.surfaceContainerLow },
          ]}
        >
          {/* Win Line */}
          <View style={[styles.winLine, { backgroundColor: colors.secondary }]} />

          {/* Reels */}
          <View style={styles.reels}>
            {reels.map((sym, i) => {
              const translateY = spinAnims[i].interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, -40, 0],
              });
              return (
                <View
                  key={i}
                  style={[
                    styles.reel,
                    { backgroundColor: colors.surfaceContainer, borderColor: colors.border },
                  ]}
                >
                  <Animated.View
                    style={[styles.reelInner, { transform: [{ translateY }] }]}
                  >
                    {/* Top symbol (blurred/dim) */}
                    <View style={styles.reelSymbolDim}>
                      <MaterialCommunityIcons
                        name={SYMBOLS[(i + 2) % SYMBOLS.length].icon as any}
                        size={28}
                        color={colors.mutedForeground}
                        style={{ opacity: 0.3 }}
                      />
                    </View>
                    {/* Center symbol (main) */}
                    <View style={styles.reelSymbolMain}>
                      <MaterialCommunityIcons
                        name={sym.icon as any}
                        size={36}
                        color={sym.color}
                      />
                    </View>
                    {/* Bottom symbol (dim) */}
                    <View style={styles.reelSymbolDim}>
                      <MaterialCommunityIcons
                        name={SYMBOLS[(i + 4) % SYMBOLS.length].icon as any}
                        size={28}
                        color={colors.mutedForeground}
                        style={{ opacity: 0.3 }}
                      />
                    </View>
                  </Animated.View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Result */}
        {lastResult && (
          <View
            style={[
              styles.resultBanner,
              {
                backgroundColor: lastResult.win ? "rgba(0,244,254,0.1)" : "rgba(255,110,132,0.1)",
                borderColor: lastResult.win ? colors.secondary : colors.destructive,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={lastResult.win ? "trophy" : "emoticon-sad-outline"}
              size={22}
              color={lastResult.win ? colors.secondary : colors.destructive}
            />
            <View>
              <Text style={[styles.resultMsg, { color: lastResult.win ? colors.secondary : colors.destructive }]}>
                {lastResult.msg}
              </Text>
              {lastResult.payout && (
                <Text style={[styles.resultPayout, { color: colors.secondary }]}>
                  +{lastResult.payout}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Controls */}
        <View
          style={[
            styles.controls,
            { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.border },
          ]}
        >
          {/* Bet Adjuster */}
          <View style={styles.betRow}>
            <TouchableOpacity
              style={[styles.betBtn, { backgroundColor: colors.surfaceBright }]}
              onPress={() => setBetAmount(Math.max(10, betAmount - 10))}
            >
              <MaterialCommunityIcons name="minus" size={20} color={colors.foreground} />
            </TouchableOpacity>
            <View style={styles.betDisplay}>
              <Text style={[styles.betLabel, { color: colors.mutedForeground }]}>BET AMOUNT</Text>
              <Text style={[styles.betAmount, { color: colors.secondary }]}>
                ${betAmount.toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.betBtn, { backgroundColor: colors.surfaceBright }]}
              onPress={() => setBetAmount(Math.min(balance, betAmount + 10))}
            >
              <MaterialCommunityIcons name="plus" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Quick bets */}
          <View style={styles.quickRow}>
            {["MIN", "1/2", "x2", "MAX"].map((q) => (
              <TouchableOpacity
                key={q}
                style={[styles.quickChip, { backgroundColor: colors.accent, borderColor: colors.border }]}
                onPress={() => {
                  if (q === "MIN") setBetAmount(10);
                  else if (q === "1/2") setBetAmount(Math.max(10, betAmount / 2));
                  else if (q === "x2") setBetAmount(Math.min(balance, betAmount * 2));
                  else setBetAmount(balance);
                }}
              >
                <Text style={[styles.quickChipText, { color: colors.foreground }]}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Spin */}
          <View style={styles.spinRow}>
            <TouchableOpacity
              style={[styles.sideBtn, { borderColor: colors.border }]}
              onPress={() => {}}
            >
              <MaterialCommunityIcons name="refresh" size={22} color={colors.mutedForeground} />
              <Text style={[styles.sideBtnLabel, { color: colors.mutedForeground }]}>AUTO</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={spin} disabled={isSpinning} activeOpacity={0.85}>
              <LinearGradient
                colors={isSpinning ? [colors.surfaceBright, colors.surfaceBright] : [colors.primary, colors.primaryDim]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.spinBtn}
              >
                <MaterialCommunityIcons
                  name={isSpinning ? "loading" : "play"}
                  size={32}
                  color={isSpinning ? colors.mutedForeground : colors.primaryForeground}
                />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sideBtn, { borderColor: colors.border }]}
              onPress={() => {}}
            >
              <MaterialCommunityIcons name="lightning-bolt" size={22} color={colors.mutedForeground} />
              <Text style={[styles.sideBtnLabel, { color: colors.mutedForeground }]}>TURBO</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Paytable */}
        <View style={[styles.paytable, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.paytableTitle, { color: colors.mutedForeground }]}>
            PAYTABLE PREVIEW
          </Text>
          {PAYTABLE.map((row, i) => (
            <View key={i} style={styles.paytableRow}>
              <MaterialCommunityIcons name={row.icon as any} size={22} color={row.color} />
              <Text style={[styles.paytableLabel, { color: colors.foreground }]}>{row.label}</Text>
              <Text style={[styles.paytablePayout, { color: colors.primary }]}>{row.payout}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    gap: 14,
    paddingTop: 8,
  },
  gameHeader: {
    alignItems: "center",
    gap: 4,
  },
  gameSubtitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  gameTitle: {
    fontSize: 36,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: -1,
  },
  jackpotBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "rgba(30,21,46,0.7)",
  },
  jackpotBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  jackpotAmount: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -1,
  },
  machine: {
    borderRadius: 24,
    padding: 16,
    overflow: "hidden",
    position: "relative",
  },
  winLine: {
    position: "absolute",
    left: 16,
    right: 16,
    height: 2,
    top: "50%",
    opacity: 0.5,
    zIndex: 2,
  },
  reels: {
    flexDirection: "row",
    gap: 8,
    height: 180,
  },
  reel: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  reelInner: {
    alignItems: "center",
    justifyContent: "space-around",
    height: "100%",
    paddingVertical: 12,
  },
  reelSymbolDim: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  reelSymbolMain: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  resultBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  resultMsg: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  resultPayout: {
    fontSize: 13,
    fontWeight: "700",
  },
  controls: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  betRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  betBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  betDisplay: {
    alignItems: "center",
  },
  betLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  betAmount: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  quickRow: {
    flexDirection: "row",
    gap: 8,
  },
  quickChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: "800",
  },
  spinRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  sideBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  sideBtnLabel: {
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 1,
  },
  spinBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#9547f7",
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  paytable: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  paytableTitle: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  paytableRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  paytableLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  paytablePayout: {
    fontSize: 14,
    fontWeight: "900",
  },
});
