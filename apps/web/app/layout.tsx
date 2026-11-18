import type { ReactNode } from "react";
import "./style.css";
export const metadata = {
  title: "Pooltrace · Local research",
  description: "Read-only cycle analysis with exact evidence and provenance.",
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
