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
import { GameHeader } from "@/components/GameHeader";
import { useBalance } from "@/context/BalanceContext";
import { useColors } from "@/hooks/useColors";

// ─── Matka Logic ────────────────────────────────────────────────────────────

type BetType = "single" | "jodi" | "patti";
type BetSide = "open" | "close";

interface MatkaResult {
  openDigits: number[];
  openAnk: number;
  openPatti: string;
  closeDigits: number[];
  closeAnk: number;
  closePatti: string;
  jodi: string;
}

interface HistoryEntry {
  betType: BetType;
  betSide?: BetSide;
  pick: string;
  amount: number;
  won: boolean;
  payout: number;
  result: MatkaResult;
}

function drawSet(): { digits: number[]; ank: number; patti: string } {
  const d = [
    Math.floor(Math.random() * 10),
    Math.floor(Math.random() * 10),
    Math.floor(Math.random() * 10),
  ];
  const sum = d[0] + d[1] + d[2];
  const ank = sum % 10;
  const patti = [...d].sort((a, b) => a - b).join("");
  return { digits: d, ank, patti };
}

function drawMatka(): MatkaResult {
  const open = drawSet();
  const close = drawSet();
  return {
    openDigits: open.digits,
    openAnk: open.ank,
    openPatti: open.patti,
    closeDigits: close.digits,
    closeAnk: close.ank,
    closePatti: close.patti,
    jodi: `${open.ank}${close.ank}`,
  };
}

/** All valid sorted 3-digit pattis for a given ank (sum % 10 === ank) */
function getPattisByAnk(ank: number): string[] {
  const result: string[] = [];
  for (let i = 0; i <= 9; i++) {
    for (let j = i; j <= 9; j++) {
      for (let k = j; k <= 9; k++) {
        if ((i + j + k) % 10 === ank) {
          result.push(`${i}${j}${k}`);
        }
      }
    }
  }
  return result;
}

function checkWin(
  r: MatkaResult,
  betType: BetType,
  betSide: BetSide,
  pick: string
): { won: boolean; multiplier: number } {
  if (betType === "single") {
    const digit = parseInt(pick);
    const won = betSide === "open" ? r.openAnk === digit : r.closeAnk === digit;
    return { won, multiplier: 9 };
  }
  if (betType === "jodi") {
    return { won: r.jodi === pick.padStart(2, "0"), multiplier: 90 };
  }
  if (betType === "patti") {
    const won =
      betSide === "open" ? r.openPatti === pick : r.closePatti === pick;
    return { won, multiplier: 150 };
  }
  return { won: false, multiplier: 0 };
}

// ─── Component ───────────────────────────────────────────────────────────────

const BET_AMOUNTS = [50, 100, 250, 500];
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function MatkaScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { balance, updateBalance, formatBalance } = useBalance();

  const { playDrum, playReveal, playWin, playLose, playJackpot } = useGameSound();
  const [betType, setBetType] = useState<BetType>("single");
  const [betSide, setBetSide] = useState<BetSide>("open");
  const [selectedDigit, setSelectedDigit] = useState<number | null>(null);
  const [jodiOpen, setJodiOpen] = useState<number | null>(null);
  const [jodiClose, setJodiClose] = useState<number | null>(null);
  const [pattiAnk, setPattiAnk] = useState<number | null>(null);
  const [selectedPatti, setSelectedPatti] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState("100");
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState<"idle" | "open" | "close" | "done">("idle");
  const [result, setResult] = useState<MatkaResult | null>(null);
  const [lastWon, setLastWon] = useState<boolean | null>(null);
  const [lastPayout, setLastPayout] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Animated values for each revealed digit
  const openFade = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  const closeFade = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  const ankFadeOpen = useRef(new Animated.Value(0)).current;
  const ankFadeClose = useRef(new Animated.Value(0)).current;
  const resultFade = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 16;

  const resetFades = () => {
    [...openFade, ...closeFade, ankFadeOpen, ankFadeClose, resultFade].forEach(
      (a) => a.setValue(0)
    );
  };

  const getPickString = (): string | null => {
    if (betType === "single") {
      return selectedDigit !== null ? String(selectedDigit) : null;
    }
    if (betType === "jodi") {
      return jodiOpen !== null && jodiClose !== null
        ? `${jodiOpen}${jodiClose}`
        : null;
    }
    if (betType === "patti") {
      return selectedPatti;
    }
    return null;
  };

  const canBet = () => {
    const amount = parseFloat(betAmount) || 0;
    if (amount <= 0 || amount > balance) return false;
    return getPickString() !== null;
  };

  const placeBet = async () => {
    const amount = parseFloat(betAmount) || 0;
    const pick = getPickString();
    if (!canBet() || !pick || isPlaying) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    playDrum();
    setIsPlaying(true);
    setResult(null);
    setLastWon(null);
    resetFades();

    updateBalance(-amount);

    const drawn = drawMatka();

    // Phase 1: reveal open digits one by one
    setPhase("open");
    await delay(400);
    for (let i = 0; i < 3; i++) {
      await delay(450);
      Animated.spring(openFade[i], { toValue: 1, useNativeDriver: true, tension: 120, friction: 7 }).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      playReveal();
    }
    await delay(350);
    Animated.spring(ankFadeOpen, { toValue: 1, useNativeDriver: true, tension: 120, friction: 7 }).start();

    // Phase 2: reveal close digits
    await delay(600);
    setPhase("close");
    for (let i = 0; i < 3; i++) {
      await delay(450);
      Animated.spring(closeFade[i], { toValue: 1, useNativeDriver: true, tension: 120, friction: 7 }).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      playReveal();
    }
    await delay(350);
    Animated.spring(ankFadeClose, { toValue: 1, useNativeDriver: true, tension: 120, friction: 7 }).start();

    // Phase 3: evaluate and show result
    await delay(500);
    setResult(drawn);
    const { won, multiplier } = checkWin(drawn, betType, betSide, pick);
    const payout = won ? amount * multiplier : 0;

    setLastWon(won);
    setLastPayout(payout);
    if (won) {
      updateBalance(payout);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (multiplier >= 90) playJackpot(); else playWin();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      playLose();
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    }

    Animated.spring(resultFade, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }).start();
    setPhase("done");

    setHistory((prev) => [
      { betType, betSide, pick, amount, won, payout, result: drawn },
      ...prev.slice(0, 9),
    ]);
    setIsPlaying(false);
  };

  const resetSelection = () => {
    setSelectedDigit(null);
    setJodiOpen(null);
    setJodiClose(null);
    setPattiAnk(null);
    setSelectedPatti(null);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <GameHeader title="SATTA MATKA" showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad, paddingHorizontal: 16, gap: 16 }}
      >
        {/* Current Result Board */}
        {(phase !== "idle" || result) && (
          <Animated.View
            style={[
              styles.boardCard,
              { backgroundColor: colors.card, borderColor: colors.border },
              { transform: [{ translateX: shakeAnim }] },
            ]}
          >
            <Text style={[styles.boardTitle, { color: colors.mutedForeground }]}>
              LIVE DRAW
            </Text>
            <View style={styles.boardRow}>
              {/* Open Side */}
              <View style={styles.boardSide}>
                <Text style={[styles.boardSideLabel, { color: "#ff59e3" }]}>OPEN</Text>
                <View style={styles.boardDigitsRow}>
                  {[0, 1, 2].map((i) => (
                    <Animated.View
                      key={i}
                      style={[
                        styles.boardDigitBox,
                        {
                          backgroundColor: `${colors.primary}18`,
                          borderColor: colors.primary,
                          opacity: openFade[i],
                          transform: [{ scale: openFade[i].interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
                        },
                      ]}
                    >
                      <Text style={[styles.boardDigitText, { color: colors.primary }]}>
                        {result ? result.openDigits[i] : phase === "open" ? "?" : "–"}
                      </Text>
                    </Animated.View>
                  ))}
                </View>
                <Animated.View style={[styles.ankBox, { backgroundColor: `${colors.primary}22`, borderColor: colors.primary, opacity: ankFadeOpen }]}>
                  <Text style={[styles.ankLabel, { color: colors.mutedForeground }]}>ANK</Text>
                  <Text style={[styles.ankValue, { color: colors.primary }]}>
                    {result ? result.openAnk : "?"}
                  </Text>
                  {result && (
                    <Text style={[styles.pattiLabel, { color: colors.mutedForeground }]}>
                      {result.openPatti}
                    </Text>
                  )}
                </Animated.View>
              </View>

              {/* Jodi Center */}
              <View style={styles.jodiCenter}>
                <Text style={[styles.jodiSep, { color: colors.mutedForeground }]}>×</Text>
                {result && (
                  <Animated.View style={{ opacity: resultFade, alignItems: "center" }}>
                    <Text style={[styles.jodiLabel, { color: colors.mutedForeground }]}>JODI</Text>
                    <Text style={[styles.jodiValue, { color: colors.secondary }]}>
                      {result.jodi}
                    </Text>
                  </Animated.View>
                )}
              </View>

              {/* Close Side */}
              <View style={styles.boardSide}>
                <Text style={[styles.boardSideLabel, { color: "#00f4fe" }]}>CLOSE</Text>
                <View style={styles.boardDigitsRow}>
                  {[0, 1, 2].map((i) => (
                    <Animated.View
                      key={i}
                      style={[
                        styles.boardDigitBox,
                        {
                          backgroundColor: `${colors.secondary}18`,
                          borderColor: colors.secondary,
                          opacity: closeFade[i],
                          transform: [{ scale: closeFade[i].interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
                        },
                      ]}
                    >
                      <Text style={[styles.boardDigitText, { color: colors.secondary }]}>
                        {result ? result.closeDigits[i] : phase === "close" ? "?" : "–"}
                      </Text>
                    </Animated.View>
                  ))}
                </View>
                <Animated.View style={[styles.ankBox, { backgroundColor: `${colors.secondary}18`, borderColor: colors.secondary, opacity: ankFadeClose }]}>
                  <Text style={[styles.ankLabel, { color: colors.mutedForeground }]}>ANK</Text>
                  <Text style={[styles.ankValue, { color: colors.secondary }]}>
                    {result ? result.closeAnk : "?"}
                  </Text>
                  {result && (
                    <Text style={[styles.pattiLabel, { color: colors.mutedForeground }]}>
                      {result.closePatti}
                    </Text>
                  )}
                </Animated.View>
              </View>
            </View>

            {/* Win/Lose banner */}
            {lastWon !== null && (
              <Animated.View
                style={[
                  styles.resultBanner,
                  {
                    backgroundColor: lastWon ? `${colors.secondary}18` : `${colors.destructive}18`,
                    borderColor: lastWon ? colors.secondary : colors.destructive,
                    opacity: resultFade,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={lastWon ? "trophy" : "close-circle"}
                  size={22}
                  color={lastWon ? colors.secondary : colors.destructive}
                />
                <View>
                  <Text style={[styles.resultBannerTitle, { color: lastWon ? colors.secondary : colors.destructive }]}>
                    {lastWon ? "YOU WON!" : "NO LUCK"}
                  </Text>
                  <Text style={[styles.resultBannerSub, { color: colors.mutedForeground }]}>
                    {lastWon ? `+${formatBalance(lastPayout)}` : "Better luck next draw"}
                  </Text>
                </View>
              </Animated.View>
            )}
          </Animated.View>
        )}

        {/* Bet Type Selector */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>BET TYPE</Text>
          <View style={styles.betTypeRow}>
            {(
              [
                { key: "single", label: "SINGLE", sub: "9×", icon: "numeric" },
                { key: "jodi", label: "JODI", sub: "90×", icon: "numeric-2-box-multiple" },
                { key: "patti", label: "PATTI", sub: "150×", icon: "cards-variant" },
              ] as const
            ).map((bt) => (
              <TouchableOpacity
                key={bt.key}
                onPress={() => { setBetType(bt.key); resetSelection(); }}
                style={[
                  styles.betTypeBtn,
                  {
                    backgroundColor:
                      betType === bt.key ? `${colors.primary}20` : colors.accent,
                    borderColor:
                      betType === bt.key ? colors.primary : colors.border,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={bt.icon}
                  size={20}
                  color={betType === bt.key ? colors.primary : colors.mutedForeground}
                />
                <Text style={[styles.betTypeLabel, { color: betType === bt.key ? colors.primary : colors.foreground }]}>
                  {bt.label}
                </Text>
                <Text style={[styles.betTypeMulti, { color: betType === bt.key ? colors.primary : colors.mutedForeground }]}>
                  {bt.sub}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Open/Close Side Selector (for single & patti) */}
        {(betType === "single" || betType === "patti") && (
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SELECT SIDE</Text>
            <View style={styles.sideRow}>
              {(["open", "close"] as BetSide[]).map((side) => (
                <TouchableOpacity
                  key={side}
                  onPress={() => setBetSide(side)}
                  style={[
                    styles.sideBtn,
                    {
                      backgroundColor:
                        betSide === side
                          ? side === "open"
                            ? `rgba(255,89,227,0.18)`
                            : `rgba(0,244,254,0.15)`
                          : colors.accent,
                      borderColor:
                        betSide === side
                          ? side === "open" ? "#ff59e3" : colors.secondary
                          : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.sideBtnText,
                      {
                        color:
                          betSide === side
                            ? side === "open" ? "#ff59e3" : colors.secondary
                            : colors.mutedForeground,
                      },
                    ]}
                  >
                    {side.toUpperCase()}
                  </Text>
                  <Text style={[styles.sideBtnSub, { color: colors.mutedForeground }]}>
                    {side === "open" ? "1st Draw" : "2nd Draw"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Single: digit picker */}
        {betType === "single" && (
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PICK ANK (0–9)</Text>
            <View style={styles.digitGrid}>
              {DIGITS.map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setSelectedDigit(d)}
                  style={[
                    styles.digitBtn,
                    {
                      backgroundColor:
                        selectedDigit === d ? colors.primary : colors.accent,
                      borderColor:
                        selectedDigit === d ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.digitBtnText,
                      { color: selectedDigit === d ? colors.primaryForeground : colors.foreground },
                    ]}
                  >
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Jodi: pick open digit + close digit */}
        {betType === "jodi" && (
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              PICK JODI (00–99)
            </Text>
            <View style={styles.jodiPickerRow}>
              {/* Open digit */}
              <View style={styles.jodiPickerHalf}>
                <Text style={[styles.jodiPickerSideLabel, { color: "#ff59e3" }]}>OPEN ANK</Text>
                <View style={styles.jodiDigitGrid}>
                  {DIGITS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      onPress={() => setJodiOpen(d)}
                      style={[
                        styles.jodiDigitBtn,
                        {
                          backgroundColor: jodiOpen === d ? "#ff59e3" : colors.accent,
                          borderColor: jodiOpen === d ? "#ff59e3" : colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.jodiDigitText, { color: jodiOpen === d ? "#fff" : colors.foreground }]}>
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Divider */}
              <View style={styles.jodiDivider}>
                {jodiOpen !== null && jodiClose !== null ? (
                  <LinearGradient
                    colors={["#ff59e3", colors.secondary]}
                    style={styles.jodiPreviewBadge}
                  >
                    <Text style={styles.jodiPreviewText}>
                      {jodiOpen}{jodiClose}
                    </Text>
                  </LinearGradient>
                ) : (
                  <Text style={[styles.jodiSepText, { color: colors.mutedForeground }]}>–</Text>
                )}
              </View>

              {/* Close digit */}
              <View style={styles.jodiPickerHalf}>
                <Text style={[styles.jodiPickerSideLabel, { color: colors.secondary }]}>CLOSE ANK</Text>
                <View style={styles.jodiDigitGrid}>
                  {DIGITS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      onPress={() => setJodiClose(d)}
                      style={[
                        styles.jodiDigitBtn,
                        {
                          backgroundColor: jodiClose === d ? colors.secondary : colors.accent,
                          borderColor: jodiClose === d ? colors.secondary : colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.jodiDigitText, { color: jodiClose === d ? "#000" : colors.foreground }]}>
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Patti: pick ank → shows valid pattis */}
        {betType === "patti" && (
          <>
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                SELECT TARGET ANK
              </Text>
              <View style={styles.digitGrid}>
                {DIGITS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => { setPattiAnk(d); setSelectedPatti(null); }}
                    style={[
                      styles.digitBtn,
                      {
                        backgroundColor: pattiAnk === d ? colors.primary : colors.accent,
                        borderColor: pattiAnk === d ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.digitBtnText, { color: pattiAnk === d ? colors.primaryForeground : colors.foreground }]}>
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {pattiAnk !== null && (
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                  SELECT PATTI (ANK {pattiAnk})
                </Text>
                <View style={styles.pattiGrid}>
                  {getPattisByAnk(pattiAnk).map((p) => (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setSelectedPatti(p)}
                      style={[
                        styles.pattiBtn,
                        {
                          backgroundColor: selectedPatti === p ? `${colors.primary}25` : colors.accent,
                          borderColor: selectedPatti === p ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.pattiBtnText, { color: selectedPatti === p ? colors.primary : colors.foreground }]}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {/* Summary chip */}
        {getPickString() !== null && (
          <View style={[styles.summaryChip, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}40` }]}>
            <MaterialCommunityIcons name="check-circle-outline" size={16} color={colors.primary} />
            <Text style={[styles.summaryText, { color: colors.primary }]}>
              {betType === "single" && `Single ${betSide.toUpperCase()} → Ank ${selectedDigit}  ·  9× payout`}
              {betType === "jodi" && `Jodi → ${jodiOpen}${jodiClose}  ·  90× payout`}
              {betType === "patti" && `${betSide.toUpperCase()} Patti → ${selectedPatti}  ·  150× payout`}
            </Text>
          </View>
        )}

        {/* Bet Amount */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>BET AMOUNT</Text>
          <View style={styles.quickAmounts}>
            {BET_AMOUNTS.map((a) => (
              <TouchableOpacity
                key={a}
                onPress={() => setBetAmount(String(a))}
                style={[
                  styles.quickAmtBtn,
                  {
                    backgroundColor:
                      betAmount === String(a) ? `${colors.primary}22` : colors.accent,
                    borderColor:
                      betAmount === String(a) ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.quickAmtText, { color: betAmount === String(a) ? colors.primary : colors.foreground }]}>
                  ${a}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={[styles.amountInput, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <Text style={[styles.dollarSign, { color: colors.primary }]}>$</Text>
            <TextInput
              value={betAmount}
              onChangeText={setBetAmount}
              keyboardType="decimal-pad"
              style={[styles.amountText, { color: colors.foreground }]}
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
          <Text style={[styles.balanceNote, { color: colors.mutedForeground }]}>
            Balance: {formatBalance(balance)}
          </Text>
        </View>

        {/* Place Bet */}
        <TouchableOpacity onPress={placeBet} disabled={!canBet() || isPlaying} activeOpacity={0.85}>
          <LinearGradient
            colors={
              canBet() && !isPlaying
                ? [colors.primary, colors.primaryDim]
                : ["#3d2e52", "#2a1f3c"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.betBtn}
          >
            {isPlaying ? (
              <>
                <MaterialCommunityIcons name="loading" size={22} color="#fff" />
                <Text style={styles.betBtnText}>
                  {phase === "open" ? "DRAWING OPEN..." : phase === "close" ? "DRAWING CLOSE..." : "CALCULATING..."}
                </Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons name="cards" size={22} color="#fff" />
                <Text style={styles.betBtnText}>PLACE BET</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Payout Table */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PAYOUT TABLE</Text>
          {[
            { type: "Single (Ank)", odds: "1 in 10", payout: "9×", color: colors.primary },
            { type: "Jodi", odds: "1 in 100", payout: "90×", color: "#ff59e3" },
            { type: "Patti", odds: "1 in 120", payout: "150×", color: colors.secondary },
          ].map((row, i) => (
            <View
              key={i}
              style={[
                styles.payoutRow,
                i < 2 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <View style={[styles.payoutDot, { backgroundColor: row.color }]} />
              <Text style={[styles.payoutType, { color: colors.foreground }]}>{row.type}</Text>
              <Text style={[styles.payoutOdds, { color: colors.mutedForeground }]}>{row.odds}</Text>
              <Text style={[styles.payoutMulti, { color: row.color }]}>{row.payout}</Text>
            </View>
          ))}
        </View>

        {/* History */}
        {history.length > 0 && (
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>DRAW HISTORY</Text>
            {history.map((h, i) => (
              <View
                key={i}
                style={[
                  styles.historyRow,
                  i < history.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                <View
                  style={[
                    styles.historyDot,
                    { backgroundColor: h.won ? colors.secondary : colors.destructive },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.historyPick, { color: colors.foreground }]}>
                    {h.betType.toUpperCase()}{h.betSide ? ` ${h.betSide.toUpperCase()}` : ""} → {h.pick}
                  </Text>
                  <Text style={[styles.historyResult, { color: colors.mutedForeground }]}>
                    {h.result.openPatti}-{h.result.openAnk} × {h.result.closeAnk}-{h.result.closePatti} | Jodi: {h.result.jodi}
                  </Text>
                </View>
                <Text style={[styles.historyAmount, { color: h.won ? colors.secondary : colors.destructive }]}>
                  {h.won ? `+${formatBalance(h.payout)}` : `-${formatBalance(h.amount)}`}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Board
  boardCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginTop: 8,
  },
  boardTitle: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 3,
    textTransform: "uppercase",
    textAlign: "center",
  },
  boardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  boardSide: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  boardSideLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
  },
  boardDigitsRow: {
    flexDirection: "row",
    gap: 6,
  },
  boardDigitBox: {
    width: 36,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  boardDigitText: {
    fontSize: 20,
    fontWeight: "900",
  },
  ankBox: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 80,
  },
  ankLabel: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  ankValue: {
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 38,
  },
  pattiLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  jodiCenter: {
    alignItems: "center",
    justifyContent: "center",
    width: 60,
    gap: 6,
  },
  jodiSep: {
    fontSize: 24,
    fontWeight: "300",
  },
  jodiLabel: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  jodiValue: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -1,
  },
  resultBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  resultBannerTitle: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  resultBannerSub: {
    fontSize: 12,
    marginTop: 1,
  },

  // Section cards
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2.5,
    textTransform: "uppercase",
  },

  // Bet type
  betTypeRow: {
    flexDirection: "row",
    gap: 8,
  },
  betTypeBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  betTypeLabel: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  betTypeMulti: {
    fontSize: 13,
    fontWeight: "900",
  },

  // Side
  sideRow: {
    flexDirection: "row",
    gap: 10,
  },
  sideBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  sideBtnText: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1,
  },
  sideBtnSub: {
    fontSize: 10,
    fontWeight: "600",
  },

  // Digit grid
  digitGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  digitBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  digitBtnText: {
    fontSize: 20,
    fontWeight: "900",
  },

  // Jodi picker
  jodiPickerRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  jodiPickerHalf: {
    flex: 1,
    gap: 8,
    alignItems: "center",
  },
  jodiPickerSideLabel: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  jodiDigitGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    justifyContent: "center",
  },
  jodiDigitBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  jodiDigitText: {
    fontSize: 15,
    fontWeight: "800",
  },
  jodiDivider: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  jodiPreviewBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  jodiPreviewText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#fff",
  },
  jodiSepText: {
    fontSize: 22,
    fontWeight: "300",
  },

  // Patti
  pattiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  pattiBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 44,
    alignItems: "center",
  },
  pattiBtnText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
    fontVariant: ["tabular-nums"],
  },

  // Summary
  summaryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },

  // Amount
  quickAmounts: {
    flexDirection: "row",
    gap: 8,
  },
  quickAmtBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  quickAmtText: {
    fontSize: 13,
    fontWeight: "800",
  },
  amountInput: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  dollarSign: {
    fontSize: 20,
    fontWeight: "900",
  },
  amountText: {
    flex: 1,
    fontSize: 22,
    fontWeight: "900",
    padding: 0,
  },
  balanceNote: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "right",
  },

  // Bet button
  betBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 18,
  },
  betBtnText: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1.5,
    color: "#fff",
  },

  // Payout table
  payoutRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 10,
  },
  payoutDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  payoutType: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  payoutOdds: {
    fontSize: 11,
    fontWeight: "600",
    marginRight: 8,
  },
  payoutMulti: {
    fontSize: 15,
    fontWeight: "900",
    minWidth: 40,
    textAlign: "right",
  },

  // History
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 10,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  historyPick: {
    fontSize: 12,
    fontWeight: "700",
  },
  historyResult: {
    fontSize: 10,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  historyAmount: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
});
