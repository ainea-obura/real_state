import { Metadata } from 'next';

import AccountType from '@/features/auth/accountType';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_SITE_NAME} | User Type`,
  description: `${process.env.NEXT_PUBLIC_SITE_NAME} Is a Real State Solution All in One`,
};
const Page = () => {
  return (
    <div className="w-full h-full">
      <AccountType />
    </div>
  );
};
export default Page;
