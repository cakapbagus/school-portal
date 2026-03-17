import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "School Portal",
  description: "School Link & Information Portal",
};

// Script dijalankan sebelum render untuk hindari flash of wrong theme
const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('portal-theme') || 'dark';
    var resolved = t === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : t;
    document.documentElement.setAttribute('data-theme', resolved);
  } catch(e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" data-theme="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
