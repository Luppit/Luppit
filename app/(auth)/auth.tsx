import Button from "@/src/components/button/Button";
import { Text } from "@/src/components/Text";
import { borders, colors, spacing } from "@/src/themes";
import { Asset } from "expo-asset";
import { Link, router } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { SvgUri } from "react-native-svg";

export default function auth() {
  const logoAsset = Asset.fromModule(
    require("../../assets/images/logo-icon.svg"),
  );

  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        {logoAsset.uri ? (
          <SvgUri
            uri={logoAsset.uri}
            width={80}
            height={80}
            style={{ marginBottom: spacing.lg }}
          />
        ) : null}
        <Text variant="title" align="center" style={{ marginBottom: spacing.xs }}>
          ¡Luppit te da la bienvenida!
        </Text>
        <Text variant="body" color="stateAnulated" align="center">
          Empieza a comprar y vender en nuestra comunidad.
        </Text>
      </View>

      <View style={styles.actions}>
        <View style={styles.actionButton}>
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

        <View style={styles.actionButton}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    flex: 1,
  },
  brand: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: spacing.xl,
  },
  actions: {
    width: "100%",
    paddingBottom: spacing.lg,
  },
  actionButton: {
    width: "100%",
  },
  footer: {
    paddingTop: spacing.xl,
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
