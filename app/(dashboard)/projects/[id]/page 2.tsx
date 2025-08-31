import { Metadata } from 'next';

import ProjectDetail from '@/features/projects/profile/prjectDetail';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_SITE_NAME} | Project Details`,
  description: `${process.env.NEXT_PUBLIC_SITE_NAME} Is a Real State Solution All in One`,
};

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return (
    <div className="w-full h-full">
      <ProjectDetail projectId={id} />
    </div>
  );
};

export default Page;
