import LoadingState from "@/src/components/loading/LoadingState";
import {
  isProfileEmailSetupComplete,
} from "@/src/components/navbar/useEmailSetupGate";
import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import { Text } from "@/src/components/Text";
import { getSession } from "@/src/lib/supabase";
import {
  getOrCreateCurrentSellerConversationByPurchaseRequestId,
} from "@/src/services/conversation.service";
import {
  getPurchaseRequestById,
  PurchaseRequest,
} from "@/src/services/purchase.request.service";
import { Roles } from "@/src/services/role.service";
import { setPendingSharedPurchaseRequest } from "@/src/services/shared.purchase.request.service";
import { getCurrentUserRole } from "@/src/services/user.role.service";
import { useTheme } from "@/src/themes";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { View } from "react-native";

function parseStringParam(raw: string | string[] | undefined) {
  return Array.isArray(raw) ? raw[0] : raw;
}

function toPurchaseRequestParam(purchaseRequest: PurchaseRequest) {
  return {
    id: purchaseRequest.id,
    profile_id: purchaseRequest.profile_id,
    draft_id: purchaseRequest.draft_id,
    category_id: purchaseRequest.category_id,
    category_path: purchaseRequest.category_path,
    category_name: purchaseRequest.category_name,
    title: purchaseRequest.title,
    summary_text: purchaseRequest.summary_text,
    contract: purchaseRequest.contract,
    status: purchaseRequest.status,
    created_at: purchaseRequest.created_at,
    published_at: purchaseRequest.published_at,
    updated_at: purchaseRequest.updated_at,
  };
}

export default function SharedPurchaseRequestResolver() {
  const t = useTheme();
  const { state: profileState, activeProfile } = useActiveProfile();
  const params = useLocalSearchParams<{
    purchaseRequestId?: string | string[];
  }>();
  const purchaseRequestId = parseStringParam(params.purchaseRequestId);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requiresEmailSetup =
    profileState === "ready" &&
    activeProfile != null &&
    !isProfileEmailSetupComplete(activeProfile.profile);

  useEffect(() => {
    let active = true;

    const resolveSharedRequest = async () => {
      const id = purchaseRequestId?.trim();
      if (!id) {
        setErrorMessage("No encontramos esta solicitud.");
        return;
      }

      if (requiresEmailSetup) {
        await setPendingSharedPurchaseRequest(id);
        if (!active) return;
        router.replace("/");
        return;
      }

      const session = await getSession();
      if (!active) return;

      if (!session?.user.id) {
        await setPendingSharedPurchaseRequest(id);
        if (!active) return;
        router.replace("/(auth)/auth");
        return;
      }

      const [roleResult, requestResult] = await Promise.all([
        getCurrentUserRole(),
        getPurchaseRequestById(id),
      ]);
      if (!active) return;

      if (!requestResult) {
        setErrorMessage("No encontramos esta solicitud.");
        return;
      }

      if (!requestResult.ok) {
        setErrorMessage(requestResult.error.message);
        return;
      }

      const purchaseRequest = requestResult.data;
      const title = purchaseRequest.title ?? "Solicitud";
      const role = roleResult.ok ? roleResult.data : null;

      if (role === Roles.SELLER) {
        if ((purchaseRequest.status ?? "").trim().toLowerCase() === "canceled") {
          setErrorMessage("Esta solicitud ya no está disponible.");
          return;
        }

        const conversation =
          await getOrCreateCurrentSellerConversationByPurchaseRequestId(id);
        if (!active) return;

        if (!conversation?.ok) {
          setErrorMessage(
            conversation?.error.message ?? "No se pudo abrir la conversación."
          );
          return;
        }

        router.replace({
          pathname: "/(conversation)/offer",
          params: {
            conversationId: conversation.data.id,
            title,
          },
        });
        return;
      }

      router.replace({
        pathname: "/(detail)/purchase-request",
        params: {
          title: title || "Detalle de solicitud",
          purchaseRequest: JSON.stringify(toPurchaseRequestParam(purchaseRequest)),
        },
      });
    };

    void resolveSharedRequest();
    return () => {
      active = false;
    };
  }, [purchaseRequestId, requiresEmailSetup]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: t.spacing.lg,
        backgroundColor: t.colors.background,
      }}
    >
      {errorMessage ? (
        <Text align="center" color="stateAnulated">
          {errorMessage}
        </Text>
      ) : (
        <LoadingState label="Abriendo solicitud..." />
      )}
    </View>
  );
}
