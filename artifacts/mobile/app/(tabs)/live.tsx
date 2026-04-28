import React, { useEffect, useState } from "react";
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
import { useColors } from "@/hooks/useColors";

interface WinEvent {
  id: string;
  user: string;
  game: string;
  amount: string;
  multiplier: string;
  time: string;
  initials: string;
}

const BASE_EVENTS: WinEvent[] = [
  { id: "1", user: "Player_921", game: "Slots", amount: "$2,450.00", multiplier: "24.5x", time: "just now", initials: "P9" },
  { id: "2", user: "CryptoKing", game: "Dice", amount: "$890.12", multiplier: "8.9x", time: "30s ago", initials: "CK" },
  { id: "3", user: "Ezibetz_User", game: "Blackjack", amount: "$12,000.00", multiplier: "2.0x", time: "1m ago", initials: "EU" },
  { id: "4", user: "LuckyAce_88", game: "Roulette", amount: "$3,200.00", multiplier: "5.8x", time: "2m ago", initials: "LA" },
  { id: "5", user: "NeonPunk", game: "Slots", amount: "$580.00", multiplier: "5.8x", time: "3m ago", initials: "NP" },
  { id: "6", user: "HighRoller", game: "Blackjack", amount: "$5,000.00", multiplier: "2.0x", time: "4m ago", initials: "HR" },
  { id: "7", user: "Player_X", game: "Dice", amount: "$230.00", multiplier: "2.3x", time: "5m ago", initials: "PX" },
  { id: "8", user: "StarBet", game: "Roulette", amount: "$7,800.00", multiplier: "5.8x", time: "6m ago", initials: "SB" },
];

const GAME_COLORS: Record<string, string> = {
  Slots: "#c59aff",
  Dice: "#ff59e3",
  Blackjack: "#00f4fe",
  Roulette: "#c59aff",
};

export default function LiveScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [events, setEvents] = useState<WinEvent[]>(BASE_EVENTS);
  const [count, setCount] = useState(4218);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 80;

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => prev + Math.floor(Math.random() * 3));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            LI<Text style={{ color: colors.primary }}>VE</Text>
          </Text>
          <View style={styles.liveIndicator}>
            <View style={[styles.liveDot, { backgroundColor: colors.secondary }]} />
            <Text style={[styles.liveCount, { color: colors.secondary }]}>
              {count.toLocaleString()} online
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad, paddingHorizontal: 16, gap: 10 }}
      >
        {/* Live Stats */}
        <View style={styles.statsRow}>
          {[
            { label: "ACTIVE GAMES", value: "1,847", icon: "gamepad-variant" as const, color: colors.primary },
            { label: "TOTAL WAGERED", value: "$2.4M", icon: "cash" as const, color: colors.secondary },
            { label: "BIGGEST WIN", value: "$48,200", icon: "trophy" as const, color: colors.tertiary },
          ].map((stat, i) => (
            <View
              key={i}
              style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <MaterialCommunityIcons name={stat.icon} size={20} color={stat.color} />
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                {stat.label}
              </Text>
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          RECENT <Text style={{ color: colors.primary }}>WINS</Text>
        </Text>

        {events.map((event) => (
          <View
            key={event.id}
            style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View
              style={[
                styles.eventAvatar,
                { backgroundColor: `${GAME_COLORS[event.game]}18` },
              ]}
            >
              <Text style={[styles.eventInitials, { color: GAME_COLORS[event.game] }]}>
                {event.initials}
              </Text>
            </View>
            <View style={styles.eventMid}>
              <Text style={[styles.eventUser, { color: colors.foreground }]}>
                {event.user}
              </Text>
              <View style={styles.eventGameRow}>
                <View
                  style={[
                    styles.eventGameBadge,
                    { backgroundColor: `${GAME_COLORS[event.game]}20` },
                  ]}
                >
                  <Text
                    style={[styles.eventGameText, { color: GAME_COLORS[event.game] }]}
                  >
                    {event.game}
                  </Text>
                </View>
                <Text style={[styles.eventTime, { color: colors.mutedForeground }]}>
                  {event.time}
                </Text>
              </View>
            </View>
            <View style={styles.eventRight}>
              <Text style={[styles.eventAmount, { color: colors.secondary }]}>
                {event.amount}
              </Text>
              <Text style={[styles.eventMultiplier, { color: colors.primary }]}>
                {event.multiplier}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: -0.5,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveCount: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  eventCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  eventAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  eventInitials: {
    fontSize: 14,
    fontWeight: "900",
  },
  eventMid: { flex: 1 },
  eventUser: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  eventGameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  eventGameBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  eventGameText: {
    fontSize: 10,
    fontWeight: "800",
  },
  eventTime: {
    fontSize: 10,
  },
  eventRight: {
    alignItems: "flex-end",
  },
  eventAmount: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  eventMultiplier: {
    fontSize: 11,
    fontWeight: "700",
  },
});
