import { HomeEntrySurface } from "@/features/home-entry/HomeEntrySurface";
import { getCurrentViewerFromCookies } from "@/server/auth-session";

export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  const initialViewer = await getCurrentViewerFromCookies();

  return (
    <HomeEntrySurface
      initialViewer={initialViewer}
      pageTitle="방 입장 / 만들기"
      pageKicker="공개방을 고르거나, 입장 코드를 넣거나, 새 방을 만들어 바로 대기방으로 이동합니다."
      showAccountHistory={false}
    />
  );
}
