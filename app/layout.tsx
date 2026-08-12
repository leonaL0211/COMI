import type { Metadata, Viewport } from "next";
import { Instrument_Sans } from "next/font/google";
import { appBuildId } from "@/shared/build-info";
import { PwaRegistration } from "./PwaRegistration";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument-sans",
});

export const metadata: Metadata = {
  title: "COMI",
  description: "COMI private AI companion.",
  applicationName: "COMI",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "COMI",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fff0d6",
};

const themeInitScript = `
try {
  var theme = window.localStorage.getItem("berry-chat-theme") || "milk-tea";
  var allowed = ["milk-tea", "sea-salt", "sakura-night"];
  var selected = allowed.indexOf(theme) >= 0 ? theme : "milk-tea";
  document.documentElement.dataset.theme = selected;
  var colors = {
    "milk-tea": "#fff7ef",
    "sea-salt": "#fff0d6",
    "sakura-night": "#171217"
  };
  var themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.setAttribute("content", colors[selected] || colors["milk-tea"]);
  }
} catch (error) {
  document.documentElement.dataset.theme = "milk-tea";
}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${instrumentSans.variable} h-full antialiased`}
      data-theme="milk-tea"
      data-build-id={appBuildId}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <PwaRegistration />
      </body>
    </html>
  );
}
