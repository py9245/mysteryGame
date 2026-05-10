import { DashboardSurface } from "@/features/dashboard/DashboardSurface";
import { getCurrentViewerFromCookies } from "@/server/auth-session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initialViewer = await getCurrentViewerFromCookies();

  return <DashboardSurface viewer={initialViewer} />;
}
