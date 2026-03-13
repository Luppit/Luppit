import { Icon } from "@/src/components/Icon";
import HintModal from "@/src/components/hintModal/HintModal";
import { Text } from "@/src/components/Text";
import { purchaseRequestExample } from "@/src/mocks/purchaseRequest.mock";
import { PurchaseRequest } from "@/src/services/purchase.request.service";
import { useTheme } from "@/src/themes";
import { Asset } from "expo-asset";
import { Image } from "expo-image";
import { useGlobalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SvgUri } from "react-native-svg";

function parsePurchaseRequestParam(
  raw: string | string[] | undefined
): PurchaseRequest | null {
  if (!raw) return null;
  const value = Array.isArray(raw) ? raw[0] : raw;
  try {
    return JSON.parse(value) as PurchaseRequest;
  } catch {
    return null;
  }
}

export default function PurchaseRequestDetailScreen() {
  const t = useTheme();
  const [showCategoryHint, setShowCategoryHint] = useState(false);
  const params = useGlobalSearchParams<{ purchaseRequest?: string | string[] }>();
  const purchaseRequest =
    parsePurchaseRequestParam(params.purchaseRequest) ?? purchaseRequestExample;
  const offersCount = 0;
  const viewsCount = 12;
  const noOffersAsset = Asset.fromModule(
    require("../../assets/images/no_offers_request.svg")
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={{ flex: 1, paddingTop: t.spacing.md }}>
        <View>
          <Text variant="body">{purchaseRequest.summary_text ?? ""}</Text>
        </View>

        <View
          style={{
            marginTop: t.spacing.lg,
            alignItems: "flex-end",
            flexDirection: "row",
            justifyContent: "flex-end",
            gap: t.spacing.xs,
          }}
        >
          <Text color="stateAnulated">Visualizaciones:</Text>
          <Icon name="eye" size={20} color={t.colors.stateAnulated} />
          <Text color="stateAnulated">{String(viewsCount)}</Text>
        </View>

        <View
          style={{
            borderBottomWidth: 1,
            borderBottomColor: t.colors.border,
            marginTop: t.spacing.md,
          }}
        />

        <View style={{ marginTop: t.spacing.lg, gap: t.spacing.sm }}>
          <Text variant="subtitle">Categoría:</Text>
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: t.spacing.xs }}
          >
            <Text variant="title">{purchaseRequest.category_name ?? "-"}</Text>
            <Pressable hitSlop={8} onPress={() => setShowCategoryHint(true)}>
              <Icon name="info" size={18} color={t.colors.primary} />
            </Pressable>
          </View>
        </View>

        <View
          style={{
            borderBottomWidth: 1,
            borderBottomColor: t.colors.border,
            marginTop: t.spacing.lg,
          }}
        />

        <View style={{ marginTop: t.spacing.md }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text color="stateAnulated" variant="subtitle">
              Ofertas ({offersCount}):
            </Text>
            <View style={{ flexDirection: "row", gap: t.spacing.sm }}>
              <Icon
                name="sliders-horizontal"
                size={18}
                color={t.colors.stateAnulated}
              />
              <Icon name="arrow-up-down" size={18} color={t.colors.stateAnulated} />
            </View>
          </View>

          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              marginTop: t.spacing.xl,
              gap: t.spacing.md,
            }}
          >
            <Text color="stateAnulated" align="center">
              Cuando recibas una oferta, aparecerá aquí.
            </Text>
            {noOffersAsset?.uri ? (
              <SvgUri uri={noOffersAsset.uri} width={260} height={340} />
            ) : (
              <Image
                source={require("../../assets/images/no_offers_request.svg")}
                style={{ width: 260, height: 340 }}
                contentFit="contain"
              />
            )}
          </View>
        </View>
      </View>

      <HintModal
        visible={showCategoryHint}
        text={purchaseRequest.category_path ?? "-"}
        onClose={() => setShowCategoryHint(false)}
      />
    </ScrollView>
  );
}
