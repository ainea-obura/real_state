import { Metadata } from 'next';

import FetchDocuments from '@/features/management/documents/fetchDocuments';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_SITE_NAME} | Documents`,
  description: `${process.env.NEXT_PUBLIC_SITE_NAME} Is a Real State Solution All in One`,
};
const Page = () => {
  return (
    <div className="w-full h-full">
      <FetchDocuments />
    </div>
  );
};

export default Page;
