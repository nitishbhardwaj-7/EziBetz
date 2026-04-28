import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
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
import { GameHeader } from "@/components/GameHeader";
import { useBalance } from "@/context/BalanceContext";
import { useColors } from "@/hooks/useColors";

const CHAMBER_POSITIONS = [
  { angle: 90, label: "1" },
  { angle: 30, label: "2" },
  { angle: 330, label: "3" },
  { angle: 270, label: "4" },
  { angle: 210, label: "5" },
  { angle: 150, label: "6" },
];

const HISTORY = [
  { chamber: 4, win: true, user: "User_9921", amount: "+$420.00", time: "2m ago" },
  { chamber: 1, win: false, user: "BetMaster", amount: "-$100.00", time: "5m ago" },
  { chamber: 3, win: true, user: "Player_X", amount: "+$1,150.00", time: "8m ago" },
];

export default function RouletteGameScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { balance, updateBalance, formatBalance } = useBalance();

  const [betAmount, setBetAmount] = useState("100.00");
  const [selectedChamber, setSelectedChamber] = useState<number | null>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [lastResult, setLastResult] = useState<{
    win: boolean;
    chamber: number;
    msg: string;
  } | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 20;
  const parsedBet = parseFloat(betAmount) || 0;
  const multiplier = 5.84;

  const pullTrigger = () => {
    if (isPulling || selectedChamber === null || parsedBet <= 0 || parsedBet > balance) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsPulling(true);
    setLastResult(null);

    Animated.sequence([
      Animated.timing(rotateAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]).start(() => rotateAnim.setValue(0));

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
      { iterations: 3 }
    ).start();

    setTimeout(() => {
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
      } else {
        updateBalance(-parsedBet);
        setLastResult({
          win: false,
          chamber: firingChamber,
          msg: `ELIMINATED! -${formatBalance(parsedBet)}`,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      setIsPulling(false);
    }, 900);
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const CYLINDER_SIZE = 260;
  const CENTER = CYLINDER_SIZE / 2;
  const CHAMBER_RADIUS = 90;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <GameHeader showBack title="Roulette" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 20 }]}
      >
        {/* Header */}
        <View style={styles.gameHeader}>
          <View style={styles.titleRow}>
            <View style={[styles.accentBar, { backgroundColor: colors.secondary }]} />
            <Text style={[styles.gameTitle, { color: colors.foreground }]}>
              NEON <Text style={{ color: colors.primary }}>ROULETTE</Text>
            </Text>
          </View>
          <Text style={[styles.odds, { color: colors.mutedForeground }]}>
            CHAMBER ODDS:{" "}
            <Text style={{ color: colors.secondary, fontWeight: "800" }}>16.6%</Text>
          </Text>
        </View>

        {/* Cylinder Visual */}
        <View
          style={[
            styles.cylinderStage,
            { backgroundColor: "rgba(30,21,46,0.7)", borderColor: colors.border },
          ]}
        >
          <View style={[styles.bgGlow, { backgroundColor: `${colors.primary}18` }]} />
          <Animated.View
            style={[
              styles.cylinderContainer,
              { width: CYLINDER_SIZE, height: CYLINDER_SIZE, transform: [{ rotate }] },
            ]}
          >
            {/* Outer ring */}
            <View
              style={[
                styles.outerRing,
                {
                  width: CYLINDER_SIZE,
                  height: CYLINDER_SIZE,
                  borderRadius: CYLINDER_SIZE / 2,
                  borderColor: `${colors.primary}30`,
                },
              ]}
            />
            {/* Inner circle */}
            <View
              style={[
                styles.innerCircle,
                {
                  width: CYLINDER_SIZE - 32,
                  height: CYLINDER_SIZE - 32,
                  borderRadius: (CYLINDER_SIZE - 32) / 2,
                  backgroundColor: colors.accent,
                  borderColor: colors.border,
                },
              ]}
            >
              {/* Chambers positioned around circle */}
              {CHAMBER_POSITIONS.map((pos, i) => {
                const chamberNum = i + 1;
                const rad = (pos.angle * Math.PI) / 180;
                const x = CENTER + CHAMBER_RADIUS * Math.cos(rad) - 24;
                const y = CENTER + CHAMBER_RADIUS * Math.sin(rad) - 24;
                const isSelected = selectedChamber === chamberNum;
                const isBullet =
                  lastResult && lastResult.chamber === chamberNum;

                return (
                  <TouchableOpacity
                    key={chamberNum}
                    style={[
                      styles.chamber,
                      {
                        position: "absolute",
                        left: x - (CYLINDER_SIZE - 32) / 2 + (CYLINDER_SIZE - 32) / 2,
                        top: y - (CYLINDER_SIZE - 32) / 2 + (CYLINDER_SIZE - 32) / 2,
                        backgroundColor: isSelected
                          ? `${colors.primary}20`
                          : `${colors.surfaceContainer}`,
                        borderColor: isSelected
                          ? colors.primary
                          : isBullet
                          ? colors.destructive
                          : colors.outlineVariant,
                        shadowColor: isSelected ? colors.primary : "transparent",
                      },
                    ]}
                    onPress={() => setSelectedChamber(chamberNum)}
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
                  <MaterialCommunityIcons
                    name="lightning-bolt"
                    size={28}
                    color={colors.primaryForeground}
                  />
                </LinearGradient>
              </View>
            </View>
          </Animated.View>

          {/* Stats Overlay */}
          <View style={styles.statsOverlay}>
            <View style={[styles.statPill, { backgroundColor: "rgba(30,21,46,0.9)", borderColor: colors.border }]}>
              <Text style={[styles.statPillLabel, { color: colors.mutedForeground }]}>POT MULTIPLIER</Text>
              <Text style={[styles.statPillValue, { color: colors.secondary }]}>x{multiplier}</Text>
            </View>
            <View>
              <Text style={[styles.statusLabel, { color: colors.mutedForeground }]}>ROUND STATUS</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: colors.secondary }]} />
                <Text style={[styles.statusText, { color: colors.foreground }]}>
                  {isPulling ? "FIRING..." : selectedChamber ? "READY" : "WAITING FOR ACTION"}
                </Text>
              </View>
            </View>
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
              name={lastResult.win ? "shield-check" : "skull"}
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

        {/* Bet Controls */}
        <View
          style={[
            styles.betCard,
            { backgroundColor: "rgba(30,21,46,0.7)", borderColor: colors.border },
          ]}
        >
          <View style={styles.betHeader}>
            <Text style={[styles.betLabel2, { color: colors.mutedForeground }]}>BET AMOUNT</Text>
            <Text style={[styles.minText, { color: colors.primary }]}>Min: $10</Text>
          </View>
          <View style={[styles.betInputRow, { backgroundColor: colors.input }]}>
            <TextInput
              value={betAmount}
              onChangeText={setBetAmount}
              keyboardType="decimal-pad"
              style={[styles.betInput, { color: colors.foreground }]}
            />
            <TouchableOpacity
              style={[styles.halvBtn, { backgroundColor: colors.accent }]}
              onPress={() => setBetAmount((parseFloat(betAmount) / 2).toFixed(2))}
            >
              <Text style={[styles.halvText, { color: colors.foreground }]}>1/2</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.halvBtn, { backgroundColor: colors.accent }]}
              onPress={() => setBetAmount((parseFloat(betAmount) * 2).toFixed(2))}
            >
              <Text style={[styles.halvText, { color: colors.foreground }]}>2X</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity onPress={pullTrigger} disabled={isPulling || !selectedChamber} activeOpacity={0.85}>
          <LinearGradient
            colors={isPulling || !selectedChamber ? [colors.surfaceBright, colors.surfaceBright] : [colors.primary, colors.primaryDim]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pullBtn}
          >
            <View style={styles.pullBtnGloss} />
            <Text style={[styles.pullBtnSub, { color: isPulling || !selectedChamber ? colors.mutedForeground : `${colors.primaryForeground}90` }]}>
              EXECUTE SESSION
            </Text>
            <Text style={[styles.pullBtnText, { color: isPulling || !selectedChamber ? colors.mutedForeground : colors.primaryForeground }]}>
              {isPulling ? "FIRING..." : selectedChamber ? `PULL TRIGGER` : "SELECT CHAMBER"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* History */}
        <View style={[styles.historyCard, { backgroundColor: "rgba(30,21,46,0.7)", borderColor: colors.border }]}>
          <View style={styles.historyHeader}>
            <MaterialCommunityIcons name="history" size={16} color={colors.secondary} />
            <Text style={[styles.historyTitle, { color: colors.mutedForeground }]}>
              RECENT OUTCOMES
            </Text>
          </View>
          {HISTORY.map((item, i) => (
            <View
              key={i}
              style={[
                styles.historyItem,
                i < HISTORY.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.historyIconWrap,
                  {
                    backgroundColor: item.win ? "rgba(0,244,254,0.1)" : "rgba(255,110,132,0.1)",
                    borderColor: item.win ? colors.secondary : colors.destructive,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={item.win ? "check-circle" : "close-circle"}
                  size={16}
                  color={item.win ? colors.secondary : colors.destructive}
                />
              </View>
              <View style={styles.historyMid}>
                <Text style={[styles.historyUser, { color: colors.foreground }]}>
                  Chamber {item.chamber}
                </Text>
                <Text style={[styles.historySubUser, { color: colors.mutedForeground }]}>
                  {item.user}
                </Text>
              </View>
              <View style={styles.historyRight}>
                <Text style={[styles.historyAmount, { color: item.win ? colors.secondary : colors.destructive }]}>
                  {item.amount}
                </Text>
                <Text style={[styles.historyTime, { color: colors.mutedForeground }]}>
                  {item.time}
                </Text>
              </View>
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
    gap: 6,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  accentBar: {
    width: 4,
    height: 40,
    borderRadius: 2,
    shadowColor: "#00f4fe",
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  gameTitle: {
    fontSize: 30,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: -0.5,
  },
  odds: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 16,
  },
  cylinderStage: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    overflow: "hidden",
    minHeight: 320,
    justifyContent: "center",
    gap: 20,
  },
  bgGlow: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -50,
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
    shadowColor: "#c59aff",
    shadowOpacity: 0.15,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  chamber: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  chamberText: {
    fontSize: 16,
    fontWeight: "900",
  },
  centerHub: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 36,
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
  statsOverlay: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    width: "100%",
  },
  statPill: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
  statPillLabel: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  statPillValue: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  statusLabel: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
    textAlign: "right",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800",
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
  betCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  betHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  betLabel2: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  minText: {
    fontSize: 11,
    fontWeight: "700",
  },
  betInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  betInput: {
    flex: 1,
    fontSize: 26,
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
    fontSize: 10,
    fontWeight: "800",
  },
  pullBtn: {
    paddingVertical: 20,
    borderRadius: 24,
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
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  pullBtnSub: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  pullBtnText: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
    textTransform: "uppercase",
  },
  historyCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  historyTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  historyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  historyMid: { flex: 1 },
  historyUser: {
    fontSize: 13,
    fontWeight: "700",
  },
  historySubUser: {
    fontSize: 10,
    marginTop: 2,
  },
  historyRight: {
    alignItems: "flex-end",
  },
  historyAmount: {
    fontSize: 13,
    fontWeight: "900",
  },
  historyTime: {
    fontSize: 10,
    marginTop: 2,
  },
});
