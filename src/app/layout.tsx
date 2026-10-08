import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { AppShell } from "@/components/AppShell";
import { themeBootScript } from "@/lib/theme-script";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "FoodSpin", template: "%s · FoodSpin" },
  description: "Can't decide what to eat? Filter by appetite, craving, budget and distance, then spin.",
  appleWebApp: { capable: true, title: "FoodSpin", statusBarStyle: "default" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1F7A4D" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1112" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${GeistSans.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
