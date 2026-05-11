import { redirect } from "next/navigation";
import { resolveRoomContextFromSearchParams, type RoomRouteSearchParams } from "@/features/room-context/room-context";

export default async function BriefingPage({
  params,
  searchParams,
}: {
  params: Promise<{ stageNumber: string }>;
  searchParams?: Promise<RoomRouteSearchParams>;
}) {
  const { stageNumber } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { roomId, roomCode, playerId } = resolveRoomContextFromSearchParams(resolvedSearchParams);
  const paramsForRedirect = new URLSearchParams();
  if (roomId) paramsForRedirect.set("roomId", roomId);
  if (roomCode) paramsForRedirect.set("roomCode", roomCode);
  if (playerId) paramsForRedirect.set("playerId", playerId);

  redirect(`/stage/${stageNumber}/gameplay?${paramsForRedirect.toString()}`);
}
