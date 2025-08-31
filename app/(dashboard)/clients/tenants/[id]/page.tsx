import { Metadata } from 'next';

import ClientDetail from '@/features/clients/clientDetail';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_SITE_NAME} | Tenant Details`,
  description: `${process.env.NEXT_PUBLIC_SITE_NAME} Is a Real State Solution All in One`,
};

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return (
    <div className="w-full h-full">
      <ClientDetail tenantId={id} />
    </div>
  );
};

export default Page;
