import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Text } from "react-native-paper";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";

// TEMPORARY screen to prove login works.
// Delete it once Home (owner) and Requests (workshop) exist.
export default function WelcomeScreen() {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.title}>Hi, {user?.full_name}!</Text>
        <Text style={styles.text}>
          Logged in as {user?.role === "workshop" ? "a workshop" : "a car owner"}.
        </Text>
        <Button mode="contained" onPress={logout} buttonColor={colors.primary} textColor={colors.text}>
          Log out
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16, padding: 24 },
  title: { fontSize: 26, fontWeight: "800", color: colors.text },
  text: { fontSize: 15, color: colors.muted },
});