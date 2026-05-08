import type { TeamSlot } from "@/contracts/game";
import type { MeView, PlayerView, RoomViewSnapshot, StageView } from "@/contracts/view";

export type ChatParticipant = Pick<PlayerView, "playerId" | "nickname" | "teamSlotId" | "isMe">;
export type ChatStageContext = Pick<
  StageView,
  "stageId" | "stageNumber" | "publicTitle" | "status" | "remainingSeconds"
>;

export interface ChatSnapshot {
  room: RoomViewSnapshot["room"];
  me: MeView;
  players: ChatParticipant[];
  teamSlots: TeamSlot[];
  stage: ChatStageContext | null;
}
