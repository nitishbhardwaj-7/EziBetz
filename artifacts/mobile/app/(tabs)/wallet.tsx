import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import React, { useState, useEffect } from "react";
import {
  KeyboardAvoidingView,
  Modal,
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
import { useBalance } from "@/context/BalanceContext";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useGetTransactionHistory } from "@workspace/api-client-react";

interface Transaction {
  id: string;
  type: "win" | "loss" | "deposit" | "withdrawal";
  label: string;
  amount: string;
  amountNum: number;
  time: string;
}

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: "1", type: "win", label: "Dice Win", amount: "+$890.12", amountNum: 890.12, time: "2m ago" },
  { id: "2", type: "loss", label: "Slots Spin", amount: "-$100.00", amountNum: -100, time: "15m ago" },
  { id: "3", type: "win", label: "Blackjack Win", amount: "+$600.00", amountNum: 600, time: "1h ago" },
  { id: "4", type: "deposit", label: "Deposit", amount: "+$500.00", amountNum: 500, time: "3h ago" },
  { id: "5", type: "loss", label: "Roulette", amount: "-$200.00", amountNum: -200, time: "5h ago" },
  { id: "6", type: "win", label: "Slots Jackpot", amount: "+$2,450.00", amountNum: 2450, time: "1d ago" },
  { id: "7", type: "withdrawal", label: "Withdrawal", amount: "-$1,000.00", amountNum: -1000, time: "2d ago" },
];

const QUICK_AMOUNTS = [50, 100, 250, 500];

type ModalType = "deposit" | "withdraw" | null;

function FundsModal({
  visible,
  type,
  onClose,
  onConfirm,
  balance,
  colors,
}: {
  visible: boolean;
  type: ModalType;
  onClose: () => void;
  onConfirm: (amount: number) => void;
  balance: number;
  colors: ReturnType<typeof useColors>;
}) {
  const [inputAmount, setInputAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 16;

  const isDeposit = type === "deposit";
  const parsed = parseFloat(inputAmount.replace(/,/g, "")) || 0;

  const validate = () => {
    if (parsed <= 0) return "Enter a valid amount";
    if (parsed < 10) return "Minimum amount is $10.00";
    if (!isDeposit && parsed > balance) return "Insufficient balance";
    if (!isDeposit && parsed > 5000) return "Max withdrawal is $5,000 per transaction";
    if (isDeposit && parsed > 10000) return "Max deposit is $10,000 per transaction";
    return null;
  };

  const handleConfirm = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSuccess(true);
    setTimeout(() => {
      onConfirm(parsed);
      setSuccess(false);
      setInputAmount("");
      onClose();
    }, 1000);
  };

  const handleClose = () => {
    setInputAmount("");
    setError(null);
    setSuccess(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, justifyContent: "flex-end" }}
      >
        <TouchableOpacity style={styles.modalBackdrop} onPress={handleClose} />
        <View
          style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: bottomPad }]}
        >
          <View style={[styles.modalHandle, { backgroundColor: colors.outlineVariant }]} />

          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View
                style={[
                  styles.modalIconWrap,
                  {
                    backgroundColor: isDeposit
                      ? `${colors.primary}20`
                      : `${colors.secondary}15`,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={isDeposit ? "arrow-down" : "arrow-up"}
                  size={22}
                  color={isDeposit ? colors.primary : colors.secondary}
                />
              </View>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {isDeposit ? "Deposit Funds" : "Withdraw Funds"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={[styles.closeBtn, { backgroundColor: colors.accent }]}
            >
              <MaterialCommunityIcons name="close" size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {success ? (
            <View style={styles.successBox}>
              <View
                style={[
                  styles.successIcon,
                  { backgroundColor: `${colors.secondary}20` },
                ]}
              >
                <MaterialCommunityIcons name="check-circle" size={48} color={colors.secondary} />
              </View>
              <Text style={[styles.successTitle, { color: colors.foreground }]}>
                {isDeposit ? "Deposit Successful!" : "Withdrawal Initiated!"}
              </Text>
              <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
                {isDeposit
                  ? `$${parsed.toFixed(2)} added to your balance`
                  : `$${parsed.toFixed(2)} will arrive within 1-3 business days`}
              </Text>
            </View>
          ) : (
            <View style={styles.modalContent}>
              {/* Current balance */}
              {!isDeposit && (
                <View
                  style={[styles.balancePill, { backgroundColor: colors.accent, borderColor: colors.border }]}
                >
                  <MaterialCommunityIcons name="wallet" size={16} color={colors.secondary} />
                  <Text style={[styles.balancePillText, { color: colors.mutedForeground }]}>
                    Available:{" "}
                    <Text style={{ color: colors.secondary, fontWeight: "900" }}>
                      ${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </Text>
                  </Text>
                </View>
              )}

              {/* Amount Input */}
              <View
                style={[styles.amountInput, { backgroundColor: colors.input, borderColor: error ? colors.destructive : colors.border }]}
              >
                <Text style={[styles.dollarSign, { color: colors.primary }]}>$</Text>
                <TextInput
                  value={inputAmount}
                  onChangeText={(v) => { setInputAmount(v); setError(null); }}
                  placeholder="0.00"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="decimal-pad"
                  style={[styles.amountTextInput, { color: colors.primary }]}
                  autoFocus
                />
              </View>

              {error && (
                <View style={[styles.errorRow, { borderColor: colors.destructive, backgroundColor: `${colors.destructive}12` }]}>
                  <MaterialCommunityIcons name="alert-circle" size={14} color={colors.destructive} />
                  <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
                </View>
              )}

              {/* Quick amounts */}
              <View style={styles.quickRow}>
                {QUICK_AMOUNTS.map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={[
                      styles.quickBtn,
                      {
                        backgroundColor:
                          parsed === amt ? `${colors.primary}25` : colors.accent,
                        borderColor: parsed === amt ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => { setInputAmount(String(amt)); setError(null); }}
                  >
                    <Text
                      style={[
                        styles.quickBtnText,
                        { color: parsed === amt ? colors.primary : colors.foreground },
                      ]}
                    >
                      ${amt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Payment methods (display only) */}
              <Text style={[styles.methodLabel, { color: colors.mutedForeground }]}>
                {isDeposit ? "PAYMENT METHOD" : "WITHDRAWAL METHOD"}
              </Text>
              <View style={styles.methodRow}>
                {[
                  { icon: "credit-card-outline", label: "Card" },
                  { icon: "bitcoin", label: "Crypto" },
                  { icon: "bank-outline", label: "Bank" },
                ].map((m, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.methodBtn,
                      {
                        backgroundColor: i === 0 ? `${colors.primary}15` : colors.accent,
                        borderColor: i === 0 ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={m.icon as any}
                      size={20}
                      color={i === 0 ? colors.primary : colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.methodBtnText,
                        { color: i === 0 ? colors.primary : colors.mutedForeground },
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Confirm Button */}
              <TouchableOpacity onPress={handleConfirm} activeOpacity={0.85}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryDim]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.confirmBtn}
                >
                  <Text style={[styles.confirmBtnText, { color: colors.primaryForeground }]}>
                    {isDeposit ? "DEPOSIT FUNDS" : "WITHDRAW FUNDS"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { balance, updateBalance, formatBalance } = useBalance();
  const { isAuthenticated } = useAuth();
  const [activeFilter, setActiveFilter] = useState<"all" | "wins" | "losses">("all");
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);

  const { data: dbTransactions, refetch: refetchTransactions } = useGetTransactionHistory({
    query: { enabled: isAuthenticated },
  });

  useEffect(() => {
    if (isAuthenticated) {
      void refetchTransactions();
    }
  }, [balance, isAuthenticated]);

  const displayTransactions = isAuthenticated && dbTransactions
    ? dbTransactions.map((t: any) => {
        const amountNum = t.amount / 100;
        const typeMapped = t.type === "bet" ? "loss" : (t.type === "win" ? "win" : t.type);
        return {
          id: t.id.toString(),
          type: typeMapped as any,
          label: t.type === "bet" ? "Bet Placement" : (t.type.charAt(0).toUpperCase() + t.type.slice(1)),
          amount: amountNum >= 0 ? `+$${amountNum.toFixed(2)}` : `-$${Math.abs(amountNum).toFixed(2)}`,
          amountNum,
          time: new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
      })
    : transactions;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 80;

  const filtered = displayTransactions.filter((t) => {
    if (activeFilter === "wins") return t.type === "win";
    if (activeFilter === "losses") return t.type === "loss";
    return true;
  });

  const handleDeposit = (amount: number) => {
    void updateBalance(amount);
  };

  const handleWithdraw = (amount: number) => {
    void updateBalance(-amount);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          WAL<Text style={{ color: colors.primary }}>LET</Text>
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        {/* Balance Display */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <LinearGradient
            colors={["rgba(30,21,46,0.9)", "rgba(43,32,62,0.9)"]}
            style={[styles.balanceCard, { borderColor: colors.border }]}
          >
            <Text style={[styles.balanceLabel, { color: colors.mutedForeground }]}>
              Total Balance
            </Text>
            <Text style={[styles.balanceBig, { color: colors.secondary }]}>
              {formatBalance(balance)}
            </Text>
            <View style={styles.walletActions}>
              <TouchableOpacity
                style={styles.walletActionBtn}
                onPress={() => setActiveModal("deposit")}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDim]}
                  style={styles.walletBtnGradient}
                >
                  <MaterialCommunityIcons name="plus" size={20} color={colors.primaryForeground} />
                  <Text style={[styles.walletBtnText, { color: colors.primaryForeground }]}>
                    DEPOSIT
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.walletActionBtn,
                  styles.walletBtnOutline,
                  { borderColor: colors.outlineVariant },
                ]}
                onPress={() => setActiveModal("withdraw")}
              >
                <MaterialCommunityIcons name="arrow-up" size={20} color={colors.foreground} />
                <Text style={[styles.walletBtnText, { color: colors.foreground }]}>WITHDRAW</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="trending-up" size={20} color={colors.secondary} />
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Won</Text>
            <Text style={[styles.statAmount, { color: colors.secondary }]}>$16,390.12</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="trending-down" size={20} color={colors.destructive} />
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Lost</Text>
            <Text style={[styles.statAmount, { color: colors.destructive }]}>$3,940.00</Text>
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.txSection}>
          <View style={styles.txHeader}>
            <Text style={[styles.txTitle, { color: colors.foreground }]}>History</Text>
            <View style={styles.filterRow}>
              {(["all", "wins", "losses"] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setActiveFilter(f)}
                  style={[
                    styles.filterBtn,
                    {
                      backgroundColor: activeFilter === f ? colors.primary : colors.accent,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      {
                        color: activeFilter === f ? colors.primaryForeground : colors.mutedForeground,
                      },
                    ]}
                  >
                    {f.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.txList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {filtered.map((tx, i) => {
              const isPositive = tx.amount.startsWith("+");
              const isDeposit = tx.type === "deposit";
              return (
                <View
                  key={tx.id}
                  style={[
                    styles.txItem,
                    i < filtered.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.txIcon,
                      {
                        backgroundColor: isPositive
                          ? "rgba(0,244,254,0.12)"
                          : isDeposit
                          ? "rgba(197,154,255,0.12)"
                          : "rgba(255,110,132,0.12)",
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={
                        isPositive
                          ? "arrow-down"
                          : tx.type === "withdrawal"
                          ? "arrow-up"
                          : "gamepad-variant"
                      }
                      size={18}
                      color={
                        isPositive ? colors.secondary : isDeposit ? colors.primary : colors.destructive
                      }
                    />
                  </View>
                  <View style={styles.txMid}>
                    <Text style={[styles.txLabel, { color: colors.foreground }]}>{tx.label}</Text>
                    <Text style={[styles.txTime, { color: colors.mutedForeground }]}>{tx.time}</Text>
                  </View>
                  <Text
                    style={[
                      styles.txAmount,
                      { color: isPositive ? colors.secondary : colors.destructive },
                    ]}
                  >
                    {tx.amount}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Deposit/Withdraw Modal */}
      <FundsModal
        visible={activeModal !== null}
        type={activeModal}
        onClose={() => setActiveModal(null)}
        onConfirm={activeModal === "deposit" ? handleDeposit : handleWithdraw}
        balance={balance}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 16 },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: -0.5,
  },
  balanceCard: { borderRadius: 24, borderWidth: 1, padding: 24 },
  balanceLabel: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  balanceBig: {
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: -1.5,
    marginBottom: 20,
  },
  walletActions: { flexDirection: "row", gap: 12 },
  walletActionBtn: { flex: 1, borderRadius: 9999, overflow: "hidden" },
  walletBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 9999,
  },
  walletBtnOutline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderWidth: 1,
  },
  walletBtnText: { fontSize: 12, fontWeight: "900", letterSpacing: 1 },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  statAmount: { fontSize: 18, fontWeight: "900", letterSpacing: -0.5 },
  txSection: { paddingHorizontal: 16 },
  txHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  txTitle: { fontSize: 18, fontWeight: "900", fontStyle: "italic" },
  filterRow: { flexDirection: "row", gap: 6 },
  filterBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  filterText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  txList: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  txItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  txMid: { flex: 1 },
  txLabel: { fontSize: 13, fontWeight: "700" },
  txTime: { fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: "900", letterSpacing: -0.3 },

  // Modal styles
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
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
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: { fontSize: 20, fontWeight: "900", letterSpacing: -0.3 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: { gap: 16, paddingBottom: 8 },
  balancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  balancePillText: { fontSize: 13, fontWeight: "600" },
  amountInput: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  dollarSign: { fontSize: 28, fontWeight: "900" },
  amountTextInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -1,
    padding: 0,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: { fontSize: 12, fontWeight: "600", flex: 1 },
  quickRow: { flexDirection: "row", gap: 8 },
  quickBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  quickBtnText: { fontSize: 13, fontWeight: "800" },
  methodLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  methodRow: { flexDirection: "row", gap: 8 },
  methodBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  methodBtnText: { fontSize: 11, fontWeight: "700" },
  confirmBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnText: { fontSize: 16, fontWeight: "900", letterSpacing: 1.5 },
  successBox: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: { fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  successSub: { fontSize: 13, textAlign: "center", lineHeight: 20 },
});
