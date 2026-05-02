import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useGameSound } from "@/hooks/useGameSound";
import React, { useState } from "react";
import {
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
import {
  Card,
  PlayingCard,
  createDeck,
  handValue,
  shuffleDeck,
} from "@/components/PlayingCard";
import { useBalance } from "@/context/BalanceContext";
import { useColors } from "@/hooks/useColors";

type GameState = "betting" | "playing" | "dealer" | "result";

function dealCard(deck: Card[]): [Card, Card[]] {
  const [top, ...rest] = deck;
  return [top, rest];
}

export default function BlackjackGameScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { balance, updateBalance, formatBalance } = useBalance();

  const { playDeal, playClick, playWin, playLose, playJackpot } = useGameSound();
  const [bet, setBet] = useState(100);
  const [gameState, setGameState] = useState<GameState>("betting");
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [winAmount, setWinAmount] = useState<number | null>(null);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 20;

  const startGame = () => {
    if (bet > balance || bet <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    playDeal();

    let newDeck = shuffleDeck(createDeck());
    let [c1, d1] = dealCard(newDeck); newDeck = d1;
    let [c2, d2] = dealCard(newDeck); newDeck = d2;
    let [c3, d3] = dealCard(newDeck); newDeck = d3;
    let [c4, d4] = dealCard(newDeck); newDeck = d4;

    const dealer = [c2, { ...c4, hidden: true }];
    const player = [c1, c3];

    setDeck(newDeck);
    setPlayerHand(player);
    setDealerHand(dealer);
    setResultMsg(null);
    setWinAmount(null);
    updateBalance(-bet);
    setGameState("playing");

    // Check for blackjack
    if (handValue(player) === 21) {
      endGame([c2, c4], player, newDeck, "blackjack");
    }
  };

  const hit = () => {
    if (gameState !== "playing") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playClick();
    let newDeck = [...deck];
    let [card, rest] = dealCard(newDeck);
    newDeck = rest;
    const newHand = [...playerHand, card];
    setDeck(newDeck);
    setPlayerHand(newHand);

    if (handValue(newHand) > 21) {
      const revealedDealer = dealerHand.map((c) => ({ ...c, hidden: false }));
      setDealerHand(revealedDealer);
      setGameState("result");
      setResultMsg("BUST! YOU LOSE!");
      setWinAmount(-bet);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const stand = () => {
    if (gameState !== "playing") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let revealedDealer = dealerHand.map((c) => ({ ...c, hidden: false }));
    let newDeck = [...deck];

    // Dealer draws until 17
    while (handValue(revealedDealer) < 17) {
      let [card, rest] = dealCard(newDeck);
      newDeck = rest;
      revealedDealer = [...revealedDealer, card];
    }

    setDeck(newDeck);
    setDealerHand(revealedDealer);
    endGame(revealedDealer, playerHand, newDeck, "stand");
  };

  const doubleDown = () => {
    if (gameState !== "playing" || bet > balance) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    let newDeck = [...deck];
    let [card, rest] = dealCard(newDeck);
    newDeck = rest;
    const newHand = [...playerHand, card];
    const doubleBet = bet;
    updateBalance(-doubleBet);
    setBet(bet * 2);
    setDeck(newDeck);
    setPlayerHand(newHand);

    if (handValue(newHand) > 21) {
      const revealedDealer = dealerHand.map((c) => ({ ...c, hidden: false }));
      setDealerHand(revealedDealer);
      setGameState("result");
      setResultMsg("BUST! YOU LOSE!");
      setWinAmount(-bet * 2);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      // Stand automatically after double
      let revDealer = dealerHand.map((c) => ({ ...c, hidden: false }));
      let dk = newDeck;
      while (handValue(revDealer) < 17) {
        let [c, rest] = dealCard(dk);
        dk = rest;
        revDealer = [...revDealer, c];
      }
      setDeck(dk);
      setDealerHand(revDealer);
      endGame(revDealer, newHand, dk, "double");
    }
  };

  const endGame = (
    dealer: Card[],
    player: Card[],
    _dk: Card[],
    reason: string
  ) => {
    const pv = handValue(player);
    const dv = handValue(dealer);
    const isBlackjack = reason === "blackjack";

    let msg = "";
    let payout = 0;

    if (pv > 21) {
      msg = "BUST! YOU LOSE!";
      payout = -bet;
    } else if (dv > 21) {
      msg = "DEALER BUSTS! YOU WIN!";
      payout = bet;
      updateBalance(bet * 2);
    } else if (isBlackjack && pv === 21) {
      msg = "BLACKJACK! 3:2!";
      payout = Math.floor(bet * 1.5);
      updateBalance(bet + payout);
    } else if (pv > dv) {
      msg = "YOU WIN!";
      payout = bet;
      updateBalance(bet * 2);
    } else if (pv === dv) {
      msg = "PUSH — BET RETURNED";
      payout = 0;
      updateBalance(bet);
    } else {
      msg = "DEALER WINS!";
      payout = -bet;
    }

    setResultMsg(msg);
    setWinAmount(payout);
    setGameState("result");
    if (payout > bet) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playJackpot();
    } else if (payout >= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playWin();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      playLose();
    }
  };

  const resetGame = () => {
    setGameState("betting");
    setPlayerHand([]);
    setDealerHand([]);
    setResultMsg(null);
    setWinAmount(null);
    if (bet > balance) setBet(Math.floor(balance / 10) * 10 || 10);
  };

  const playerVal = handValue(playerHand);
  const dealerVal = handValue(
    dealerHand.map((c) => ({ ...c, hidden: false }))
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <GameHeader showBack title="Blackjack" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 20 }]}
      >
        {/* Ambient */}
        <View style={styles.ambientLeft} pointerEvents="none" />
        <View style={styles.ambientRight} pointerEvents="none" />

        {/* Dealer Section */}
        <View style={styles.dealerSection}>
          <View style={[styles.totalPill, { backgroundColor: "rgba(30,21,46,0.8)", borderColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>
              DEALER TOTAL
            </Text>
            <Text style={[styles.totalValue, { color: colors.secondary }]}>
              {gameState === "betting"
                ? "--"
                : gameState === "playing"
                ? dealerHand.find((c) => !c.hidden) ? handValue(dealerHand.filter((c) => !c.hidden)).toString() : "--"
                : dealerVal.toString()}
            </Text>
          </View>
          <View style={styles.handRow}>
            {gameState === "betting" ? (
              <View style={[styles.emptyHand, { borderColor: colors.border, backgroundColor: colors.accent }]}>
                <Text style={[styles.emptyHandText, { color: colors.mutedForeground }]}>Dealer</Text>
              </View>
            ) : (
              dealerHand.map((card, i) => (
                <PlayingCard key={i} card={card} width={68} height={102} />
              ))
            )}
          </View>
        </View>

        {/* Table Circle */}
        <View style={styles.tableSection}>
          <View
            style={[
              styles.tableCircle,
              { borderColor: `${colors.primary}30` },
            ]}
          >
            <View style={[styles.tableCircleInner, { borderColor: `${colors.secondary}15` }]} />
            <View
              style={[
                styles.betCircle,
                { borderColor: `${colors.primary}50` },
              ]}
            >
              {gameState === "betting" ? (
                <Text style={[styles.betCircleText, { color: colors.mutedForeground }]}>
                  BET HERE
                </Text>
              ) : (
                <View style={styles.chipsStack}>
                  <View style={[styles.chip, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.chipText, { color: colors.primaryForeground }]}>
                      ${Math.min(bet, 100)}
                    </Text>
                  </View>
                  {bet > 100 && (
                    <View style={[styles.chip, { backgroundColor: colors.secondary, marginLeft: -12 }]}>
                      <Text style={[styles.chipText, { color: colors.secondaryForeground }]}>
                        ${bet - 100}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
            <Text style={[styles.betLabel, { color: colors.mutedForeground }]}>
              Your Bet:{" "}
              <Text style={{ color: colors.primary, fontWeight: "800" }}>
                {formatBalance(bet)}
              </Text>
            </Text>
          </View>
        </View>

        {/* Player Section */}
        <View style={[styles.playerSection, { backgroundColor: "rgba(30,21,46,0.7)", borderColor: colors.border }]}>
          <View style={styles.playerHeader}>
            <Text style={[styles.youLabel, { color: colors.foreground }]}>YOU</Text>
            <View style={[styles.playerTotal, { backgroundColor: `${colors.primary}20`, borderColor: colors.primary }]}>
              <Text style={[styles.playerTotalText, { color: colors.primary }]}>
                {gameState === "betting" ? "--" : playerVal}
              </Text>
            </View>
          </View>
          <View style={styles.handRow}>
            {gameState === "betting" ? (
              <View style={[styles.emptyHand, { borderColor: colors.border, backgroundColor: colors.accent }]}>
                <Text style={[styles.emptyHandText, { color: colors.mutedForeground }]}>Your hand</Text>
              </View>
            ) : (
              playerHand.map((card, i) => (
                <PlayingCard key={i} card={card} width={68} height={102} />
              ))
            )}
          </View>

          {/* Payout / Result */}
          {gameState !== "betting" && resultMsg === null && (
            <View style={styles.potentialRow}>
              <MaterialCommunityIcons name="star-four-points" size={16} color={colors.secondary} />
              <Text style={[styles.potentialText, { color: colors.secondary }]}>
                Potential Payout: {formatBalance(bet * 2)}
              </Text>
            </View>
          )}
        </View>

        {/* Result Banner */}
        {resultMsg && (
          <View
            style={[
              styles.resultBanner,
              {
                backgroundColor:
                  (winAmount ?? 0) >= 0
                    ? "rgba(0,244,254,0.1)"
                    : "rgba(255,110,132,0.1)",
                borderColor:
                  (winAmount ?? 0) >= 0 ? colors.secondary : colors.destructive,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={(winAmount ?? 0) >= 0 ? "trophy" : "close-circle"}
              size={22}
              color={(winAmount ?? 0) >= 0 ? colors.secondary : colors.destructive}
            />
            <Text
              style={[
                styles.resultMsg,
                {
                  color:
                    (winAmount ?? 0) >= 0 ? colors.secondary : colors.destructive,
                },
              ]}
            >
              {resultMsg}
            </Text>
          </View>
        )}

        {/* Controls */}
        {gameState === "betting" && (
          <View style={styles.bettingControls}>
            {/* Bet chips */}
            <View style={styles.chipRow}>
              {[10, 25, 50, 100, 250, 500].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[
                    styles.betChip,
                    {
                      backgroundColor: bet === amt ? `${colors.primary}30` : colors.accent,
                      borderColor: bet === amt ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setBet(amt)}
                >
                  <Text style={[styles.betChipText, { color: bet === amt ? colors.primary : colors.foreground }]}>
                    ${amt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={startGame} disabled={bet > balance} activeOpacity={0.85}>
              <LinearGradient
                colors={bet > balance ? [colors.surfaceBright, colors.surfaceBright] : [colors.primary, colors.primaryDim]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.dealBtn}
              >
                <View style={styles.dealBtnGloss} />
                <MaterialCommunityIcons name="cards" size={22} color={bet > balance ? colors.mutedForeground : colors.primaryForeground} />
                <Text style={[styles.dealBtnText, { color: bet > balance ? colors.mutedForeground : colors.primaryForeground }]}>
                  DEAL CARDS
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {gameState === "playing" && (
          <View style={[styles.actionBar, { backgroundColor: "rgba(30,21,46,0.8)", borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.actionBtnOutline, { borderColor: `${colors.primary}50`, flex: 1 }]}
              onPress={doubleDown}
            >
              <Text style={[styles.actionBtnSubLabel, { color: colors.mutedForeground }]}>Double</Text>
              <Text style={[styles.actionBtnLabel, { color: colors.foreground }]}>x2</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtnOutline,
                { borderColor: `${colors.primaryDim}60`, borderWidth: 2, flex: 1.3 },
              ]}
              onPress={stand}
            >
              <Text style={[styles.actionBtnLabel, { color: colors.foreground, fontSize: 16 }]}>
                STAND
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={hit} style={{ flex: 2 }}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDim]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.actionBtnGradient, { flex: undefined }]}
              >
                <Text style={[styles.actionBtnLabelBold, { color: colors.primaryForeground }]}>
                  HIT
                </Text>
                <MaterialCommunityIcons
                  name="lightning-bolt"
                  size={18}
                  color={colors.primaryForeground}
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {gameState === "result" && (
          <TouchableOpacity onPress={resetGame}>
            <LinearGradient
              colors={[colors.primary, colors.primaryDim]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.dealBtn}
            >
              <MaterialCommunityIcons name="refresh" size={22} color={colors.primaryForeground} />
              <Text style={[styles.dealBtnText, { color: colors.primaryForeground }]}>
                PLAY AGAIN
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    gap: 16,
    paddingTop: 8,
  },
  ambientLeft: {
    position: "absolute",
    left: -100,
    top: 50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(197,154,255,0.06)",
  },
  ambientRight: {
    position: "absolute",
    right: -100,
    bottom: 100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(0,244,254,0.05)",
  },
  dealerSection: {
    alignItems: "center",
    gap: 12,
  },
  totalPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  handRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    flexWrap: "wrap",
    minHeight: 110,
    alignItems: "center",
  },
  emptyHand: {
    width: 90,
    height: 110,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyHandText: {
    fontSize: 11,
    fontWeight: "600",
  },
  tableSection: {
    alignItems: "center",
  },
  tableCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 12,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  tableCircleInner: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 1,
  },
  betCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  chipsStack: {
    flexDirection: "row",
    alignItems: "center",
  },
  chip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  chipText: {
    fontSize: 9,
    fontWeight: "900",
  },
  betCircleText: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  betLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  playerSection: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  playerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  youLabel: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  playerTotal: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
  },
  playerTotalText: {
    fontSize: 18,
    fontWeight: "900",
  },
  potentialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  potentialText: {
    fontSize: 14,
    fontWeight: "800",
  },
  resultBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  resultMsg: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  bettingControls: {
    gap: 16,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  betChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  betChipText: {
    fontSize: 13,
    fontWeight: "800",
  },
  dealBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  dealBtnGloss: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  dealBtnText: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  actionBar: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 9999,
    borderWidth: 1,
  },
  actionBtnOutline: {
    paddingVertical: 14,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnSubLabel: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  actionBtnLabel: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  actionBtnLabelBold: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  actionBtnGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 9999,
    shadowColor: "#9547f7",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
