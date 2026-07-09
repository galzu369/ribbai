import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "RIBBAI OPS",
    template: "%s | RIBBAI OPS",
  },
  description: "Enterprise restaurant operations platform for RIBBAI.",
  applicationName: "RIBBAI OPS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
