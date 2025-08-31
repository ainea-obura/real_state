import { Metadata } from 'next';

import ServiceList from '@/features/management/services/ServiceList';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_SITE_NAME} | For Services`,
  description: `${process.env.NEXT_PUBLIC_SITE_NAME} Is a Real State Solution All in One`,
};
const Page = () => {
  return (
    <div className="w-full h-full">
      <ServiceList />
    </div>
  );
};

export default Page;
