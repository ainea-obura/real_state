import { Metadata } from 'next';

import SignInComponent from '@/features/auth/signIn';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_SITE_NAME} | Sign In`,
  description: `${process.env.NEXT_PUBLIC_SITE_NAME} Is a Real State Solution All in One`,
};
const Page = () => {
  return (
    <div className="w-full h-full">
      <SignInComponent />
    </div>
  );
};

export default Page;
