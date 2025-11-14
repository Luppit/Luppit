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
    flex: 1
  },
  viewStyles : {
    flex: 1,
    marginTop: spacing.xl
  }
});