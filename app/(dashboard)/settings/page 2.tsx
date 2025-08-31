import { Metadata } from 'next';

import SettingsMain from '@/features/settings/SettingsMain';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_SITE_NAME} | Settings`,
  description: `${process.env.NEXT_PUBLIC_SITE_NAME} Is a Real State Solution All in One`,
};

const SettingsPage = () => {
  return (
    <div className="w-full h-full">
      <SettingsMain />
    </div>
  );
};

export default SettingsPage;
