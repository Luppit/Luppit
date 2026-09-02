import Button from "@/src/components/button/Button";
import { BundledSvg } from "@/src/components/BundledSvg";
import { Text } from "@/src/components/Text";
import { LEGAL_DOCUMENT_CODES } from "@/src/services/legal-document.service";
import { colors, spacing } from "@/src/themes";
import { Link, router } from "expo-router";
import React from "react";
import { Image, StyleSheet, View } from "react-native";

export default function auth() {
  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <BundledSvg
          asset={require("../../assets/images/logo-icon.svg")}
          width={80}
          height={80}
          style={{ marginBottom: spacing.lg }}
          fallback={
            <Image
              source={require("../../assets/images/icon.png")}
              style={styles.logoFallback}
              resizeMode="contain"
            />
          }
        />
        <Text variant="title" align="center" style={{ marginBottom: spacing.xs }}>
          ¡Luppit te da la bienvenida!
        </Text>
        <Text
          variant="body"
          color="textMedium"
          align="center"
          style={styles.brandDescription}
        >
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
          <Text
            variant="small"
            color="textMedium"
            align="center"
            style={styles.separatorLabel}
          >
            o
          </Text>
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
          <Text variant="small" align="center">
            Antes de crear tu cuenta, revisa nuestros documentos legales.
          </Text>
          <View style={styles.legalLinks}>
            <Link
              href={{
                pathname: "/(detail)/legal-document",
                params: {
                  code: LEGAL_DOCUMENT_CODES.termsConditions,
                  title: "Términos y condiciones",
                  hideMenu: "true",
                },
              }}
            >
              <Text variant="small" style={styles.legalLink}>
                Términos y condiciones
              </Text>
            </Link>
            <Text variant="small">y</Text>
            <Link
              href={{
                pathname: "/(detail)/legal-document",
                params: {
                  code: LEGAL_DOCUMENT_CODES.privacyPolicy,
                  title: "Política de privacidad",
                  hideMenu: "true",
                },
              }}
            >
              <Text variant="small" style={styles.legalLink}>
                Política de privacidad
              </Text>
            </Link>
          </View>
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
  brandDescription: {
    opacity: 0.65,
  },
  logoFallback: {
    width: 80,
    height: 80,
    marginBottom: spacing.lg,
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
    gap: spacing.xs,
  },
  legalLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.xs,
  },
  legalLink: {
    textDecorationLine: "underline",
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
  separatorLabel: {
    width: spacing.lg,
    marginHorizontal: spacing.sm,
  },
});
