import { Metadata } from 'next';

import ShowAgencyStatistics from '@/features/clients/ShowAgencyStatistics';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_SITE_NAME} | Agency`,
  description: `${process.env.NEXT_PUBLIC_SITE_NAME} Is a Real State Solution All in One`,
};

const Page = () => {
  return (
    <div className="w-full h-full">
      <ShowAgencyStatistics />
    </div>
  );
};

export default Page;
