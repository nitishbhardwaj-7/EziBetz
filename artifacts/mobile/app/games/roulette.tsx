import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useGameSound } from "@/hooks/useGameSound";
import React, { useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GameHeader } from "@/components/GameHeader";
import { useBalance } from "@/context/BalanceContext";
import { useColors } from "@/hooks/useColors";
import { ROULETTE_CONFIG } from "@/constants/gameConfig";

const CHAMBER_POSITIONS = [
  { angle: 90,  label: "1" },
  { angle: 30,  label: "2" },
  { angle: 330, label: "3" },
  { angle: 270, label: "4" },
  { angle: 210, label: "5" },
  { angle: 150, label: "6" },
];

const RECENT_HISTORY = [
  { chamber: 4, win: true,  user: "User_9921",  amount: "+$420.00",   time: "2m ago" },
  { chamber: 1, win: false, user: "BetMaster",  amount: "-$100.00",   time: "5m ago" },
  { chamber: 3, win: true,  user: "Player_X",   amount: "+$1,150.00", time: "8m ago" },
];

export default function RouletteGameScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { balance, updateBalance, formatBalance } = useBalance();
  const { playRoll, playWin, playLose } = useGameSound();

  const [betAmount, setBetAmount] = useState("100.00");
  const [selectedChamber, setSelectedChamber] = useState<number | null>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [lastResult, setLastResult] = useState<{
    win: boolean; chamber: number; msg: string;
  } | null>(null);

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const resultFlashAnim = useRef(new Animated.Value(0)).current;
  const spinBtnAnim = useRef(new Animated.Value(1)).current;
  // Track cumulative rotation so each spin continues from previous angle
  const cumulativeRotation = useRef(0);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 16;
  const parsedBet = parseFloat(betAmount) || 0;
  const { multiplier } = ROULETTE_CONFIG;

  const CYLINDER_SIZE = 240;
  const CENTER = CYLINDER_SIZE / 2;
  const CHAMBER_RADIUS = 82;

  const pullTrigger = () => {
    if (isPulling || selectedChamber === null || parsedBet <= 0 || parsedBet > balance) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    playRoll();
    setIsPulling(true);
    setLastResult(null);

    // Button press effect
    Animated.sequence([
      Animated.timing(spinBtnAnim, { toValue: 0.94, duration: 80, useNativeDriver: true }),
      Animated.timing(spinBtnAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();

    // Physics-based multi-rotation
    const extraRotations =
      ROULETTE_CONFIG.totalSpinRotations.min +
      Math.random() * (ROULETTE_CONFIG.totalSpinRotations.max - ROULETTE_CONFIG.totalSpinRotations.min);
    const landingFraction = Math.random(); // random fraction of one rotation
    const totalDegrees = extraRotations * 360 + landingFraction * 360;

    const startValue = cumulativeRotation.current;
    const endValue = startValue + totalDegrees;
    cumulativeRotation.current = endValue;

    rotateAnim.setValue(startValue);

    Animated.timing(rotateAnim, {
      toValue: endValue,
      duration: ROULETTE_CONFIG.spinDuration,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start(() => {
      // Determine result
      const firingChamber = Math.floor(Math.random() * 6) + 1;
      const isBullet = firingChamber === selectedChamber;

      if (!isBullet) {
        const winAmount = parsedBet * multiplier;
        updateBalance(winAmount - parsedBet);
        setLastResult({
          win: true,
          chamber: firingChamber,
          msg: `SURVIVED! +${formatBalance(winAmount - parsedBet)}`,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        playWin();
      } else {
        updateBalance(-parsedBet);
        setLastResult({
          win: false,
          chamber: firingChamber,
          msg: `ELIMINATED! -${formatBalance(parsedBet)}`,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        playLose();
      }

      // Flash result
      Animated.sequence([
        Animated.timing(resultFlashAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(resultFlashAnim, { toValue: 0.7, duration: 200, useNativeDriver: true }),
        Animated.timing(resultFlashAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      setIsPulling(false);
    });
  };

  const rotateDeg = rotateAnim.interpolate({
    inputRange: [cumulativeRotation.current - 3600, cumulativeRotation.current + 3600],
    outputRange: ["-3600deg", "3600deg"],
    extrapolate: "extend",
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <GameHeader showBack title="Roulette" />

      <View style={[styles.content, { paddingBottom: bottomPad }]}>
        {/* Title row */}
        <View style={styles.titleRow}>
          <View style={[styles.accentBar, { backgroundColor: colors.secondary }]} />
          <View>
            <Text style={[styles.gameTitle, { color: colors.foreground }]}>
              NEON <Text style={{ color: colors.primary }}>ROULETTE</Text>
            </Text>
            <Text style={[styles.odds, { color: colors.mutedForeground }]}>
              CHAMBER ODDS:{" "}
              <Text style={{ color: colors.secondary, fontWeight: "800" }}>16.6%</Text>
              {"  "}WIN MULTIPLIER:{" "}
              <Text style={{ color: colors.tertiary, fontWeight: "800" }}>×{multiplier}</Text>
            </Text>
          </View>
        </View>

        {/* Cylinder Stage */}
        <View
          style={[
            styles.cylinderStage,
            { backgroundColor: "rgba(30,21,46,0.7)", borderColor: colors.border },
          ]}
        >
          <View style={[styles.bgGlow, { backgroundColor: `${colors.primary}14` }]} />

          <Animated.View
            style={[
              styles.cylinderContainer,
              {
                width: CYLINDER_SIZE,
                height: CYLINDER_SIZE,
                transform: [{ rotate: rotateDeg }],
              },
            ]}
          >
            {/* Outer dashed ring */}
            <View
              style={[
                styles.outerRing,
                { width: CYLINDER_SIZE, height: CYLINDER_SIZE, borderRadius: CYLINDER_SIZE / 2, borderColor: `${colors.primary}25` },
              ]}
            />
            {/* Inner disc */}
            <View
              style={[
                styles.innerCircle,
                {
                  width: CYLINDER_SIZE - 28,
                  height: CYLINDER_SIZE - 28,
                  borderRadius: (CYLINDER_SIZE - 28) / 2,
                  backgroundColor: colors.accent,
                  borderColor: colors.border,
                },
              ]}
            >
              {CHAMBER_POSITIONS.map((pos, i) => {
                const chamberNum = i + 1;
                const rad = (pos.angle * Math.PI) / 180;
                const r = CHAMBER_RADIUS;
                const cx = (CYLINDER_SIZE - 28) / 2 + r * Math.cos(rad) - 22;
                const cy = (CYLINDER_SIZE - 28) / 2 + r * Math.sin(rad) - 22;
                const isSelected = selectedChamber === chamberNum;
                const isBullet = lastResult?.chamber === chamberNum;

                return (
                  <TouchableOpacity
                    key={chamberNum}
                    style={[
                      styles.chamber,
                      {
                        position: "absolute",
                        left: cx,
                        top: cy,
                        backgroundColor: isSelected
                          ? `${colors.primary}25`
                          : colors.surfaceContainer,
                        borderColor: isSelected
                          ? colors.primary
                          : isBullet
                          ? colors.destructive
                          : colors.outlineVariant,
                        shadowColor: isSelected ? colors.primary : "transparent",
                      },
                    ]}
                    onPress={() => !isPulling && setSelectedChamber(chamberNum)}
                  >
                    <Text
                      style={[
                        styles.chamberText,
                        {
                          color: isSelected
                            ? colors.primary
                            : isBullet
                            ? colors.destructive
                            : colors.mutedForeground,
                        },
                      ]}
                    >
                      {chamberNum}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Center hub */}
              <View style={[styles.centerHub, { backgroundColor: colors.background }]}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryDim]}
                  style={styles.centerHubGradient}
                >
                  <MaterialCommunityIcons name="lightning-bolt" size={24} color={colors.primaryForeground} />
                </LinearGradient>
              </View>
            </View>
          </Animated.View>

          {/* Status row */}
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: isPulling ? colors.tertiary : colors.secondary }]} />
            <Text style={[styles.statusText, { color: colors.foreground }]}>
              {isPulling ? "SPINNING..." : selectedChamber ? `CHAMBER ${selectedChamber} LOCKED` : "SELECT A CHAMBER"}
            </Text>
          </View>
        </View>

        {/* Result Banner */}
        {lastResult && (
          <Animated.View
            style={[
              styles.resultBanner,
              {
                backgroundColor: lastResult.win ? "rgba(0,244,254,0.08)" : "rgba(255,110,132,0.08)",
                borderColor: lastResult.win ? colors.secondary : colors.destructive,
                opacity: resultFlashAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
              },
            ]}
          >
            <MaterialCommunityIcons
              name={lastResult.win ? "shield-check" : "skull"}
              size={20}
              color={lastResult.win ? colors.secondary : colors.destructive}
            />
            <Text style={[styles.resultText, { color: lastResult.win ? colors.secondary : colors.destructive }]}>
              {lastResult.msg}
            </Text>
          </Animated.View>
        )}

        {/* Bet Row */}
        <View style={[styles.betCard, { backgroundColor: "rgba(30,21,46,0.7)", borderColor: colors.border }]}>
          <Text style={[styles.betLabel, { color: colors.mutedForeground }]}>BET AMOUNT</Text>
          <View style={[styles.betInputRow, { backgroundColor: colors.input }]}>
            <TextInput
              value={betAmount}
              onChangeText={setBetAmount}
              keyboardType="decimal-pad"
              style={[styles.betInput, { color: colors.foreground }]}
            />
            <TouchableOpacity
              style={[styles.halvBtn, { backgroundColor: colors.accent }]}
              onPress={() => setBetAmount((Math.max(10, parseFloat(betAmount) / 2)).toFixed(2))}
            >
              <Text style={[styles.halvText, { color: colors.foreground }]}>½</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.halvBtn, { backgroundColor: colors.accent }]}
              onPress={() => setBetAmount((parseFloat(betAmount) * 2).toFixed(2))}
            >
              <Text style={[styles.halvText, { color: colors.foreground }]}>2×</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pull trigger */}
        <Animated.View style={{ transform: [{ scale: spinBtnAnim }] }}>
          <TouchableOpacity onPress={pullTrigger} disabled={isPulling || !selectedChamber} activeOpacity={0.85}>
            <LinearGradient
              colors={isPulling || !selectedChamber ? [colors.surfaceBright, colors.surfaceBright] : [colors.primary, colors.primaryDim]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pullBtn}
            >
              <View style={styles.pullBtnGloss} />
              <Text style={[styles.pullBtnSub, { color: isPulling || !selectedChamber ? colors.mutedForeground : `${colors.primaryForeground}90` }]}>
                {isPulling ? "SPINNING..." : "EXECUTE SESSION"}
              </Text>
              <Text style={[styles.pullBtnText, { color: isPulling || !selectedChamber ? colors.mutedForeground : colors.primaryForeground }]}>
                {isPulling ? "FIRING..." : selectedChamber ? "PULL TRIGGER" : "SELECT CHAMBER"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Compact History */}
        <View style={[styles.historyCard, { backgroundColor: "rgba(30,21,46,0.6)", borderColor: colors.border }]}>
          <View style={styles.historyHeader}>
            <MaterialCommunityIcons name="history" size={14} color={colors.secondary} />
            <Text style={[styles.historyTitle, { color: colors.mutedForeground }]}>RECENT OUTCOMES</Text>
          </View>
          <View style={styles.historyItems}>
            {RECENT_HISTORY.slice(0, 3).map((item, i) => (
              <View key={i} style={styles.historyItem}>
                <MaterialCommunityIcons
                  name={item.win ? "check-circle" : "close-circle"}
                  size={14}
                  color={item.win ? colors.secondary : colors.destructive}
                />
                <Text style={[styles.historyChember, { color: colors.mutedForeground }]}>Ch.{item.chamber}</Text>
                <Text style={[styles.historyUser, { color: colors.foreground }]}>{item.user}</Text>
                <Text style={[styles.historyAmount, { color: item.win ? colors.secondary : colors.destructive }]}>
                  {item.amount}
                </Text>
                <Text style={[styles.historyTime, { color: colors.mutedForeground }]}>{item.time}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 8,
    gap: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  accentBar: {
    width: 4,
    height: 44,
    borderRadius: 2,
    shadowColor: "#00f4fe",
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  gameTitle: {
    fontSize: 26,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: -0.5,
  },
  odds: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  cylinderStage: {
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    overflow: "hidden",
    gap: 12,
  },
  bgGlow: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    top: -40,
    alignSelf: "center",
  },
  cylinderContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  outerRing: {
    position: "absolute",
    borderWidth: 2,
    borderStyle: "dashed",
  },
  innerCircle: {
    width: "100%",
    height: "100%",
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chamber: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  chamberText: {
    fontSize: 15,
    fontWeight: "900",
  },
  centerHub: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  centerHubGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  resultBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  resultText: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  betCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  betLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  betInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  betInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
    padding: 0,
  },
  halvBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  halvText: {
    fontSize: 12,
    fontWeight: "800",
  },
  pullBtn: {
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    gap: 2,
  },
  pullBtnGloss: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  pullBtnSub: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  pullBtnText: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
    textTransform: "uppercase",
  },
  historyCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  historyTitle: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  historyItems: {
    gap: 6,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  historyChember: {
    fontSize: 10,
    fontWeight: "700",
    width: 28,
  },
  historyUser: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
  },
  historyAmount: {
    fontSize: 11,
    fontWeight: "900",
  },
  historyTime: {
    fontSize: 9,
    width: 40,
    textAlign: "right",
  },
});
