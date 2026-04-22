import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "URL Gallery",
  description: "A curated gallery of inspiring websites",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0a] text-white antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
