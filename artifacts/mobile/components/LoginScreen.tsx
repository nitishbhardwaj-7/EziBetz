import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login, register } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegister, setIsRegister] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  
  const handleSubmit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError(null);
    setLoading(true);
    
    let result;
    if (isRegister) {
      // For registration, we generate a username from the email handle
      const username = email.split("@")[0].replace(/[^a-z0-9_]/gi, "_");
      result = await register(email, password, username, username);
    } else {
      result = await login(email, password);
    }
    
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? (isRegister ? "Registration failed" : "Login failed"));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Ambient glows */}
      <View style={[styles.glow1, { backgroundColor: `${colors.primary}12` }]} />
      <View style={[styles.glow2, { backgroundColor: `${colors.secondary}08` }]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: topPad + 32, paddingBottom: bottomPad + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoSection}>
            <Image
              source={require("@/assets/images/ezibetz_logo.png")}
              style={styles.logoImg}
              contentFit="contain"
            />
            <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
              PREMIUM GAMING EXPERIENCE
            </Text>
          </View>

          {/* Card */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {/* Tab Toggle */}
            <View style={[styles.tabToggle, { backgroundColor: colors.accent }]}>
              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  !isRegister && { backgroundColor: colors.primary },
                ]}
                onPress={() => { setIsRegister(false); setError(null); }}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    {
                      color: !isRegister ? colors.primaryForeground : colors.mutedForeground,
                    },
                  ]}
                >
                  SIGN IN
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  isRegister && { backgroundColor: colors.primary },
                ]}
                onPress={() => { setIsRegister(true); setError(null); }}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    {
                      color: isRegister ? colors.primaryForeground : colors.mutedForeground,
                    },
                  ]}
                >
                  REGISTER
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.welcomeText, { color: colors.foreground }]}>
              {isRegister ? "Create Account" : "Welcome Back"}
            </Text>
            <Text style={[styles.subText, { color: colors.mutedForeground }]}>
              {isRegister
                ? "Join thousands of players"
                : "Enter your credentials to continue"}
            </Text>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                EMAIL ADDRESS
              </Text>
              <View
                style={[
                  styles.inputRow,
                  { backgroundColor: colors.input, borderColor: colors.border },
                ]}
              >
                <MaterialCommunityIcons
                  name="email-outline"
                  size={20}
                  color={colors.mutedForeground}
                />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.input, { color: colors.foreground }]}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                PASSWORD
              </Text>
              <View
                style={[
                  styles.inputRow,
                  { backgroundColor: colors.input, borderColor: colors.border },
                ]}
              >
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={20}
                  color={colors.mutedForeground}
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  style={[styles.input, { color: colors.foreground }]}
                />
                <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                  <MaterialCommunityIcons
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color={colors.mutedForeground}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Error */}
            {error && (
              <View
                style={[
                  styles.errorBox,
                  { backgroundColor: `${colors.destructive}15`, borderColor: colors.destructive },
                ]}
              >
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={16}
                  color={colors.destructive}
                />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDim]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitBtn}
              >
                {loading ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>
                    {isRegister ? "CREATE ACCOUNT" : "SIGN IN"}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>OR</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Demo Button */}
            <TouchableOpacity
              onPress={() => {
                setEmail("demo@ezibetz.com");
                setPassword("demo1234");
              }}
              style={[styles.demoBtn, { borderColor: colors.border }]}
            >
              <MaterialCommunityIcons name="play-circle-outline" size={18} color={colors.primary} />
              <Text style={[styles.demoBtnText, { color: colors.primary }]}>
                USE DEMO ACCOUNT
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.footer, { color: colors.mutedForeground }]}>
            By continuing you agree to our{" "}
            <Text style={{ color: colors.primary }}>Terms of Service</Text> and{" "}
            <Text style={{ color: colors.primary }}>Privacy Policy</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  glow1: {
    position: "absolute",
    top: -100,
    left: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
  },
  glow2: {
    position: "absolute",
    bottom: 0,
    right: -100,
    width: 350,
    height: 350,
    borderRadius: 175,
  },
  scroll: {
    paddingHorizontal: 24,
    alignItems: "stretch",
    gap: 24,
  },
  logoSection: {
    alignItems: "center",
    gap: 12,
  },
  logoImg: {
    width: 120,
    height: 120,
  },
  tagline: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
    gap: 16,
  },
  tabToggle: {
    flexDirection: "row",
    borderRadius: 9999,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9999,
    alignItems: "center",
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginTop: 4,
  },
  subText: {
    fontSize: 13,
    marginTop: -8,
  },
  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    padding: 0,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  submitBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  demoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  demoBtnText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  footer: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 18,
  },
});
