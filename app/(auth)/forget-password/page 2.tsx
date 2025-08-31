import { Metadata } from 'next';

import ForgetPassword from '@/features/auth/forget-password';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_SITE_NAME} | Forget Password`,
  description: `${process.env.NEXT_PUBLIC_SITE_NAME} Is a Real State Solution All in One`,
};

const Page = () => {
  return (
    <div className="w-full h-full">
      <ForgetPassword />
    </div>
  );
};
export default Page;
