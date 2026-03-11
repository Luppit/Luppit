import React, { createContext, useContext, useMemo, useState } from "react";

export type ChatMessage = {
  id: string;
  sender: "user" | "assistant";
  text: string;
};

type ChatSessionContextValue = {
  messages: ChatMessage[];
  title?: string;
  sendMessage: (text: string) => void;
};

const ChatSessionContext = createContext<ChatSessionContextValue>({
  messages: [],
  title: undefined,
  sendMessage: () => {},
});

export function ChatSessionProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const now = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: `${now}-u`, sender: "user", text: trimmed },
      {
        id: `${now}-a`,
        sender: "assistant",
        text: "Gracias por tu mensaje. Vamos a seguir armando tu solicitud.",
      },
    ]);
  };

  const value = useMemo(
    () => ({
      messages,
      title: messages.length > 0 ? "Compresor Sentra 2023" : undefined,
      sendMessage,
    }),
    [messages]
  );

  return (
    <ChatSessionContext.Provider value={value}>
      {children}
    </ChatSessionContext.Provider>
  );
}

export function useChatSession() {
  return useContext(ChatSessionContext);
}
