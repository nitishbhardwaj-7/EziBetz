import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useGameSound } from "@/hooks/useGameSound";
import React, { useCallback, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GameHeader } from "@/components/GameHeader";
import { PressableScale } from "@/components/PressableScale";
import {
  Card,
  PlayingCard,
  createDeck,
  handValue,
  shuffleDeck,
} from "@/components/PlayingCard";
import { useBalance } from "@/context/BalanceContext";
import { useColors } from "@/hooks/useColors";
import { BLACKJACK_CONFIG } from "@/constants/gameConfig";

type GameState = "betting" | "playing" | "result";

function dealCard(deck: Card[]): [Card, Card[]] {
  const [top, ...rest] = deck;
  return [top, rest];
}

const BET_CHIPS = [10, 25, 50, 100, 250, 500];

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

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 16;

  const endGame = useCallback(
    (dealer: Card[], player: Card[], reason: string) => {
      const pv = handValue(player);
      const dv = handValue(dealer);
      const isBlackjack = reason === "blackjack";
      let msg = "";
      let payout = 0;

      if (pv > 21) {
        msg = "BUST! YOU LOSE!"; payout = -bet;
      } else if (dv > 21) {
        msg = "DEALER BUSTS! YOU WIN!"; payout = bet; updateBalance(bet * 2);
      } else if (isBlackjack && pv === 21) {
        msg = "BLACKJACK! 3:2!"; payout = Math.floor(bet * BLACKJACK_CONFIG.blackjackPayout);
        updateBalance(bet + payout);
      } else if (pv > dv) {
        msg = "YOU WIN!"; payout = bet; updateBalance(bet * 2);
      } else if (pv === dv) {
        msg = "PUSH — BET RETURNED"; payout = 0; updateBalance(bet);
      } else {
        msg = "DEALER WINS!"; payout = -bet;
      }

      setResultMsg(msg);
      setWinAmount(payout);
      setGameState("result");

      if (payout > bet) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); playJackpot(); }
      else if (payout >= 0) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); playWin(); }
      else { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); playLose(); }
    },
    [bet, updateBalance, playJackpot, playWin, playLose]
  );

  const startGame = useCallback(() => {
    if (bet > balance || bet <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    playDeal();

    let d = shuffleDeck(createDeck());
    let c1: Card, c2: Card, c3: Card, c4: Card;
    [c1, d] = dealCard(d); [c2, d] = dealCard(d);
    [c3, d] = dealCard(d); [c4, d] = dealCard(d);

    const dealer: Card[] = [c2, { ...c4, hidden: true }];
    const player: Card[] = [c1, c3];

    setDeck(d); setPlayerHand(player); setDealerHand(dealer);
    setResultMsg(null); setWinAmount(null);
    updateBalance(-bet);
    setGameState("playing");

    if (handValue(player) === 21) endGame([c2, c4], player, "blackjack");
  }, [bet, balance, updateBalance, playDeal, endGame]);

  const hit = useCallback(() => {
    if (gameState !== "playing") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playClick();
    let d = [...deck];
    let card: Card;
    [card, d] = dealCard(d);
    const newHand = [...playerHand, card];
    setDeck(d); setPlayerHand(newHand);
    if (handValue(newHand) > 21) {
      const rev = dealerHand.map(c => ({ ...c, hidden: false }));
      setDealerHand(rev); setGameState("result");
      setResultMsg("BUST! YOU LOSE!"); setWinAmount(-bet);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); playLose();
    }
  }, [gameState, deck, playerHand, dealerHand, bet, playClick, playLose]);

  const stand = useCallback(() => {
    if (gameState !== "playing") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let rev = dealerHand.map(c => ({ ...c, hidden: false }));
    let d = [...deck];
    while (handValue(rev) < BLACKJACK_CONFIG.dealerStandsOn) {
      let card: Card; [card, d] = dealCard(d); rev = [...rev, card];
    }
    setDeck(d); setDealerHand(rev);
    endGame(rev, playerHand, "stand");
  }, [gameState, deck, dealerHand, playerHand, endGame]);

  const doubleDown = useCallback(() => {
    if (gameState !== "playing" || bet > balance) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    let d = [...deck]; let card: Card;
    [card, d] = dealCard(d);
    const newHand = [...playerHand, card];
    updateBalance(-bet); setBet(b => b * 2);
    setDeck(d); setPlayerHand(newHand);

    if (handValue(newHand) > 21) {
      const rev = dealerHand.map(c => ({ ...c, hidden: false }));
      setDealerHand(rev); setGameState("result");
      setResultMsg("BUST! YOU LOSE!"); setWinAmount(-bet * 2);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); playLose();
    } else {
      let rev = dealerHand.map(c => ({ ...c, hidden: false }));
      while (handValue(rev) < BLACKJACK_CONFIG.dealerStandsOn) {
        let c: Card; [c, d] = dealCard(d); rev = [...rev, c];
      }
      setDeck(d); setDealerHand(rev);
      endGame(rev, newHand, "double");
    }
  }, [gameState, deck, playerHand, dealerHand, bet, balance, updateBalance, endGame, playLose]);

  const resetGame = useCallback(() => {
    setGameState("betting"); setPlayerHand([]); setDealerHand([]);
    setResultMsg(null); setWinAmount(null);
    if (bet > balance) setBet(Math.floor(balance / 10) * 10 || 10);
  }, [bet, balance]);

  const playerVal = handValue(playerHand);
  const dealerVisible = handValue(dealerHand.filter(c => !c.hidden));
  const isWin = (winAmount ?? 0) >= 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <GameHeader showBack title="Blackjack" />

      <View style={[styles.content, { paddingBottom: bottomPad }]}>
        {/* Ambient glows */}
        <View style={[styles.ambientL, { backgroundColor: `${colors.primary}08` }]} pointerEvents="none" />
        <View style={[styles.ambientR, { backgroundColor: `${colors.secondary}06` }]} pointerEvents="none" />

        {/* Dealer */}
        <View style={[styles.handSection, { backgroundColor: "rgba(30,21,46,0.6)", borderColor: colors.border }]}>
          <View style={styles.handHeader}>
            <Text style={[styles.handLabel, { color: colors.mutedForeground }]}>DEALER</Text>
            <View style={[styles.scorePill, { backgroundColor: `${colors.secondary}18`, borderColor: `${colors.secondary}40` }]}>
              <Text style={[styles.scoreText, { color: colors.secondary }]}>
                {gameState === "betting" ? "--" : dealerVisible}
              </Text>
            </View>
          </View>
          <View style={styles.cardRow}>
            {gameState === "betting" ? (
              <View style={[styles.emptySlot, { borderColor: colors.border }]}>
                <MaterialCommunityIcons name="cards" size={22} color={colors.mutedForeground} style={{ opacity: 0.4 }} />
              </View>
            ) : dealerHand.map((card, i) => (
              <PlayingCard key={i} card={card} width={58} height={88} />
            ))}
          </View>
        </View>

        {/* Bet Strip */}
        <View style={[styles.betStrip, { backgroundColor: "rgba(17,10,30,0.8)", borderColor: `${colors.primary}30` }]}>
          <LinearGradient
            colors={[`${colors.primary}12`, "transparent"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <MaterialCommunityIcons name="poker-chip" size={18} color={colors.primary} />
          <Text style={[styles.betStripLabel, { color: colors.mutedForeground }]}>CURRENT BET</Text>
          <Text style={[styles.betStripAmount, { color: colors.primary }]}>{formatBalance(bet)}</Text>
          {gameState !== "betting" && resultMsg === null && (
            <>
              <View style={[styles.betDivider, { backgroundColor: colors.border }]} />
              <MaterialCommunityIcons name="star-four-points" size={12} color={colors.secondary} />
              <Text style={[styles.potText, { color: colors.secondary }]}>POT {formatBalance(bet * 2)}</Text>
            </>
          )}
        </View>

        {/* Player */}
        <View style={[styles.handSection, { backgroundColor: "rgba(30,21,46,0.6)", borderColor: colors.border }]}>
          <View style={styles.handHeader}>
            <Text style={[styles.handLabel, { color: colors.foreground }]}>YOU</Text>
            <View style={[styles.scorePill, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}40` }]}>
              <Text style={[styles.scoreText, { color: colors.primary }]}>
                {gameState === "betting" ? "--" : playerVal}
              </Text>
            </View>
          </View>
          <View style={styles.cardRow}>
            {gameState === "betting" ? (
              <View style={[styles.emptySlot, { borderColor: colors.border }]}>
                <MaterialCommunityIcons name="cards" size={22} color={colors.mutedForeground} style={{ opacity: 0.4 }} />
              </View>
            ) : playerHand.map((card, i) => (
              <PlayingCard key={i} card={card} width={58} height={88} />
            ))}
          </View>
        </View>

        {/* Result */}
        {resultMsg && (
          <View style={[styles.resultBanner, {
            backgroundColor: isWin ? "rgba(0,244,254,0.08)" : "rgba(255,110,132,0.08)",
            borderColor: isWin ? colors.secondary : colors.destructive,
          }]}>
            <MaterialCommunityIcons
              name={isWin ? "trophy" : "close-circle"}
              size={20}
              color={isWin ? colors.secondary : colors.destructive}
            />
            <Text style={[styles.resultText, { color: isWin ? colors.secondary : colors.destructive }]}>
              {resultMsg}
            </Text>
            {(winAmount ?? 0) > 0 && (
              <Text style={[styles.resultPayout, { color: colors.secondary }]}>
                +{formatBalance(winAmount!)}
              </Text>
            )}
          </View>
        )}

        {/* Controls */}
        {gameState === "betting" && (
          <View style={styles.bettingControls}>
            <View style={styles.chipGrid}>
              {BET_CHIPS.map((amt) => {
                const active = bet === amt;
                return (
                  <PressableScale
                    key={amt}
                    onPress={() => setBet(amt)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? `${colors.primary}25` : colors.accent,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: active ? colors.primary : colors.foreground }]}>
                      ${amt}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
            <PressableScale onPress={startGame} disabled={bet > balance} scale={0.96}>
              <LinearGradient
                colors={bet > balance ? [colors.surfaceBright, colors.surfaceBright] : ["#9547f7", "#c59aff"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.mainBtn}
              >
                <View style={styles.btnGloss} />
                <MaterialCommunityIcons name="cards" size={20} color={bet > balance ? colors.mutedForeground : "#fff"} />
                <Text style={[styles.mainBtnText, { color: bet > balance ? colors.mutedForeground : "#fff" }]}>
                  DEAL CARDS
                </Text>
              </LinearGradient>
            </PressableScale>
          </View>
        )}

        {gameState === "playing" && (
          <View style={[styles.actionBar, { backgroundColor: "rgba(30,21,46,0.9)", borderColor: colors.border }]}>
            <PressableScale
              onPress={doubleDown}
              disabled={bet > balance}
              style={[styles.actionOutline, { borderColor: `${colors.primary}40`, flex: 1 }]}
            >
              <Text style={[styles.actionSub, { color: colors.mutedForeground }]}>Double</Text>
              <Text style={[styles.actionMain, { color: colors.foreground }]}>×2</Text>
            </PressableScale>

            <PressableScale
              onPress={stand}
              style={[styles.actionOutline, { borderColor: `${colors.primaryDim}50`, borderWidth: 2, flex: 1.2 }]}
            >
              <Text style={[styles.actionMain, { color: colors.foreground, fontSize: 15 }]}>STAND</Text>
            </PressableScale>

            <PressableScale onPress={hit} scale={0.95} containerStyle={{ flex: 1.8 }}>
              <LinearGradient
                colors={["#9547f7", "#c59aff"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.hitBtn}
              >
                <Text style={[styles.actionMain, { color: "#fff", fontSize: 18 }]}>HIT</Text>
                <MaterialCommunityIcons name="lightning-bolt" size={16} color="#fff" />
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
  ambientL: {
    position: "absolute",
    left: -60,
    top: 80,
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  ambientR: {
    position: "absolute",
    right: -60,
    bottom: 120,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  handSection: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  handHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  handLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  scorePill: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  cardRow: {
    flexDirection: "row",
    gap: 8,
    minHeight: 88,
    alignItems: "center",
  },
  emptySlot: {
    width: 58,
    height: 88,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  betStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  betStripLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  betStripAmount: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  betDivider: {
    width: 1,
    height: 16,
    marginHorizontal: 4,
  },
  potText: {
    fontSize: 12,
    fontWeight: "800",
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
    flex: 1,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  resultPayout: {
    fontSize: 14,
    fontWeight: "900",
  },
  bettingControls: {
    gap: 10,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 11,
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "800",
  },
  mainBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
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
    padding: 10,
    borderRadius: 9999,
    borderWidth: 1,
  },
  actionOutline: {
    paddingVertical: 12,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionSub: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  actionMain: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  hitBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 9999,
    shadowColor: "#9547f7",
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
});
