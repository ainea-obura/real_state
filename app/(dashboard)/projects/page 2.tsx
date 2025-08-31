import { Metadata } from 'next';

import ShowStatistics from '@/features/projects/ShowStatistics';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_SITE_NAME} | Projects`,
  description: `${process.env.NEXT_PUBLIC_SITE_NAME} Is a Real State Solution All in One`,
};
const Page = () => {
  return (
    <div className="w-full h-full">
      <ShowStatistics />
    </div>
  );
};
export default Page;
