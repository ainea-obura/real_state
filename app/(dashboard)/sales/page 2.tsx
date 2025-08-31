import { Metadata } from 'next';

import SalesMenus from '@/features/sales/salesMenus';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_SITE_NAME} | Sales`,
  description: `${process.env.NEXT_PUBLIC_SITE_NAME} Is a Real State Solution All in One`,
};

const Page = () => {
  return (
    <div className="w-full h-full">
      <SalesMenus />
    </div>
  );
};

export default Page;
