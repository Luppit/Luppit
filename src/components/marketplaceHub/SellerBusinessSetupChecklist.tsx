import Button from "@/src/components/button/Button";
import { GroupedList, GroupedListRow } from "@/src/components/groupedList/GroupedList";
import { Icon } from "@/src/components/Icon";
import { usePushNotifications } from "@/src/components/notifications/PushNotificationProvider";
import { NAVBAR_HEIGHT } from "@/src/components/navbar/styles";
import { Text } from "@/src/components/Text";
import { lucideIcons, LucideIconName } from "@/src/icons/lucide";
import { SellerBusinessSetup, SellerBusinessSetupStep } from "@/src/services/seller.business.setup.service";
import { Theme, useTheme } from "@/src/themes";
import { showError } from "@/src/utils/useToast";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

export default function SellerBusinessSetupChecklist({
  setup,
  topContentInset,
  onRefresh,
}: {
  setup: SellerBusinessSetup;
  topContentInset: number;
  onRefresh: () => void;
}) {
  const t = useTheme();
  const s = useMemo(() => createStyles(t), [t]);
  const [isEnablingNotifications, setIsEnablingNotifications] = useState(false);
  const { permissionStatus, permissionCanAskAgain, enablePushNotifications,
    openPushNotificationSettings } = usePushNotifications();
  const nextStep = setup.steps.find((step) => !step.isComplete && step.canEdit);
  const remaining = setup.totalCount - setup.completedCount;
  const needsSettings = !permissionCanAskAgain && permissionStatus !== "undetermined";

  const openStep = async (step: SellerBusinessSetupStep) => {
    switch (step.code) {
      case "email":
        router.push({ pathname: "/(modal)/email-setup", params: { title: "Verificar correo" } });
        break;
      case "categories":
        router.push({ pathname: "/(detail)/business-categories",
          params: { title: step.label, hideMenu: "true" } });
        break;
      case "commercial_name":
        router.push({ pathname: "/(modal)/business-name-edit",
          params: { title: step.label, value: setup.commercialName ?? "" } });
        break;
      case "location":
        router.push({ pathname: "/(modal)/business-location-edit", params: {
          title: step.label, locationId: setup.locationId ?? "",
          locationLabel: setup.locationLabel ?? "",
        } });
        break;
      case "photo":
        router.push({ pathname: "/(modal)/profile-picture-edit", params: { title: step.label } });
        break;
      case "notifications":
        if (needsSettings) {
          try {
            await openPushNotificationSettings();
          } catch {
            showError("No pudimos abrir los ajustes", "Intenta de nuevo desde los ajustes del dispositivo.");
          }
        } else {
          setIsEnablingNotifications(true);
          await enablePushNotifications();
          setIsEnablingNotifications(false);
          onRefresh();
        }
        break;
    }
  };

  return (
    <View style={s.screen}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, { paddingTop: topContentInset }]}
      >
        <View style={s.summary}>
          <Text variant="small" color="textMedium">Configuración del negocio</Text>
          <Text variant="subtitle" accessibilityLiveRegion="polite">
            {setup.completedCount} de {setup.totalCount} pasos completados
          </Text>
          <Text variant="body" color="textMedium">
            Completa los pasos pendientes para hacer ofertas.
          </Text>
          <View style={s.progress} accessible accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: setup.totalCount, now: setup.completedCount }}
            accessibilityLabel="Configuración del negocio"
          >
            <View style={[s.progressFill, { width: `${100 * setup.completedCount / setup.totalCount}%` }]} />
          </View>
        </View>
        <GroupedList>
          {setup.steps.map((step, index) => (
            <GroupedListRow key={step.code}
              icon={step.icon in lucideIcons ? step.icon as LucideIconName : "circle-help"}
              label={step.label} labelMaxLines={2}
              description={step.isComplete ? step.description :
                !step.canEdit ? "Pendiente del administrador principal" :
                step.code === "notifications" && needsSettings ? "Actívalas en los ajustes del dispositivo." : null}
              showSeparator={index < setup.steps.length - 1}
              showChevron={!step.isComplete && step.canEdit}
              accessibilityLabel={`${step.label}, ${step.isComplete ? "completado" : "pendiente"}`}
              onPress={step.canEdit && !isEnablingNotifications ? () => void openStep(step) : undefined}
              rightAccessory={step.isComplete ? (
                <View style={s.check} accessibilityElementsHidden importantForAccessibility="no">
                  <Icon name="check" size={16} color={t.colors.backgroudWhite} />
                </View>
              ) : <Text variant="small" color="stateAnulated">Pendiente</Text>}
            />
          ))}
        </GroupedList>
      </ScrollView>
      <View style={s.actions}>
        <Button variant="dark" loading={isEnablingNotifications} disabled={!nextStep}
          title={nextStep ? nextStep.code === "notifications" && needsSettings
            ? "Abrir ajustes" : nextStep.actionLabel : "Pendiente del administrador principal"}
          onPress={nextStep ? () => void openStep(nextStep) : undefined}
        />
        <Text variant="small" color="stateAnulated" align="center">
          {remaining === 1 ? "Falta 1 paso" : `Faltan ${remaining} pasos`}
        </Text>
      </View>
    </View>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    screen: { flex: 1 },
    scroll: { flex: 1 },
    content: { gap: t.spacing.md, paddingBottom: t.spacing.md },
    summary: { gap: t.spacing.sm },
    progress: { height: 5, borderRadius: 3, overflow: "hidden", backgroundColor: t.colors.border },
    progressFill: { height: "100%", backgroundColor: t.colors.primary, borderRadius: 3 },
    check: { width: 22, height: 22, borderRadius: 11, backgroundColor: t.colors.primary,
      alignItems: "center", justifyContent: "center" },
    actions: { gap: t.spacing.sm, paddingTop: t.spacing.md, marginBottom: NAVBAR_HEIGHT + t.spacing.md },
  });
}
