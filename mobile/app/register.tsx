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
import { inputStyle } from "../src/styles/inputs";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Missing fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);

      await api.post("/api/register", {
        email: email.trim().toLowerCase(),
        password,
      });

      Alert.alert("Success", "Account created. Please log in.");
      router.replace("/login");
    } catch (err: any) {
      Alert.alert(
        "Registration failed",
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ paddingTop: 50, padding: 24 }}>
      <Text style={{ fontSize: 24, fontWeight: "600", marginBottom: 20 }}>
        Register
      </Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor="#999"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={inputStyle}
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor="#999"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={inputStyle}
      />

      <TextInput
        placeholder="Confirm Password"
        placeholderTextColor="#999"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        style={inputStyle}
      />

      {loading ? (
        <ActivityIndicator />
      ) : (
        <Button title="Create Account" onPress={handleRegister} />
      )}

      <Pressable
        onPress={() => router.replace("/login")}
        style={{ marginTop: 16 }}
      >
        <Text style={{ textAlign: "center", textDecorationLine: "underline" }}>
          Back to Login
        </Text>
      </Pressable>
    </View>
  );
}
