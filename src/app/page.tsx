import { HomeEntrySurface } from "@/features/home-entry/HomeEntrySurface";
import { getCurrentViewerFromCookies } from "@/server/auth-session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initialViewer = await getCurrentViewerFromCookies();

  return <HomeEntrySurface initialViewer={initialViewer} />;
}
