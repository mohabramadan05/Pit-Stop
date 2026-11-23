import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, HelperText, Snackbar, Text, TextInput } from "react-native-paper";
import { getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");

  const emailError = submitted && !/^\S+@\S+\.\S+$/.test(email.trim());
  const passwordError = submitted && password.length === 0;

  const handleLogin = async () => {
    setSubmitted(true);
    if (!/^\S+@\S+\.\S+$/.test(email.trim()) || password.length === 0) return;

    setLoading(true);
    try {
      // Saves the user in AuthContext; App.tsx then switches to the logged-in screens
      await login(email.trim().toLowerCase(), password);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Image
        source={require("../../assets/images/login-road-background.png")}
        style={styles.road}
        resizeMode="cover"
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Image source={require("../../assets/images/logo.png")} style={styles.logo} />
            <Text style={styles.brandName}>
              PitStop<Text style={styles.brandDot}>.</Text>
            </Text>
          </View>

          <View style={styles.heading}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Log in to book your next service in Kielce.</Text>
          </View>

          <View>
            <Text style={styles.label}>Email</Text>
            <TextInput
              mode="outlined"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              left={<TextInput.Icon icon="email-outline" color={colors.muted} />}
              error={emailError}
              style={styles.input}
              outlineStyle={styles.inputOutline}
            />
            <HelperText type="error" visible={emailError}>
              Enter a valid email address
            </HelperText>

            <Text style={styles.label}>Password</Text>
            <TextInput
              mode="outlined"
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              left={<TextInput.Icon icon="lock-outline" color={colors.muted} />}
              right={
                <TextInput.Icon
                  icon={showPassword ? "eye-off-outline" : "eye-outline"}
                  color={colors.muted}
                  onPress={() => setShowPassword((prev) => !prev)}
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                />
              }
              error={passwordError}
              style={styles.input}
              outlineStyle={styles.inputOutline}
            />
            <HelperText type="error" visible={passwordError}>
              Enter your password
            </HelperText>

            <Pressable
              style={styles.forgot}
              onPress={() => setMessage("Password reset isn't available yet.")}
            >
              <Text style={styles.link}>Forgot password?</Text>
            </Pressable>
          </View>

          <View style={styles.flex} />

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            buttonColor={colors.primary}
            textColor={colors.text}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            Log in
          </Button>

          <View style={styles.footer}>
            <Text style={styles.footerText}>New to PitStop? </Text>
            <Pressable onPress={() => setMessage("Registration screen coming soon.")}>
              <Text style={[styles.link, styles.bold]}>Create an account</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar visible={message !== ""} onDismiss={() => setMessage("")} duration={3000}>
        {message}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  road: { position: "absolute", top: 0, left: 0, width: "100%", height: 260 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 32 },

  brand: { gap: 18, alignItems: "flex-start" },
  logo: { width: 64, height: 64 },
  brandName: { fontSize: 30, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
  brandDot: { color: colors.primary },

  heading: { marginTop: 56, marginBottom: 28, gap: 6 },
  title: { fontSize: 28, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: colors.muted, lineHeight: 22 },

  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 6 },
  input: { backgroundColor: colors.surface, fontSize: 15 },
  inputOutline: { borderRadius: 14 },

  forgot: { alignSelf: "flex-end", paddingVertical: 4 },
  link: { color: colors.secondary, fontSize: 13, fontWeight: "600" },
  bold: { fontWeight: "700", fontSize: 14 },

  button: { borderRadius: 14, marginTop: 24 },
  buttonContent: { height: 54 },
  buttonLabel: { fontSize: 16, fontWeight: "700" },

  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 20 },
  footerText: { fontSize: 14, color: colors.muted },
});
