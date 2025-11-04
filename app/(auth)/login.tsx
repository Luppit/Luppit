import Button from "@/src/components/button/Button";
import { Text } from "@/src/components/Text";
import { sharedStyles, spacing } from "@/src/themes";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, View } from "react-native";

export default function login() {
  return (
    <View
      style={{
        ...sharedStyles.alignItemsCenter,
        ...styles.container,
      }}
    >
      <Image source={imageRoute} style={styles.image}></Image>
      <Text variant="title" style={{ marginBottom: spacing.xs }}>
        ¡Luppit te da la bienvenida!
      </Text>
      <Text variant="body" color="stateAnulated" align="center">
        Empieza a comprar y vender en nuetra comunidad.
      </Text>

      <View style={{ width: "100%"}}>
        <Button variant="white" title="Crear cuenta con teléfono" icon="smartphone"></Button>
      </View>

      <View style={{ width: "100%" }}>
        <Button variant="dark" title="Iniciar sesión con mi cuenta"></Button>
      </View>

      <View style={styles.footer}>
        <Text variant="caption" align="center">Hola</Text>
      </View>

    </View>
  );
}

const imageRoute = require("@/assets/images/icon.png");

const styles = StyleSheet.create({
  image: {
    width: 120,
    height: 120,
    marginBottom: spacing.lg,
  },
  container: {
    paddingHorizontal: spacing.md,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    alignItems: "center"
  }
});
