import Button from "@/src/components/button/Button";
import { Text } from "@/src/components/Text";
import { borders, colors, spacing } from "@/src/themes";
import { Image } from "expo-image";
import { Link, router } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";

export default function auth() {
  return (
    <View
      style={{
        alignItems: "center",
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

      <View style={{ width: "100%", paddingTop: spacing.lg }}>
        <Button
          onPress={() => router.push("/(auth)/signup")}
          variant="white"
          title="Crear cuenta con teléfono"
          icon="smartphone"
        ></Button>
      </View>

      <View style={styles.parentContainer}>
        <View style={styles.childrenLine}></View>
        <View style={styles.separatorCircle}></View>
        <View style={styles.childrenLine}></View>
      </View>

      <View style={{ width: "100%" }}>
        <Button
          onPress={() => router.push("/(auth)/login")}
          variant="dark"
          title="Iniciar sesión con mi cuenta"
        ></Button>
      </View>

      <View style={styles.footer}>
        <Text variant="caption" align="center">
          Al continuar, aceptas automáticamente los
        </Text>
        <Link href="https://google.com">
          <Text
            variant="caption"
            style={{ textDecorationLine: "underline", fontWeight: "bold" }}
          >
            Términos y condiciones
          </Text>
        </Link>
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
    flex: 1,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    alignItems: "center",
  },
  parentContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
  },
  childrenLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  separatorCircle: {
    width: 10,
    height: 10,
    borderRadius: borders.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    marginHorizontal: spacing.sm,
  },
});
