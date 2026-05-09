import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useGameSound } from "@/hooks/useGameSound";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { DiceFace } from "@/components/DiceFace";
import { GameHeader } from "@/components/GameHeader";
import { PressableScale } from "@/components/PressableScale";
import { useBalance } from "@/context/BalanceContext";
import { useColors } from "@/hooks/useColors";
import { DICE_CONFIG } from "@/constants/gameConfig";

type Prediction = "over" | "under" | number | null;

const ROLL_HISTORY_MAX = 6;
const HISTORY_COLORS = ["#c59aff", "#00f4fe", "#ff59e3", "#ffd700", "#c59aff", "#00f4fe"];

function getBoostedResult(prediction: Prediction, rollCount: number): number {
  const isEarly = rollCount <= DICE_CONFIG.earlyBoostRounds;
  if (isEarly && Math.random() < DICE_CONFIG.earlyBoostWinChance) {
    if (prediction === "over") return [4, 5, 6][Math.floor(Math.random() * 3)];
    if (prediction === "under") return [1, 2, 3][Math.floor(Math.random() * 3)];
    if (typeof prediction === "number") return prediction;
  }
  return Math.floor(Math.random() * 6) + 1;
}

export default function DiceGameScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { balance, updateBalance, formatBalance } = useBalance();
  const { playRoll, playWin, playLose } = useGameSound();

  const [betAmount, setBetAmount] = useState("50.00");
  const [diceValue, setDiceValue] = useState(5);
  const [prediction, setPrediction] = useState<Prediction>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [rollHistory, setRollHistory] = useState<number[]>([6, 2, 4, 1, 5, 3]);
  const [lastResult, setLastResult] = useState<{ win: boolean; msg: string } | null>(null);

  const spinAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const resultFade = useRef(new Animated.Value(0)).current;
  const rollCount = useRef(0);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 16;
  const parsedBet = parseFloat(betAmount) || 0;

  const roll = useCallback(() => {
    if (isRolling || !prediction || parsedBet <= 0 || parsedBet > balance) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    playRoll();
    setIsRolling(true);
    setLastResult(null);
    resultFade.setValue(0);

    Animated.parallel([
      Animated.timing(spinAnim, { toValue: 1, duration: 550, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.78, duration: 120, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.12, duration: 260, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 300, useNativeDriver: true }),
      ]),
    ]).start(() => spinAnim.setValue(0));

    rollCount.current += 1;
    const result = getBoostedResult(prediction, rollCount.current);

    setTimeout(() => {
      setDiceValue(result);
      setRollHistory(prev => [result, ...prev].slice(0, ROLL_HISTORY_MAX));

      let win = false;
      const multiplier =
        prediction === "over" || prediction === "under"
          ? DICE_CONFIG.overUnderMultiplier
          : DICE_CONFIG.exactMultiplier;

      if (prediction === "over") win = result > 3.5;
      else if (prediction === "under") win = result < 3.5;
      else if (typeof prediction === "number") win = result === prediction;

      updateBalance(win ? parsedBet * multiplier - parsedBet : -parsedBet);
      setLastResult({
        win,
        msg: win
          ? `YOU WIN! +${formatBalance(parsedBet * (multiplier - 1))}`
          : `YOU LOSE! -${formatBalance(parsedBet)}`,
      });
      Haptics.notificationAsync(
        win
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error
      );
      win ? playWin() : playLose();

      Animated.timing(resultFade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      setIsRolling(false);
    }, 600);
  }, [isRolling, prediction, parsedBet, balance, rollCount, spinAnim, scaleAnim, resultFade, updateBalance, formatBalance, playRoll, playWin, playLose]);

  const spin = useMemo(
    () => spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "720deg"] }),
    [spinAnim]
  );

  const canRoll = !isRolling && !!prediction && parsedBet > 0 && parsedBet <= balance;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <GameHeader showBack title="Dice" />

      <View style={[styles.content, { paddingBottom: bottomPad }]}>
        {/* Dice Stage */}
        <View style={[styles.diceStage, { backgroundColor: colors.surfaceContainerLow }]}>
          <View style={StyleSheet.absoluteFill}>
            <View style={[styles.glowLeft, { backgroundColor: `${colors.primary}16` }]} />
            <View style={[styles.glowRight, { backgroundColor: `${colors.secondary}0e` }]} />
          </View>
          <View style={[styles.liveBadge, { backgroundColor: "rgba(17,10,30,0.8)" }]}>
            <View style={[styles.liveDot, { backgroundColor: colors.secondary }]} />
            <Text style={[styles.liveText, { color: colors.foreground }]}>LIVE TABLE #402</Text>
          </View>
          <Animated.View style={{ transform: [{ rotate: spin }, { scale: scaleAnim }] }}>
            <DiceFace value={diceValue} size={118} primaryColor={colors.primary} />
          </Animated.View>
        </View>

        {/* History + Result row */}
        <View style={styles.histResultRow}>
          <View style={styles.historyStrip}>
            {rollHistory.map((n, i) => (
              <View key={i} style={[styles.histChip, { backgroundColor: colors.accent, borderColor: colors.border }]}>
                <Text style={[styles.histNum, { color: HISTORY_COLORS[i % HISTORY_COLORS.length] }]}>{n}</Text>
              </View>
            ))}
            <View style={[styles.histChip, { backgroundColor: colors.accent, borderColor: colors.border }]}>
              <Text style={[styles.histNum, { color: colors.mutedForeground, opacity: 0.35 }]}>?</Text>
            </View>
          </View>

          {lastResult && (
            <Animated.View
              style={[
                styles.resultBadge,
                {
                  backgroundColor: lastResult.win ? "rgba(0,244,254,0.1)" : "rgba(255,110,132,0.1)",
                  borderColor: lastResult.win ? colors.secondary : colors.destructive,
                  opacity: resultFade,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={lastResult.win ? "check-circle" : "close-circle"}
                size={14}
                color={lastResult.win ? colors.secondary : colors.destructive}
              />
              <Text style={[styles.resultText, { color: lastResult.win ? colors.secondary : colors.destructive }]}>
                {lastResult.msg}
              </Text>
            </Animated.View>
          )}
        </View>

        {/* Bet Card */}
        <View style={[styles.card, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.border }]}>
          <View style={styles.betRow}>
            <View style={[styles.betInputWrap, { backgroundColor: colors.input }]}>
              <Text style={[styles.dollarSign, { color: colors.primary }]}>$</Text>
              <TextInput
                value={betAmount}
                onChangeText={setBetAmount}
                keyboardType="decimal-pad"
                style={[styles.betInput, { color: colors.primary }]}
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            {([["½", 0.5], ["×2", 2], ["+50", 50], ["MAX", -1]] as [string, number][]).map(([label, factor]) => (
              <PressableScale
                key={label}
                onPress={() => {
                  const cur = parseFloat(betAmount) || 0;
                  if (factor === -1) setBetAmount(balance.toFixed(2));
                  else if (factor < 1) setBetAmount(Math.max(1, cur * factor).toFixed(2));
                  else if (factor > 10) setBetAmount((cur + factor).toFixed(2));
                  else setBetAmount(Math.min(balance, cur * factor).toFixed(2));
                }}
                style={[styles.betQuickBtn, { backgroundColor: colors.surfaceBright }]}
              >
                <Text style={[styles.betQuickText, { color: colors.foreground }]}>{label}</Text>
              </PressableScale>
            ))}
          </View>
        </View>

        {/* Prediction Card */}
        <View style={[styles.card, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>SELECT OUTCOME</Text>

          <View style={styles.ouRow}>
            {(["over", "under"] as const).map((side) => {
              const active = prediction === side;
              const mult = side === "over" ? DICE_CONFIG.overUnderMultiplier : DICE_CONFIG.underMultiplier;
              return (
                <PressableScale
                  key={side}
                  onPress={() => setPrediction(side)}
                  style={[
                    styles.ouBtn,
                    {
                      backgroundColor: active ? `${colors.primary}18` : colors.accent,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.ouLabel, { color: active ? colors.primary : colors.mutedForeground }]}>
                    {side === "over" ? "Over 3.5" : "Under 3.5"}
                  </Text>
                  <Text style={[styles.ouMult, { color: active ? colors.primary : colors.foreground }]}>
                    {mult}×
                  </Text>
                </PressableScale>
              );
            })}
          </View>

          <View style={styles.exactHeader}>
            <Text style={[styles.exactLabel, { color: colors.mutedForeground }]}>EXACT NUMBER</Text>
            <Text style={[styles.exactPayout, { color: colors.secondary }]}>{DICE_CONFIG.exactMultiplier}× payout</Text>
          </View>
          <View style={styles.numGrid}>
            {[1, 2, 3, 4, 5, 6].map((n) => {
              const active = prediction === n;
              return (
                <PressableScale
                  key={n}
                  onPress={() => setPrediction(n)}
                  style={[
                    styles.numBtn,
                    {
                      backgroundColor: active ? `${colors.secondary}18` : colors.accent,
                      borderColor: active ? colors.secondary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.numText, { color: active ? colors.secondary : colors.foreground }]}>
                    {n}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </View>

        {/* Roll Button */}
        <PressableScale onPress={roll} disabled={!canRoll} scale={0.96}>
          <LinearGradient
            colors={canRoll ? ["#9547f7", "#c59aff"] : [colors.surfaceBright, colors.surfaceBright]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.rollBtn}
          >
            <View style={styles.rollBtnGloss} />
            <MaterialCommunityIcons
              name={isRolling ? "loading" : "dice-6"}
              size={20}
              color={canRoll ? "#fff" : colors.mutedForeground}
            />
            <Text style={[styles.rollBtnText, { color: canRoll ? "#fff" : colors.mutedForeground }]}>
              {isRolling ? "ROLLING..." : "ROLL DICE"}
            </Text>
          </LinearGradient>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 10,
  },
  diceStage: {
    borderRadius: 20,
    height: 158,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    flexDirection: "row",
  },
  glowLeft: {
    position: "absolute",
    left: -40,
    top: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  glowRight: {
    position: "absolute",
    right: -40,
    bottom: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  liveBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  histResultRow: {
    gap: 8,
  },
  historyStrip: {
    flexDirection: "row",
    gap: 8,
  },
  histChip: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  histNum: {
    fontSize: 18,
    fontWeight: "900",
  },
  resultBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  resultText: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  betRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  betInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  dollarSign: {
    fontSize: 18,
    fontWeight: "900",
  },
  betInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
    padding: 0,
  },
  betQuickBtn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  betQuickText: {
    fontSize: 10,
    fontWeight: "800",
  },
  cardLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  ouRow: {
    flexDirection: "row",
    gap: 10,
  },
  ouBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 2,
  },
  ouLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  ouMult: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  exactHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  exactLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  exactPayout: {
    fontSize: 11,
    fontWeight: "800",
  },
  numGrid: {
    flexDirection: "row",
    gap: 8,
  },
  numBtn: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  numText: {
    fontSize: 16,
    fontWeight: "900",
  },
  rollBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 9999,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#9547f7",
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  rollBtnGloss: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  rollBtnText: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});
