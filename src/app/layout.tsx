import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import InstallApp from "@/components/InstallApp";

export const metadata: Metadata = {
  title: "Pole Mapping | Engineering Management System",
  description: "Electric pole scanning and mapping module for EE-IMS (prototype)",
  applicationName: "Pole Scanner",
  appleWebApp: { capable: true, title: "Pole Scanner", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png", icon: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#0e0e11",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppShell>{children}</AppShell>
        <InstallApp />
      </body>
    </html>
  );
}
