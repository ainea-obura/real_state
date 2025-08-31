import { Metadata } from 'next';

import OwnerDetail from '@/features/clients/ownerDetail';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_SITE_NAME} | Owner Details`,
  description: `${process.env.NEXT_PUBLIC_SITE_NAME} Is a Real State Solution All in One`,
};

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;

  return (
    <div className="w-full h-full">
      <OwnerDetail ownerId={id} />
    </div>
  );
};

export default Page;
