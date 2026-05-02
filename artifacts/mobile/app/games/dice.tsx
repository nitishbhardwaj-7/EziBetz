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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { DiceFace } from "@/components/DiceFace";
import { GameHeader } from "@/components/GameHeader";
import { useBalance } from "@/context/BalanceContext";
import { useColors } from "@/hooks/useColors";

type Prediction = "over" | "under" | number | null;

const ROLL_HISTORY_MAX = 7;

export default function DiceGameScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { balance, updateBalance, formatBalance } = useBalance();

  const [betAmount, setBetAmount] = useState("50.00");
  const [diceValue, setDiceValue] = useState(5);
  const [prediction, setPrediction] = useState<Prediction>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [rollHistory, setRollHistory] = useState<number[]>([6, 2, 4, 1, 5, 3]);
  const [lastResult, setLastResult] = useState<{ win: boolean; msg: string } | null>(null);

  const { playRoll, playWin, playLose } = useGameSound();
  const spinAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 20;

  const parsedBet = parseFloat(betAmount) || 0;

  const roll = () => {
    if (isRolling || !prediction || parsedBet <= 0 || parsedBet > balance) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    playRoll();
    setIsRolling(true);
    setLastResult(null);

    // animate
    Animated.sequence([
      Animated.parallel([
        Animated.timing(spinAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 0.8, duration: 150, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1.1, duration: 300, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1.0, duration: 150, useNativeDriver: true }),
        ]),
      ]),
    ]).start(() => {
      spinAnim.setValue(0);
    });

    setTimeout(() => {
      const result = Math.floor(Math.random() * 6) + 1;
      setDiceValue(result);
      setRollHistory((prev) => {
        const updated = [result, ...prev];
        return updated.slice(0, ROLL_HISTORY_MAX);
      });

      let win = false;
      if (prediction === "over") win = result > 3.5;
      else if (prediction === "under") win = result < 3.5;
      else if (typeof prediction === "number") win = result === prediction;

      const multiplier =
        prediction === "over" || prediction === "under" ? 2.1 : 6.0;

      if (win) {
        updateBalance(parsedBet * multiplier - parsedBet);
        setLastResult({ win: true, msg: `YOU WIN! +${formatBalance(parsedBet * (multiplier - 1))}` });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        playWin();
      } else {
        updateBalance(-parsedBet);
        setLastResult({ win: false, msg: `YOU LOSE! -${formatBalance(parsedBet)}` });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        playLose();
      }

      setIsRolling(false);
    }, 700);
  };

  const adjustBet = (factor: number) => {
    const current = parseFloat(betAmount) || 0;
    setBetAmount(Math.max(1, current * factor).toFixed(2));
  };

  const addToBet = (amount: number) => {
    const current = parseFloat(betAmount) || 0;
    setBetAmount((current + amount).toFixed(2));
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "720deg"],
  });

  const historyColors = [colors.primary, colors.secondary, colors.tertiary];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <GameHeader showBack title="Dice" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 20 }]}
      >
        {/* Dice Stage */}
        <View
          style={[
            styles.diceStage,
            { backgroundColor: colors.surfaceContainerLow },
          ]}
        >
          <View style={styles.ambientGlow} pointerEvents="none">
            <View style={[styles.glowLeft, { backgroundColor: `${colors.primary}18` }]} />
            <View style={[styles.glowRight, { backgroundColor: `${colors.secondary}10` }]} />
          </View>

          {/* Live indicator */}
          <View
            style={[
              styles.liveChip,
              { backgroundColor: "rgba(17,10,30,0.7)" },
            ]}
          >
            <View style={[styles.liveDot, { backgroundColor: colors.secondary }]} />
            <Text style={[styles.liveText, { color: colors.foreground }]}>
              Live Table #402
            </Text>
          </View>

          <Animated.View
            style={[
              styles.diceWrapper,
              { transform: [{ rotate: spin }, { scale: scaleAnim }] },
            ]}
          >
            <DiceFace value={diceValue} size={140} primaryColor={colors.primary} />
          </Animated.View>
        </View>

        {/* Result Banner */}
        {lastResult && (
          <View
            style={[
              styles.resultBanner,
              {
                backgroundColor: lastResult.win
                  ? "rgba(0,244,254,0.12)"
                  : "rgba(255,110,132,0.12)",
                borderColor: lastResult.win ? colors.secondary : colors.destructive,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={lastResult.win ? "check-circle" : "close-circle"}
              size={22}
              color={lastResult.win ? colors.secondary : colors.destructive}
            />
            <Text
              style={[
                styles.resultText,
                { color: lastResult.win ? colors.secondary : colors.destructive },
              ]}
            >
              {lastResult.msg}
            </Text>
          </View>
        )}

        {/* Roll History */}
        <View style={styles.historySection}>
          <Text style={[styles.historyLabel, { color: colors.mutedForeground }]}>
            RECENT ROLLS
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.historyRow}>
            {rollHistory.map((n, i) => (
              <View
                key={i}
                style={[
                  styles.historyChip,
                  { backgroundColor: colors.accent, borderColor: colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.historyNum,
                    { color: historyColors[i % historyColors.length] },
                  ]}
                >
                  {n}
                </Text>
              </View>
            ))}
            <View
              style={[
                styles.historyChip,
                { backgroundColor: colors.accent, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.historyNum, { color: colors.mutedForeground, opacity: 0.4 }]}>
                ?
              </Text>
            </View>
          </ScrollView>
        </View>

        {/* Bet Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.border },
          ]}
        >
          <View style={styles.betHeader}>
            <Text style={[styles.cardLabel, { color: colors.foreground }]}>Bet Amount</Text>
            <Text style={[styles.minLabel, { color: colors.mutedForeground }]}>Min $1.00</Text>
          </View>
          <View style={[styles.betInputRow, { backgroundColor: colors.input }]}>
            <Text style={[styles.betSymbol, { color: colors.primary }]}>$</Text>
            <TextInput
              value={betAmount}
              onChangeText={setBetAmount}
              keyboardType="decimal-pad"
              style={[styles.betInput, { color: colors.primary }]}
              placeholderTextColor={colors.mutedForeground}
            />
            <View style={styles.betQuickBtns}>
              <TouchableOpacity
                style={[styles.betQuickBtn, { backgroundColor: colors.surfaceBright }]}
                onPress={() => adjustBet(0.5)}
              >
                <Text style={[styles.betQuickText, { color: colors.foreground }]}>1/2</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.betQuickBtn, { backgroundColor: colors.surfaceBright }]}
                onPress={() => adjustBet(2)}
              >
                <Text style={[styles.betQuickText, { color: colors.foreground }]}>x2</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.quickBetRow}>
            {[5, 10, 50].map((amt) => (
              <TouchableOpacity
                key={amt}
                style={[
                  styles.quickBetChip,
                  {
                    backgroundColor: colors.accent,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => addToBet(amt)}
              >
                <Text style={[styles.quickBetText, { color: colors.foreground }]}>+${amt}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.quickBetChip, { backgroundColor: colors.accent, borderColor: colors.border }]}
              onPress={() => setBetAmount(balance.toFixed(2))}
            >
              <Text style={[styles.quickBetText, { color: colors.foreground }]}>MAX</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Prediction Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardLabel, { color: colors.foreground }]}>SELECT OUTCOME</Text>

          {/* Over / Under */}
          <View style={styles.overUnderRow}>
            <TouchableOpacity
              style={[
                styles.overUnderBtn,
                {
                  backgroundColor:
                    prediction === "over" ? `${colors.primary}20` : colors.accent,
                  borderColor: prediction === "over" ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setPrediction("over")}
            >
              <Text style={[styles.ouLabel, { color: prediction === "over" ? colors.primary : colors.mutedForeground }]}>
                Over 3.5
              </Text>
              <Text style={[styles.ouMultiplier, { color: colors.foreground }]}>2.1x</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.overUnderBtn,
                {
                  backgroundColor:
                    prediction === "under" ? `${colors.primary}20` : colors.accent,
                  borderColor: prediction === "under" ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setPrediction("under")}
            >
              <Text style={[styles.ouLabel, { color: prediction === "under" ? colors.primary : colors.mutedForeground }]}>
                Under 3.5
              </Text>
              <Text style={[styles.ouMultiplier, { color: colors.foreground }]}>1.8x</Text>
            </TouchableOpacity>
          </View>

          {/* Specific Number */}
          <View style={styles.numberSection}>
            <View style={styles.numberHeader}>
              <Text style={[styles.numberLabel, { color: colors.mutedForeground }]}>
                SPECIFIC NUMBER
              </Text>
              <Text style={[styles.numberPayout, { color: colors.secondary }]}>
                6.0x Payout
              </Text>
            </View>
            <View style={styles.numberGrid}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[
                    styles.numberBtn,
                    {
                      backgroundColor:
                        prediction === n ? `${colors.secondary}20` : colors.accent,
                      borderColor: prediction === n ? colors.secondary : colors.border,
                    },
                  ]}
                  onPress={() => setPrediction(n)}
                >
                  <Text
                    style={[
                      styles.numberBtnText,
                      { color: prediction === n ? colors.secondary : colors.foreground },
                    ]}
                  >
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Roll Button */}
          <TouchableOpacity onPress={roll} disabled={isRolling || !prediction} activeOpacity={0.85}>
            <LinearGradient
              colors={
                isRolling || !prediction
                  ? [colors.surfaceBright, colors.surfaceBright]
                  : [colors.primary, colors.primaryDim]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.rollBtn}
            >
              <View style={styles.rollBtnGloss} />
              <Text
                style={[
                  styles.rollBtnText,
                  {
                    color:
                      isRolling || !prediction
                        ? colors.mutedForeground
                        : colors.primaryForeground,
                  },
                ]}
              >
                {isRolling ? "ROLLING..." : "ROLL DICE"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
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
  diceStage: {
    borderRadius: 24,
    height: 240,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  ambientGlow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
  },
  glowLeft: {
    flex: 1,
    borderRadius: 100,
    transform: [{ scale: 1.5 }],
  },
  glowRight: {
    flex: 1,
    borderRadius: 100,
    transform: [{ scale: 1.5 }],
  },
  liveChip: {
    position: "absolute",
    top: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  diceWrapper: {
    shadowColor: "#c59aff",
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
  },
  resultBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  resultText: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  historySection: {
    gap: 8,
  },
  historyLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginLeft: 4,
  },
  historyRow: {
    flexDirection: "row",
  },
  historyChip: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderWidth: 1,
  },
  historyNum: {
    fontSize: 20,
    fontWeight: "900",
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  betHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  minLabel: {
    fontSize: 11,
  },
  betInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  betSymbol: {
    fontSize: 22,
    fontWeight: "900",
  },
  betInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
    padding: 0,
  },
  betQuickBtns: {
    flexDirection: "row",
    gap: 6,
  },
  betQuickBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  betQuickText: {
    fontSize: 11,
    fontWeight: "800",
  },
  quickBetRow: {
    flexDirection: "row",
    gap: 8,
  },
  quickBetChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  quickBetText: {
    fontSize: 12,
    fontWeight: "800",
  },
  overUnderRow: {
    flexDirection: "row",
    gap: 12,
  },
  overUnderBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 4,
  },
  ouLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  ouMultiplier: {
    fontSize: 22,
    fontWeight: "900",
  },
  numberSection: {
    gap: 12,
  },
  numberHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  numberLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  numberPayout: {
    fontSize: 11,
    fontWeight: "800",
  },
  numberGrid: {
    flexDirection: "row",
    gap: 8,
  },
  numberBtn: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  numberBtnText: {
    fontSize: 16,
    fontWeight: "900",
  },
  rollBtn: {
    paddingVertical: 18,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  rollBtnGloss: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  rollBtnText: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});
