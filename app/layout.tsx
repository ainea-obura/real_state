import type { Metadata } from "next";
import './globals.css';

import { getServerSession } from 'next-auth';
import { Poppins } from 'next/font/google';

import { Toaster } from '@/components/ui/sonner';
import { authOptions } from '@/lib/auth';

import { Providers } from './provider';

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "500", "700", "800"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_SITE_NAME} | Real State`,
  description: `${process.env.NEXT_PUBLIC_SITE_DESCRIPTION}`,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en" className={poppins.variable} suppressHydrationWarning>
      <body className="relative w-screen h-screen antialiased">
        <Providers session={session}>
          <main className="flex flex-col flex-grow w-full h-full">
            {children}
          </main>
          <Toaster
            richColors
            toastOptions={{
              classNames: {
                toast: "rounded-lg shadow-lg",
                error: "bg-red-600 text-white",
                icon: "text-white",
                title: "font-semibold",
                description: "text-white",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
