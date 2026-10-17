import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  title: { default: `${config.appName} — free phone demo at your doorstep`, template: `%s · ${config.appName}` },
  description: `Book a free mobile phone demo at home from ${config.shopName}. Try it, then buy it from the delivery partner.`,
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#5a2fe0" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
