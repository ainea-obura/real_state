import { Metadata } from 'next';

import Services from '@/features/services/fetchServices';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_SITE_NAME} | Services`,
  description: `${process.env.NEXT_PUBLIC_SITE_NAME} Is a Real State Solution All in One`,
};
const Page = () => {
  return (
    <div className="w-full h-full">
      <Services />
    </div>
  );
};

export default Page;
