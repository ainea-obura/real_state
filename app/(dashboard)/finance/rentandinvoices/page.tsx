import { Metadata } from 'next';

import RentAndInvoicesDetailPage from '@/features/finance/rendandInvoices/rentAndInvoicesDetailPage';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_SITE_NAME} | Rent and Invoices`,
  description: `${process.env.NEXT_PUBLIC_SITE_NAME} Is a Real State Solution All in One`,
};

const Page = () => {
  return (
    <div className="w-full h-full">
      <RentAndInvoicesDetailPage />
    </div>
  );
};

export default Page;
