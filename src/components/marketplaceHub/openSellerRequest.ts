import { router } from "expo-router";
import type { MarketplaceHubItem } from "../../services/purchase.request.service";
import { openPopup } from "../../services/popup.service";
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
  if (offers.data.length > 1 || (offers.data.length === 1 && item.status === "active")) {
    openPopup({
      type: "menu",
      options: [
        ...offers.data.map((offer, index) => ({
          id: offer.conversationId,
          label: `${index + 1}. ${offer.description}${offer.priceSummary ? ` · ${offer.priceSummary}` : ""}`,
          onPress: () => openConversation(offer.conversationId, title),
        })),
        ...(item.status === "active" ? [{
          id: "add-another-offer",
          label: "Agregar otra oferta",
          icon: "plus" as const,
          onPress: () => { void (async () => {
            const seed = await getOrCreateCurrentSellerOfferSeedConversation(item.id);
            if (seed.ok) router.push({ pathname: "/(modal)/offer", params: {
              title: "Agregar otra oferta", purchaseRequestId: item.id,
              conversationId: seed.data.id, mode: "create",
            } });
            else showError("No se pudo abrir la oferta", seed.error.message);
          })(); },
        }] : []),
      ],
    });
    return;
  }
  if (offers.data.length === 1) {
    openConversation(offers.data[0].conversationId, title);
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
