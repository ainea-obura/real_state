import { useAtomValue } from 'jotai';
import { FolderPlus, Home, Users } from 'lucide-react';
import { useParams } from 'next/navigation';

import { fetchTenantAssignments } from '@/actions/projects/tenantAssignment';
import { Button } from '@/components/ui/button';
import FetchTenantAssignments from '@/features/property/fetchTenantAssignments';
import { pageIndexAtom, pageSizeAtom } from '@/store';
import { useQuery } from '@tanstack/react-query';

import Header from '../../projects/profile/tabs/Components/header';
import FeatureCard from './components/featureCard';

const Tenants = () => {
  const params = useParams();
  const propertyId = params?.id as string;
  const pageIndex = useAtomValue(pageIndexAtom);
  const pageSize = useAtomValue(pageSizeAtom);

  const {
    data: responseData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["tenant-assignments", propertyId, pageIndex, pageSize],
    queryFn: () =>
      fetchTenantAssignments(pageIndex + 1, pageSize, {}, propertyId),
    enabled: !!propertyId,
  });

  // Statistics (example: total assignments, active, etc.)
  const assignments = responseData?.results || responseData || [];
  const totalAssignments = assignments.length;
  // You can add more stats as needed

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <Header
        title="Property Tenants"
        description="Tenants of the property and their details."
      >
        <Button>
          <FolderPlus className="w-4 h-4" />
          Add Tenant
        </Button>
      </Header>

      <div className="gap-4 grid grid-cols-4">
        <FeatureCard
          icon={Users}
          title="Total Assignments"
          value={totalAssignments}
        />
        {/* Add more FeatureCards for other stats if needed */}
      </div>

      <div className="py-4">
        <FetchTenantAssignments
          isPending={isLoading}
          isError={isError}
          error={error as Error}
          data={responseData || { count: 0, results: [] }}
        />
      </div>
    </div>
  );
};

export default Tenants;
