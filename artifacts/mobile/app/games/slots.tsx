import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useGameSound } from "@/hooks/useGameSound";
import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  Animated,
  Platform,
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
import { SLOT_CONFIG } from "@/constants/gameConfig";

interface SlotSymbol {
  icon: string;
  color: string;
  name: string;
  multiplier: number;
}

const SYMBOLS: SlotSymbol[] = [
  { icon: "diamond",        color: "#00f4fe", name: "Diamond",   multiplier: SLOT_CONFIG.symbolMultipliers.Diamond   },
  { icon: "lightning-bolt", color: "#ff59e3", name: "Lightning", multiplier: SLOT_CONFIG.symbolMultipliers.Lightning },
  { icon: "star",           color: "#ede0fd", name: "Star",      multiplier: SLOT_CONFIG.symbolMultipliers.Star      },
  { icon: "rocket-launch",  color: "#c59aff", name: "Rocket",    multiplier: SLOT_CONFIG.symbolMultipliers.Rocket    },
  { icon: "clover",         color: "#00f4fe", name: "Clover",    multiplier: SLOT_CONFIG.symbolMultipliers.Clover    },
  { icon: "crown",          color: "#ffd700", name: "Crown",     multiplier: SLOT_CONFIG.symbolMultipliers.Crown     },
  { icon: "cards",          color: "#c59aff", name: "Cards",     multiplier: SLOT_CONFIG.symbolMultipliers.Cards     },
];

const WEIGHTS = SLOT_CONFIG.symbolWeights;
const WEIGHT_TOTAL = (WEIGHTS as readonly number[]).reduce((a, b) => a + b, 0);

function weightedRandom(): SlotSymbol {
  let r = Math.random() * WEIGHT_TOTAL;
  for (let i = 0; i < SYMBOLS.length; i++) {
    r -= WEIGHTS[i];
    if (r <= 0) return SYMBOLS[i];
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

const NUM_REELS = 5;
const SYMBOL_H = 64;
const VISIBLE = 3;

type ReelDisplay = [SlotSymbol, SlotSymbol, SlotSymbol];

function checkWin(reels: SlotSymbol[]): { win: boolean; multiplier: number; msg: string; winIndices: boolean[] } {
  const counts: Record<string, number[]> = {};
  reels.forEach((r, i) => {
    if (!counts[r.name]) counts[r.name] = [];
    counts[r.name].push(i);
  });

  let best = { count: 0, name: "" };
  for (const [name, idxs] of Object.entries(counts)) {
    if (idxs.length > best.count) best = { count: idxs.length, name };
  }

  if (best.count >= 3) {
    const sym = SYMBOLS.find(s => s.name === best.name)!;
    const mult = SLOT_CONFIG.matchMultipliers[best.count as 3 | 4 | 5] ?? 1;
    const finalMult = Math.floor(sym.multiplier * mult);
    const winIndices = reels.map(r => r.name === best.name);
    let msg = best.count === 5 ? `JACKPOT! ${sym.name.toUpperCase()}!` :
              best.count === 4 ? "4 OF A KIND!" : "3 OF A KIND!";
    return { win: true, multiplier: finalMult, msg, winIndices };
  }
  return { win: false, multiplier: 0, msg: "TRY AGAIN!", winIndices: Array(NUM_REELS).fill(false) };
}

const PAYTABLE = [
  { icon: "diamond",        label: "JACKPOT",    payout: "500x", color: "#00f4fe" },
  { icon: "lightning-bolt", label: "LIGHTNING",  payout: "100x", color: "#ff59e3" },
  { icon: "star",           label: "STAR RUSH",  payout: "50x",  color: "#ede0fd" },
];

export default function SlotsGameScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { balance, updateBalance, formatBalance } = useBalance();
  const { playSpin, playWin, playJackpot, playLose } = useGameSound();

  const [betAmount, setBetAmount] = useState(100);
  const [isSpinning, setIsSpinning] = useState(false);
  const [jackpot, setJackpot] = useState(2847312);
  const [lastResult, setLastResult] = useState<{ win: boolean; msg: string; payout?: string } | null>(null);
  const [winIndices, setWinIndices] = useState<boolean[]>(Array(NUM_REELS).fill(false));
  const [reelDisplays, setReelDisplays] = useState<ReelDisplay[]>(
    Array.from({ length: NUM_REELS }, () => [SYMBOLS[3], SYMBOLS[4], SYMBOLS[5]])
  );

  const spinningMask = useRef<boolean[]>(Array(NUM_REELS).fill(false));
  const spinIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bounceAnims = useRef(Array.from({ length: NUM_REELS }, () => new Animated.Value(0))).current;
  const glowAnims = useRef(Array.from({ length: NUM_REELS }, () => new Animated.Value(0))).current;
  const spinBtnAnim = useRef(new Animated.Value(1)).current;
  const jackpotAnim = useRef(new Animated.Value(1)).current;

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 16;

  // Jackpot ticker increment
  useEffect(() => {
    const t = setInterval(() => setJackpot(j => j + Math.floor(Math.random() * 7 + 1)), 800);
    return () => clearInterval(t);
  }, []);

  const stopReel = useCallback((
    idx: number,
    finalSym: SlotSymbol,
    allDone: boolean,
    finalReels: SlotSymbol[],
  ) => {
    spinningMask.current[idx] = false;
    const above = weightedRandom();
    const below = weightedRandom();
    setReelDisplays(prev => {
      const next = [...prev] as ReelDisplay[];
      next[idx] = [above, finalSym, below];
      return next;
    });
    // Bounce spring
    bounceAnims[idx].setValue(10);
    Animated.spring(bounceAnims[idx], {
      toValue: 0,
      friction: 6,
      tension: 280,
      useNativeDriver: true,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (allDone) {
      // All stopped — evaluate
      if (spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current);
        spinIntervalRef.current = null;
      }
      const result = checkWin(finalReels);
      setWinIndices(result.winIndices);
      if (result.win) {
        const payout = betAmount * result.multiplier;
        updateBalance(payout);
        setLastResult({ win: true, msg: result.msg, payout: formatBalance(payout) });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (result.multiplier >= 100) playJackpot(); else playWin();
        // Glow pulse on winning reels
        result.winIndices.forEach((isWin, i) => {
          if (!isWin) return;
          Animated.loop(
            Animated.sequence([
              Animated.timing(glowAnims[i], { toValue: 1, duration: 300, useNativeDriver: true }),
              Animated.timing(glowAnims[i], { toValue: 0.3, duration: 300, useNativeDriver: true }),
            ]),
            { iterations: 4 }
          ).start(() => glowAnims[i].setValue(0));
        });
      } else {
        setLastResult({ win: false, msg: "TRY AGAIN!" });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        playLose();
      }
      setIsSpinning(false);
      Animated.spring(spinBtnAnim, { toValue: 1, friction: 5, tension: 200, useNativeDriver: true }).start();
    }
  }, [betAmount, bounceAnims, formatBalance, glowAnims, playJackpot, playLose, playWin, spinBtnAnim, updateBalance]);

  const spin = () => {
    if (isSpinning || betAmount > balance || betAmount <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    playSpin();
    setIsSpinning(true);
    setLastResult(null);
    setWinIndices(Array(NUM_REELS).fill(false));
    updateBalance(-betAmount);

    Animated.spring(spinBtnAnim, { toValue: 0.88, friction: 5, tension: 300, useNativeDriver: true }).start();

    const finalReels = Array.from({ length: NUM_REELS }, () => weightedRandom());
    spinningMask.current = Array(NUM_REELS).fill(true);

    // Start rapid symbol cycling
    spinIntervalRef.current = setInterval(() => {
      setReelDisplays(prev =>
        prev.map((disp, i) =>
          spinningMask.current[i]
            ? [weightedRandom(), weightedRandom(), weightedRandom()] as ReelDisplay
            : disp
        )
      );
    }, 55);

    // Staggered stops
    for (let i = 0; i < NUM_REELS; i++) {
      const stopAt = SLOT_CONFIG.spinDurationBase + i * SLOT_CONFIG.reelStopInterval;
      const isLast = i === NUM_REELS - 1;
      setTimeout(() => stopReel(i, finalReels[i], isLast, finalReels), stopAt);
    }
  };

  const totalStop = SLOT_CONFIG.spinDurationBase + (NUM_REELS - 1) * SLOT_CONFIG.reelStopInterval + 200;
  void totalStop; // used in setTimeout above

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <GameHeader showBack title="Slots" />

      <View style={[styles.content, { paddingBottom: bottomPad }]}>
        {/* Jackpot Row */}
        <View style={styles.jackpotRow}>
          <View>
            <Text style={[styles.gameSubtitle, { color: colors.mutedForeground }]}>CYBER RUSH DELUXE</Text>
            <Text style={[styles.gameTitle, { color: colors.foreground }]}>
              MEGA <Text style={{ color: colors.primary }}>SPIN</Text>
            </Text>
          </View>
          <View style={[styles.jackpotBox, { backgroundColor: `${colors.tertiary}15`, borderColor: `${colors.tertiary}40` }]}>
            <Text style={[styles.jackpotLabel, { color: colors.tertiary }]}>JACKPOT</Text>
            <Animated.Text style={[styles.jackpotAmount, { color: colors.tertiary, transform: [{ scale: jackpotAnim }] }]}>
              ${jackpot.toLocaleString()}
            </Animated.Text>
          </View>
        </View>

        {/* Slot Machine */}
        <View style={[styles.machine, { backgroundColor: colors.surfaceContainerLow }]}>
          {/* Win line */}
          <View style={[styles.winLine, { backgroundColor: colors.secondary }]} />
          {/* Reels */}
          <View style={styles.reels}>
            {reelDisplays.map((disp, i) => {
              const isWin = winIndices[i];
              const glowOpacity = glowAnims[i];
              return (
                <View key={i} style={styles.reelWrapper}>
                  {/* Glow overlay */}
                  {isWin && (
                    <Animated.View
                      style={[styles.reelGlow, { borderColor: disp[1].color, opacity: glowOpacity }]}
                      pointerEvents="none"
                    />
                  )}
                  <View
                    style={[
                      styles.reel,
                      {
                        backgroundColor: isWin ? `${disp[1].color}12` : colors.surfaceContainer,
                        borderColor: isWin ? disp[1].color : colors.border,
                      },
                    ]}
                  >
                    <Animated.View
                      style={[styles.reelInner, { transform: [{ translateY: bounceAnims[i] }] }]}
                    >
                      {/* Top dim */}
                      <View style={[styles.symbolSlot, styles.symbolDim]}>
                        <MaterialCommunityIcons
                          name={disp[0].icon as any}
                          size={22}
                          color={colors.mutedForeground}
                        />
                      </View>
                      {/* Center main */}
                      <View style={[styles.symbolSlot, styles.symbolMain]}>
                        <MaterialCommunityIcons
                          name={disp[1].icon as any}
                          size={isWin ? 34 : 30}
                          color={disp[1].color}
                        />
                      </View>
                      {/* Bottom dim */}
                      <View style={[styles.symbolSlot, styles.symbolDim]}>
                        <MaterialCommunityIcons
                          name={disp[2].icon as any}
                          size={22}
                          color={colors.mutedForeground}
                        />
                      </View>
                    </Animated.View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Result Banner */}
        {lastResult ? (
          <View
            style={[
              styles.resultBanner,
              {
                backgroundColor: lastResult.win ? "rgba(0,244,254,0.08)" : "rgba(255,110,132,0.08)",
                borderColor: lastResult.win ? colors.secondary : colors.destructive,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={lastResult.win ? "trophy" : "emoticon-sad-outline"}
              size={20}
              color={lastResult.win ? colors.secondary : colors.destructive}
            />
            <Text style={[styles.resultMsg, { color: lastResult.win ? colors.secondary : colors.destructive }]}>
              {lastResult.msg}
            </Text>
            {lastResult.payout && (
              <Text style={[styles.resultPayout, { color: colors.secondary }]}>
                +{lastResult.payout}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.paytableRow}>
            {PAYTABLE.map((row, i) => (
              <View key={i} style={[styles.paytableItem, { backgroundColor: colors.surfaceContainer, borderColor: colors.border }]}>
                <MaterialCommunityIcons name={row.icon as any} size={16} color={row.color} />
                <Text style={[styles.paytableLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                <Text style={[styles.paytablePayout, { color: row.color }]}>{row.payout}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Controls */}
        <View style={[styles.controls, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.border }]}>
          <View style={styles.betRow}>
            <TouchableOpacity
              style={[styles.betBtn, { backgroundColor: colors.surfaceBright }]}
              onPress={() => setBetAmount(Math.max(10, betAmount - 10))}
            >
              <MaterialCommunityIcons name="minus" size={18} color={colors.foreground} />
            </TouchableOpacity>
            <View style={styles.betCenter}>
              <Text style={[styles.betLabel, { color: colors.mutedForeground }]}>BET AMOUNT</Text>
              <Text style={[styles.betAmount, { color: colors.secondary }]}>${betAmount.toFixed(2)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.betBtn, { backgroundColor: colors.surfaceBright }]}
              onPress={() => setBetAmount(Math.min(balance, betAmount + 10))}
            >
              <MaterialCommunityIcons name="plus" size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <View style={styles.quickRow}>
            {(["MIN", "1/2", "×2", "MAX"] as const).map((q) => (
              <TouchableOpacity
                key={q}
                style={[styles.quickChip, { backgroundColor: colors.accent, borderColor: colors.border }]}
                onPress={() => {
                  if (q === "MIN") setBetAmount(10);
                  else if (q === "1/2") setBetAmount(Math.max(10, Math.floor(betAmount / 2)));
                  else if (q === "×2") setBetAmount(Math.min(balance, betAmount * 2));
                  else setBetAmount(Math.floor(balance));
                }}
              >
                <Text style={[styles.quickChipText, { color: colors.foreground }]}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Spin Row */}
        <View style={styles.spinRow}>
          <View style={[styles.sideBtn, { borderColor: colors.border }]}>
            <MaterialCommunityIcons name="refresh" size={20} color={colors.mutedForeground} />
            <Text style={[styles.sideBtnLabel, { color: colors.mutedForeground }]}>AUTO</Text>
          </View>

          <Animated.View style={{ transform: [{ scale: spinBtnAnim }] }}>
            <TouchableOpacity onPress={spin} disabled={isSpinning} activeOpacity={0.85}>
              <LinearGradient
                colors={isSpinning ? [colors.surfaceBright, colors.surfaceBright] : ["#9547f7", "#c59aff"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.spinBtn}
              >
                <MaterialCommunityIcons
                  name={isSpinning ? "loading" : "play"}
                  size={30}
                  color={isSpinning ? colors.mutedForeground : "#fff"}
                />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <View style={[styles.sideBtn, { borderColor: colors.border }]}>
            <MaterialCommunityIcons name="lightning-bolt" size={20} color={colors.mutedForeground} />
            <Text style={[styles.sideBtnLabel, { color: colors.mutedForeground }]}>TURBO</Text>
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
    paddingTop: 10,
    gap: 10,
  },
  jackpotRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gameSubtitle: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  gameTitle: {
    fontSize: 26,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: -1,
    marginTop: 2,
  },
  jackpotBox: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  jackpotLabel: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  jackpotAmount: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  machine: {
    borderRadius: 20,
    padding: 12,
    position: "relative",
  },
  winLine: {
    position: "absolute",
    left: 12,
    right: 12,
    height: 2,
    top: "50%",
    opacity: 0.6,
    zIndex: 2,
  },
  reels: {
    flexDirection: "row",
    gap: 6,
    height: SYMBOL_H * VISIBLE,
  },
  reelWrapper: {
    flex: 1,
    position: "relative",
  },
  reelGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    borderWidth: 2,
    zIndex: 3,
  },
  reel: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  reelInner: {
    flex: 1,
  },
  symbolSlot: {
    height: SYMBOL_H,
    alignItems: "center",
    justifyContent: "center",
  },
  symbolDim: {
    opacity: 0.35,
  },
  symbolMain: {
    opacity: 1,
  },
  resultBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  resultMsg: {
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  resultPayout: {
    fontSize: 15,
    fontWeight: "900",
  },
  paytableRow: {
    flexDirection: "row",
    gap: 6,
  },
  paytableItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  paytableLabel: {
    flex: 1,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  paytablePayout: {
    fontSize: 11,
    fontWeight: "900",
  },
  controls: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  betRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  betBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  betCenter: {
    alignItems: "center",
  },
  betLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  betAmount: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  quickRow: {
    flexDirection: "row",
    gap: 6,
  },
  quickChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
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
    paddingBottom: 4,
  },
  sideBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#9547f7",
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
});
