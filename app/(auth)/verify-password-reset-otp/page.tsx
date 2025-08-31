import { Metadata } from 'next';

import VerifyPasswordResetOtp from '@/features/auth/verifyPasswordResetOtp';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_SITE_NAME} | Verify Password Reset OTP`,
  description: `${process.env.NEXT_PUBLIC_SITE_NAME} Is a Real State Solution All in One`,
};

const Page = () => {
  return (
    <div className="flex flex-col items-center mt-6 w-full">
      <VerifyPasswordResetOtp />
    </div>
  );
};
export default Page; 