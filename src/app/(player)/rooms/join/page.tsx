import { HomeEntrySurface } from "@/features/home-entry/HomeEntrySurface";
import { getCurrentViewerFromCookies } from "@/server/auth-session";

export const dynamic = "force-dynamic";

export default async function JoinRoomPage() {
  const initialViewer = await getCurrentViewerFromCookies();

  return (
    <HomeEntrySurface
      initialViewer={initialViewer}
      pageTitle="방 입장"
      pageKicker="입장 코드를 넣거나 열린 방을 골라서 바로 대기방으로 들어갑니다."
      showAccountHistory={false}
      surfaceMode="join"
    />
  );
}
