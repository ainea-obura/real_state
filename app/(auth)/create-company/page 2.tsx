import { Metadata } from 'next';

import CreateCompany from '@/features/auth/create-company';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_SITE_NAME} | Create Company`,
  description: `${process.env.NEXT_PUBLIC_SITE_NAME} Is a Real State Solution All in One`,
};

const Page = () => {
  return <CreateCompany />;
};

export default Page;
