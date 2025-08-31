import { Metadata } from 'next';

import MediaManagement from '@/features/management/media/mediaManagement';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_SITE_NAME} | Media`,
  description: `${process.env.NEXT_PUBLIC_SITE_NAME} Is a Real State Solution All in One`,
};

const Page = () => {
  return (
    <div className="w-full h-full">
      <MediaManagement />
    </div>
  );
};
export default Page;
