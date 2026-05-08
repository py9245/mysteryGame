import type {
  RealtimeEnvelope,
  RealtimeEventName,
  RealtimeEventPayloadMap,
} from "../../contracts/events";
import type { EntityId, IsoTimestamp } from "../../contracts/game";

export function buildRoomChannelName(roomId: EntityId): string {
  return `room:${roomId}`;
}

export function buildStageChannelName(stageId: EntityId): string {
  return `stage:${stageId}`;
}

export function createRealtimeEnvelope<EventName extends RealtimeEventName>(
  event: EventName,
  payload: RealtimeEventPayloadMap[EventName],
  emittedAt: IsoTimestamp,
): RealtimeEnvelope<EventName> {
  return {
    event,
    payload,
    emittedAt,
  };
}
