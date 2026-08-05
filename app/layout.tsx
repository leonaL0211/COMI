import type { Metadata, Viewport } from "next";
import { PwaRegistration } from "./PwaRegistration";
import "./globals.css";

export const metadata: Metadata = {
  title: "Berry Chat",
  description: "私人 AI 聊天与长期记忆应用",
  applicationName: "Berry Chat",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Berry Chat",
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
  themeColor: "#fff7ef",
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
    "sakura-night": "#211b22"
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
      className="h-full antialiased"
      data-theme="milk-tea"
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
