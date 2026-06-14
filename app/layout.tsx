import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kandwii",
  description: "Kandwii mock-first Shopify operations shell",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
