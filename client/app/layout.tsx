import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import { ParallaxProvider } from "@/components/providers/parallax-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { SocketProvider } from "@/components/providers/socket-provider";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Tasty Banana - AI Image Generation",
  description: "Generate stunning images with AI-powered image generation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${plusJakarta.variable} ${inter.variable}`}
      >
        <SocketProvider>
          <AuthProvider>
            <ParallaxProvider>
              {children}
            </ParallaxProvider>
          </AuthProvider>
        </SocketProvider>
      </body>
    </html>
  );
}
