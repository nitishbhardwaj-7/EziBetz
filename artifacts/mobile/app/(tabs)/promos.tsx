import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
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
import { useBalance } from "@/context/BalanceContext";
import { useColors } from "@/hooks/useColors";

interface Promo {
  id: number;
  title: string;
  tag: string;
  desc: string;
  icon: string;
  color: string;
  bonus: number;
  bonusLabel: string;
}

const PROMOS: Promo[] = [
  {
    id: 1,
    title: "200% WELCOME BOOST",
    tag: "NEW PLAYERS",
    desc: "Double your first deposit up to $2,000",
    icon: "gift",
    color: "#c59aff",
    bonus: 2000,
    bonusLabel: "+$2,000 BONUS",
  },
  {
    id: 2,
    title: "DAILY CASHBACK",
    tag: "EVERY DAY",
    desc: "Get 10% back on all losses, credited every 24 hours",
    icon: "cash-refund",
    color: "#00f4fe",
    bonus: 250,
    bonusLabel: "+$250 CASHBACK",
  },
  {
    id: 3,
    title: "VIP PLASMA BONUS",
    tag: "EXCLUSIVE",
    desc: "Plasma tier members get 50 free spins — $5 credit per spin",
    icon: "crown",
    color: "#ff59e3",
    bonus: 250,
    bonusLabel: "+$250 FREE SPINS",
  },
  {
    id: 4,
    title: "REFER A FRIEND",
    tag: "UNLIMITED",
    desc: "Earn $50 for every friend who deposits $100 or more",
    icon: "account-multiple-plus",
    color: "#c59aff",
    bonus: 50,
    bonusLabel: "+$50 REFERRAL",
  },
  {
    id: 5,
    title: "WEEKEND RELOAD",
    tag: "SAT & SUN",
    desc: "50% reload bonus every weekend, up to $500",
    icon: "reload",
    color: "#00f4fe",
    bonus: 500,
    bonusLabel: "+$500 RELOAD",
  },
];

export default function PromosScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { updateBalance } = useBalance();
  const [claimed, setClaimed] = useState<Set<number>>(new Set());
  const [justClaimed, setJustClaimed] = useState<number | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 80;

  const handleClaim = (promo: Promo) => {
    if (claimed.has(promo.id)) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setClaimed((prev) => new Set(prev).add(promo.id));
    updateBalance(promo.bonus);
    setJustClaimed(promo.id);
    setTimeout(() => setJustClaimed(null), 2500);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          PROMO<Text style={{ color: colors.primary }}>TIONS</Text>
        </Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          {claimed.size > 0
            ? `${claimed.size} OF ${PROMOS.length} CLAIMED`
            : "ACTIVE OFFERS"}
        </Text>
      </View>

      {/* Progress Bar */}
      {claimed.size > 0 && (
        <View style={{ paddingHorizontal: 24, marginBottom: 8 }}>
          <View style={[styles.progressBg, { backgroundColor: colors.accent }]}>
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.progressFill,
                { width: `${(claimed.size / PROMOS.length) * 100}%` },
              ]}
            />
          </View>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad }]}
      >
        {PROMOS.map((promo) => {
          const isClaimed = claimed.has(promo.id);
          const isJust = justClaimed === promo.id;

          return (
            <View
              key={promo.id}
              style={[
                styles.promoCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isClaimed ? `${colors.secondary}40` : colors.border,
                },
              ]}
            >
              {isClaimed && (
                <View
                  style={[styles.claimedBanner, { backgroundColor: `${colors.secondary}15` }]}
                >
                  <MaterialCommunityIcons name="check-circle" size={14} color={colors.secondary} />
                  <Text style={[styles.claimedBannerText, { color: colors.secondary }]}>
                    {isJust ? `CLAIMED — ${promo.bonusLabel} ADDED!` : "CLAIMED"}
                  </Text>
                </View>
              )}

              <View style={styles.promoBody}>
                <View style={[styles.promoIconWrap, { backgroundColor: `${promo.color}18` }]}>
                  <MaterialCommunityIcons name={promo.icon as any} size={28} color={promo.color} />
                </View>

                <View style={styles.promoContent}>
                  <Text style={[styles.promoTag, { color: colors.mutedForeground }]}>
                    {promo.tag}
                  </Text>
                  <Text style={[styles.promoTitle, { color: colors.foreground }]}>
                    {promo.title}
                  </Text>
                  <Text style={[styles.promoDesc, { color: colors.mutedForeground }]}>
                    {promo.desc}
                  </Text>

                  <View style={styles.promoFooter}>
                    <View
                      style={[
                        styles.bonusChip,
                        { backgroundColor: `${promo.color}18`, borderColor: `${promo.color}30` },
                      ]}
                    >
                      <Text style={[styles.bonusChipText, { color: promo.color }]}>
                        {promo.bonusLabel}
                      </Text>
                    </View>

                    {isClaimed ? (
                      <View
                        style={[
                          styles.claimedBtn,
                          { backgroundColor: `${colors.secondary}15`, borderColor: `${colors.secondary}40` },
                        ]}
                      >
                        <MaterialCommunityIcons name="check" size={14} color={colors.secondary} />
                        <Text style={[styles.claimedBtnText, { color: colors.secondary }]}>
                          CLAIMED
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleClaim(promo)}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={[colors.primary, colors.primaryDim]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.claimGradient}
                        >
                          <Text style={[styles.claimText, { color: colors.primaryForeground }]}>
                            CLAIM
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 10 },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 3,
    marginTop: 2,
    textTransform: "uppercase",
  },
  progressBg: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  list: {
    paddingHorizontal: 16,
    gap: 12,
    paddingTop: 8,
  },
  promoCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  claimedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  claimedBannerText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  promoBody: {
    flexDirection: "row",
    padding: 20,
    gap: 16,
  },
  promoIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  promoContent: { flex: 1, gap: 4 },
  promoTag: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  promoTitle: { fontSize: 15, fontWeight: "900", letterSpacing: -0.3 },
  promoDesc: { fontSize: 12, lineHeight: 18 },
  promoFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    flexWrap: "wrap",
    gap: 8,
  },
  bonusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
  },
  bonusChipText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  claimGradient: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  claimText: { fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
  claimedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
  },
  claimedBtnText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
});
