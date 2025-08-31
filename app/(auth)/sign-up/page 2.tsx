import { Metadata } from 'next';

import SignUp from '@/features/auth/signUp';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_SITE_NAME} | Sign Up`,
  description: `${process.env.NEXT_PUBLIC_SITE_NAME} Is a Real State Solution All in One`,
};
const Page = () => {
  return (
    <div className="w-full h-full">
      <SignUp />
    </div>
  );
};
export default Page;
