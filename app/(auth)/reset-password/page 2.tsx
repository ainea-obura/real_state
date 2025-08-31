import { Metadata } from 'next';

import ResetPassword from '@/features/auth/resetPassword';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_SITE_NAME} | Reset Password`,
  description: `${process.env.NEXT_PUBLIC_SITE_NAME} Is a Real State Solution All in One`,
};

const Page = () => {
  return (
    <div className="w-full h-full">
      <ResetPassword />
    </div>
  );
};
export default Page; 