import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useGameSound } from "@/hooks/useGameSound";
import React, { useCallback, useRef, useState } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GameHeader } from "@/components/GameHeader";
import { PressableScale } from "@/components/PressableScale";
import { PlayingCard, type Card } from "@/components/PlayingCard";
import { useBalance } from "@/context/BalanceContext";
import { useColors } from "@/hooks/useColors";
import {
  dealBlackjack,
  hitBlackjack,
  standBlackjack,
  doubleBlackjack,
  type BlackjackHandResponse,
} from "@workspace/api-client-react";

type GameState = "betting" | "playing" | "result";

// Real casino chip denominations + colors
const CHIPS = [
  { value: 10,  bg: "#1a88f0", border: "#5ab4ff", label: "$10"  },
  { value: 25,  bg: "#22c55e", border: "#86efac", label: "$25"  },
  { value: 50,  bg: "#ef4444", border: "#fca5a5", label: "$50"  },
  { value: 100, bg: "#1a1a1a", border: "#9ca3af", label: "$100" },
  { value: 250, bg: "#a855f7", border: "#d8b4fe", label: "$250" },
  { value: 500, bg: "#f59e0b", border: "#fde68a", label: "$500" },
];

// The server is the only thing that knows how a hand actually resolved
// (artifacts/api-server/src/routes/blackjack.ts) — this just picks the
// matching table talk for its `result` field.
function resultMessage(result: string | null | undefined, netCents: number): string {
  switch (result) {
    case "player_bust": return "BUST! YOU LOSE";
    case "dealer_bust": return "DEALER BUSTS — YOU WIN!";
    case "blackjack": return "BLACKJACK! 3:2 PAYOUT!";
    case "player_win": return "YOU WIN!";
    case "push": return "PUSH — BET RETURNED";
    case "dealer_win": return "DEALER WINS";
    default: return netCents >= 0 ? "YOU WIN!" : "YOU LOSE";
  }
}

export default function BlackjackGameScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { balance, setBalanceFromCents, formatBalance } = useBalance();
  const { playDeal, playClick, playWin, playLose, playJackpot } = useGameSound();

  const [bet, setBet] = useState(25);
  const [gameState, setGameState] = useState<GameState>("betting");
  const [handId, setHandId] = useState<number | null>(null);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [playerVal, setPlayerVal] = useState(0);
  const [dealerVisible, setDealerVisible] = useState(0);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [winAmount, setWinAmount] = useState<number | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const resultAnim = useRef(new Animated.Value(0)).current;

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 16;

  // Applies whatever the server just returned — deal/hit/stand/double all
  // return the same hand shape, settled or not, so one handler covers all four.
  const applyHandResponse = useCallback((response: BlackjackHandResponse) => {
    setHandId(response.handId);
    setPlayerHand(response.playerCards);
    setDealerHand(response.dealerCards);
    setPlayerVal(response.playerValue);
    setDealerVisible(response.dealerValue);
    setBet(response.betAmount / 100);
    setBalanceFromCents(response.balanceAfter);

    if (response.status === "settled") {
      const netCents = (response.payout ?? 0) - response.betAmount;
      const win = netCents >= 0;
      setWinAmount(netCents / 100);
      setGameState("result");
      const msg = resultMessage(response.result, netCents);
      setResultMsg(msg);
      resultAnim.setValue(0);
      Animated.spring(resultAnim, { toValue: 1, friction: 7, tension: 300, useNativeDriver: true }).start();
      Haptics.notificationAsync(win ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
      if ((response.payout ?? 0) > response.betAmount * 1.4) playJackpot();
      else if (win) playWin();
      else playLose();
    } else {
      setGameState("playing");
    }
  }, [resultAnim, playJackpot, playWin, playLose, setBalanceFromCents]);

  const runAction = useCallback(
    (action: () => Promise<BlackjackHandResponse>, failureMessage: string) => {
      if (isActing) return;
      setIsActing(true);
      setActionError(null);
      action()
        .then(applyHandResponse)
        .catch((err: any) => {
          setActionError(err?.data?.error || failureMessage);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        })
        .finally(() => setIsActing(false));
    },
    [isActing, applyHandResponse]
  );

  const startGame = useCallback(() => {
    if (bet > balance || bet <= 0 || isActing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    playDeal();
    setResultMsg(null);
    setWinAmount(null);
    runAction(() => dealBlackjack({ betAmount: Math.round(bet * 100) }), "Failed to deal — please try again.");
  }, [bet, balance, isActing, playDeal, runAction]);

  const hit = useCallback(() => {
    if (gameState !== "playing" || !handId || isActing) return;
    playClick();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    runAction(() => hitBlackjack({ handId }), "Hit failed — please try again.");
  }, [gameState, handId, isActing, playClick, runAction]);

  const stand = useCallback(() => {
    if (gameState !== "playing" || !handId || isActing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    runAction(() => standBlackjack({ handId }), "Stand failed — please try again.");
  }, [gameState, handId, isActing, runAction]);

  const doubleDown = useCallback(() => {
    if (gameState !== "playing" || !handId || isActing || bet > balance) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    runAction(() => doubleBlackjack({ handId }), "Double failed — please try again.");
  }, [gameState, handId, isActing, bet, balance, runAction]);

  const resetGame = useCallback(() => {
    setGameState("betting"); setPlayerHand([]); setDealerHand([]);
    setResultMsg(null); setWinAmount(null); setHandId(null); setActionError(null);
    if (bet > balance) setBet(10);
  }, [bet, balance]);

  const isWin = (winAmount ?? -1) >= 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <GameHeader showBack title="Blackjack" />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        {/* ── FELT TABLE ── */}
        <View style={styles.feltTable}>
          <LinearGradient
            colors={["#0d5c35", "#0a4a2a", "#083d22"]}
            style={StyleSheet.absoluteFill}
          />
          {/* Gold arc line */}
          <View style={styles.goldArc} />
          {/* Table inscription */}
          <Text style={styles.tableText}>BLACKJACK PAYS 3 TO 2</Text>
          <Text style={styles.tableTextSub}>INSURANCE PAYS 2 TO 1</Text>

          {/* Dealer zone */}
          <View style={styles.dealerZone}>
            <View style={styles.handLabelRow}>
              <Text style={styles.feltLabel}>DEALER</Text>
              <View style={[styles.scoreBubble, { borderColor: gameState !== "betting" ? "#ffd700" : "#ffffff30" }]}>
                <Text style={[styles.scoreBubbleText, { color: gameState !== "betting" ? "#ffd700" : "#ffffff50" }]}>
                  {gameState === "betting" ? "—" : dealerVisible}
                </Text>
              </View>
            </View>
            <View style={styles.cardRow}>
              {gameState === "betting" ? (
                <>
                  <View style={[styles.emptyCardSlot, { borderColor: "#ffffff18" }]} />
                  <View style={[styles.emptyCardSlot, { borderColor: "#ffffff18" }]} />
                </>
              ) : (
                dealerHand.map((card, i) => (
                  <View key={i} style={styles.cardShadowWrap}>
                    <PlayingCard card={card} width={60} height={90} />
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Centre bet zone */}
          <View style={styles.betZone}>
            <View style={styles.betCircle}>
              {gameState === "betting" ? (
                <Text style={styles.betCircleLabel}>BET HERE</Text>
              ) : (
                <View style={styles.chipStack}>
                  {CHIPS.filter(c => c.value <= bet).slice(-2).map((chip, i) => (
                    <View
                      key={i}
                      style={[
                        styles.stackedChip,
                        {
                          backgroundColor: chip.bg,
                          borderColor: chip.border,
                          marginLeft: i > 0 ? -8 : 0,
                          zIndex: i,
                        },
                      ]}
                    >
                      <Text style={styles.stackedChipText}>{chip.label}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            <Text style={styles.betAmountLabel}>
              BET: <Text style={{ color: "#ffd700", fontWeight: "900" }}>{formatBalance(bet)}</Text>
            </Text>
            {gameState === "playing" && (
              <Text style={styles.potLabel}>
                WIN: <Text style={{ color: "#86efac" }}>{formatBalance(bet * 2)}</Text>
              </Text>
            )}
          </View>

          {/* Player zone */}
          <View style={styles.playerZone}>
            <View style={styles.handLabelRow}>
              <Text style={styles.feltLabel}>YOUR HAND</Text>
              <View style={[styles.scoreBubble, { borderColor: gameState !== "betting" ? "#c59aff" : "#ffffff30" }]}>
                <Text style={[styles.scoreBubbleText, {
                  color: gameState !== "betting"
                    ? (playerVal > 21 ? "#ff6e84" : "#c59aff")
                    : "#ffffff50",
                }]}>
                  {gameState === "betting" ? "—" : playerVal}
                </Text>
              </View>
            </View>
            <View style={styles.cardRow}>
              {gameState === "betting" ? (
                <>
                  <View style={[styles.emptyCardSlot, { borderColor: "#ffffff18" }]} />
                  <View style={[styles.emptyCardSlot, { borderColor: "#ffffff18" }]} />
                </>
              ) : (
                playerHand.map((card, i) => (
                  <View key={i} style={styles.cardShadowWrap}>
                    <PlayingCard card={card} width={60} height={90} />
                  </View>
                ))
              )}
            </View>
          </View>
        </View>

        {/* ── RESULT BANNER ── */}
        {resultMsg && (
          <Animated.View
            style={[
              styles.resultBanner,
              {
                backgroundColor: isWin ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                borderColor: isWin ? "#22c55e" : "#ef4444",
                opacity: resultAnim,
                transform: [{ scale: resultAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
              },
            ]}
          >
            <MaterialCommunityIcons
              name={isWin ? "trophy" : "close-circle"}
              size={22}
              color={isWin ? "#22c55e" : "#ef4444"}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.resultMsg, { color: isWin ? "#22c55e" : "#ef4444" }]}>
                {resultMsg}
              </Text>
              {winAmount !== null && winAmount !== 0 && (
                <Text style={[styles.resultPayout, { color: winAmount > 0 ? "#86efac" : "#fca5a5" }]}>
                  {winAmount > 0 ? `+${formatBalance(winAmount)}` : `-${formatBalance(Math.abs(winAmount))}`}
                </Text>
              )}
            </View>
          </Animated.View>
        )}

        {/* ── CONTROLS ── */}
        <View style={[styles.controls, { backgroundColor: colors.surfaceContainerLow }]}>
          {gameState === "betting" && (
            <>
              <Text style={[styles.controlLabel, { color: colors.mutedForeground }]}>SELECT CHIP</Text>
              <View style={styles.chipRow}>
                {CHIPS.map((chip) => {
                  const active = bet === chip.value;
                  return (
                    <PressableScale
                      key={chip.value}
                      onPress={() => setBet(chip.value)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? chip.bg : colors.accent,
                          borderColor: active ? chip.border : colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: active ? "#fff" : colors.mutedForeground }]}>
                        {chip.label}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>
              <PressableScale onPress={startGame} disabled={bet > balance || isActing} scale={0.96}>
                <LinearGradient
                  colors={bet > balance ? [colors.surfaceBright, colors.surfaceBright] : ["#9547f7", "#c59aff"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.mainBtn}
                >
                  <View style={styles.btnGloss} />
                  <MaterialCommunityIcons name="cards" size={20} color={bet > balance ? colors.mutedForeground : "#fff"} />
                  <Text style={[styles.mainBtnText, { color: bet > balance ? colors.mutedForeground : "#fff" }]}>
                    {isActing ? "DEALING..." : "DEAL CARDS"}
                  </Text>
                </LinearGradient>
              </PressableScale>
            </>
          )}

          {actionError && (
            <Text style={styles.actionErrorText}>{actionError}</Text>
          )}

          {gameState === "playing" && (
            <View style={styles.actionBar}>
              <PressableScale
                onPress={doubleDown}
                disabled={bet > balance || isActing || playerHand.length !== 2}
                style={[styles.actionBtn, { borderColor: `${colors.primary}40`, borderWidth: 1.5, flex: 1 }]}
              >
                <Text style={[styles.actionSub, { color: colors.mutedForeground }]}>Double</Text>
                <Text style={[styles.actionMain, { color: colors.foreground }]}>×2</Text>
              </PressableScale>

              <PressableScale
                onPress={stand}
                disabled={isActing}
                style={[styles.actionBtn, { borderColor: "#ef4444", borderWidth: 1.5, flex: 1 }]}
              >
                <Text style={[styles.actionSub, { color: colors.mutedForeground }]}>Stop</Text>
                <Text style={[styles.actionMain, { color: "#ef4444" }]}>STAND</Text>
              </PressableScale>

              <PressableScale onPress={hit} disabled={isActing} scale={0.95} containerStyle={{ flex: 1.5 }}>
                <LinearGradient
                  colors={["#22c55e", "#16a34a"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.hitBtn}
                >
                  <Text style={[styles.actionMain, { color: "#fff", fontSize: 18 }]}>HIT</Text>
                  <MaterialCommunityIcons name="cards-playing" size={18} color="#fff" />
                </LinearGradient>
              </PressableScale>
            </View>
          )}

          {gameState === "result" && (
            <PressableScale onPress={resetGame} scale={0.96}>
              <LinearGradient
                colors={["#9547f7", "#c59aff"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.mainBtn}
              >
                <View style={styles.btnGloss} />
                <MaterialCommunityIcons name="refresh" size={20} color="#fff" />
                <Text style={[styles.mainBtnText, { color: "#fff" }]}>PLAY AGAIN</Text>
              </LinearGradient>
            </PressableScale>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // ── Felt Table ──
  feltTable: {
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 24,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 0,
    borderWidth: 2,
    borderColor: "#ffd70035",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  goldArc: {
    position: "absolute",
    left: 20,
    right: 20,
    top: "38%",
    height: 2,
    backgroundColor: "#ffd70025",
    borderRadius: 1,
  },
  tableText: {
    textAlign: "center",
    color: "#ffd70055",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  tableTextSub: {
    textAlign: "center",
    color: "#ffffff20",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: -10,
    marginBottom: 12,
  },
  dealerZone: {
    gap: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ffd70020",
  },
  playerZone: {
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#ffd70020",
  },
  handLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  feltLabel: {
    color: "#ffffff60",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  scoreBubble: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1.5,
  },
  scoreBubbleText: {
    fontSize: 16,
    fontWeight: "900",
  },
  cardRow: {
    flexDirection: "row",
    gap: 8,
    minHeight: 90,
    alignItems: "center",
  },
  cardShadowWrap: {
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  emptyCardSlot: {
    width: 60,
    height: 90,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },

  // ── Bet Zone ──
  betZone: {
    alignItems: "center",
    paddingVertical: 14,
    gap: 6,
  },
  betCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#ffd70040",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  betCircleLabel: {
    color: "#ffffff30",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    textAlign: "center",
  },
  chipStack: {
    flexDirection: "row",
    alignItems: "center",
  },
  stackedChip: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  stackedChipText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "900",
  },
  betAmountLabel: {
    color: "#ffffff80",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  potLabel: {
    color: "#ffffff50",
    fontSize: 11,
    fontWeight: "600",
  },

  // ── Result ──
  resultBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 12,
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  resultMsg: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  resultPayout: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
  },
  actionErrorText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },

  // ── Controls ──
  controls: {
    margin: 12,
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  controlLabel: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    minWidth: 60,
    alignItems: "center",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "900",
  },
  mainBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 9999,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#9547f7",
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  btnGloss: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  mainBtnText: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  actionBar: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  actionSub: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  actionMain: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  hitBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: "#22c55e",
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
});
