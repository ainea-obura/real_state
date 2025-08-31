import { Metadata } from 'next';

import Reports from '@/features/finance/reports/reports';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_SITE_NAME} | Reports`,
  description: `${process.env.NEXT_PUBLIC_SITE_NAME} Is a Real State Solution All in One`,
};

const Page = () => {
  return (
    <div className="w-full h-full">
      <Reports />
    </div>
  );
};

export default Page;
