export function shouldOpenAssistantSummary(value: string) {
  const reply = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.,!?¿¡]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if ([
    "si", "si ok", "si por favor", "si porfa", "yes", "ok", "dale", "claro",
  ].includes(reply)) return true;

  const request = reply
    .replace(/^(?:si|yes|ok|dale|claro) (?:por favor |porfa )?/, "")
    .replace(/ (?:por favor|porfa)$/, "");
  return [
    "mostrar resumen", "mostrar el resumen", "ver resumen", "ver el resumen",
    "revisar resumen", "revisar el resumen", "muestra el resumen", "muestrame el resumen",
    "ensename el resumen", "quiero ver el resumen", "puedes mostrarme el resumen",
    "me puedes mostrar el resumen",
  ].includes(request);
}

export function isAssistantReviewInstruction(value: string) {
  return [
    "Listo. Revisa que todo esté correcto antes de publicar.",
    "Aqui tienes el resumen. ¿Deseas publicar o seguir ajustando?",
  ].includes(value.replace(/\s+/g, " ").trim());
}

export function isSellerOfferReviewInstruction(value: string) {
  return value.replace(/\s+/g, " ").trim() ===
    "Aquí tienes el resumen de la oferta. ¿Deseas enviarla o seguir ajustando?";
}

export function isSellerOfferSummaryInvitation(value: string) {
  return value.replace(/\s+/g, " ").trim() ===
    "Tu oferta está lista. ¿Deseas ver el resumen?";
}

type SellerOfferTranscriptMessage = {
  sender: "user" | "assistant";
  text: string;
  images?: readonly unknown[];
};

export function getVisibleSellerOfferMessages<T extends SellerOfferTranscriptMessage>(
  messages: readonly T[]
): T[] {
  let summaryInvited = false;
  return messages.filter((message) => {
    if (message.sender === "assistant" && isSellerOfferReviewInstruction(message.text)) {
      return false;
    }
    if (message.sender === "assistant" && isSellerOfferSummaryInvitation(message.text)) {
      const repeatedInvitation = summaryInvited;
      summaryInvited = true;
      return !repeatedInvitation;
    }
    if (
      message.sender !== "user" ||
      message.images?.length ||
      !shouldOpenAssistantSummary(message.text)
    ) {
      summaryInvited = false;
    }
    return true;
  });
}

export function isSellerOfferSummaryReply(
  value: string,
  pendingAction: string | null
) {
  return shouldOpenAssistantSummary(value) && (
    /resumen/i.test(value) ||
    pendingAction === "ASK_SHOW_SUMMARY"
  );
}
