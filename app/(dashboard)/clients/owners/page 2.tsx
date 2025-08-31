import { Metadata } from 'next';

import ShowOwnerStatistics from '@/features/clients/ShowOwnerStatistics';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_SITE_NAME} | Owners`,
  description: `${process.env.NEXT_PUBLIC_SITE_NAME} Is a Real State Solution All in One`,
};
const Page = () => {
  return (
    <div className="w-full h-full">
      <ShowOwnerStatistics />
    </div>
  );
};

export default Page;
