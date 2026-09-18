import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Doodledoggy — Mini Golden Doodles Georgia",
  description: "Ancestry and kennel management for dog breeding",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
