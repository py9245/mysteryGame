import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default function PlayerLayout({ children }: { children: ReactNode }) {
  return <main className="player-shell">{children}</main>;
}
