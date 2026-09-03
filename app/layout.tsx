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

/*
 * Anti-FOUC theme script — runs before React hydrates, so it duplicates the
 * allowlist/default from shared/themes.ts by necessity (can't import a
 * module into an inline <script>). Keep the two in sync by hand.
 *
 * "milk-tea" (奶茶莓粉) was retired: it's intentionally not in `allowed`
 * here, so any old stored value of "milk-tea" (or anything else invalid)
 * falls through to "sea-salt" (Light) below, matching
 * shared/themes.ts's defaultTheme. This never throws on an unrecognized
 * value — it just fails safe to Light.
 */
const themeInitScript = `
try {
  var theme = window.localStorage.getItem("berry-chat-theme") || "sea-salt";
  var allowed = ["sea-salt", "sakura-night"];
  var selected = allowed.indexOf(theme) >= 0 ? theme : "sea-salt";
  document.documentElement.dataset.theme = selected;
  var colors = {
    "sea-salt": "#fff0d6",
    "sakura-night": "#171217"
  };
  var themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.setAttribute("content", colors[selected] || colors["sea-salt"]);
  }
} catch (error) {
  document.documentElement.dataset.theme = "sea-salt";
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
      data-theme="sea-salt"
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
