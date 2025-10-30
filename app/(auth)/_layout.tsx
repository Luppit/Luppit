import { colors } from "@/src/themes";
import { Slot } from "expo-router";
import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function _layout() {
  return (
    <SafeAreaView style={{...authLayoutStyles.container}}>
      <View>
        <Slot></Slot>
      </View>
    </SafeAreaView>
  );
}

const authLayoutStyles = {
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
};