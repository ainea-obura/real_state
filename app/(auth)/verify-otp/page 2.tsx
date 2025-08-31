import { Metadata } from 'next';

import VerifyOTP from '@/features/auth/verifyotp';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_SITE_NAME} | Verify OTP`,
  description: `${process.env.NEXT_PUBLIC_SITE_NAME} Is a Real State Solution All in One`,
};
const Page = () => {
  return (
    <div className="">
      <VerifyOTP />
    </div>
  );
};
export default Page;
