import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useGameSound } from "@/hooks/useGameSound";
import React, { useCallback, useRef, useState } from "react";
import {
  Animated,
  Easing,
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
import { PressableScale } from "@/components/PressableScale";
import { useBalance } from "@/context/BalanceContext";
import { useColors } from "@/hooks/useColors";

// ─── Constants ────────────────────────────────────────────────────────────────

const RED_NUMS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

// European wheel order (clockwise from top)
const WHEEL_ORDER = [
  0,32,15,19,4,21,2,25,17,34,6,27,13,36,
  11,30,8,23,10,5,24,16,33,1,20,14,31,9,
  22,18,29,7,28,12,35,3,26,
];

function getColor(n: number): "red" | "black" | "green" {
  if (n === 0) return "green";
  return RED_NUMS.has(n) ? "red" : "black";
}

const NUM_COLOR_BG: Record<string, string> = {
  red:   "#991b1b",
  black: "#111827",
  green: "#15803d",
};

const NUM_COLOR_BRIGHT: Record<string, string> = {
  red:   "#ef4444",
  black: "#6b7280",
  green: "#22c55e",
};

// ─── Bet types ────────────────────────────────────────────────────────────────

type BetType = "straight" | "color" | "parity" | "range" | "dozen";

interface Bet { type: BetType; value: string }

function evaluateBet(bet: Bet, result: number): { win: boolean; multiplier: number } {
  const { type, value } = bet;
  switch (type) {
    case "straight":
      return { win: result === Number(value), multiplier: 36 };   // 35:1
    case "color":
      return { win: result !== 0 && getColor(result) === value, multiplier: 2 }; // 1:1
    case "parity":
      if (result === 0) return { win: false, multiplier: 0 };
      return { win: (result % 2 === 0) === (value === "even"), multiplier: 2 };
    case "range":
      if (result === 0) return { win: false, multiplier: 0 };
      return { win: value === "low" ? result <= 18 : result >= 19, multiplier: 2 };
    case "dozen":
      if (result === 0) return { win: false, multiplier: 0 };
      const dz = result <= 12 ? "1st" : result <= 24 ? "2nd" : "3rd";
      return { win: dz === value, multiplier: 3 };                // 2:1
    default:
      return { win: false, multiplier: 0 };
  }
}

// ─── Board layout helpers ─────────────────────────────────────────────────────

// Standard 3-row × 12-col European layout
// Row 0 (top): 3,6,9,…,36  Row 1 (mid): 2,5,8,…,35  Row 2 (bot): 1,4,7,…,34
const GRID_ROWS: number[][] = [
  Array.from({length:12}, (_,c) => c*3+3),
  Array.from({length:12}, (_,c) => c*3+2),
  Array.from({length:12}, (_,c) => c*3+1),
];

// ─── Wheel sizing ─────────────────────────────────────────────────────────────
const WHEEL_D    = 230;
const CENTER     = WHEEL_D / 2;
const RING_R     = 90;
const POCKET_SZ  = 22;

// ─── Component ───────────────────────────────────────────────────────────────

export default function RouletteGameScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { balance, updateBalance, formatBalance } = useBalance();
  const { playSpin, playWin, playLose, playClick, playDeal } = useGameSound();

  const [selectedBet, setSelectedBet] = useState<Bet | null>(null);
  const [betIdx, setBetIdx]           = useState(1); // index into BET_CHIPS
  const [isSpinning, setIsSpinning]   = useState(false);
  const [result, setResult]           = useState<{
    number: number; win: boolean; netGain: number; msg: string;
  } | null>(null);
  const [history, setHistory] = useState<Array<{n: number; color: string}>>([]);

  const rotateAnim      = useRef(new Animated.Value(0)).current;
  const resultAnim      = useRef(new Animated.Value(0)).current;
  const cumulativeRot   = useRef(0);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 16;

  const BET_CHIPS = [10, 25, 50, 100, 250, 500];
  const betAmount = BET_CHIPS[betIdx];

  // ── rotateDeg interpolation (linear extension) ─────────────────────────────
  const rotateDeg = rotateAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
    extrapolate: "extend",
  });

  // ── Helpers ────────────────────────────────────────────────────────────────

  const isSelected = (type: BetType, value: string) =>
    selectedBet?.type === type && selectedBet.value === value;

  const selectBet = useCallback((type: BetType, value: string) => {
    if (isSpinning) return;
    playClick();
    Haptics.selectionAsync();
    setSelectedBet(prev =>
      prev?.type === type && prev.value === value ? null : { type, value }
    );
  }, [isSpinning, playClick]);

  // ── Spin ───────────────────────────────────────────────────────────────────

  const spin = useCallback(() => {
    if (!selectedBet || isSpinning || betAmount > balance) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    playSpin();
    setIsSpinning(true);
    setResult(null);
    updateBalance(-betAmount);

    // Pick result
    const resultNum = Math.floor(Math.random() * 37); // 0–36
    const wi = WHEEL_ORDER.indexOf(resultNum);         // pocket index on wheel

    // Rotation to bring pocket wi to top (0°):
    // pocket wi is at wi*(360/37)° from top in wheel frame
    // rotating clockwise by θ = n*360 − wi*(360/37) lands it at top
    const n = 5 + Math.floor(Math.random() * 4);
    const toAdd = n * 360 - wi * (360 / 37);

    const startVal = cumulativeRot.current;
    const endVal   = startVal + toAdd;
    cumulativeRot.current = endVal;

    rotateAnim.setValue(startVal);
    Animated.timing(rotateAnim, {
      toValue: endVal,
      duration: 3200 + Math.random() * 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      const { win, multiplier } = evaluateBet(selectedBet, resultNum);
      const netGain = win ? betAmount * multiplier - betAmount : 0;

      if (win) {
        updateBalance(betAmount * multiplier);
        playWin();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        playLose();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      // Animate result banner
      resultAnim.setValue(0);
      Animated.spring(resultAnim, {
        toValue: 1, friction: 7, tension: 300, useNativeDriver: true,
      }).start();

      const numColor = getColor(resultNum);
      setResult({
        number: resultNum, win,
        netGain: win ? netGain : -betAmount,
        msg: win
          ? `${resultNum} (${numColor.toUpperCase()}) — +${formatBalance(netGain)}`
          : `${resultNum} (${numColor.toUpperCase()}) — Better luck next time`,
      });
      setHistory(h => [{n: resultNum, color: numColor}, ...h].slice(0, 14));
      setIsSpinning(false);
    });
  }, [selectedBet, isSpinning, betAmount, balance, updateBalance,
      playSpin, playWin, playLose, playClick, rotateAnim, resultAnim, formatBalance]);

  // ── Bet label helper ───────────────────────────────────────────────────────
  const betLabel = (() => {
    if (!selectedBet) return "NO BET SELECTED";
    const { type, value } = selectedBet;
    if (type === "straight") return `STRAIGHT — ${value}`;
    if (type === "color") return `COLOR — ${value.toUpperCase()}`;
    if (type === "parity") return value.toUpperCase();
    if (type === "range") return value === "low" ? "LOW (1–18)" : "HIGH (19–36)";
    if (type === "dozen") return `${value.toUpperCase()} DOZEN`;
    return value;
  })();

  const canSpin = !!selectedBet && !isSpinning && betAmount <= balance;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <GameHeader showBack title="Roulette" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad }}>

        {/* ── WHEEL ─────────────────────────────────────────────────────── */}
        <View style={styles.wheelSection}>
          <View style={[styles.wheelOuter, { borderColor: "#ffd70060" }]}>
            {/* Ball marker (fixed top) */}
            <View style={styles.ballMarker} />

            {/* Rotating wheel */}
            <Animated.View
              style={[styles.wheelInner, { transform: [{ rotate: rotateDeg }] }]}
            >
              {/* Outer dark ring */}
              <View style={styles.wheelRingOuter} />

              {/* Pockets */}
              {WHEEL_ORDER.map((num, i) => {
                const angle = (i / 37) * 2 * Math.PI - Math.PI / 2;
                const px = CENTER + RING_R * Math.cos(angle) - POCKET_SZ / 2;
                const py = CENTER + RING_R * Math.sin(angle) - POCKET_SZ / 2;
                const col = getColor(num);
                const isWinner = result?.number === num;
                return (
                  <View
                    key={num}
                    style={[
                      styles.pocket,
                      {
                        left: px, top: py,
                        backgroundColor: NUM_COLOR_BG[col],
                        borderColor: isWinner ? "#ffd700" : `${NUM_COLOR_BRIGHT[col]}50`,
                        borderWidth: isWinner ? 2 : 1,
                      },
                    ]}
                  >
                    <Text style={styles.pocketText}>{num}</Text>
                  </View>
                );
              })}

              {/* Hub */}
              <View style={styles.hub}>
                <LinearGradient
                  colors={["#ffd700", "#b8860b"]}
                  style={styles.hubGradient}
                >
                  {result && !isSpinning ? (
                    <Text style={styles.hubNum}>{result.number}</Text>
                  ) : (
                    <MaterialCommunityIcons name="circle-double" size={18} color="#000" />
                  )}
                </LinearGradient>
              </View>
            </Animated.View>

            {/* Status text */}
            <Text style={[styles.wheelStatus, { color: colors.mutedForeground }]}>
              {isSpinning ? "SPINNING..." : "EUROPEAN ROULETTE · 0–36"}
            </Text>
          </View>
        </View>

        {/* ── HISTORY ──────────────────────────────────────────────────────── */}
        {history.length > 0 && (
          <View style={styles.historyRow}>
            {history.map((h, i) => (
              <View
                key={i}
                style={[styles.histDot, { backgroundColor: NUM_COLOR_BG[h.color], borderColor: `${NUM_COLOR_BRIGHT[h.color]}60` }]}
              >
                <Text style={styles.histDotText}>{h.n}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── RESULT BANNER ─────────────────────────────────────────────────── */}
        {result && (
          <Animated.View
            style={[
              styles.resultBanner,
              {
                backgroundColor: result.win ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.10)",
                borderColor: result.win ? "#22c55e" : "#ef4444",
                opacity: resultAnim,
                transform: [{ scale: resultAnim.interpolate({ inputRange: [0,1], outputRange: [0.92,1] }) }],
              },
            ]}
          >
            <View
              style={[
                styles.resultNumBadge,
                { backgroundColor: NUM_COLOR_BG[getColor(result.number)], borderColor: NUM_COLOR_BRIGHT[getColor(result.number)] },
              ]}
            >
              <Text style={styles.resultNumText}>{result.number}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.resultMsg, { color: result.win ? "#22c55e" : "#ef4444" }]}>
                {result.win ? "🏆 YOU WIN!" : "HOUSE WINS"}
              </Text>
              <Text style={[styles.resultSub, { color: colors.mutedForeground }]}>
                {result.msg}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* ── BET BOARD ─────────────────────────────────────────────────────── */}
        <View style={styles.boardWrap}>
          <Text style={[styles.boardLabel, { color: colors.mutedForeground }]}>PLACE YOUR BET</Text>

          {/* Number grid */}
          <View style={styles.boardGrid}>
            {/* Zero cell */}
            <TouchableOpacity
              onPress={() => selectBet("straight", "0")}
              style={[
                styles.zeroCell,
                {
                  backgroundColor: isSelected("straight","0") ? "#15803d" : "#0f3d22",
                  borderColor: isSelected("straight","0") ? "#ffd700" : "#16a34a70",
                },
              ]}
            >
              <Text style={styles.cellNum}>0</Text>
            </TouchableOpacity>

            {/* 3-row × 12-col number grid */}
            <View style={styles.numGrid}>
              {GRID_ROWS.map((row, ri) => (
                <View key={ri} style={styles.numRow}>
                  {row.map((num) => {
                    const col = getColor(num);
                    const sel = isSelected("straight", String(num));
                    return (
                      <TouchableOpacity
                        key={num}
                        onPress={() => selectBet("straight", String(num))}
                        style={[
                          styles.numCell,
                          {
                            backgroundColor: sel
                              ? NUM_COLOR_BRIGHT[col]
                              : NUM_COLOR_BG[col],
                            borderColor: sel ? "#ffd700" : `${NUM_COLOR_BRIGHT[col]}35`,
                          },
                        ]}
                      >
                        <Text style={styles.cellNum}>{num}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* 2:1 column bet cells (one per row = top/mid/bot column) */}
            <View style={styles.colBets}>
              {(["3rd","2nd","1st"] as const).map((dz) => (
                <TouchableOpacity
                  key={dz}
                  onPress={() => selectBet("dozen", dz)}
                  style={[
                    styles.colBetCell,
                    {
                      backgroundColor: isSelected("dozen", dz) ? "#ffd70025" : colors.surfaceContainerLow,
                      borderColor: isSelected("dozen", dz) ? "#ffd700" : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.colBetText, { color: isSelected("dozen", dz) ? "#ffd700" : colors.mutedForeground }]}>
                    2:1
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Dozen row */}
          <View style={styles.dozenRow}>
            {([["1st","1st 12"],["2nd","2nd 12"],["3rd","3rd 12"]] as const).map(([val,label]) => {
              const sel = isSelected("dozen", val);
              return (
                <TouchableOpacity
                  key={val}
                  onPress={() => selectBet("dozen", val)}
                  style={[
                    styles.dozenCell,
                    {
                      backgroundColor: sel ? "#ffd70020" : colors.surfaceContainerLow,
                      borderColor: sel ? "#ffd700" : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.dozenText, { color: sel ? "#ffd700" : colors.foreground }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Outside bets row */}
          <View style={styles.outsideRow}>
            {[
              { type: "range" as BetType, value: "low",   label: "1–18",   bg: "#1e293b" },
              { type: "parity" as BetType, value: "even", label: "EVEN",   bg: "#1e293b" },
              { type: "color" as BetType, value: "red",   label: "●",      bg: "#991b1b" },
              { type: "color" as BetType, value: "black", label: "●",      bg: "#111827" },
              { type: "parity" as BetType, value: "odd",  label: "ODD",    bg: "#1e293b" },
              { type: "range" as BetType, value: "high",  label: "19–36",  bg: "#1e293b" },
            ].map((b) => {
              const sel = isSelected(b.type, b.value);
              return (
                <TouchableOpacity
                  key={`${b.type}-${b.value}`}
                  onPress={() => selectBet(b.type, b.value)}
                  style={[
                    styles.outsideCell,
                    {
                      backgroundColor: sel ? (b.bg + "dd") : b.bg,
                      borderColor: sel ? "#ffd700" : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.outsideText, {
                    color: sel ? "#ffd700" :
                      b.value === "red" ? "#ff8080" :
                      b.value === "black" ? "#9ca3af" :
                      colors.foreground,
                    fontSize: b.label === "●" ? 20 : 10,
                  }]}>
                    {b.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── BET CONTROLS ──────────────────────────────────────────────────── */}
        <View style={[styles.betControls, { backgroundColor: colors.surfaceContainerLow }]}>
          {/* Bet amount chips */}
          <View style={styles.betChipRow}>
            <Text style={[styles.betChipLabel, { color: colors.mutedForeground }]}>CHIP VALUE</Text>
            <View style={styles.betChips}>
              {BET_CHIPS.map((amt, i) => {
                const active = betIdx === i;
                return (
                  <PressableScale
                    key={amt}
                    onPress={() => setBetIdx(i)}
                    style={[
                      styles.betChipBtn,
                      {
                        backgroundColor: active ? "#9547f7" : colors.accent,
                        borderColor: active ? "#c59aff" : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.betChipBtnText, { color: active ? "#fff" : colors.mutedForeground }]}>
                      ${amt}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          </View>

          {/* Selected bet + spin button */}
          <View style={[styles.betInfoRow, { borderColor: colors.border }]}>
            <View style={styles.betInfoLeft}>
              <Text style={[styles.betInfoLabel, { color: colors.mutedForeground }]}>YOUR BET</Text>
              <Text style={[styles.betInfoBet, { color: colors.foreground }]} numberOfLines={1}>
                {betLabel}
              </Text>
              <Text style={[styles.betInfoAmount, { color: "#ffd700" }]}>
                {formatBalance(betAmount)}
              </Text>
            </View>

            {result && !isSpinning && (
              <PressableScale
                onPress={() => { setResult(null); setSelectedBet(null); }}
                style={[styles.clearBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.clearBtnText, { color: colors.mutedForeground }]}>CLEAR</Text>
              </PressableScale>
            )}
          </View>

          <PressableScale
            onPress={spin}
            disabled={!canSpin}
            scale={0.96}
            containerStyle={{ opacity: canSpin ? 1 : 0.45 }}
          >
            <LinearGradient
              colors={canSpin ? ["#9547f7", "#c59aff"] : [colors.surfaceBright, colors.surfaceBright]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.spinBtn}
            >
              <View style={styles.spinBtnGloss} />
              <MaterialCommunityIcons name="autorenew" size={22} color={canSpin ? "#fff" : colors.mutedForeground} />
              <Text style={[styles.spinBtnText, { color: canSpin ? "#fff" : colors.mutedForeground }]}>
                {isSpinning ? "SPINNING..." : !selectedBet ? "PICK A BET" : betAmount > balance ? "INSUFFICIENT FUNDS" : "SPIN THE WHEEL"}
              </Text>
            </LinearGradient>
          </PressableScale>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // ── Wheel ──────────────────────────────────────────────────────────────────
  wheelSection: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 4,
  },
  wheelOuter: {
    width: WHEEL_D + 32,
    height: WHEEL_D + 48,
    borderRadius: (WHEEL_D + 32) / 2,
    borderWidth: 2,
    backgroundColor: "#0a0a14",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 8,
    overflow: "hidden",
    shadowColor: "#ffd700",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  ballMarker: {
    position: "absolute",
    top: 10,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#ffd700",
    zIndex: 10,
    shadowColor: "#fff",
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  wheelInner: {
    width: WHEEL_D,
    height: WHEEL_D,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  wheelRingOuter: {
    position: "absolute",
    width: WHEEL_D,
    height: WHEEL_D,
    borderRadius: WHEEL_D / 2,
    borderWidth: 4,
    borderColor: "#1a1010",
    backgroundColor: "#0f0f1a",
  },
  pocket: {
    position: "absolute",
    width: POCKET_SZ,
    height: POCKET_SZ,
    borderRadius: POCKET_SZ / 2,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pocketText: {
    color: "#fff",
    fontSize: 6.5,
    fontWeight: "900",
  },
  hub: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#b8860b",
    shadowColor: "#ffd700",
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  hubGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  hubNum: {
    fontSize: 18,
    fontWeight: "900",
    color: "#000",
  },
  wheelStatus: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  // ── History ────────────────────────────────────────────────────────────────
  historyRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    gap: 4,
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 6,
  },
  histDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  histDotText: {
    color: "#fff",
    fontSize: 7.5,
    fontWeight: "900",
  },

  // ── Result ─────────────────────────────────────────────────────────────────
  resultBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 12,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  resultNumBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  resultNumText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
  resultMsg: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  resultSub: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },

  // ── Board ──────────────────────────────────────────────────────────────────
  boardWrap: {
    marginHorizontal: 10,
    marginTop: 10,
    gap: 2,
  },
  boardLabel: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  boardGrid: {
    flexDirection: "row",
    gap: 2,
  },
  zeroCell: {
    width: 24,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 4,
    borderWidth: 1.5,
  },
  cellNum: {
    color: "#fff",
    fontSize: 8.5,
    fontWeight: "900",
  },
  numGrid: {
    flex: 1,
    gap: 2,
  },
  numRow: {
    flexDirection: "row",
    gap: 2,
  },
  numCell: {
    flex: 1,
    height: 30,
    borderRadius: 3,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  colBets: {
    gap: 2,
    width: 28,
  },
  colBetCell: {
    flex: 1,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  colBetText: {
    fontSize: 7.5,
    fontWeight: "900",
  },
  dozenRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: 2,
    marginLeft: 26,
    marginRight: 30,
  },
  dozenCell: {
    flex: 1,
    height: 28,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  dozenText: {
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  outsideRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: 2,
    marginLeft: 26,
    marginRight: 30,
  },
  outsideCell: {
    flex: 1,
    height: 32,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  outsideText: {
    fontSize: 10,
    fontWeight: "900",
  },

  // ── Controls ───────────────────────────────────────────────────────────────
  betControls: {
    margin: 10,
    marginTop: 12,
    borderRadius: 20,
    padding: 14,
    gap: 12,
  },
  betChipRow: {
    gap: 8,
  },
  betChipLabel: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  betChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  betChipBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.5,
    minWidth: 48,
    alignItems: "center",
  },
  betChipBtnText: {
    fontSize: 11,
    fontWeight: "900",
  },
  betInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 10,
  },
  betInfoLeft: {
    flex: 1,
    gap: 2,
  },
  betInfoLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  betInfoBet: {
    fontSize: 13,
    fontWeight: "800",
  },
  betInfoAmount: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  clearBtnText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  spinBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 9999,
    overflow: "hidden",
    shadowColor: "#9547f7",
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  spinBtnGloss: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  spinBtnText: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
});
