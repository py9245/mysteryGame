import type {
  ApiResponse,
  ListChatMessagesRequest,
  ListChatMessagesResponse,
  SendChatMessageRequest,
  SendChatMessageResponse,
} from "../../../contracts/api";

export const CHAT_ROUTE_CONTRACT = {
  list: {
    method: "GET",
    path: "/api/chat/[roomId]",
  },
  send: {
    method: "POST",
    path: "/api/chat",
  },
} as const;

export type ListChatMessagesRouteRequest = ListChatMessagesRequest;
export type ListChatMessagesRouteResponse =
  ApiResponse<ListChatMessagesResponse>;
export type SendChatMessageRouteRequest = SendChatMessageRequest;
export type SendChatMessageRouteResponse =
  ApiResponse<SendChatMessageResponse>;
