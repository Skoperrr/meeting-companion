import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Stride | Meeting Companion",
  description: "Turn meeting transcripts into reviewed, traceable tasks.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
