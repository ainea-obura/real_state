import { Metadata } from 'next';

import RentList from '@/features/management/rent/RentList';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_SITE_NAME} | For Rent`,
  description: `${process.env.NEXT_PUBLIC_SITE_NAME} Is a Real State Solution All in One`,
};

export default function RentManagementPage() {
  return <RentList />;
}
