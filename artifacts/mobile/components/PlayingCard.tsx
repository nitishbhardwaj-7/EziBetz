import React from "react";
import { View, Text, StyleSheet } from "react-native";

export interface Card {
  suit: "♠" | "♥" | "♦" | "♣";
  value: string;
  numericValue: number;
  hidden?: boolean;
}

interface PlayingCardProps {
  card: Card;
  width?: number;
  height?: number;
}

const isRed = (suit: string) => suit === "♥" || suit === "♦";

export function PlayingCard({ card, width = 72, height = 108 }: PlayingCardProps) {
  if (card.hidden) {
    return (
      <View style={[styles.card, styles.cardBack, { width, height, borderRadius: width * 0.12 }]}>
        <View style={styles.cardBackPattern}>
          <Text style={styles.cardBackE}>E</Text>
        </View>
      </View>
    );
  }

  const color = isRed(card.suit) ? "#ff4444" : "#1a1a2e";

  return (
    <View style={[styles.card, { width, height, borderRadius: width * 0.12 }]}>
      <View style={styles.cardCorner}>
        <Text style={[styles.cardValue, { color }]}>{card.value}</Text>
        <Text style={[styles.cardSuit, { color }]}>{card.suit}</Text>
      </View>
      <Text style={[styles.centerSuit, { color }]}>{card.suit}</Text>
      <View style={[styles.cardCorner, styles.bottomCorner]}>
        <Text style={[styles.cardValue, { color }]}>{card.value}</Text>
        <Text style={[styles.cardSuit, { color }]}>{card.suit}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#f5f0ff",
    padding: 8,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  cardBack: {
    backgroundColor: "#2b203e",
    borderWidth: 2,
    borderColor: "rgba(197, 154, 255, 0.4)",
  },
  cardBackPattern: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(197, 154, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    margin: 4,
  },
  cardBackE: {
    color: "rgba(197, 154, 255, 0.4)",
    fontSize: 28,
    fontWeight: "900",
    fontStyle: "italic",
  },
  cardCorner: {
    alignItems: "flex-start",
  },
  bottomCorner: {
    alignItems: "flex-end",
    transform: [{ rotate: "180deg" }],
  },
  cardValue: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 18,
  },
  cardSuit: {
    fontSize: 14,
    lineHeight: 16,
  },
  centerSuit: {
    fontSize: 28,
    textAlign: "center",
  },
});

export function createDeck(): Card[] {
  const suits: Card["suit"][] = ["♠", "♥", "♦", "♣"];
  const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const value of values) {
      let numericValue = parseInt(value);
      if (isNaN(numericValue)) {
        numericValue = value === "A" ? 11 : 10;
      }
      deck.push({ suit, value, numericValue });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function handValue(hand: Card[]): number {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    if (card.hidden) continue;
    if (card.value === "A") {
      aces++;
      total += 11;
    } else {
      total += card.numericValue;
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}
