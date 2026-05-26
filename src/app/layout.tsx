import type { ReactNode } from "react";
import "./globals.css";
import { ToastHost } from "@/components/feedback/ToastHost";

export const metadata = {
  title: "Mystery Time",
  description: "Mystery Time gameplay frontend scaffold",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className="mt-root">
        {children}
        <ToastHost />
      </body>
    </html>
  );
}
