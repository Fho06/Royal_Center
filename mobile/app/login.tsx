import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { api } from "../src/api/client";
import { useAuthStore } from "../src/auth/authStore";
import { inputStyle } from "../src/styles/inputs";

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing fields");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post("/api/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      await login(res.data.token, res.data.user);
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert(
        "Login failed",
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Invalid credentials"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ paddingTop: 50, padding: 24 }}>
      <Text style={{ fontSize: 24, fontWeight: "600", marginBottom: 20 }}>
        Login
      </Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor="#999"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={inputStyle} // ✅ USING SHARED STYLE
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor="#999"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={inputStyle}
      />

      {loading ? (
        <ActivityIndicator />
      ) : (
        <Button title="Log In" onPress={handleLogin} />
      )}

      <Pressable
        onPress={() => router.push("/register")}
        style={{ marginTop: 16 }}
      >
        <Text style={{ textAlign: "center" }}>
          Don’t have an account?{" "}
          <Text style={{ textDecorationLine: "underline" }}>
            Register
          </Text>
        </Text>
      </Pressable>
    </View>
  );
}
