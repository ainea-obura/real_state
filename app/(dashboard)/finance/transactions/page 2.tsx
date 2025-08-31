import { Metadata } from 'next';

import Transactions from '@/features/finance/transactions/transactions';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_SITE_NAME} | Transactions`,
  description: `${process.env.NEXT_PUBLIC_SITE_NAME} Is a Real State Solution All in One`,
};
const Page = () => {
  return <Transactions />;
};
export default Page;
