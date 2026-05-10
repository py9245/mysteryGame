import { HomeEntrySurface } from "@/features/home-entry/HomeEntrySurface";
import { getCurrentViewerFromCookies } from "@/server/auth-session";

export const dynamic = "force-dynamic";

export default async function CreateRoomPage() {
  const initialViewer = await getCurrentViewerFromCookies();

  return (
    <HomeEntrySurface
      initialViewer={initialViewer}
      pageTitle="방 만들기"
      pageKicker="방을 열면 생성 성공 즉시 방장으로 대기방에 자동 입장합니다."
      showAccountHistory={false}
      surfaceMode="create"
    />
  );
}
