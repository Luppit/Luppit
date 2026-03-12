import { Roles } from "./role.service";

export type ConversationMessage = {
  id: string;
  sender: "buyer" | "seller" | "system";
  text: string;
  createdAt: string;
  imageUrl?: string;
  imageKey?: "mockReference";
};

export type ConversationQuery = {
  purchaseRequestId: string;
  profileId: string;
  role: Roles;
};

const conversationMockMessages: ConversationMessage[] = [
  {
    id: "msg-1",
    sender: "buyer",
    text: "Quiero comprar un compresor del aire acondicionado para Nissan Sentra 2023, motor gasolina, original y solo la pieza principal.",
    createdAt: "6:10pm",
  },
  {
    id: "msg-2",
    sender: "seller",
    text: "Perfecto, tengo opciones disponibles. ¿Lo necesitas nuevo u original usado?",
    createdAt: "6:12pm",
  },
  {
    id: "msg-3",
    sender: "buyer",
    text: "Estas son algunas imágenes de referencia.",
    createdAt: "6:14pm",
    imageKey: "mockReference",
  },
  {
    id: "msg-4",
    sender: "seller",
    text: "Gracias, con eso te cotizo en breve.",
    createdAt: "6:15pm",
  },
];

export async function getConversationMessages(
  query: ConversationQuery
): Promise<ConversationMessage[]> {
  // The params are part of the contract and will be used by the real API call.
  void query;
  return conversationMockMessages;
}
