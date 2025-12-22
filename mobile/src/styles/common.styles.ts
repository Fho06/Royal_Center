import { StyleSheet } from "react-native";

export const commonStyles = StyleSheet.create({
  /* ---------- Layout ---------- */
  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  flex1: {
    flex: 1,
  },

  /* ---------- Card ---------- */
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },

  cardInfo: {
    flex: 1,
    paddingRight: 12,
  },

  /* ---------- Text ---------- */
  title: {
    fontSize: 16,
    fontWeight: "600",
  },

  price: {
    marginTop: 4,
  },

  mutedText: {
    marginTop: 4,
    color: "#666",
  },

  /* ---------- Buttons ---------- */
  primaryButton: {
    backgroundColor: "#000",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },

  disabledButton: {
    backgroundColor: "#999",
  },

  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },

  pressed: {
    opacity: 0.8,
  },

});
