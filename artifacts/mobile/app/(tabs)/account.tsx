import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useBalance } from "@/context/BalanceContext";
import { useColors } from "@/hooks/useColors";

type MenuKey =
  | "edit_profile"
  | "security"
  | "notifications"
  | "limits"
  | "language"
  | "help"
  | "terms"
  | null;

const MENU_ITEMS: { key: MenuKey; icon: string; label: string }[] = [
  { key: "edit_profile", icon: "account-edit", label: "Edit Profile" },
  { key: "security", icon: "shield-check", label: "Security & KYC" },
  { key: "notifications", icon: "bell-outline", label: "Notifications" },
  { key: "limits", icon: "swap-horizontal", label: "Transaction Limits" },
  { key: "language", icon: "translate", label: "Language & Region" },
  { key: "help", icon: "help-circle-outline", label: "Help & Support" },
  { key: "terms", icon: "file-document-outline", label: "Terms & Privacy" },
];

function MenuModal({
  visible,
  menuKey,
  onClose,
  colors,
  user,
  updateProfile,
}: {
  visible: boolean;
  menuKey: MenuKey;
  onClose: () => void;
  colors: ReturnType<typeof useColors>;
  user: { username: string; email: string; displayName: string } | null;
  updateProfile: (data: any) => void;
}) {
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [notifPush, setNotifPush] = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);
  const [notifPromos, setNotifPromos] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 16;

  const getTitle = () => {
    switch (menuKey) {
      case "edit_profile":
        return "Edit Profile";
      case "security":
        return "Security & KYC";
      case "notifications":
        return "Notifications";
      case "limits":
        return "Transaction Limits";
      case "language":
        return "Language & Region";
      case "help":
        return "Help & Support";
      case "terms":
        return "Terms & Privacy";
      default:
        return "";
    }
  };

  const renderContent = () => {
    switch (menuKey) {
      case "edit_profile":
        return (
          <View style={styles.modalContent}>
            <View style={styles.avatarEditRow}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDim]}
                style={styles.modalAvatar}
              >
                <Text
                  style={[
                    styles.modalAvatarText,
                    { color: colors.primaryForeground },
                  ]}
                >
                  {(displayName || "EZ")[0].toUpperCase()}
                </Text>
              </LinearGradient>
              <TouchableOpacity
                style={[styles.changePhotoBtn, { borderColor: colors.primary }]}
              >
                <Text
                  style={[styles.changePhotoText, { color: colors.primary }]}
                >
                  CHANGE AVATAR
                </Text>
              </TouchableOpacity>
            </View>
            <FieldInput
              label="DISPLAY NAME"
              value={displayName}
              onChange={setDisplayName}
              colors={colors}
            />
            <FieldInput
              label="EMAIL"
              value={email}
              onChange={setEmail}
              colors={colors}
              keyboardType="email-address"
            />
            <FieldInput
              label="USERNAME"
              value={user?.username ?? ""}
              onChange={() => {}}
              colors={colors}
              editable={false}
            />
            <TouchableOpacity
              onPress={() => {
                updateProfile({ displayName, email });
                onClose();
              }}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDim]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveBtn}
              >
                <Text
                  style={[
                    styles.saveBtnText,
                    { color: colors.primaryForeground },
                  ]}
                >
                  SAVE CHANGES
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        );

      case "security":
        return (
          <View style={styles.modalContent}>
            <View
              style={[
                styles.kycBadge,
                {
                  backgroundColor: `${colors.secondary}15`,
                  borderColor: colors.secondary,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="check-decagram"
                size={20}
                color={colors.secondary}
              />
              <View>
                <Text style={[styles.kycTitle, { color: colors.secondary }]}>
                  IDENTITY VERIFIED
                </Text>
                <Text
                  style={[styles.kycSub, { color: colors.mutedForeground }]}
                >
                  KYC Level 2 Complete
                </Text>
              </View>
            </View>
            <ToggleRow
              label="Two-Factor Authentication"
              sub="Protect your account with 2FA"
              value={twoFactor}
              onChange={setTwoFactor}
              colors={colors}
            />
            <TouchableOpacity
              style={[
                styles.securityAction,
                { borderColor: colors.border, backgroundColor: colors.accent },
              ]}
            >
              <MaterialCommunityIcons
                name="lock-reset"
                size={20}
                color={colors.primary}
              />
              <Text
                style={[
                  styles.securityActionText,
                  { color: colors.foreground },
                ]}
              >
                Change Password
              </Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={18}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.securityAction,
                { borderColor: colors.border, backgroundColor: colors.accent },
              ]}
            >
              <MaterialCommunityIcons
                name="devices"
                size={20}
                color={colors.primary}
              />
              <Text
                style={[
                  styles.securityActionText,
                  { color: colors.foreground },
                ]}
              >
                Active Sessions
              </Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={18}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
          </View>
        );

      case "notifications":
        return (
          <View style={styles.modalContent}>
            <ToggleRow
              label="Push Notifications"
              sub="Game results, promotions"
              value={notifPush}
              onChange={setNotifPush}
              colors={colors}
            />
            <ToggleRow
              label="Email Notifications"
              sub="Account updates, receipts"
              value={notifEmail}
              onChange={setNotifEmail}
              colors={colors}
            />
            <ToggleRow
              label="Promotion Alerts"
              sub="Bonuses, free spins, events"
              value={notifPromos}
              onChange={setNotifPromos}
              colors={colors}
            />
            <TouchableOpacity onPress={onClose}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDim]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveBtn}
              >
                <Text
                  style={[
                    styles.saveBtnText,
                    { color: colors.primaryForeground },
                  ]}
                >
                  SAVE PREFERENCES
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        );

      case "limits":
        return (
          <View style={styles.modalContent}>
            {[
              {
                label: "Daily Deposit Limit",
                value: "$10,000.00",
                icon: "arrow-down",
              },
              {
                label: "Daily Withdrawal Limit",
                value: "$5,000.00",
                icon: "arrow-up",
              },
              {
                label: "Daily Bet Limit",
                value: "$2,500.00",
                icon: "gamepad-variant",
              },
              {
                label: "Session Time Limit",
                value: "8 hours",
                icon: "clock-outline",
              },
            ].map((item, i) => (
              <View
                key={i}
                style={[styles.limitRow, { borderBottomColor: colors.border }]}
              >
                <View
                  style={[
                    styles.limitIcon,
                    { backgroundColor: `${colors.primary}15` },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.limitLabel,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {item.label}
                  </Text>
                  <Text
                    style={[styles.limitValue, { color: colors.foreground }]}
                  >
                    {item.value}
                  </Text>
                </View>
                <TouchableOpacity>
                  <Text style={[styles.editLink, { color: colors.primary }]}>
                    Edit
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        );

      case "language":
        return (
          <View style={styles.modalContent}>
            {["English", "Spanish", "French", "Portuguese", "German"].map(
              (lang, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.langRow,
                    {
                      borderBottomColor: colors.border,
                      backgroundColor:
                        i === 0 ? `${colors.primary}12` : "transparent",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.langText,
                      { color: i === 0 ? colors.primary : colors.foreground },
                    ]}
                  >
                    {lang}
                  </Text>
                  {i === 0 && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={20}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ),
            )}
          </View>
        );

      case "help":
        return (
          <View style={styles.modalContent}>
            {[
              {
                q: "How do I deposit funds?",
                a: "Go to the Wallet tab and tap DEPOSIT. We support credit cards, crypto, and bank transfer.",
              },
              {
                q: "How long do withdrawals take?",
                a: "Crypto withdrawals are instant. Bank transfers take 1-3 business days.",
              },
              {
                q: "Is this platform fair?",
                a: "Yes. All games use certified RNG (Random Number Generator) for provably fair results.",
              },
              {
                q: "How do I claim a bonus?",
                a: "Visit the Promotions tab and tap CLAIM on any active offer.",
              },
            ].map((item, i) => (
              <View
                key={i}
                style={[styles.faqItem, { borderBottomColor: colors.border }]}
              >
                <Text style={[styles.faqQ, { color: colors.foreground }]}>
                  {item.q}
                </Text>
                <Text style={[styles.faqA, { color: colors.mutedForeground }]}>
                  {item.a}
                </Text>
              </View>
            ))}
            <View
              style={[
                styles.supportCta,
                {
                  backgroundColor: `${colors.secondary}12`,
                  borderColor: colors.secondary,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="chat-outline"
                size={20}
                color={colors.secondary}
              />
              <Text
                style={[styles.supportCtaText, { color: colors.secondary }]}
              >
                Live Chat Support Available 24/7
              </Text>
            </View>
          </View>
        );

      case "terms":
        return (
          <View style={styles.modalContent}>
            <Text style={[styles.termsText, { color: colors.mutedForeground }]}>
              {
                "By using EZIBETZ Gaming you agree to our terms of service. You must be 18+ to play. Gambling involves risk. Please gamble responsibly.\n\n"
              }
              <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                Privacy Policy{"\n"}
              </Text>
              {
                "We collect minimal data to provide our service. We never sell your personal data to third parties. You may request data deletion at any time.\n\n"
              }
              <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                Responsible Gambling{"\n"}
              </Text>
              {
                "If you feel gambling is negatively affecting your life, please contact our support team. We offer self-exclusion tools and support resources."
              }
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} />
        <View
          style={[
            styles.modalSheet,
            {
              backgroundColor: colors.card,
              paddingBottom: bottomPad,
            },
          ]}
        >
          {/* Handle */}
          <View
            style={[
              styles.modalHandle,
              { backgroundColor: colors.outlineVariant },
            ]}
          />

          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {getTitle()}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.modalCloseBtn, { backgroundColor: colors.accent }]}
            >
              <MaterialCommunityIcons
                name="close"
                size={18}
                color={colors.foreground}
              />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {renderContent()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  colors,
  keyboardType = "default",
  editable = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  colors: ReturnType<typeof useColors>;
  keyboardType?: "default" | "email-address";
  editable?: boolean;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: editable ? colors.input : colors.accent,
            borderColor: colors.border,
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType={keyboardType}
          autoCapitalize="none"
          editable={editable}
          style={[
            styles.textInput,
            { color: editable ? colors.foreground : colors.mutedForeground },
          ]}
        />
      </View>
    </View>
  );
}

function ToggleRow({
  label,
  sub,
  value,
  onChange,
  colors,
}: {
  label: string;
  sub: string;
  value: boolean;
  onChange: (v: boolean) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.toggleLabel, { color: colors.foreground }]}>
          {label}
        </Text>
        <Text style={[styles.toggleSub, { color: colors.mutedForeground }]}>
          {sub}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.accent, true: `${colors.primary}70` }}
        thumbColor={value ? colors.primary : colors.mutedForeground}
        ios_backgroundColor={colors.accent}
      />
    </View>
  );
}

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { balance, formatBalance } = useBalance();
  const { user, logout, updateProfile } = useAuth();

  const [activeMenu, setActiveMenu] = useState<MenuKey>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 100;

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          logout();
        },
      },
    ]);
  };

  const openMenu = (key: MenuKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveMenu(key);
  };

  const displayInitials = user?.displayName?.slice(0, 2).toUpperCase() ?? "EZ";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        {/* Profile Card */}
        <LinearGradient
          colors={["rgba(43,32,62,0.95)", "rgba(17,10,30,0.95)"]}
          style={[styles.profileCard, { paddingTop: topPad + 24 }]}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDim]}
            style={styles.avatarCircle}
          >
            <Text
              style={[
                styles.avatarInitials,
                { color: colors.primaryForeground },
              ]}
            >
              {displayInitials}
            </Text>
          </LinearGradient>
          <Text style={[styles.username, { color: colors.foreground }]}>
            {user?.displayName ?? "Player"}
          </Text>
          <Text style={[styles.userHandle, { color: colors.mutedForeground }]}>
            @{user?.username ?? "ezibetz_player"}
          </Text>
          <View
            style={[
              styles.vipBadge,
              {
                backgroundColor: `${colors.primary}20`,
                borderColor: colors.primary,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="crown"
              size={14}
              color={colors.primary}
            />
            <Text style={[styles.vipBadgeText, { color: colors.primary }]}>
              PLASMA TIER
            </Text>
          </View>

          <View style={styles.xpSection}>
            <View
              style={[
                styles.xpBarBg,
                { backgroundColor: colors.surfaceContainerLow },
              ]}
            >
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.xpBarFill}
              />
            </View>
            <Text style={[styles.xpText, { color: colors.mutedForeground }]}>
              750 / 1000 XP TO NEXT LEVEL
            </Text>
          </View>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: "GAMES PLAYED", value: "1,248" },
            { label: "WIN RATE", value: "58%" },
            { label: "TOTAL WON", value: "$16.4K" },
          ].map((s, i) => (
            <View
              key={i}
              style={[
                styles.statItem,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {s.value}
              </Text>
              <Text
                style={[styles.statLabel, { color: colors.mutedForeground }]}
              >
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Balance Summary */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <View
            style={[
              styles.balanceRow,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View>
              <Text
                style={[styles.balanceLabel, { color: colors.mutedForeground }]}
              >
                Balance
              </Text>
              <Text style={[styles.balanceAmount, { color: colors.secondary }]}>
                {formatBalance(balance)}
              </Text>
            </View>
            <TouchableOpacity onPress={() => {}}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDim]}
                style={styles.depositBtn}
              >
                <Text
                  style={[
                    styles.depositBtnText,
                    { color: colors.primaryForeground },
                  ]}
                >
                  DEPOSIT
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu */}
        <View style={{ paddingHorizontal: 16 }}>
          <View
            style={[
              styles.menuCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {MENU_ITEMS.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.menuItem,
                  i < MENU_ITEMS.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => openMenu(item.key)}
              >
                <View
                  style={[
                    styles.menuIconWrap,
                    { backgroundColor: `${colors.primary}14` },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <Text style={[styles.menuLabel, { color: colors.foreground }]}>
                  {item.label}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={colors.mutedForeground}
                />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.logoutBtn,
              { borderColor: colors.destructive, marginBottom: 20 },
            ]}
            onPress={handleLogout}
          >
            <MaterialCommunityIcons
              name="logout"
              size={20}
              color={colors.destructive}
            />
            <Text style={[styles.logoutText, { color: colors.destructive }]}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {/* Menu Modal */}
      <MenuModal
        visible={activeMenu !== null}
        menuKey={activeMenu}
        onClose={() => setActiveMenu(null)}
        colors={colors}
        user={user}
        updateProfile={updateProfile}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  profileCard: {
    alignItems: "center",
    paddingBottom: 24,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarInitials: { fontSize: 28, fontWeight: "900", fontStyle: "italic" },
  username: { fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  userHandle: { fontSize: 13, marginTop: 2, marginBottom: 10 },
  vipBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    marginBottom: 16,
  },
  vipBadgeText: { fontSize: 12, fontWeight: "900", letterSpacing: 1 },
  xpSection: { width: "100%" },
  xpBarBg: { height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 6 },
  xpBarFill: { width: "75%", height: "100%", borderRadius: 3 },
  xpText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
    textAlign: "center",
    textTransform: "uppercase",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
  },
  statValue: { fontSize: 18, fontWeight: "900", letterSpacing: -0.5 },
  statLabel: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 4,
    textAlign: "center",
  },
  balanceRow: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  balanceLabel: { fontSize: 11, fontWeight: "600", marginBottom: 2 },
  balanceAmount: { fontSize: 24, fontWeight: "900", letterSpacing: -1 },
  depositBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  depositBtnText: { fontSize: 12, fontWeight: "900", letterSpacing: 1 },
  menuCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: "600" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  logoutText: { fontSize: 14, fontWeight: "800" },

  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalBackdrop: { flex: 1 },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "85%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "900", letterSpacing: -0.3 },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: { gap: 16, paddingBottom: 20 },
  avatarEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 4,
  },
  modalAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  modalAvatarText: { fontSize: 22, fontWeight: "900" },
  changePhotoBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
  },
  changePhotoText: { fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  inputRow: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textInput: { fontSize: 15, fontWeight: "500", padding: 0 },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { fontSize: 14, fontWeight: "900", letterSpacing: 1.5 },
  kycBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  kycTitle: { fontSize: 13, fontWeight: "900", letterSpacing: 0.5 },
  kycSub: { fontSize: 11, marginTop: 2 },
  securityAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  securityActionText: { flex: 1, fontSize: 14, fontWeight: "600" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  toggleLabel: { fontSize: 14, fontWeight: "600" },
  toggleSub: { fontSize: 11, marginTop: 2 },
  limitRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  limitIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  limitLabel: { fontSize: 11, fontWeight: "600" },
  limitValue: { fontSize: 15, fontWeight: "800", marginTop: 2 },
  editLink: { fontSize: 12, fontWeight: "800" },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  langText: { fontSize: 15, fontWeight: "600" },
  faqItem: { paddingVertical: 14, borderBottomWidth: 1, gap: 6 },
  faqQ: { fontSize: 14, fontWeight: "700" },
  faqA: { fontSize: 12, lineHeight: 18 },
  supportCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  supportCtaText: { fontSize: 13, fontWeight: "700" },
  termsText: { fontSize: 13, lineHeight: 20 },
});
