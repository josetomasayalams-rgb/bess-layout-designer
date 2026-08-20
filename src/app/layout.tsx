import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BESS Layout Designer",
  description:
    "Preliminary BESS layout design tool on a map. Conceptual sizing only — not a substitute for detailed engineering.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
