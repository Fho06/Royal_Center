import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{ title: "Shop" }}
      />
      <Tabs.Screen
        name="explore"
        options={{ title: "Cart" }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: "Account" }}
      />
    </Tabs>
  );
}
