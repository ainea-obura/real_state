import { Metadata } from 'next';

import ShowTenantStatistics from '@/features/clients/ShowTenantStatistics';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_SITE_NAME} | Tenants`,
  description: `${process.env.NEXT_PUBLIC_SITE_NAME} Is a Real State Solution All in One`,
};
const Page = () => {
  return (
    <div className="w-full h-full">
      <ShowTenantStatistics />
    </div>
  );
};

export default Page;
