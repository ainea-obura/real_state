import { Metadata } from 'next';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_SITE_NAME} | Property`,
  description: `${process.env.NEXT_PUBLIC_SITE_NAME} Is a Real State Solution All in One`,
};

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return (
    <div className="w-full h-full">
      {/* <FetchProperty propertyId={params.id} /> */}
      <h1>hello {id}</h1>
    </div>
  );
};
export default Page;
