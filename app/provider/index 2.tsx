"use client";

import { Provider } from 'jotai';
import { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

import { PermissionProvider } from '@/components/providers/PermissionProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export function Providers({
  children,
  session,
}: {
  children: ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <QueryClientProvider client={queryClient}>
        <Provider>
          <PermissionProvider>{children}</PermissionProvider>
        </Provider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
