import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Mystery Time",
  description: "Mystery Time gameplay frontend scaffold",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className="mt-root">{children}</body>
    </html>
  );
}
