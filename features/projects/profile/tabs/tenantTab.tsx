import { useParams } from 'next/navigation';
import ShowTenantStatistics from './ShowTenantStatistics';

const TenantTab = ({
  projectId,
}: {
  projectId: string;
}) => {
  return (
    <div className="w-full h-full">
      <ShowTenantStatistics projectId={projectId} />
    </div>
  );
};

export default TenantTab;