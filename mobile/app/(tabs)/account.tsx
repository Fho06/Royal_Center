import { View, Text, Button, Alert } from "react-native";
import { useAuthStore } from "../../src/auth/authStore";
import { router } from "expo-router";

export default function AccountScreen() {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  const handleLogout = async () => {
    Alert.alert("Log out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <View style={{ padding: 24 }}>
      <Text style={{ fontSize: 20, fontWeight: "600", marginBottom: 12 }}>
        Account
      </Text>

      {user && (
        <Text style={{ marginBottom: 20 }}>
          Logged in as {user.email}
        </Text>
      )}

      <Button title="Log out" onPress={handleLogout} color="red" />
    </View>
  );
}
