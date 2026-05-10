import { RoomStartSurface } from "@/features/room-entry/RoomStartSurface";
import { getCurrentViewerFromCookies } from "@/server/auth-session";

export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  const initialViewer = await getCurrentViewerFromCookies();

  return <RoomStartSurface viewer={initialViewer} />;
}
