import { router } from "expo-router";
import type { MarketplaceHubItem } from "../../services/purchase.request.service";
import {
  getCurrentSellerRequestOfferConversations,
  getOrCreateCurrentSellerOfferSeedConversation,
} from "../../services/seller.request.offers.service";
import { showError } from "../../utils/useToast";

function openConversation(conversationId: string, title: string) {
  router.push({
    pathname: "/(conversation)/offer",
    params: { conversationId, title },
  });
}

export async function openSellerRequest(item: MarketplaceHubItem) {
  const title = item.title ?? "Conversación";
  const offers = await getCurrentSellerRequestOfferConversations(item.id);
  if (!offers.ok) {
    showError("No se pudieron cargar las ofertas", offers.error.message);
    return;
  }
  if (offers.data.length > 0) {
    router.push({ pathname: "/(detail)/seller-request-offers", params: {
      purchaseRequestId: item.id, title,
    } });
    return;
  }
  if (item.status !== "active" && item.navigation?.target === "conversation" &&
      item.navigation.conversation_id) {
    openConversation(item.navigation.conversation_id, title);
    return;
  }
  const conversation = await getOrCreateCurrentSellerOfferSeedConversation(item.id);
  if (!conversation.ok) {
    showError("No se pudo abrir la conversación",
      conversation.error.message);
    return;
  }
  openConversation(conversation.data.id, title);
}
