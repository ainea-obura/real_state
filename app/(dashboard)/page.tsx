import { Metadata } from 'next';

import Dashboard from '@/features/dashboard';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_SITE_NAME} | Home`,
  description: `${process.env.NEXT_PUBLIC_SITE_NAME} Is a Real State Solution All in One`,
};

const Page = () => {
  return <Dashboard />;
};

export default Page;
