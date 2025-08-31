import { Metadata } from 'next';

import VerifyEmail from '@/features/auth/verifyEmail';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_SITE_NAME} | Verify Email`,
  description: `${process.env.NEXT_PUBLIC_SITE_NAME} Is a Real State Solution All in One`,
};

const Page = () => {
  return (
    <div className="flex flex-col items-center mt-6 w-full">
      <VerifyEmail />
    </div>
  );
};
export default Page;
