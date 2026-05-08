import { loadChatMessages } from "./chat-messages-loader";
import { ChatRailClientShell } from "./ChatRailClientShell";
import type { ChatSnapshot } from "./chat-ui-types";

export async function ChatRail({ snapshot }: { snapshot: ChatSnapshot }) {
  const { messages, source, endpoint } = await loadChatMessages({
    roomId: snapshot.room.id,
    stageId: snapshot.stage?.stageId ?? null,
  });

  return (
    <ChatRailClientShell
      snapshot={snapshot}
      initialMessages={messages}
      source={source}
      endpoint={endpoint}
    />
  );
}
