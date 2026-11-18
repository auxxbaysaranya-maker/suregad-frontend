import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { closeSocket, getSocket } from "../lib/socket";
import { useSession } from "../store/session";

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  kind: "text" | "image" | "offer" | "system";
  body: string;
  imageUrl: string | null;
  offer: ChatOffer | null;
  readBy: string[];
  createdAt: string;
  pending?: boolean;
}

export interface ChatOffer {
  id: string;
  amountPaise: number;
  listPricePaise: number;
  status: "pending" | "accepted" | "rejected" | "withdrawn" | "superseded" | "expired" | "purchased";
  createdBy: string;
  buyerId: string;
  sellerUserId: string;
  productId: string;
  expiresAt: string | null;
  orderId: string | null;
}

/** Keeps chat queries fresh from Socket.IO events for the signed-in user. */
export function RealtimeBridge() {
  const profile = useSession((state) => state.profile);
  const token = useSession((state) => state.token);
  const client = useQueryClient();
  useEffect(() => {
    if (!profile) {
      closeSocket();
      return;
    }
    const socket = getSocket();
    if (!socket) return;
    const onMessage = (payload: { conversationId: string; message: ChatMessage }) => {
      client.setQueryData<ChatMessage[]>(["chat-messages", payload.conversationId], (current) => {
        if (!current) return current;
        if (current.some((message) => message.id === payload.message.id)) return current;
        // Replace an optimistic copy of my own message if there is one.
        const withoutPending = current.filter((message) => !(message.pending && message.senderId === payload.message.senderId && message.body === payload.message.body));
        return [...withoutPending, payload.message];
      });
      if (payload.message.offer || payload.message.kind === "system") void client.invalidateQueries({ queryKey: ["chat-messages", payload.conversationId] });
      void client.invalidateQueries({ queryKey: ["chat-list"] });
      void client.invalidateQueries({ queryKey: ["chat-unread"] });
      void client.invalidateQueries({ queryKey: ["chat", payload.conversationId] });
    };
    const onRead = (payload: { conversationId: string; readerId: string }) => {
      client.setQueryData<ChatMessage[]>(["chat-messages", payload.conversationId], (current) =>
        current?.map((message) => (message.readBy.includes(payload.readerId) ? message : { ...message, readBy: [...message.readBy, payload.readerId] })),
      );
      void client.invalidateQueries({ queryKey: ["chat-unread"] });
      void client.invalidateQueries({ queryKey: ["chat-list"] });
    };
    const onConversation = (payload: { conversationId: string }) => {
      void client.invalidateQueries({ queryKey: ["chat", payload.conversationId] });
      void client.invalidateQueries({ queryKey: ["chat-list"] });
    };
    const onPresence = () => {
      void client.invalidateQueries({ queryKey: ["chat-list"] });
    };
    socket.on("chat:message", onMessage);
    socket.on("chat:read", onRead);
    socket.on("chat:conversation", onConversation);
    socket.on("chat:presence", onPresence);
    return () => {
      socket.off("chat:message", onMessage);
      socket.off("chat:read", onRead);
      socket.off("chat:conversation", onConversation);
      socket.off("chat:presence", onPresence);
    };
  }, [profile, token, client]);
  return null;
}
