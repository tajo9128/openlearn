import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import '@openmaic/renderer/fonts.css';
import 'animate.css';
import 'katex/dist/katex.min.css';
import { ThemeProvider } from '@/lib/hooks/use-theme';
import { I18nProvider } from '@/lib/hooks/use-i18n';
import { Toaster } from '@/components/ui/sonner';
import { ServerProvidersInit } from '@/components/server-providers-init';
import { AccessCodeGuard } from '@/components/access-code-guard';
import { NavBar } from '@/components/learning/NavBar';

const inter = localFont({
  src: '../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  variable: '--font-sans',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: {
    default: 'BioDockify Learn — Free AI-Narrated Pharmacy Courses, Python Notes & Certificates',
    template: '%s | BioDockify Learn',
  },
  description:
    'Free pharmacy education platform: 21 AI-narrated video courses (molecular docking, drug discovery, pharmacology, Python for pharmacy), free B.Pharm notes PDF downloads, practice exercises and certificates.',
  keywords: [
    'pharmacy education platform',
    'AI-narrated pharmacy courses',
    'free pharmacy courses online',
    'B pharmacy python notes',
    'molecular docking course',
    'drug discovery learning',
  ],
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/favicon.ico", sizes: "any" }],
  },
  openGraph: {
    siteName: 'BioDockify Learn',
    type: 'website',
    url: 'https://learn.biodockify.com',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <I18nProvider>
            <ServerProvidersInit />
            <AccessCodeGuard><NavBar />{children}</AccessCodeGuard>
            <Toaster position="top-center" />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
