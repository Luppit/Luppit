import { colors, spacing } from "@/src/themes";
import { Slot } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function _layout() {
  return (
    <SafeAreaView style={authLayoutStyles.container}>
      <View style={authLayoutStyles.viewStyles}>
        <Slot></Slot>
      </View>
    </SafeAreaView>
  );
}

const authLayoutStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    height: "100%",
  },
  viewStyles : {
    alignItems: "center",
    marginTop: spacing.xl
  }
});